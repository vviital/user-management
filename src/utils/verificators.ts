import * as jwt from 'jsonwebtoken';

import config from '../config';
import { TokenPayload, VerificatorOptions, VerificatorMode, TokenVerificator } from './models';
import { DataSource, User } from '../datasource/models';
import { GenericHTTPEvent } from '../handlers/models';
import ErrorObject from '../error';

export class LightVerificator implements TokenVerificator {
  constructor(protected token: string) {

  }

  async verify(options?: jwt.VerifyOptions): Promise<TokenPayload | false> {
    try {
      const result = jwt.verify(this.token, config.JWT_SECRET, options);
      if (typeof result !== 'object') return false;
      return result as TokenPayload;
    } catch (error) {
      console.error(error);
      return false;
    }
  }
}

export class StrictVerificator extends LightVerificator {
  protected _user?: User

  constructor(protected datasource: DataSource<User>, token: string) {
    super(token)
  }

  async verify(options?: jwt.VerifyOptions): Promise<TokenPayload | false> {
    const initialVerificationResult = await super.verify(options);
    if (!initialVerificationResult) return initialVerificationResult;
    const user = await this.datasource.findById(initialVerificationResult.id);
    if (ErrorObject.isErrorObject(user)) return false;
    this._user = user;
    const tokenID = initialVerificationResult.jti;
    const hasToken = !!tokenID && (user.tokens || []).some(value => value.tokenID === tokenID);
    if (!hasToken) return false;
    return initialVerificationResult;
  }
}

export const chooseVerificator = (token: string, options: VerificatorOptions): TokenVerificator => {
  if (options.mode === 'light') return new LightVerificator(token);
  return new StrictVerificator(options.datasource, token)
}

export const getVerificatorMode = (event: GenericHTTPEvent): VerificatorMode  => {
  if (!event.queryStringParameters) return 'strict';
  return event.queryStringParameters.mode === 'light' ? 'light' : 'strict';
}
