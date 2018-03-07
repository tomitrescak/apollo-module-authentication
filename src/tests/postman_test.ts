import * as assert from 'power-assert';
import { default as PostmanType } from '../postman';
import { PostmanOptions } from '../postman_shared';
import * as proxyquire from 'proxyquire';
import * as sinon from 'sinon';

const transportMailSpy = sinon.spy();
const createTransportSpy = sinon.spy(() => ({
  sendMail: transportMailSpy
}));

const MailerStub: any = {
  createTransport: createTransportSpy
};

const Postman = proxyquire('../postman', { 'nodemailer': MailerStub }).default;

describe('Postman', function () {
  describe('Mail Templates', function () {
    let postman: PostmanType;

    beforeEach(() => {
      postman = new Postman();
    });

    const mailoptions: PostmanOptions = {
      defaultFrom: 'Me',
      defaultTo: 'To'
    };

    it('allows you to set default options', () => {
      postman.mailOptions = mailoptions;

      const options = postman.mailOptions;

      assert.notEqual(options.resetPassword, null);
      assert.notEqual(options.verification, null);
      assert.equal(options.defaultFrom, mailoptions.defaultFrom);
      assert.equal(options.defaultTo, mailoptions.defaultTo);
    });

    it('creates a new reset email with default template values', () => {
      const mail = postman.mailTemplates.resetPassword({});
      const options = postman.mailOptions;

      assert.equal(mail.from, null);
      assert.equal(mail.to, null);
      assert.equal(mail.subject, options.resetPassword.subject);
      assert.equal(mail.text, options.resetPassword.text);
      assert.equal(mail.html, options.resetPassword.html);
    });

    it('creates a new verification email with default template values', () => {
      const mail = postman.mailTemplates.sendVerification({});
      const options = postman.mailOptions;

      assert.equal(mail.from, null);
      assert.equal(mail.to, null);
      assert.equal(mail.subject, options.verification.subject);
      assert.equal(mail.text, options.verification.text);
      assert.equal(mail.html, options.verification.html);
    });

    it('creates a new reset email and replaces template values', () => {
      postman.mailOptions.resetPassword.text = '${fromName} ${toName} ${url}';
      const mail = postman.mailTemplates.resetPassword({ fromName: 'FromName', toName: 'ToName', url: 'MyUrl' });

      assert.equal(mail.text, 'FromName ToName MyUrl');
    });

    it('creates a new verisifcation email and replaces template values', () => {
      postman.mailOptions.verification.text = '${fromName} ${toName} ${url}';
      const mail = postman.mailTemplates.sendVerification({ fromName: 'FromName', toName: 'ToName', url: 'MyUrl' });

      assert.equal(mail.text, 'FromName ToName MyUrl');
    });

    it('throws exception when sender or receiver is not specified', async () => {
      let thrown: string;
      try {
        await postman.sendMail({});
      } catch (ex) {
        thrown = ex.message;
      }
      assert.equal(thrown, 'Please specify sender!');

      try {
        await postman.sendMail({ from: 'Me' });
      } catch (ex) {
        thrown = ex.message;
      }
      assert.equal(thrown, 'Please specify receiver!');
    });

    it('checks for missing MAIL URL and throws excpetion if not initialised', async () => {
      delete (process.env.MAIL_URL);
      let thrown: string;
      try {
        await postman.sendMail({ from: 'Me', to: 'You' });
      } catch (ex) {
        thrown = ex.message;
      }
      assert.equal(thrown, 'You need to set environment variable: MAIL_URL');
    });

    it('initialises transporter', async () => {
      process.env.MAIL_URL = 'Set';
      const options = { from: 'Me', to: 'You' };
      await postman.sendMail(options);
      assert(createTransportSpy.calledWithExactly(process.env.MAIL_URL));
      assert(transportMailSpy.calledWithExactly(options));
    });

    it('sends reset password with restPassword mail options', async () => {
      process.env.MAIL_URL = 'Set';
      const options = { from: 'Me', to: 'You' };

      const sendMailSpy = sinon.spy(postman, 'sendMail');
      const mailTemplateSpy = sinon.spy(postman.mailTemplates, 'resetPassword');

      await postman.sendResetPassword(options);

      assert(sendMailSpy.calledOnce);
      assert(mailTemplateSpy.calledOnce);
      assert(mailTemplateSpy.calledWithExactly(options));
    });

    it('sends verification with verification mail options', async () => {
      process.env.MAIL_URL = 'Set';
      const options = { from: 'tomi@tomi.com', to: 'tomi@tomi.com' };

      const sendMailSpy = sinon.spy(postman, 'sendMail');
      const mailTemplateSpy = sinon.spy(postman.mailTemplates, 'sendVerification');

      await postman.sendVerification(options);

      assert(sendMailSpy.calledOnce);
      assert(mailTemplateSpy.calledOnce);
      assert(mailTemplateSpy.calledWithExactly(options));
    });

    it('uses real postman to send mail but fail on login info', async () => {
      process.env.MAIL_URL = 'smtps://unknown:user@smtp.gmail.com';
      const postman_real = new PostmanType();
      const options = { from: 'tomi@tomi.com', to: 'tomi@tomi.com' };

      const sendMailSpy = sinon.spy(postman, 'sendMail');
      const mailTemplateSpy = sinon.spy(postman.mailTemplates, 'sendVerification');

      try {
        await postman_real.sendVerification(options);
      } catch (ex) {
        assert(ex.message.match(/Invalid login/));
      }
    });

  });
});
