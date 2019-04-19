import * as aws from 'aws-sdk';
import { isEmpty, omit, omitBy } from 'lodash';
import * as httpStatus from 'http-status-codes';

import { DataSource, User, DynamoOptions, ExistsQuery, PrimaryFields } from './models';
import ErrorObject from '../error'

const defaultOptions: DynamoOptions = {
  hash: 'users-management',
};

class DynamoDataSource implements DataSource<User> {
  protected client: aws.DynamoDB.DocumentClient
  protected table: string
  protected indexes: {
    email: string,
    login: string,
  }
  protected keys: {
    hash: string,
    range: string,
  }
  protected emailIndex: string
  protected loginIndex: string

  constructor(protected _options: DynamoOptions = defaultOptions) {
    this.client = new aws.DynamoDB.DocumentClient();
    this.table = 'users';
    this.keys = {
      hash: 'app',
      range: 'id',
    };
    this.indexes = {
      email: 'email-index',
      login: 'login-index',
    };
  }

  getBaseID() {
    return this.options.hash;
  }

  get options() {
    return this._options;
  }

  set options(options: DynamoOptions) {
    this._options = options;
  }

  async findById(id: string) {
    const params: aws.DynamoDB.DocumentClient.GetItemInput = {
      TableName: this.table,
      Key: {
        app: this.options.hash,
        id: id,
      },
    };

    const value = await this.client.get(params).promise();

    if (isEmpty(value.Item)) {
      return new ErrorObject('', httpStatus.NOT_FOUND);
    }

    const user: User = value.Item as unknown as any;

    return user;
  }

  async findOneByQuery(params: aws.DynamoDB.DocumentClient.QueryInput): Promise<User | ErrorObject> {
    const value = await this.client.query(params).promise();

    if (isEmpty(value.Items)) {
      return new ErrorObject('', httpStatus.NOT_FOUND);
    }

    const user: User = (value.Items || [])[0] as unknown as any;

    return user;
  }

  async findByLogin(login: string) {
    const params: aws.DynamoDB.DocumentClient.QueryInput = {
      TableName: this.table,
      IndexName: this.indexes.login,
      Limit: 1,
      ReturnConsumedCapacity: 'INDEXES',
      KeyConditionExpression: 'app = :app AND login = :login',
      ExpressionAttributeValues: {
        ':app': this.options.hash,
        ':login': login,
      }
    };

    return this.findOneByQuery(params);
  }

  async findByEmail(email: string) {
    const params: aws.DynamoDB.DocumentClient.QueryInput = {
      TableName: this.table,
      IndexName: this.indexes.email,
      Limit: 1,
      ReturnConsumedCapacity: 'INDEXES',
      KeyConditionExpression: 'app = :app AND email = :email',
      ExpressionAttributeValues: {
        ':app': this.options.hash,
        ':email': email,
      }
    };

    return this.findOneByQuery(params);
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

  async exists(query: ExistsQuery) {
    const user = await this.findByPrimaryFields(query);

    if (ErrorObject.isErrorObject(user) || !user) {
      return false;
    }

    return true;
  }

  async create(object: User) {
    const exists = await this.exists({ login: object.login, email: object.email });
    if (exists) {
      return new ErrorObject('', httpStatus.CONFLICT);
    }
    const params: aws.DynamoDB.DocumentClient.PutItemInput = {
      TableName: this.table,
      Item: omitBy(object, x => !x),
      ReturnConsumedCapacity: 'INDEXES',
    };
    const value = await this.client.put(params).promise();
    return object;
  }

  async delete(id: string) {
    const params: aws.DynamoDB.DocumentClient.DeleteItemInput = {
      TableName: this.table,
      Key: {
        app: this.options.hash,
        id,
      },
    };

    const value = await this.client.delete(params).promise();
    return true;
  }

  async update(id: string, object: User) {
    const objectToUpdate = omitBy(omit(object, Object.values(this.keys)), x => !x);
    const keys = Object.keys(objectToUpdate);
    const params: aws.DynamoDB.DocumentClient.UpdateItemInput = {
      TableName: this.table,
      Key: {
        app: this.options.hash,
        id: id,
      },
      UpdateExpression: `set ${keys.map(key => `#${key} = :${key}`).join(',')}`,
      ExpressionAttributeValues: keys.reduce((acc: any, key: keyof User) => {
        return { ...acc, [`:${key}`]: objectToUpdate[key] };
      }, {}),
      ExpressionAttributeNames: keys.reduce((acc: any, key: keyof User) => {
        return { ...acc, [`#${key}`]: key };
      }, {})
    };
    const value = await this.client.update(params).promise();
    return object;
  }
}

export default DynamoDataSource;
