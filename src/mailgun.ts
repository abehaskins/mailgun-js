import * as tsscmp from "tsscmp";
import * as crypto from "crypto";

import * as Attachment from "./attachment";
import * as Request from "./request";
import * as builder from "./build";
import {definitions} from "./schema"

const mailgunExpirey = 15 * 60 * 1000;
const mailgunHashType = "sha256";
const mailgunSignatureEncoding = "hex";

type HTTPMethod = "PUT" | "GET" | "DELETE" | "POST";

interface MailGunOptions {
  apiKey: string;
  publicApiKey: string;
  domain: string;
  timeout: number;
  auth?: string;
  mute?: boolean;
  host?: string;
  endpoint?: string;
  protocol?: string;
  port?: number;
  retry?: number;

  // TODO: Clarify what proxy is
  // Not sure is proxy is a string?
  proxy: string;
}

export class Mailgun {
  username: string;
  apiKey: string;
  publicApiKey: string;
  domain: string;
  auth: string;
  mute: boolean;
  timeout: number;
  host: string;
  endpoint: string;
  protocol: string;
  port: number;
  retry: number;
  proxy: string;
  
  options: MailGunOptions;
  mailgunTokens: { [s: string] : boolean; };

  constructor(options: MailGunOptions) {
    if(!options.apiKey){
      throw new Error("apiKey value must be defined!"); 
    }
    this.username = "api";
    this.apiKey = options.apiKey;
    this.publicApiKey = options.publicApiKey;
    this.domain = options.domain;
    this.auth = [this.username, this.apiKey].join(":");
    this.mute = options.mute || false;
    this.timeout = options.timeout;

    this.host = options.host || "api.mailgun.net";
    this.endpoint = options.endpoint || "/v3";
    this.protocol = options.protocol || "https:";
    this.port = options.port || 443;
    this.retry = options.retry || 1;

    if (options.proxy) {
      this.proxy = options.proxy;
    }

    this.options = {
      host: this.host,
      endpoint: this.endpoint,
      protocol: this.protocol,
      port: this.port,
      auth: this.auth,
      proxy: this.proxy,
      timeout: this.timeout,
      retry: this.retry
    } as MailGunOptions;

    this.mailgunTokens = {};
  }

  getDomain(method: HTTPMethod, resource: string) {
    var d = this.domain;

    //filter out API calls that do not require a domain specified
    if ((resource.indexOf("/routes") >= 0)
      || (resource.indexOf("/lists") >= 0)
      || (resource.indexOf("/address") >= 0)
      || (resource.indexOf("/domains") >= 0 )) {
      d = "";
    }
    else if ((resource.indexOf("/messages") >= 0)
      && (method === "GET" || method === "DELETE")) {
      d = "domains/" + this.domain;
    }

    return d;
  }

  getRequestOptions(resource: string) {
    var o = this.options;

    // use public API key if we have it for the routes that require it
    if (resource.indexOf("/address") >= 0 && this.publicApiKey) {
      var copy = Object.assign({}, this.options);
      copy.auth = [this.username, this.publicApiKey].join(":");
      o = copy;
    }
  
    return o;
  }

  request(method: HTTPMethod, resource: string, data: any, fn: Function) {
    var fullpath = resource;
    var domain = this.getDomain(method, resource);
    if (domain) {
      fullpath = "/".concat(domain, resource);
    }

    var req = new Request(this.options);
    return req.request(method, fullpath, data, fn);
  }

  post(path: string, data: any, fn: Function) {
    var req = new Request(this.options);
    return req.request("POST", path, data, fn);
  }

  get(path: string, data: any, fn: Function) {
    var req = new Request(this.options);
    return req.request("GET", path, data, fn);
  }

  delete(path: string, data: any, fn: Function) {
    var req = new Request(this.options);
    return req.request("DELETE", path, data, fn);
  }

  put(path: string, data: any, fn: Function) {
    var req = new Request(this.options);
    return req.request("PUT", path, data, fn);
  }

  validateWebhook(timestamp: string, token: string, signature: string) {
    var self = this;

    var adjustedTimestamp = parseInt(timestamp, 10) * 1000;
    var fresh = (Math.abs(Date.now() - adjustedTimestamp) < mailgunExpirey);

    if (!fresh) {
      if (!this.mute) {
        console.error("[mailgun] Stale Timestamp: this may be an attack");
        console.error("[mailgun] However, this is most likely your fault\n");
        console.error("[mailgun] run `ntpdate ntp.ubuntu.com` and check your system clock\n");
        console.error("[mailgun] System Time: " + new Date().toString());
        console.error("[mailgun] Mailgun Time: " + new Date(adjustedTimestamp).toString(), timestamp);
        console.error("[mailgun] Delta: " + (Date.now() - adjustedTimestamp));
      }
      return false;
    }

    if (this.mailgunTokens[token]) {
      if (!this.mute) {
        console.error("[mailgun] Replay Attack");
      }
      return false;
    }

    this.mailgunTokens[token] = true;

    const tokenTimeout = setTimeout(function () {
      delete self.mailgunTokens[token];
    }, mailgunExpirey + (5 * 1000));
    
    // TODO: Clarify this
    //  tokenTimeout.unref();
    clearTimeout(tokenTimeout);

    return tsscmp(
      signature
      , crypto.createHmac(mailgunHashType, self.apiKey)
        .update(new Buffer(timestamp + token, "utf-8"))
        .digest(mailgunSignatureEncoding)
    );
  }

  validate(address: string, fn, Function) {
    var resource = `/address/validate`;
    var options = this.getRequestOptions(resource);

    var req = new Request(options);
    return req.request("GET", resource, { address }, fn);
  };

  parse(addresses: string[], fn: Function) {
    var resource = `/address/parse`;
    var options = this.getRequestOptions(resource);

    var req = new Request(options);
    return req.request("GET", resource, { addresses }, fn);
  };
};

export default function (options: MailGunOptions) {
  return new Mailgun(options);
};
