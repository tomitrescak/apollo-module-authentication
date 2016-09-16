declare module 'graphql-tools' {
  interface IExecutableSchemaDefinition {
    typeDefs: any[];
    resolvers: any[];
    allowUndefinedInResolve?: boolean;
  }
  export function makeExecutableSchema(definition: IExecutableSchemaDefinition): any;
}