import * as httpStatus from 'http-status-codes';
import { get, omit } from 'lodash';
import { getVerificatorMode, chooseVerificator } from '../utils';

import { DataSource, User } from '../datasource/models';
import {
  LambdaResponse,
  UserCreationData,
  GenericHTTPEvent,
} from './models';
import { UserModel } from '../models'
import ErrorObject from '../error';

const sendError = (error: ErrorObject): LambdaResponse => {
  return {
    statusCode: error.toJSON().statusCode,
    body: JSON.stringify(error),
  };
}

const sendResponse = (response: any, statusCode: number = httpStatus.OK): LambdaResponse => {
  return {
    statusCode,
    body: JSON.stringify(response),
  };
}

function withErrorHandling() {
  return function(_: any, __: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;
      descriptor.value = async function(...args: any): Promise<LambdaResponse> {
        try {
          const result = await originalMethod.apply(this, args);
          return result;
        } catch (error) {
          const object = sendError(new ErrorObject((error as Error).message , httpStatus.INTERNAL_SERVER_ERROR));
          return object;
        }
      }
  }
}

function withAuthorization() {
  return function(_: any, __: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function(event: GenericHTTPEvent): Promise<LambdaResponse> {
      const authorization: string = get(event, 'headers.Authorization', '') || '';
      const token = authorization.replace('Bearer ', '');
      const verificator = chooseVerificator(token, { 
        datasource: this.datasource,
        mode: getVerificatorMode(event),
      });
      const verificationResult = await verificator.verify();
      if (!verificationResult) {
        return sendError(new ErrorObject("", httpStatus.UNAUTHORIZED));
      }
      event.user = verificationResult;
      return originalMethod.call(this, event)
    }
  }
}

class HttpHandlers {
  constructor(protected datasource: DataSource<User>) {

  }

  @withErrorHandling()
  async createUser(event: GenericHTTPEvent): Promise<LambdaResponse> {
    const data: UserCreationData = JSON.parse(event.body || '');
    const user = new UserModel(data, { hasHashedPassword: false, app: this.datasource.getBaseID() });
    const result = await this.datasource.create(user.getUser());
    if (ErrorObject.isErrorObject(result)) {
      return sendError(result);
    }
    return sendResponse(result, httpStatus.CREATED);
  }

  @withErrorHandling()
  async createToken(event: GenericHTTPEvent): Promise<LambdaResponse> {
    const data: UserCreationData = JSON.parse(event.body || '');
    const user = await this.datasource.findByPrimaryFields(data);
    if (ErrorObject.isErrorObject(user)) {
      return sendError(user);
    }
    const userModel = new UserModel(user, { hasHashedPassword: true, app: this.datasource.getBaseID() });
    if (!userModel.verifyPassword(data.password)) {
      return sendError(new ErrorObject('Wrong password', httpStatus.BAD_REQUEST));
    }
    const token = userModel.generateToken();
    const updateResult = await this.datasource.update(userModel.id, userModel.getUser());
    if (ErrorObject.isErrorObject(updateResult)) {
      return sendError(updateResult);
    }
    return sendResponse({ token });
  }

  @withErrorHandling()
  @withAuthorization()
  async verifyToken(event: GenericHTTPEvent): Promise<LambdaResponse> {
    console.log('--- event.user ---', event.user);
    return sendResponse(event.user);
  }

  @withErrorHandling()
  @withAuthorization()
  async getUserData(event: GenericHTTPEvent): Promise<LambdaResponse> {
    if (!event.user) {
      return sendError(new ErrorObject("", httpStatus.UNAUTHORIZED));
    }
    const userOrError = await this.datasource.findById(event.user.id);
    if (ErrorObject.isErrorObject(userOrError)) {
      return sendError(userOrError);
    }
    const userModel = new UserModel(userOrError);
    return sendResponse(userModel.getPublicFields());
  }

  @withErrorHandling()
  @withAuthorization()
  async updateUserData(event: GenericHTTPEvent): Promise<LambdaResponse> {
    if (!event.user) {
      return sendError(new ErrorObject("", httpStatus.UNAUTHORIZED));
    }
    const userData: User = JSON.parse(event.body || '');
    const userOrError = await this.datasource.findById(event.user.id);
    if (ErrorObject.isErrorObject(userOrError)) {
      return sendError(userOrError);
    }
    const forbiddenFields = ['id', 'login', 'email', 'app', 'tokens', 'oldPasswords'];
    const mergedUser = { ...userOrError, ...omit(userData, forbiddenFields) };
    const userModel = new UserModel(mergedUser)
    await this.datasource.update(event.user.id, userModel.getUser())
    return sendResponse(new UserModel(mergedUser).getPublicFields());
  }
}

export default HttpHandlers;
