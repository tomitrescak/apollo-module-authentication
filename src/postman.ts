import { SendMailOptions } from 'nodemailer';
import nodemailer from 'nodemailer';

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
};

export interface PostmanMailOptions extends SendMailOptions {
  fromName?: string;
  toName?: string;
  url?: string;
}

export class MailTemplates {
  defaultOptions: PostmanOptions;

  constructor(defaultOptions: PostmanOptions) {
    this.defaultOptions = defaultOptions;
  }

  substitute(text: string, options: PostmanMailOptions) {
    if (!text) { return text; };
    if (options.fromName) {
      text = text.replace(/\$\{fromName\}/g, options.fromName);
    }
    if (options.toName) {
      text = text.replace(/\$\{toName\}/g, options.toName);
    }
    if (options.url) {
      text = text.replace(/\$\{url\}/g, options.url);
    }
    return text;
  }

  resetPassword(options: PostmanMailOptions): SendMailOptions {
    return {
      from: options.from ? options.from : this.defaultOptions.defaultFrom,
      to: options.to ? options.to : this.defaultOptions.defaultTo,
      subject: this.defaultOptions.resetPassword.subject,
      text: this.substitute(this.defaultOptions.resetPassword.text, options),
      html: this.substitute(this.defaultOptions.resetPassword.html, options)
    };
  }

  sendVerification(options: PostmanMailOptions): SendMailOptions {
    return {
      from: options.from ? options.from : this.defaultOptions.defaultFrom,
      to: options.to ? options.to : this.defaultOptions.defaultTo,
      subject: this.defaultOptions.verification.subject,
      text: this.substitute(this.defaultOptions.verification.text, options),
      html: this.substitute(this.defaultOptions.verification.html, options)
    };
  }
};


export default class Postman {
  public transporter: any = null;
  public mailTemplates: MailTemplates;

  // setup e-mail data with unicode symbols
  private _defaultMailOptions: PostmanOptions = {
    resetPassword: {
      subject: `Reset password`,
      text: `Dear User

To reset your password, simply click the link below.

\${url}

Thanks.

`},
    verification: {
      subject: 'Verify account',
      text: `Dear User

To verify your account, simply click the link below.

\${url}

Thanks.

`
    }
  };

  constructor() {
    this.mailTemplates = new MailTemplates(this.mailOptions);
  }

  get mailOptions() {
    return this._defaultMailOptions;
  }

  set mailOptions(options: PostmanOptions) {
    if (options) {
      this._defaultMailOptions = Object.assign(this._defaultMailOptions, options);
    }
  };

  // send mail with defined transport object

  async sendVerification(mailOptions: SendMailOptions) {
    await this.sendMail(this.mailTemplates.sendVerification(mailOptions));
  }

  async sendResetPassword(mailOptions: SendMailOptions) {
    await this.sendMail(this.mailTemplates.resetPassword(mailOptions));
  }

  async sendMail(mailOptions: SendMailOptions) {
    if (!mailOptions.from && !this.mailOptions.defaultFrom) {
      throw new Error('Please specify sender!');
    }

    if (!mailOptions.to && !this.mailOptions.defaultFrom) {
      throw new Error('Please specify receiver!');
    }

    if (!this.transporter) {
      if (!process.env.MAIL_URL) {
        throw new Error('You need to set environment variable: MAIL_URL');
      } else {
        console.log('Mail URL: ' + process.env.MAIL_URL);
      }
      this.transporter = nodemailer.createTransport(process.env.MAIL_URL);
    }
    return await this.transporter.sendMail(mailOptions);
  }
}

