import * as jwt from 'jsonwebtoken';
import { omitBy, isEmpty } from 'lodash';

import config from '../config';
import { TokenPayload } from './models';

export const generateToken = (payload: TokenPayload, options: jwt.SignOptions): string => {
  payload = omitBy(payload, isEmpty) as TokenPayload;
  return jwt.sign(payload, config.JWT_SECRET, options);
}
