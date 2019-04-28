import { TokenPayload } from '../utils/models'

export type GenericHTTPEvent = {
  body: string|null
  headers: { [key: string]: string }|null
  httpMethod: string
  multiValueHeaders?: { [key: string]: string[] }|null
  multiValueQueryStringParameters?: { [key: string]: string[] }|null
  path?: string
  pathParameters?: any,
  queryStringParameters?: { [key: string]: string }|null
  requestContext?: object,
  resource?: string
  stageVariables?: any,
  user?: TokenPayload,
}

export type UserCreationData = {
  login: string
  password: string
  email: string
};

export type TokenData = {
  token: string,
}

export type TokenInvalidateData = {
  id: string,
}

export type LambdaResponse = {
  statusCode: number,
  body?: string,
};
