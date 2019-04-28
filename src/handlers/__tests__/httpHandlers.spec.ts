import { VerifyOptions, TokenExpiredError } from 'jsonwebtoken'

import { DataSource, User } from '../../datasource/models';
import { InMemoryDataSource } from '../../datasource'
import HttpHandlers from '../httpHandlers';
import { GenericHTTPEvent } from '../models';
import ErrorObject from '../../error';

describe('httpHandlers', () => {
  let datasource: DataSource<User>
  let user: User
  let token: string

  const event: GenericHTTPEvent = {
    body: JSON.stringify({ login: 'test login', password: 'test password' }),
    headers: {},
    httpMethod: 'http method',
  }

  beforeAll(() => {
    datasource = new InMemoryDataSource();
  });

  describe('createUser', () => {
    it('should create user', async () => {
      const handlers = new HttpHandlers(datasource);
      const response = await handlers.createUser(event);

      expect(response.statusCode).toBe(201);
      
      user = JSON.parse(response.body || '');
      expect(user).toEqual(expect.objectContaining({
        id: expect.any(String),
        login: 'test login',
      }))
      expect(user.password).not.toBeTruthy()
    });

    it('should throw an error if user exists', async () => {
      const handlers = new HttpHandlers(datasource);
      const response = await handlers.createUser(event);

      expect(response.statusCode).toBe(409);
      expect(JSON.parse(response.body || '')).toEqual({
        statusCode: 409,
        message: 'Conflict',
      });
    });
  });

  describe('createToken', () => {
    it('should create token', async () => {
      const handlers = new HttpHandlers(datasource);
      const response = await handlers.createToken(event);

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body || '')).toEqual(expect.objectContaining({
        token: expect.any(String),
      }));
      token = JSON.parse(response.body || '').token;
    });

    it('should throw an error if user is not exist', async () => {
      const e = Object.assign({}, event, { body: JSON.stringify({ login: 'test login', password: 'wrong password' })})

      const handlers = new HttpHandlers(datasource);
      const response = await handlers.createToken(e);

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body || '')).toEqual({
        statusCode: 400,
        message: 'Wrong password',
      });
    });
  });

  describe('verifyToken', () => {
    it('should response with token claims if everything is ok (strict version)', async () => {
      const headers = { 'Authorization': `Bearer ${token}` };
      const e = Object.assign({}, event, { headers });

      const handlers = new HttpHandlers(datasource);
      const response = await handlers.verifyToken(e);

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body || '')).toEqual(expect.objectContaining({
        exp: expect.any(Number),
        iat: expect.any(Number),
        id: user.id,
        iss: expect.any(String),
        jti: expect.any(String),
        login: user.login,
      }));
    });

    it('should response with token claims if everything is ok (light version)', async () => {
      const headers = { 'Authorization': `Bearer ${token}` };
      const queryStringParameters = { mode: 'light' }
      const e = Object.assign({}, event, { headers, queryStringParameters });

      const handlers = new HttpHandlers(datasource);
      const response = await handlers.verifyToken(e);

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body || '')).toEqual(expect.objectContaining({
        exp: expect.any(Number),
        iat: expect.any(Number),
        id: user.id,
        iss: expect.any(String),
        jti: expect.any(String),
        login: user.login,
      }));
    });

    it('should throw an error if token is not valid', async () => {
      const headers = { 'Authorization': `Bearer ${token}wrong` };
      const queryStringParameters = { mode: 'light' }
      const e = Object.assign({}, event, { headers, queryStringParameters });

      const handlers = new HttpHandlers(datasource);
      const response = await handlers.verifyToken(e);

      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.body || '')).toEqual({
        statusCode: 401,
        message: 'Unauthorized',
      });
    });
  });

  describe('getUserData', () => {
    it('should return user data', async () => {
      const headers = { 'Authorization': `Bearer ${token}` };
      const e = Object.assign({}, event, { headers });

      const handlers = new HttpHandlers(datasource);
      const response = await handlers.getUserData(e);

      expect(response.statusCode).toBe(200);
      const u: User = JSON.parse(response.body || '');
      expect(u).toEqual(expect.objectContaining({
        app: user.app,
        email: user.email,
        id: user.id,
        login: user.login,
        name: user.name,
        tokens: expect.any(Array),
        type: 'User',
      }));
    });

    it('should throw an error if you have no access for the user data', async () => {
      const headers = { 'Authorization': `Bearer ${token}wrong` };
      const e = Object.assign({}, event, { headers });

      const handlers = new HttpHandlers(datasource);
      const response = await handlers.getUserData(e);

      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.body || '')).toEqual({
        message: 'Unauthorized',
        statusCode: 401,
      });
    });
  });

  describe('updateUserData', () => {
    it('should update user\'s fields', async () => {
      const headers = { 'Authorization': `Bearer ${token}` };
      const initialState = await datasource.findById(user.id);

      if (ErrorObject.isErrorObject(initialState)) {
        throw new Error(initialState.toJSON().message)
      }

      const object = { name: 'name', id: '29e1360b-76af-40a8-b365-118b32ed29ff' };
      const e = Object.assign({}, event, { headers, body: JSON.stringify(object) });
  
      const handlers = new HttpHandlers(datasource);
      const response = await handlers.updateUserData(e);

      expect(response.statusCode).toBe(200);
      const u: User = JSON.parse(response.body || '');
      expect(u).toEqual(expect.objectContaining({
        app: user.app,
        email: user.email,
        id: user.id,
        login: user.login,
        name: object.name,
        tokens: expect.any(Array),
        type: 'User',
      }));

      const updatedState = await datasource.findById(user.id);

      if (ErrorObject.isErrorObject(updatedState)) {
        throw new Error(updatedState.toJSON().message)
      }

      expect(initialState.password).toEqual(updatedState.password);
    });

    it('should update user password', async () => {
      const headers = { 'Authorization': `Bearer ${token}` };
      const object = { password: 'new password' }
      const e = Object.assign({}, event, { headers, body: JSON.stringify(object) });

      const initialState = await datasource.findById(user.id);

      if (ErrorObject.isErrorObject(initialState)) {
        throw new Error(initialState.toJSON().message)
      }
  
      const handlers = new HttpHandlers(datasource);
      const response = await handlers.updateUserData(e);

      expect(response.statusCode).toBe(200);

      const updatedState = await datasource.findById(user.id);

      if (ErrorObject.isErrorObject(updatedState)) {
        throw new Error(updatedState.toJSON().message)
      }

      expect(initialState.password).not.toEqual(updatedState.password);
    });

    it('should throw error is user is not authorized', async () => {
      const headers = { 'Authorization': `Bearer ${token}wrong` };
      const e = Object.assign({}, event, { headers });

      const handlers = new HttpHandlers(datasource);
      const response = await handlers.updateUserData(e);

      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.body || '')).toEqual({
        message: 'Unauthorized',
        statusCode: 401,
      });
    });
  });
});
