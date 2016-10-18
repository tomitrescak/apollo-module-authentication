import User, { UserEntity, AccountsServices, Token, Email, PasswordService, Profile } from './authentication';
import { ApolloOptions } from 'apollo-modules';
import { Cursor } from 'mongodb';

export interface Context {
  users: User<UserEntity>;
  userId: string;
}

// function formatResponse(response: any, apolloOptions: ApolloOptions) {
//   if (apolloOptions.context && apolloOptions.context.errors) {
//     if (!response.data.errors) {
//       response.data.errors = [];
//     }
//     response.data.errors.concat(apolloOptions.context.errors);
//   }

//   // if (apolloOptions.formatResponse) {
//   //   response = apolloOptions.formatResponse(response, apolloOptions);
//   // }
//   return response;
// }

export function modifyOptions(req: any, apolloOptions: ApolloOptions): void {
  if (req.headers.authorization) {
    apolloOptions.context.users.modifyContext(req.headers.authorization, apolloOptions.context);
  }
}

export const resolvers = {
  User: {
    emails(user: UserEntity) {
      return user.emails;
    },
    services(user: UserEntity) {
      return user.services;
    },
    profile(user: UserEntity) {
      return user.profile;
    }
  },
  AccountServices: {
    password(services: AccountsServices) {
      return services.password;
    }
  },
  Token: {
    user(token: Token) {
      return token.user;
    }
  }
};

export const queries = {
  user(target: UserEntity, { id }: any, context: Context) {
    id = id ? id : context.userId;
    return context.users.findOne({_id: id});
  },
  async users(target: UserEntity, _: any, context: Context) {
    return context.users.find({});
  },
  cachedUsers(target: UserEntity, _: any, context: Context) {
    return context.users.findAllCached();
  }
};

export const mutations = {
  createAccount(_: any, args: any, context: Context) {
    const { email, password, profile } = args.user;
    return context.users.create(null, email, password, profile);
  },
  async createAccountAndLogin(_: any, args: any, context: Context) {
    const { email, password, profile } = args.user;

    // create user
    await context.users.create(null, email, password, profile);

    // login user
    const token = await context.users.login(email, password);
    return token;
  },
  loginWithPassword(_: any, args: any, context: Context) {
    const { email, password } = args.user;
    return context.users.login(email, password);
  },
  requestResendVerification(_: any, args: any, context: Context) {
    const { email } = args;
    return context.users.requestVerification(email);
  },
  verify(_: any, args: any, context: Context) {
    const { token } = args;
    return context.users.verify(token);
  },
  resume(_: any, args: any, context: Context) {
    const { token } = args;
    return context.users.resume(token);
  },
  requestResetPassword(_: any, args: any, context: Context) {
    const { email } = args;
    return context.users.requestResetPassword(email);
  },
  resetPassword(_: any, args: any, context: Context) {
    const { token, password } = args;
    return context.users.resetPassword(token, password);
  }
};

