import { API } from "./api";
import { APIOptions } from "./types";

module.exports = function(options: APIOptions) {
  return new API(options);
};
