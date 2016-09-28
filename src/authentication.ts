import { MongoEntity, MongoConnector } from 'apollo-connector-mongodb';
import * as Random from 'meteor-random';
import * as bcrypt from 'bcrypt-nodejs';
import * as jwt from 'jsonwebtoken';
import * as sha256 from 'meteor-sha256';

import config from './config';

import Postman from './postman';

export interface Token {
  hashedToken: HashedToken;
  user: User;
  expires: Date;
}

export interface HashedToken {
  userId: string;
  type: string;
  email?: string;
}

// export interface Password = {
//   bcrypt: string;
// }

export interface PasswordService {
  bcrypt: string;
}

export interface EmailService {
  verificationTokens: string;
}

export interface ResumeService {
  loginTokens: HashedToken[];
}

export interface AccountsServices {
  password: PasswordService;
  // email: EmailService;
  // resume: ResumeService;
}

export interface Profile {
  name: string;
}

export interface Email {
  address: string;
  verified: boolean;
}

export interface UserEntity {
  _id: string;
  createdAt: Date;
  services: AccountsServices;
  emails: Email[];
  profile: Profile;
  roles: string[];
}

// helper functions

function calculateHash(text: string): string {
  // let hash = crypto.createHash('sha256');
  // hash.update(text);
  // return hash.digest('base64');
  return sha256(text);
}

function checkPassword(user: UserEntity, password: string) {
  let result: { userId: string, error?: Error } = {
    userId: user._id
  };

  password = calculateHash(password);

  if (!bcrypt.compareSync(password, user.services.password.bcrypt)) {
    result.error = new Error('Incorrect password');
  }
  return result;
};

export default class User extends MongoEntity<UserEntity> {

  static options: {
    sendVerificationMail: boolean
  };

  postman: Postman;
  userLoader: any;

  constructor(connector: MongoConnector) {
    super(connector, 'users');
    this.postman = new Postman();
  }

  async modifyContext(hashedToken: string, context: any) {
    let token: HashedToken;

    // we add user to the context
    if (!context.users) {
      if (!context.connector) {
        throw new Error('Expected connector in the context!');
      }
      context.users = new User(context.connector);
    }

    let verified = false;
    try {
      token = jwt.verify(hashedToken, config.jwtSecret);
      verified = true;
    } catch (err) {
      // console.error(err);
    }

    if (verified && token.type === 'resume') {
      context.userId = token.userId;
      context.user = await context.users.findOneCachedById(context.userId);
    }
  }

  hashPassword(password: string) {
    password = calculateHash(password);
    return bcrypt.hashSync(password, bcrypt.genSaltSync(10));
  };

  createToken(user: UserEntity, type: string, expirationInHours: number, email?: string) {
    // const hashedToken = calculateHash(Random.secret());
    const expires = new Date(new Date().getTime() + expirationInHours * 60 * 60 * 1000);

    const token: HashedToken = {
      userId: user._id,
      type
    };

    if (email) {
      token.email = email;
    }

    const hashedToken = jwt.sign(
      token,
      config.jwtSecret,
      { expiresIn: expirationInHours + 'h' }
    );

    return {
      hashedToken,
      expires,
      user: {
        _id: user._id,
        profile: user.profile,
        roles: user.roles,
        emails: user.emails
      }
    };
  }

  async create(username: string, email: string, password: string, profile: Profile) {
    if (!username && !email || !password) {
      throw new Error('Need to set a username or email');
    }

    let user: any = {
      _id: Random.id(),
      createdAt: new Date(),
      services: {},
      profile: profile
    };
    if (password) {
      let hashed = this.hashPassword(password);
      user.services.password = { bcrypt: hashed };
    }

    if (username) {
      user.username = username;
    }
    if (email) {
      user.emails = [{ address: email, verified: false }];
    }

    const value = await this.collection.findOne({ 'emails.address': email });
    if (value != null) {
      throw new Error('User with this email already exists!');
    }
    await this.collection.insertOne(user);
    return user;
  }

  async login(email: string, password: string) {
    const user = await this.collection.findOne({ 'emails.address': email });

    // possibly there is no user
    if (!user) {
      throw new Error('User with that email address not found!');
    };

    let result = checkPassword(user, password);

    if (result.error) {
      throw new Error('Invalid credentials!');
    }

    // find email and check if it is verified
    if (config.requireVerification) {
      const userEmail = user.emails.find((e) => e.address === email);
      if (!userEmail.verified) {
        throw new Error('Email not verified!');
      }
    }

    return this.createToken(user, 'resume', 168);
  }

  async sendEmailToUser(to: string, type: string, template: Function) {
    const user = await this.collection.findOne({ 'emails.address': to });
    if (!user) {
      throw new Error('User email does not exist');
    }

    let token = this.createToken(user, type, 1, to).hashedToken;

    // create url
    let url = `${process.env.ROOT_URL}?${type}=${token}`;
    let email = template({ url, to });

    return await this.postman.sendMail(email);
  }

  requestVerification(email: string) {
    // insert verification token to database and send email
    return this.sendEmailToUser(email, 'verifyEmail', this.postman.mailTemplates.sendVerification);
  }

  async verify(hashedToken: string) {
    let token: HashedToken;
    try {
      token = jwt.verify(hashedToken, config.jwtSecret);
    } catch (err) {
      throw err;
    }

    if (token.type !== 'verifyEmail') {
      throw new Error('This is not a verify email token');
    }

    // now login
    const user = await this.collection.findOne(({ _id: token.userId }));
    if (!user) {
      throw new Error('User does not exist!');
    }

    const emailIndex = user.emails.findIndex((e) => e.address === token.email);

    // create a new password and update collection
    this.update({ _id: token.userId }, { $set: { ['emails.' + emailIndex + '.verified']: true } });
    return this.createToken(user, 'resume', 168);
  }

  async resume(hashedToken: string) {
    let token: HashedToken;
    try {
      token = jwt.verify(hashedToken, config.jwtSecret);
    } catch (err) {
      // This could be any number of reasons but in short: user not authed.
      // JsonWebTokenError: invalid signature
      // JsonWebTokenError: invalid token
      // TokenExpiredError: jwt expired
      // Passed as context.jwtError for debugging but can be safely ignored.
      throw err;
    }

    if (token.type !== 'resume') {
      throw new Error('This is not a resume token');
    }
    // now login
    const user = await this.findOneCachedById(token.userId);
    if (!user) {
      throw new Error('User does not exist!');
    }
    return this.createToken(user, 'resume', 168);
  }

  requestResetPassword(email: string) {
    return this.sendEmailToUser(email, 'resetPassword', this.postman.mailTemplates.resetPassword);
  }

  async resetPassword(hashedToken: string, newPassword: string) {

    let token: HashedToken;
    try {
      token = jwt.verify(hashedToken, config.jwtSecret);
    } catch (err) {
      // This could be any number of reasons but in short: user not authed.
      // JsonWebTokenError: invalid signature
      // JsonWebTokenError: invalid token
      // TokenExpiredError: jwt expired
      // Passed as context.jwtError for debugging but can be safely ignored.
      throw err;
    }

    if (token.type !== 'resetPassword') {
      throw new Error('This is not a reset token');
    }

    // create a new password and update collection
    let hashed = this.hashPassword(newPassword);
    this.update({ _id: token.userId }, { $set: { 'services.password.bcrypt': hashed } });

    // now login
    const user = await this.findOneCachedById(token.userId);
    if (!user) {
      throw new Error('User does not exist!');
    }
    return this.createToken(user, 'resume', 168);
  }

  // fixtures() {
  //   this.collection.count({}, (err, num) => {
  //     if (num === 0) {
  //       this.collection.insert({ _id: this.random.id(), name: 'Tomas Trescak ' });
  //     }
  //   });
  // }
}
