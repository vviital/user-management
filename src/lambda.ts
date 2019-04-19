import { httpHandlers, streamHandlers } from './index';

module.exports.createUser = httpHandlers.createUser.bind(httpHandlers);
module.exports.createToken = httpHandlers.createToken.bind(httpHandlers);
module.exports.verifyToken = httpHandlers.verifyToken.bind(httpHandlers);
module.exports.getUserData = httpHandlers.getUserData.bind(httpHandlers);
module.exports.updateUserData = httpHandlers.updateUserData.bind(httpHandlers);
module.exports.listenStream = streamHandlers.listenStream.bind(streamHandlers);
