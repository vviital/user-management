import ErrorObject from '../error';

export interface DataSource<T extends Object> {
  create(object: T): Promise<T | ErrorObject>
  delete(id: string): Promise<boolean>
  exists(id: ExistsQuery): Promise<boolean>
  findByEmail(email: string): Promise<T | ErrorObject>
  findById(id: string): Promise<T | ErrorObject>
  findByLogin(login: string): Promise<T | ErrorObject>
  findByPrimaryFields(fields: PrimaryFields): Promise<T | ErrorObject>
  getBaseID(): string
  update(id: string, object: T): Promise<T | ErrorObject>
}

export type DynamoOptions = {
  hash: string
}

export type ExistsQuery = {
  email?: string
  id?: string
  login?: string
}

export type PrimaryFields = ExistsQuery

export type TokenRecord = {
  tokenID: string
  expiration: number
}

export type OldPasswordRecord = {
  value: string
  expiration: Date,
}

export type User = {
  app: string
  email: string
  id: string
  login: string
  name?: string
  oldPasswords?: OldPasswordRecord[]
  password: string
  surname?: string
  tokens?: TokenRecord[]
  type: string,
}
