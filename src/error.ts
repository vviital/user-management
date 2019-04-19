import * as httpStatus from 'http-status-codes';

class ErrorObject {
  constructor(protected message: string, protected statusCode: number = 500, protected description?: string) {

  }

  toJSON() {
    const statusCode = this.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
    const message = this.message || httpStatus.getStatusText(statusCode);
    const object: {
      message: string,
      statusCode: number,
      description?: string,
    } = { statusCode, message };
    
    if (this.description) {
      object.description = this.description;
    }

    return object;
  }

  static isErrorObject(x: any): x is ErrorObject {
    return x instanceof ErrorObject;
  }
}

export default ErrorObject;
