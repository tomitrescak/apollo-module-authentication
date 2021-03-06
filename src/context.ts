import UserModel from './authentication';

export function wrapOptions(dbConnection: any, graphQlOptions: any) {
  // add user model into context
  if (!graphQlOptions.context) {
    graphQlOptions.context = {};
  }
  graphQlOptions.context.users = new UserModel(dbConnection);

  return (_req?: any) => {
    return graphQlOptions;
  };
}
