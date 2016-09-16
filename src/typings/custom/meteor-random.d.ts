declare module 'meteor-random' {
  export function id(length?: number): string;
  export function secret(length?: number): string;
  export function fraction(): number;
  export function choice<T>(array: T[]): T;
}