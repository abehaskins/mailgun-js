
import {MailgunClient} from "../src/mailgun-client";
import {MailgunClientOptions} from '../src/types';

declare module "mailgun-js" {
    export class Mailgun extends MailgunClient {
        messages(): Message;
        domains(): Domain;
        credentials(): Credentials;
        complaints(): Complaints;
        unsubscribes(): Unsubscribes;
        bounces(): Bounces;
        routes(): Routes;
        list(): List;
        members(): Members;
        campaign(): Campaign;
        stats(): Stats;
        tags(): Tags;
        events(): Events;
    }

    function NewClient(opts: MailgunClientOptions): Mailgun;
}


declare class Message {
   info(opts: {MIME?: boolean}, callback: Function): any;
   send(opts: {from: string}, callback: Function): any;
   sendMime(opts: {message?: string,object}, callback: Function): any;
   delete(callback: Function): any;
}

declare class Domain {
   list(opts: {limit?: number, skip?: number}, callback: Function): any;
   info(callback: Function): any;
   create(opts: {name: string, smtp_password: string, wildcard?: boolean}, callback: Function): any;
   delete(callback: Function): any;
}

declare class Credentials {
   list(opts: {limit?: number, skip?: number}, callback: Function): any;
   create(opts: {login: string, password: string}, callback: Function): any;
   update(opts: {password: string}, callback: Function): any;
   delete(callback: Function): any;
}

declare class Complaints {
   list(opts: {limit?: number, skip?: number}, callback: Function): any;
   create(opts: {address: string}, callback: Function): any;
   info(callback: Function): any;
   delete(callback: Function): any;
}

declare class Unsubscribes {
   list(opts: {limit?: number, skip?: number}, callback: Function): any;
   info(callback: Function): any;
   delete(callback: Function): any;
   create(opts: {address: string, tag: string}, callback: Function): any;
}

declare class Bounces {
   list(opts: {limit?: number, skip?: number}, callback: Function): any;
   info(callback: Function): any;
   delete(callback: Function): any;
   create(opts: {address: string, code?: number, error?: string}, callback: Function): any;
}

declare class Routes {
   list(opts: {limit?: number, skip?: number}, callback: Function): any;
   info(callback: Function): any;
   create(opts: {limit?: undefined, description?: string, expression: string}, callback: Function): any;
   update(opts: {limit?: undefined, description?: string, expression?: string}, callback: Function): any;
   delete(callback: Function): any;
}

declare class List {
   list(opts: {address?: string, limit?: number, skip?: number}, callback: Function): any;
   info(callback: Function): any;
   create(opts: {address: string, name?: string, description?: string, access_level?: string}, callback: Function): any;
   update(opts: {address?: string, name?: string, description?: string, access_level?: string}, callback: Function): any;
   delete(callback: Function): any;
}

declare class Members {
   list(opts: {subscribed?: boolean, limit?: number, skip?: number}, callback: Function): any;
   page(opts: {subscribed?: boolean, limit?: number, page?: string, address?: string}, callback: Function): any;
   info(callback: Function): any;
   create(opts: {address: string, name?: string, vars?: object, subscribed?: boolean, upsert?: string}, callback: Function): any;
   add(opts: {members: any[], upsert?: boolean}, callback: Function): any;
   update(opts: {address?: string, name?: string, vars?: object, subscribed?: string}, callback: Function): any;
   delete(callback: Function): any;
}

declare class Campaign {
   create(opts: {id?: string, name: string}, callback: Function): any;
   list(opts: {limit?: number, skip?: number}, callback: Function): any;
   info(callback: Function): any;
   update(opts: {id?: string, name?: string}, callback: Function): any;
   delete(callback: Function): any;
}

declare class Stats {
   list(opts: {limit?: number, skip?: number, startDate?: string}, callback: Function): any;
}

declare class Tags {
   list(callback: Function): any;
   info(callback: Function): any;
   delete(callback: Function): any;
}

declare class Events {
   get(opts: {begin?: string, end?: string, ascending?: string, limit?: number, pretty?: string}, callback: Function): any;
}
