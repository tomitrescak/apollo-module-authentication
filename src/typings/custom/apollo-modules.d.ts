declare interface IApolloState {
  queries: Object;
  mutations: Object;
}

declare interface ApolloOptions {
  schema?: any;
  context?: any; // value to be used as context in resolvers
  rootValue?: any;
  formatError?: Function; // function used to format errors before returning them to clients
  validationRules?: Array<any>; // additional validation rules to be applied to client-specified queries
  formatParams?: Function; // function applied for each query in a batch to format parameters before passing them to `runQuery`
  formatResponse?: (response: any, options: ApolloOptions) => any; // function applied to each response before returning data to clients
  modules?: {
    schema: any[];
    resolvers: any;
    options: any[];
  };
}

declare module 'graphql-tag' {
  let gql: any;
  export default gql;
}

declare module 'apollo-modules' {
  export interface ApolloOption {
    (req: any, apolloOptions: ApolloOptions): ApolloOptions;
  }

  export interface ApolloModule {
    schema: string;
    queries?: Object;
    resolvers?: Object;
    mutations?: Object;
    queryText?: string;
    mutationText?: string;
    modifyOptions?: (req: any, apolloOptions: ApolloOptions) => void;
  }

  export function addModules(definition: ApolloModule[]): {
    schema: any[],
    resolvers: any[],
    options: any
  };
  export function createServer(apolloOptions?: ApolloOptions, executableSchema?: any): (req: any) => ApolloOptions;
  export function ioSchema(type: string): void;
  export function modificationSchema(): string;
}