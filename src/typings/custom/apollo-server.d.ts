declare module 'apollo-server' {
  export var apolloServer: any;
  export function apolloExpress(...params: any[]): any;
  export function graphiqlExpress(...params: any[]): any;
}