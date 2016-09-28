import User, { UserEntity, AccountsServices, Token, Email, PasswordService, Profile } from './authentication';
import { Cursor } from 'mongodb';

export interface Context {
  user: User;
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
    apolloOptions.context.user.modifyContext(req.headers.authorization, apolloOptions.context);
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
    return context.user.findOne({_id: id});
  },
  async users(target: UserEntity, _: any, context: Context) {
    return context.user.find({});
  },
  cachedUsers(target: UserEntity, _: any, context: Context) {
    return context.user.findManyCached();
  }
};

export const mutations = {
  createAccount(_: any, args: any, context: Context) {
    const { email, password, profile } = args.user;
    return context.user.create(null, email, password, profile);
  },
  async createAccountAndLogin(_: any, args: any, context: Context) {
    const { email, password, profile } = args.user;

    // create user
    await context.user.create(null, email, password, profile);

    // login user
    const token = await context.user.login(email, password);
    return token;
  },
  loginWithPassword(_: any, args: any, context: Context) {
    const { email, password } = args.user;
    return context.user.login(email, password);
  },
  requestResendVerification(_: any, args: any, context: Context) {
    const { email } = args;
    return context.user.requestVerification(email);
  },
  verify(_: any, args: any, context: Context) {
    const { token } = args;
    return context.user.verify(token);
  },
  resume(_: any, args: any, context: Context) {
    const { token } = args;
    return context.user.resume(token);
  },
  requestResetPassword(_: any, args: any, context: Context) {
    const { email } = args;
    return context.user.requestResetPassword(email);
  },
  resetPassword(_: any, args: any, context: Context) {
    const { token, password } = args;
    return context.user.resetPassword(token, password);
  }
};

