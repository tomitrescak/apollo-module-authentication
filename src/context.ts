import UserModel from './authentication';

export function wrapOptions(dbConnection: any, graphQlOptions: any) {
  // add user model into context
  if (!graphQlOptions.context) {
    graphQlOptions.context = {};
  }
  graphQlOptions.context.user = new UserModel(dbConnection);

  return (req?: any) => {
    return graphQlOptions;
  };
}
