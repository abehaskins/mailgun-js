"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tsscmp = require("tsscmp");
const crypto = require("crypto");
const attachment_1 = require("./attachment");
const request_1 = require("./request");
const build_1 = require("./build");
const schema_1 = require("./schema");
const mailgunExpirey = 15 * 60 * 1000;
const mailgunHashType = "sha256";
const mailgunSignatureEncoding = "hex";
class MailgunClient {
    constructor(options) {
        this.Mailgun = MailgunClient;
        this.Attachment = attachment_1.Attachment;
        if (!options.apiKey) {
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
        };
        this.mailgunTokens = {};
    }
    getDomain(method, resource) {
        let d = this.domain;
        // filter out API calls that do not require a domain specified
        if (resource.indexOf("/routes") >= 0 ||
            resource.indexOf("/lists") >= 0 ||
            resource.indexOf("/address") >= 0 ||
            resource.indexOf("/domains") >= 0) {
            d = "";
        }
        else if (resource.indexOf("/messages") >= 0 &&
            (method === "GET" || method === "DELETE")) {
            d = "domains/" + this.domain;
        }
        return d;
    }
    getRequestOptions(resource) {
        let o = this.options;
        // use public API key if we have it for the routes that require it
        if (resource.indexOf("/address") >= 0 && this.publicApiKey) {
            const copy = Object.assign({}, this.options);
            copy.auth = [this.username, this.publicApiKey].join(":");
            o = copy;
        }
        return o;
    }
    request(method, resource, data, fn) {
        let fullpath = resource;
        const domain = this.getDomain(method, resource);
        if (domain) {
            fullpath = "/".concat(domain, resource);
        }
        const req = new request_1.Request(this.options);
        return req.request(method, fullpath, data, fn);
    }
    post(path, data, fn) {
        const req = new request_1.Request(this.options);
        return req.request("POST", path, data, fn);
    }
    get(path, data, fn) {
        const req = new request_1.Request(this.options);
        return req.request("GET", path, data, fn);
    }
    delete(path, data, fn) {
        const req = new request_1.Request(this.options);
        return req.request("DELETE", path, data, fn);
    }
    put(path, data, fn) {
        const req = new request_1.Request(this.options);
        return req.request("PUT", path, data, fn);
    }
    validateWebhook(timestamp, token, signature) {
        const self = this;
        const adjustedTimestamp = parseInt(timestamp, 10) * 1000;
        const fresh = Math.abs(Date.now() - adjustedTimestamp) < mailgunExpirey;
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
        }, mailgunExpirey + 5 * 1000);
        // TODO: Clarify this
        // tokenTimeout.unref();
        clearTimeout(tokenTimeout);
        return tsscmp(signature, crypto
            .createHmac(mailgunHashType, self.apiKey)
            .update(new Buffer(timestamp + token, "utf-8"))
            .digest(mailgunSignatureEncoding));
    }
    validate(address, fn) {
        const resource = `/address/validate`;
        const options = this.getRequestOptions(resource);
        const req = new request_1.Request(options);
        return req.request("GET", resource, { address }, fn);
    }
    parse(addresses, fn) {
        const resource = `/address/parse`;
        const options = this.getRequestOptions(resource);
        const req = new request_1.Request(options);
        return req.request("GET", resource, { addresses }, fn);
    }
}
exports.MailgunClient = MailgunClient;
build_1.build(MailgunClient, schema_1.definitions);
//# sourceMappingURL=mailgun-client.js.map