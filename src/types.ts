export interface MailgunClientOptions {
  apiKey: string;
  domain: string;
  timeout?: number;
  publicApiKey?: string;
  auth?: string;
  mute?: boolean;
  host?: string;
  endpoint?: string;
  protocol?: string;
  port?: number;
  retry?: number;
  proxy?: string;
}
