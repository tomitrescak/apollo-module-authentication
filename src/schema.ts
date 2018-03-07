import { ApolloOptions } from 'apollo-modules';
import { Cursor } from 'mongodb';

import {
  AccountsServices,
  default as User,
  Email,
  PasswordService,
  Profile,
  Token,
  UserEntity
} from './authentication';
import { Context, modifyOptions, mutations, queries, resolvers } from './resolvers';

const schema = `
  type Token {
    hashedToken: String!
    expires: Date!
    user: User!
  }

  type AccountEmail {
    address: String
    verified: Boolean
  }

  type AccountEmailVerification {
    verificationTokens: [String]
  }

  type AccountsPassword {
    bcrypt: String
  }

  type AccountServices {
    password: AccountsPassword
    email: AccountEmailVerification
  }

  type User {
    _id: String
    createdAt: Date
    services: AccountServices
    emails: [AccountEmail]
    profile: Profile
    roles: [String]
  }

  input UserPasswordInput {
    email: String
    password: String,
    profile: ProfileInput
  }
`;

const queryText = `
  user(id: String): User
  users: [User]
  cachedUsers: [User]
`;

const mutationText = `
  createAccount(user: UserPasswordInput): User
  createAccountAndLogin(user: UserPasswordInput): Token
  loginWithPassword(user: UserPasswordInput): Token
  requestResendVerification(email: String): Boolean
  requestResetPassword(email: String): Boolean
  resetPassword(token: String, password: String): Token
  verify(token: String): Token
  resume(token: String): Token
`;

export default {
  schema,
  resolvers,
  queryText,
  queries,
  mutationText,
  mutations,
  modifyOptions
};
