export interface APIOptions {
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
  proxy: string;
}
