import { SendMailOptions } from 'nodemailer';

export interface PostmanOptions {
  defaultFrom?: string;
  defaultTo?: string;
  resetPassword?: {
    subject?: string;
    text?: string;
    html?: string;
  };

  verification?: {
    subject?: string;
    text?: string;
    html?: string;
  };
}

export interface PostmanMailOptions extends SendMailOptions {
  fromName?: string;
  toName?: string;
  url?: string;
}
