import * as http from "http";
import * as https from "https";
import * as proxy from "proxy-agent";
import * as qs from "querystring";
import * as fs from "fs";
import * as Debug from "debug";

import { Readable } from "stream";
import { retry } from "async";

import { Attachment } from "./attachment";
import { MailgunClientOptions } from "./types";

const FormData = require("form-data");
const promisifyCall = require("promisify-call");

const debug = Debug("mailgun-js");

export type HTTPMethod = "PUT" | "GET" | "DELETE" | "POST";
export type KeyValuePair = { [key: string]: any };

interface RequestOptions {
  hostname: string;
  port: number;
  protocol: string;
  path: string;
  method: string;
  headers: KeyValuePair;
  auth: string;
  agent: any;
  timeout: number;
}

export class Request {
  host: string;
  protocol: string;
  port: number;
  retry: number;
  proxy: string;
  endpoint: string;
  auth: string;
  timeout: number;
  payload: string;
  headers: { [key: string]: string };
  callback: Function;
  form: any;

  constructor(options: MailgunClientOptions) {
    this.host = options.host;
    this.protocol = options.protocol;
    this.port = options.port;
    this.endpoint = options.endpoint;
    this.auth = options.auth;
    this.proxy = options.proxy;
    this.timeout = options.timeout;
    this.retry = options.retry || 1;
  }

  _request(method: HTTPMethod, resource: string, data: any, fn: Function) {
    let path = "".concat(this.endpoint, resource);

    const params = this.prepareData(data);
    const isMIME = path.indexOf("/messages.mime") >= 0;

    this.payload = "";
    this.headers = {};

    if (method === "GET" || method === "DELETE") {
      this.payload = qs.stringify(params);
      if (this.payload) path = path.concat("?", this.payload);
    } else {
      this.headers["Content-Type"] = isMIME
        ? "multipart/form-data"
        : "application/x-www-form-urlencoded";

      if (
        params &&
        (params.attachment || params.inline || (isMIME && params.message))
      ) {
        this.prepareFormData(params);
      } else {
        this.payload = qs.stringify(params);
        const length = this.payload ? Buffer.byteLength(this.payload) : 0;
        this.headers["Content-Length"] = length.toString();
      }
    }

    // check for MIME is true in case of messages GET
    if (
      method === "GET" &&
      path.indexOf("/messages") >= 0 &&
      params &&
      params.MIME === true
    ) {
      this.headers.Accept = "message/rfc2822";
    }

    debug("%s %s", method, path);

    const opts: RequestOptions = {
      hostname: this.host,
      port: this.port,
      protocol: this.protocol,
      path: path,
      method: method,
      headers: this.headers,
      auth: this.auth,
      agent: this.proxy ? proxy(this.proxy) : false,
      timeout: this.timeout
    };

    if (this.retry > 1) {
      retry(
        this.retry,
        (retryCb: Function) => {
          this.callback = retryCb;
          this.performRequest(opts);
        },
        fn
      );
    } else {
      this.callback = fn;
      this.performRequest(opts);
    }
  }

  request(method: HTTPMethod, resource: string, data: any, fn: Function) {
    if (typeof data === "function" && !fn) {
      fn = data;
      data = {};
    }

    if (!data) {
      data = {};
    }

    // TODO: modify promisifyCall to have proper typing
    return promisifyCall(this, this._request, method, resource, data, fn);
  }

  prepareData(data: KeyValuePair) {
    const params: { [key: string]: any } = {};

    for (const key in data) {
      if (key !== "attachment" && key !== "inline" && isOk(data[key])) {
        const value = getDataValue(key, data[key]);

        if (isOk(value)) {
          params[key] = value;
        }
      } else {
        params[key] = data[key];
      }
    }

    return params;
  }

  prepareFormData(data: KeyValuePair) {
    this.form = new FormData();
    const self = this;

    for (const key in data) {
      const obj = data[key];
      if (isOk(obj)) {
        if (key === "attachment" || key === "inline") {
          if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i++) {
              this.handleAttachmentObject(key, obj[i]);
            }
          } else {
            this.handleAttachmentObject(key, obj);
          }
        } else if (key === "message") {
          this.handleMimeObject(key, obj);
        } else if (Array.isArray(obj)) {
          obj.forEach(element => {
            if (isOk(element)) {
              const value = getDataValue(key, element);
              if (isOk(value)) {
                self.form.append(key, value);
              }
            }
          });
        } else {
          const value = getDataValue(key, obj);
          if (isOk(value)) {
            this.form.append(key, value);
          }
        }
      }
    }

    this.headers = this.form.getHeaders();
  }

  handleMimeObject(key: string, obj: any) {
    if (typeof obj === "string") {
      if (fs.existsSync(obj) && fs.statSync(obj).isFile()) {
        this.form.append("message", fs.createReadStream(obj));
      } else {
        this.form.append("message", new Buffer(obj), {
          filename: "message.mime",
          contentType: "message/rfc822",
          knownLength: obj.length
        });
      }
    } else if (obj instanceof Readable) {
      this.form.append("message", obj);
    }
  }

  handleAttachmentObject(key: string, obj: any) {
    if (!this.form) this.form = new FormData();

    if (Buffer.isBuffer(obj)) {
      debug("appending buffer to form data. key: %s", key);
      this.form.append(key, obj, {
        filename: "file"
      });
    } else if (typeof obj === "string") {
      debug("appending stream to form data. key: %s obj: %s", key, obj);
      this.form.append(key, fs.createReadStream(obj));
    } else if (typeof obj === "object" && obj.readable === true) {
      debug(
        "appending readable stream to form data. key: %s obj: %s",
        key,
        obj
      );
      this.form.append(key, obj);
    } else if (typeof obj === "object" && obj instanceof Attachment) {
      const attachmentType = obj.getType();
      if (attachmentType === "path") {
        debug(
          "appending attachment stream to form data. key: %s data: %s filename: %s",
          key,
          obj.data,
          obj.filename
        );
        this.form.append(key, fs.createReadStream(obj.data), {
          filename: obj.filename || "attached file"
        });
      } else if (attachmentType === "buffer") {
        debug(
          "appending attachment buffer to form data. key: %s filename: %s",
          key,
          obj.filename
        );
        const formOpts: KeyValuePair = {
          filename: obj.filename || "attached file"
        };

        if (obj.contentType) {
          formOpts.contentType = obj.contentType;
        }

        if (obj.knownLength) {
          formOpts.knownLength = obj.knownLength;
        }

        this.form.append(key, obj.data, formOpts);
      } else if (attachmentType === "stream") {
        if (obj.knownLength && obj.contentType) {
          debug(
            "appending attachment stream to form data. key: %s filename: %s",
            key,
            obj.filename
          );

          this.form.append(key, obj.data, {
            filename: obj.filename || "attached file",
            contentType: obj.contentType,
            knownLength: obj.knownLength
          });
        } else {
          debug(
            "missing content type or length for attachment stream. key: %s",
            key
          );
        }
      }
    } else {
      debug("unknown attachment type. key: %s", key);
    }
  }

  handleResponse(res: http.ClientResponse) {
    let chunks = "";
    let error: any;

    res.on("data", chunk => {
      chunks += chunk;
    });

    res.on("error", (err: string) => {
      error = err;
    });

    res.on("end", () => {
      let body;

      debug(
        "response status code: %s content type: %s error: %s",
        res.statusCode,
        res.headers["content-type"],
        error
      );

      // FIXME: An ugly hack to overcome invalid response type in mailgun api (see http://bit.ly/1eF30fU).
      // We skip content-type validation for "campaigns" endpoint assuming it is JSON.
      const unsafeRes = res as any;
      const skipContentTypeCheck =
        unsafeRes.req &&
        unsafeRes.req.path &&
        unsafeRes.req.path.match(/\/campaigns/);
      const isJSON =
        res.headers["content-type"] &&
        res.headers["content-type"].indexOf("application/json") >= 0;

      if (chunks && !error && (skipContentTypeCheck || isJSON)) {
        try {
          body = JSON.parse(chunks);
        } catch (e) {
          error = e;
        }
      }

      if (process.env.DEBUG_MAILGUN_FORCE_RETRY) {
        error = new Error("Force retry error");
        delete process.env.DEBUG_MAILGUN_FORCE_RETRY;
      }

      if (!error && res.statusCode !== 200) {
        const msg = body
          ? body.message || body.response
          : body || chunks || res.statusMessage;
        error = new Error(msg);
        error.statusCode = res.statusCode;
      }

      return this.callback(error, body);
    });
  }

  performRequest(options: RequestOptions) {
    const method = options.method;

    if (
      this.form &&
      (method === "POST" || method === "PUT" || method === "PATCH")
    ) {
      this.form.submit(options, (err: string, res: any) => {
        if (err) {
          return this.callback(err);
        }

        return this.handleResponse(res);
      });
    } else {
      let req: http.ClientRequest;

      if (options.protocol === "http:") {
        req = http.request(options, res => {
          return this.handleResponse(res);
        });
      } else {
        req = https.request(options, res => {
          return this.handleResponse(res);
        });
      }

      if (options.timeout) {
        req.setTimeout(options.timeout, function() {
          // timeout occurs
          req.abort();
        });
      }

      req.on("error", e => {
        return this.callback(e);
      });

      if (
        this.payload &&
        (method === "POST" || method === "PUT" || method === "PATCH")
      ) {
        req.write(this.payload);
      }

      req.end();
    }
  }
}

function getDataValue(key: string, input: any) {
  if (isSpecialParam(key) && typeof input === "object") {
    return JSON.stringify(input);
  } else if (typeof input === "number" || typeof input === "boolean") {
    return input.toString();
  } else {
    return input;
  }
}

function isSpecialParam(paramKey: string) {
  const key = paramKey.toLowerCase();
  return (
    key === "vars" ||
    key === "members" ||
    key === "recipient-variables" ||
    key.indexOf("v:") === 0
  );
}

function noop() {}

function isOk(i: any) {
  return typeof i !== "undefined" && i !== undefined;
}
