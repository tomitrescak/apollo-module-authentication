import { PostmanOptions } from './postman_shared';

export interface Config {
  jwtSecret: string;
  requireVerification: boolean;
  validateCreate(user: any): void;
}

export const config: Config = {
  jwtSecret: 's0m37h1ng_L0ng',
  requireVerification: false,
  validateCreate: null
};

export default config;
