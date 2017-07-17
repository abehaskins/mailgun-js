"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mailgun_client_1 = require("./mailgun-client");
function NewClient(options) {
    return new mailgun_client_1.MailgunClient(options);
}
exports.NewClient = NewClient;
/*
  I'll concede this is a hack, but it allows us to support the traditional
  `require("mailgun-js")(opts)` flow while also allowing a more typescript
  friendly `import {GetMailgunClient} from "mailgun-js"; GetMailgunClient(opts)`
*/
NewClient["NewClient"] = NewClient;
module.exports = NewClient;
//# sourceMappingURL=mailgun.js.map