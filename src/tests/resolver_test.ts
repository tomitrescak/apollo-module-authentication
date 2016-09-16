import * as sinon from 'sinon';
import * as assert from 'power-assert';

import * as resolver from '../resolvers';
import User from '../authentication';

const context: any = {
  user: new User(null),
  userId: '1'
};

const loginUser = {
  email: 'foo@bar.com',
  password: '123',
  profile: {}
};

describe('resolvers', () => {
  describe('modifyOptions', () => {
    it('modifes context', () => {
      const headers = { authorization: 'TOKEN' };
      const modifyContextStub = sinon.stub(context.user, 'modifyContext');
      resolver.modifyOptions(
        { headers },
        { context });

      assert(modifyContextStub.calledWithExactly(headers.authorization, context));
    });
  });

  // stub

  const services = {
    password: {
      bcrypt: 'qwe'
    },
    email: {}
  };

  const user: any = {
    _id: '1',
    createdAt: new Date(),
    emails: <any[]>[],
    services: [services],
    profile: {},
    roles: ['role']
  };

  describe('resolvers', () => {
    it('resolves User', () => {
      assert.equal(resolver.resolvers.User.emails(user), user.emails);
      assert.equal(resolver.resolvers.User.services(user), user.services);
      assert.equal(resolver.resolvers.User.profile(user), user.profile);
    });

    it('resolves AccountServices', () => {
      assert.equal(resolver.resolvers.AccountServices.password(services), services.password);
    });

    it('resolves Token', () => {
      const token: any = {
        user: {}
      };
      assert.equal(resolver.resolvers.Token.user(token), token.user);
    });
  });


  describe('queries', () => {
    it('user: returns user', sinon.test(function () {
      const stub = this.stub(context.user, 'findOne');
      resolver.queries.user(user, { id: '1' }, context);
      sinon.assert.calledWithExactly(stub, { _id: '1' });
    }));

    it('users: returns user from context', sinon.test(function () {
      const stub = this.stub(context.user, 'findOne');
      resolver.queries.user(user, {}, context);
      sinon.assert.calledWithExactly(stub, { _id: '1' });
    }));

    it('users: returns users', sinon.test(function () {
      const stub = this.stub(context.user, 'find');
      resolver.queries.users(user, { id: '1' }, context);
      sinon.assert.calledOnce(stub);
    }));

    it('cachedUser: returns cached usesr', sinon.test(function () {
      const stub = this.stub(context.user, 'findManyCached');
      resolver.queries.cachedUsers(user, { id: '1' }, context);
      sinon.assert.calledOnce(stub);
    }));
  });

  describe('mutations', () => {
    it('createAccount', sinon.test(function () {
      const stub = this.stub(context.user, 'create');
      resolver.mutations.createAccount(null, { user: loginUser }, context);
      sinon.assert.calledWithExactly(stub, null, loginUser.email, loginUser.password, loginUser.profile);
    }));

    it('createAccountAndLogin', async () => {
      const createStub = sinon.stub(context.user, 'create');
      const loginStub = sinon.stub(context.user, 'login');

      await resolver.mutations.createAccountAndLogin(null, { user: loginUser }, context);

      sinon.assert.calledWithExactly(createStub, null, loginUser.email, loginUser.password, loginUser.profile);
      sinon.assert.calledWithExactly(loginStub, loginUser.email, loginUser.password);

      createStub.restore();
      loginStub.restore();
    });

    it('loginWithPassword', sinon.test(function () {
      const stub = this.stub(context.user, 'login').returns(1);
      const result = resolver.mutations.loginWithPassword(null, { user: loginUser }, context);

      // check the call and the return value
      sinon.assert.alwaysCalledWithExactly(stub, loginUser.email, loginUser.password);
      assert.equal(1, result);
    }));

    it('requestResendVerification', sinon.test(function () {
      const stub = this.stub(context.user, 'requestVerification').returns(1);
      const result = resolver.mutations.requestResendVerification(null, { email: loginUser.email }, context);
      sinon.assert.calledWithExactly(stub, loginUser.email);
      assert.equal(1, result);
    }));

    it('requestResetPassword', sinon.test(function () {
      const stub = this.stub(context.user, 'requestResetPassword').returns(1);
      const result = resolver.mutations.requestResetPassword(null, { email: loginUser.email }, context);
      sinon.assert.calledWithExactly(stub, loginUser.email);
      assert.equal(1, result);
    }));

    it('verify', sinon.test(function () {
      const stub = this.stub(context.user, 'verify').returns(1);
      const result = resolver.mutations.verify(null, { token: 'token' }, context);
      sinon.assert.calledWithExactly(stub, 'token');
      assert.equal(1, result);
    }));

    it('resume', sinon.test(function () {
      const stub = this.stub(context.user, 'resume').returns(1);
      const result = resolver.mutations.resume(null, { token: 'token' }, context);
      sinon.assert.calledWithExactly(stub, 'token');
      assert.equal(1, result);
    }));

    it('resetPassword', sinon.test(function () {
      const stub = this.stub(context.user, 'resetPassword').returns(1);
      const result = resolver.mutations.resetPassword(null, { token: 'token', password: 'password' }, context);
      sinon.assert.calledWithExactly(stub, 'token', 'password');
      assert.equal(1, result);
    }));

  });
});
