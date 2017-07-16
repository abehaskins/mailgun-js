import * as inflection from "inflection";
import * as pathProxy from "path-proxy";
import { API } from "./api";

const promisifyCall = require("promisify-call");

class Builder {
  baseObj: API;
  resources: any;

  constructor(baseObj, resources) {
    this.baseObj = baseObj;
    this.resources = resources;
  }

  build() {
    Object.keys(this.resources).forEach(key => {
      // console.log("building " + key);
      this.buildResource(this.resources[key]);
    });
  }

  buildResource(resource) {
    resource.links.forEach(this.buildAction, this);
  }

  buildAction(action) {
    const actionName = action.title;
    const properties = action.properties;
    const requiredProps = action.required;

    // HACKY special case for members bulk add and send MIME endpoints
    const path = action.href.replace(/\.json/gi, "").replace(/\.mime/gi, "");
    const constructor = pathProxy.pathProxy(this.baseObj, path);

    function impl(data, fn) {
      let requestPath = action.href;
      const pathParams = action.href.match(/{[^}]+}/g) || [];

      if (typeof data === "function") {
        fn = data;
        data = undefined;
      }

      let err;

      if (this.params.length !== pathParams.length) {
        err = new Error(
          "Invalid number of params in path (expected " +
            pathParams.length +
            ", got " +
            this.params.length +
            ")."
        );
        return fn(err);
      }

      this.params.forEach(function(param) {
        requestPath = requestPath.replace(/{[^}]+}/, param);
      });

      // check required payload properties
      if (requiredProps && requiredProps.length > 0) {
        if (!data) {
          err = new Error("Missing parameters.");
        } else {
          for (let i = 0; i < requiredProps.length; i++) {
            const prop = requiredProps[i];
            if (typeof data[prop] === "undefined") {
              err = new Error(`Missing parameter '${prop}'`);
              break;
            }
          }
        }
      }

      if (err) {
        return fn(err);
      }

      // check payload property types
      for (const key in properties) {
        if (data && data[key]) {
          const type = properties[key].type;
          const dataType = Array.isArray(data[key])
            ? "array"
            : typeof data[key];
          if (Array.isArray(type)) {
            if (type.indexOf(dataType) === -1) {
              err = new Error(
                "Invalid parameter type. " +
                  key +
                  " must be of type: " +
                  type +
                  "."
              );
              break;
            }
          } else if (dataType !== type) {
            err = new Error(
              "Invalid parameter type. " +
                key +
                " must be of type: " +
                type +
                "."
            );
            break;
          }
        }
      }

      if (err) {
        return fn(err);
      }

      this.client = this.base;
      return this.client.request(action.method, requestPath, data, fn);
    }

    constructor.prototype[getName(actionName)] = function(data, fn) {
      return promisifyCall(this, impl, data, fn);
    };
  }
}

function getName(name) {
  name = name.toLowerCase();
  name = inflection.dasherize(name).replace(/-/g, "_");
  name = inflection.camelize(name, true);

  return name;
}

const noop = function() {};

export function build(baseObj, resources) {
  const b = new Builder(baseObj, resources);
  b.build();
}
