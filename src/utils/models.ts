import { VerifyOptions } from 'jsonwebtoken';

import { DataSource, User } from '../datasource/models';

export interface TokenVerificator {
  verify(options?: VerifyOptions): Promise<TokenPayload | false>
}

export type TokenPayload = {
  id: string
  login?: string
  email?: string
  app: string,
  jti?: string,
};

export type VerificatorMode = 'strict'|'light';

export type VerificatorOptions = {
  datasource: DataSource<User>
  mode: VerificatorMode
}
