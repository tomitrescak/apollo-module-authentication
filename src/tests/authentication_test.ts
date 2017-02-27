import * as assert from 'power-assert';
import * as sinon from 'sinon';
import { MongoClient, Db } from 'mongodb';

import User, { UserEntity } from '../authentication';
import config from '../config';

const host = process.env.MONGODB_HOST || '127.0.0.1';
const port = process.env.MONGODB_PORT || 27017;
const startDate = new Date();

async function assertThrowAsync(func: any, error: string) {
  let message = '';
  try {
    await func();
  } catch (ex) {
    message = ex.message;
  }
  assert.equal(message, error);
}

describe('entity', () => {
  let db: Db = null;
  let user: User<UserEntity>;
  let insertedUser: UserEntity;

  const connector: any = {
    collection(name: string) { return db.collection(name); }
  };

  // connecto to database
  before(async function () {
    process.env.ROOT_URL = 'URL';
    const name = 'tmp' + Math.floor(Math.random() * 10000);
    db = await MongoClient.connect(`mongodb://${host}:${port}/${name}`);
    global.db = db;

    // // delete other
    // const dbs = await db.admin().listDatabases();
    // dbs.databases.forEach((tdb: any) => {
    //   if (tdb.name.substring(0, 3) === 'tmp') {
    //     MongoClient.connect(`mongodb://${host}:${port}/${tdb.name}`, function (err, cdb) {
    //       cdb.dropDatabase();
    //       cdb.close();
    //     });
    //   }
    // });
  });

  // close the connection
  after(async () => {
    delete (process.env.ROOT_URL);
    await db.dropDatabase();
    await db.close();
  });

  const userDetails = {
    _id: '1',
    username: 'tomi',
    email: 'email',
    password: '123',
    profile: {
      name: 'Tomi'
    },
    roles: ['tutor']
  };

  beforeEach(async () => {
    user = new User(connector);
    insertedUser = await user.create(userDetails.username, userDetails.email, userDetails.password, userDetails.profile);
  });

  afterEach(async () => {
    // remove user
    await user.collection.remove({ _id: insertedUser._id });
  });

  it('create: can create a new user', async () => {
    assert(insertedUser);

    // user and email need to be specified
    assertThrowAsync(
      () => user.create(null, null, null, null),
      'Need to set a username or email');

    assertThrowAsync(
      () => user.create('A', null, null, null),
      'Need to set a username or email');

    assertThrowAsync(
      () => user.create('A', 'B', null, null),
      'Need to set a username or email');

    const users = await user.find({}).toArray();
    assert.equal(users.length, 1);

    const newUser = await user.collection.findOne({ _id: insertedUser._id });
    assert.equal(newUser.emails[0].address, userDetails.email);
    assert.deepEqual(newUser.profile, userDetails.profile);
    assert(newUser.createdAt >= startDate);

    const a = () => user.create(userDetails.username, userDetails.email, userDetails.password, userDetails.profile);
    await assertThrowAsync(a, 'User with this email already exists!');
  });

  it('login: can login and throw errors upon unsuccessfull login', async () => {
    // non existent user
    await assertThrowAsync(() => user.login('a', 'b'), 'User with \'a\' address not found!');

    // incorrect password
    await assertThrowAsync(() => user.login(userDetails.email, 'b'), 'Invalid credentials!');

    // verification failed  
    config.requireVerification = true;
    await assertThrowAsync(() => user.login(userDetails.email, userDetails.password), 'Email not verified!');

    const date = new Date();
    date.setDate(date.getDate() + 7);

    // correct login
    config.requireVerification = false;
    const token = await user.login(userDetails.email, userDetails.password);

    // token expires in 7 days
    assert(token.expires >= date);
    assert(token.hashedToken);

    // compare user
    assert.equal(token.user._id, insertedUser._id);
    assert.equal(token.user.roles, insertedUser.roles);
    assert.deepEqual(token.user.profile, insertedUser.profile);
  });

  it('sendEmailToUser: sends email to user with a token', async () => {
    const originalTransporter = user.postman.transporter;
    const transporter = {
      sendMail: sinon.spy()
    };
    user.postman.transporter = transporter;

    const type = 'type1';
    const to = userDetails.email;
    const template = sinon.spy(() => ({
      from: 'me',
      to
    }));

    const tokenSpy = sinon.spy(user, 'createToken');

    // try sending mail to nonexistent user
    assertThrowAsync(
      () => user.sendEmailToUser('Non existent', type, template),
      'User email does not exist');

    // execute
    await user.sendEmailToUser(userDetails.email, type, template);

    // we check if token was called correctly
    tokenSpy.calledWith(type, 1, 'you');

    // check if url is created correctly
    const token = tokenSpy.returnValues[0].hashedToken;
    const url = `${process.env.ROOT_URL}?${type}=${token}`;
    assert.deepEqual(template.args[0][0], { url, to });

    // we check if email was sent with correct parameters
    assert(transporter.sendMail.calledOnce);

    // cleanup
    user.postman.transporter = originalTransporter;
  });

  it('requestification: sends mail with verification', () => {
    const stub = sinon.stub(user, 'sendEmailToUser');
    user.requestVerification('email');
    assert(stub.calledWith('email', 'verifyEmail', sinon.match.func));
    stub.restore();
  });


  it('requestResetPassword: sends mail with reset password instructions', () => {
    const stub = sinon.stub(user, 'sendEmailToUser');
    user.requestResetPassword('email');
    assert(stub.calledWith('email', 'resetPassword', sinon.match.func));
    stub.restore();
  });

  it('modifyContext: inserts user info from the correct token into context', async () => {
    const loginUser = insertedUser;

    const token = user.createToken(loginUser, 'resume', 1);
    const context: any = { connector };

    // bad token
    const badToken = token.hashedToken + '123';
    await user.modifyContext(badToken, context);
    assert.equal(context.userId, null);

    // incorrect token (non resume)
    const verifyToken = user.createToken(loginUser, 'verify', 1).hashedToken;
    await user.modifyContext(verifyToken, context);
    assert.deepEqual(context.userId, null);

    // good token

    await user.modifyContext(token.hashedToken, context);

    assert.equal(context.userId, loginUser._id);
    assert.deepEqual(context.user, loginUser);
    assert(context.users);

    // checks for connector
    const badContext = {};
    await assertThrowAsync(() => user.modifyContext(token.hashedToken, badContext), 'Expected connector in the context!');
  });

  it('verify: verifies received token', async () => {
    // refuses with non existent user
    let baduser = Object.assign({}, insertedUser, { _id: '1000' });
    let verifyToken = user.createToken(baduser, 'verifyEmail', 1).hashedToken;

    await assertThrowAsync(() => user.verify(verifyToken), 'User does not exist!');

    // incorrect token (non verifyEmail)
    verifyToken = user.createToken(insertedUser, 'resume', 1).hashedToken;
    await assertThrowAsync(() => user.verify(verifyToken), 'This is not a verify email token');

    // invalid token
    verifyToken = user.createToken(insertedUser, 'verify', 1).hashedToken + '123';
    await assertThrowAsync(() => user.verify(verifyToken), 'invalid signature');

    // check that token expires 7 days from now
    const date = new Date();
    date.setDate(date.getDate() + 7);

    // check if user has been verified
    verifyToken = user.createToken(insertedUser, 'verifyEmail', 1, insertedUser.emails[0].address).hashedToken;
    const token = await user.verify(verifyToken);

    const verifiedUser = await user.findOneCachedById(insertedUser._id);
    assert(verifiedUser.emails[0].verified);

    assert(token.expires >= date);
  });

  it('resume: creates a resume token to continue the session', async () => {
    // refuses with non existent user
    let baduser = Object.assign({}, insertedUser, { _id: '1000' });
    let verifyToken = user.createToken(baduser, 'resume', 1).hashedToken;

    await assertThrowAsync(() => user.resume(verifyToken), 'User does not exist!');

    // incorrect token (non verifyEmail)
    verifyToken = user.createToken(insertedUser, 'verifyEmail', 1).hashedToken;
    await assertThrowAsync(() => user.resume(verifyToken), 'This is not a resume token');

    // invalid token
    verifyToken = user.createToken(insertedUser, 'resume', 1).hashedToken + '123';
    await assertThrowAsync(() => user.resume(verifyToken), 'invalid signature');

    // check that token expires 7 days from now
    const date = new Date();
    date.setDate(date.getDate() + 7);

    // check if user has been verified
    verifyToken = user.createToken(insertedUser, 'resume', 1).hashedToken;
    const token = await user.resume(verifyToken);

    assert(token.expires >= date);
  });

  it('resetPassword: create a new password if token is correct', async () => {
    const password = '567';
    let baduser = Object.assign({}, insertedUser, { _id: '1000' });
    let verifyToken = user.createToken(baduser, 'resetPassword', 1).hashedToken;

    await assertThrowAsync(() => user.resetPassword(verifyToken, password), 'User does not exist!');

    // incorrect token (non verifyEmail)
    verifyToken = user.createToken(insertedUser, 'verifyEmail', 1).hashedToken;
    await assertThrowAsync(() => user.resetPassword(verifyToken, password), 'This is not a reset token');

    // invalid token
    verifyToken = user.createToken(insertedUser, 'resetPassword', 1).hashedToken + '123';
    await assertThrowAsync(() => user.resetPassword(verifyToken, password), 'invalid signature');

    // check that token expires 7 days from now
    const date = new Date();
    date.setDate(date.getDate() + 7);

    // spy on hashing function to obtain the password hashedPassword
    const hashSpy = sinon.spy(user, 'hashPassword');

    verifyToken = user.createToken(insertedUser, 'resetPassword', 1).hashedToken;
    const token = await user.resetPassword(verifyToken, password);

    // check that passwords Math
    const modifiedUser = await user.findOneCachedById(insertedUser._id);

    // check that passwords match
    assert.equal(modifiedUser.services.password.bcrypt, hashSpy.returnValues[0]);

    // check that token expires 7 days from now
    assert(token.expires >= date);
  });
});
