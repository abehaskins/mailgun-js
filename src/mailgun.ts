import { MailgunClient } from "./mailgun-client";
import { MailgunClientOptions } from "./types";

export function NewClient(options: MailgunClientOptions): MailgunClient {
  return new MailgunClient(options);
}

/*
  I'll concede this is a hack, but it allows us to support the traditional
  `require("mailgun-js")(opts)` flow while also allowing a more typescript
  friendly `import {GetMailgunClient} from "mailgun-js"; GetMailgunClient(opts)`
*/
NewClient["NewClient"] = NewClient;

module.exports = NewClient;
