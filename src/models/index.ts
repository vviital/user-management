import * as uuid from 'uuid';
import * as bcrypt from 'bcryptjs';
import { omitBy, isEmpty, pick } from 'lodash';
import * as moment from 'moment';

import { User, TokenRecord } from '../datasource/models';
import { UserCreationData } from '../handlers/models';
import { UserModelOptions } from './models';
import { generateToken } from '../utils';

const defaultOptions = {
  app: 'users-management'
}

class UserModel {
  user: User

  constructor(user: User | UserCreationData, protected options: UserModelOptions = defaultOptions) {
    this.user = user as unknown as any
  }

  get type() {
    return 'User';
  }

  get email() {
    if (this.user.email) return this.user.email;
    return '';
  }

  get id() {
    if (!this.user.id) {
      this.user.id = uuid.v4();
    }
    return this.user.id;
  }

  get login() {
    if (this.user.login) return this.user.login;
    return '';
  }

  get name() {
    if (this.user.name) return this.user.name;
    return '';
  }

  get password() {
    if (this.options.hasHashedPassword) return this.user.password || '';
    return bcrypt.hashSync(this.user.password || '');
  }

  get surname() {
    return this.user.surname;
  }

  get app() {
    return this.user.app || this.options.app;
  }

  get tokens() {
    return this.user.tokens || [];
  }

  set tokens(tokens: TokenRecord[]) {
    this.tokens = tokens;
  }

  get oldPasswords() {
    return this.user.oldPasswords || [];
  }

  verifyPassword(password: string): boolean {
    if (!this.options.hasHashedPassword) return true;
    console.log('--- comparing', password, 'with', this.password)
    return bcrypt.compareSync(password, this.password || '');
  }

  getUser(): User {
    return {
      app: this.app,
      email: this.email,
      id: this.id,
      login: this.login,
      name: this.name,
      oldPasswords: this.oldPasswords,
      password: this.password,
      surname: this.surname,
      tokens: this.tokens,
      type: this.type,
    };
  }

  getPublicFields(): object {
    const publicFields = ['app', 'email', 'id', 'login', 'name', 'surname', 'tokens', 'type'];
    return pick(this.getUser(), publicFields);
  }

  generateToken(): string {
    if (!this.user.tokens) {
      this.user.tokens = [];
    }
    const tokenID = uuid.v4();
    const token = generateToken({
      id: this.id,
      login: this.login,
      email: this.email,
      app: this.app,
    }, {
      issuer: this.app,
      algorithm: 'HS256',
      expiresIn: '12h',
      jwtid: tokenID,
    });
    this.user.tokens.push({
      tokenID,
      expiration: moment().add('12', 'h').valueOf(),
    });
    return token;
  }
}

export {
  UserModel,
};
