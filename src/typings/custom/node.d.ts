declare module 'events' {
  var a: any;
  export class EventEmitter {}
  export default a;
}

declare class Buffer { }

declare namespace NodeJS {
  export class EventEmitter {}
  export class ReadableStream {}
}

declare module 'path' {
  var a: any;
  export = a;
}

declare module 'fs' {
  var a: any;
  export = a;
}

declare var global: any;
declare var require: any;
declare var process: any;
declare var __dirname: string;