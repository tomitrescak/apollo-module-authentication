import { ApolloOptions } from 'apollo-modules';
import { Cursor } from 'mongodb';

import User, {
  AccountsServices,
  Email,
  PasswordService,
  Profile,
  Token,
  UserEntity
} from './authentication';

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

export async function modifyOptions(req: any, apolloOptions: ApolloOptions) {
  if (req.headers.authorization) {
    await apolloOptions.context.users.modifyContext(
      req.headers.authorization,
      apolloOptions.context
    );
  }
}

export const resolvers = {
  User: {
    emails(user: UserEntity): Email[] {
      return user.emails;
    },
    services(user: UserEntity) {
      return user.services;
    },
    profile(user: UserEntity): Profile {
      return user.profile;
    }
  },
  AccountServices: {
    password(services: AccountsServices): PasswordService {
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
  user(_target: UserEntity, { id }: any, context: Context): Promise<UserEntity> {
    id = id ? id : context.userId;
    return context.users.findOne({ _id: id });
  },
  async users(_target: UserEntity, _: any, context: Context): Promise<Cursor<UserEntity>> {
    return context.users.find({});
  },
  cachedUsers(_target: UserEntity, _: any, context: Context): Promise<UserEntity[]> {
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
    const token = await context.users.login(email, password, context);
    return token;
  },
  loginWithPassword(_: any, args: any, context: Context) {
    const { email, password } = args.user;
    return context.users.login(email, password, context);
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
