import * as uuid from 'uuid';
import { cloneDeep } from 'lodash';
import * as httpStatus from 'http-status-codes';

import { DataSource, User, ExistsQuery, PrimaryFields } from './models';
import ErrorObject from '../error'

class InMemoryDataSource implements DataSource<User> {
  memory: User[]

  constructor() {
    this.memory = [];
  }

  async create(object: User) {
    const exists = await this.exists(object);
    if (exists) {
      return new ErrorObject('', httpStatus.CONFLICT);
    }
    object.id = uuid.v4();
    this.memory.push(cloneDeep(object))
    return object;
  }

  async delete(id: string) {
    this.memory = this.memory.filter(x => x.id != id);
    return true;
  }

  async exists(query: ExistsQuery) {
    return !!this.memory.find(x => {
      return x.id === query.id || x.email === query.email || x.login === query.login;
    })
  }

  async findByEmail(email: string) {
    const val = this.memory.find(x => x.email === email);
    if (!val) return new ErrorObject('', httpStatus.NOT_FOUND);
    return val;
  }

  async findById(id: string) {
    const val = this.memory.find(x => x.id === id);
    if (!val) return new ErrorObject('', httpStatus.NOT_FOUND);
    return val;
  }

  async findByLogin(login: string) {
    const val = this.memory.find(x => x.login === login);
    if (!val) return new ErrorObject('', httpStatus.NOT_FOUND);
    return val;
  }

  async findByPrimaryFields(query: PrimaryFields) {
    let userPromise: Promise<User | ErrorObject>|undefined;

    if (query.id) {
      userPromise = this.findById(query.id);
    } else if (query.email) {
      userPromise = this.findByEmail(query.email);
    } else if (query.login) {
      userPromise = this.findByLogin(query.login);
    }
    let user = await userPromise;
    return user || new ErrorObject('', httpStatus.NOT_FOUND);
  }

  getBaseID() {
    return '';
  }

  async update(id: string, object: User) {
    this.memory = this.memory.map((u) => {
      if (u.id === id) {
        return object;
      }
      return u;
    });
    return object;
  }
}

export default InMemoryDataSource;
