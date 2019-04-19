import { HttpHandlers, StreamHandlers } from './handlers';
import { DynamoDataSource } from './datasource';

const httpHandlers = new HttpHandlers(new DynamoDataSource());
const streamHandlers = new StreamHandlers();

export {
  httpHandlers,
  streamHandlers,
};
