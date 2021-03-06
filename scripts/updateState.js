require('dotenv-expand')(require('dotenv-safe').config());

const grpc = require('grpc');

const { server: { createServer } } = require('@dashevo/grpc-common');
const { getUpdateStateDefinition } = require('@dashevo/drive-grpc');

const UpdateStateApp = require('../lib/app/UpdateStateApp');
const UpdateStateAppOptions = require('../lib/app/UpdateStateAppOptions');

const errorHandler = require('../lib/util/errorHandler');

(async function main() {
  const updateStateAppOptions = new UpdateStateAppOptions(process.env);
  const updateStateApp = new UpdateStateApp(updateStateAppOptions);

  await updateStateApp.init();

  const grpcServer = createServer(
    getUpdateStateDefinition(),
    updateStateApp.createWrappedHandlers(),
  );

  grpcServer.bind(
    `${updateStateAppOptions.getGrpcHost()}:${updateStateAppOptions.getGrpcPort()}`,
    grpc.ServerCredentials.createInsecure(),
  );

  grpcServer.start();
}()).catch(errorHandler);
