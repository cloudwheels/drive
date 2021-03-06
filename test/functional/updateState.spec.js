const {
  StartTransactionRequest,
  ApplyStateTransitionRequest,
  CommitTransactionRequest,
  StartTransactionResponse,
  ApplyStateTransitionResponse,
  CommitTransactionResponse,
} = require('@dashevo/drive-grpc');
const {
  startDapi,
} = require('@dashevo/dp-services-ctl');

const DashPlatformProtocol = require('@dashevo/dpp');

const DriveDataProvider = require('../../lib/dpp/DriveDataProvider');

const getStateTransitionsFixture = require('../../lib/test/fixtures/getStateTransitionsFixture');
const registerUser = require('../../lib/test/registerUser');

// TODO: Make this test integrational
describe.skip('updateState', function main() {
  let grpcClient;
  let driveApiClient;
  let dapiCoreClient;
  let stateTransition;
  let documentsStateTransition;
  let startTransactionRequest;
  let applyStateTransitionRequest;
  let commitTransactionRequest;
  let dapiInstance;

  const height = 1;
  const hash = 'b4749f017444b051c44dfd2720e88f314ff94f3dd6d56d40ef65854fcd7fff6b';
  const nextHash = 'b4749f017444b051c44dfd2720e88f314ff94f3dd6d56d40ef65854fcd7fff7b';

  this.timeout(190000);

  beforeEach(async () => {
    dapiInstance = await startDapi();

    grpcClient = dapiInstance.driveUpdateState.getApi();
    driveApiClient = dapiInstance.driveApi.getApi();
    dapiCoreClient = dapiInstance.dapiCore.getApi();
    const tendermintApi = dapiInstance.tendermintCore.getApi();
    const coreApi = dapiInstance.dashCore.getApi();

    // activate sporks
    await coreApi.generate(1000);

    const dpp = new DashPlatformProtocol({
      dataProvider: new DriveDataProvider(
        null,
        null,
        coreApi,
        tendermintApi,
        null,
      ),
    });

    // eslint-disable-next-line no-unused-vars
    const { identityId, identityPrivateKey } = await registerUser(coreApi, dapiCoreClient, dpp);

    [stateTransition, documentsStateTransition] = getStateTransitionsFixture();

    stateTransition.dataContract.contractId = identityId;
    documentsStateTransition.documents.forEach((document) => {
      // eslint-disable-next-line
      document.contractId = identityId;
      // eslint-disable-next-line
      document.userId = identityId;
    });

    startTransactionRequest = new StartTransactionRequest();
    startTransactionRequest.setBlockHeight(height);

    applyStateTransitionRequest = new ApplyStateTransitionRequest();
    applyStateTransitionRequest.setStateTransition(stateTransition.serialize());
    applyStateTransitionRequest.setBlockHeight(height);
    applyStateTransitionRequest.setBlockHash(hash);

    commitTransactionRequest = new CommitTransactionRequest();
    commitTransactionRequest.setBlockHeight(height);
  });

  after(async () => {
    await Promise.all([
      dapiInstance.remove(),
    ]);
  });

  it('should successfully apply state transition and commit data', async () => {
    const startTransactionResponse = await grpcClient.startTransaction(startTransactionRequest);
    const applyStateTransitionResponse = await grpcClient
      .applyStateTransition(applyStateTransitionRequest);
    const commitTransactionResponse = await grpcClient.commitTransaction(commitTransactionRequest);

    expect(startTransactionResponse).to.be.an.instanceOf(StartTransactionResponse);
    expect(applyStateTransitionResponse).to.be.an.instanceOf(ApplyStateTransitionResponse);
    expect(commitTransactionResponse).to.be.an.instanceOf(CommitTransactionResponse);

    // check we have our data in database
    const { result: contract } = await driveApiClient.request('fetchContract', {
      contractId: stateTransition.getDataContract().getId(),
    });

    expect(contract).to.deep.equal(stateTransition.getDataContract().toJSON());

    startTransactionRequest = new StartTransactionRequest();
    startTransactionRequest.setBlockHeight(height + 1);

    applyStateTransitionRequest = new ApplyStateTransitionRequest();
    applyStateTransitionRequest.setStateTransition(
      documentsStateTransition.serialize(),
    );
    applyStateTransitionRequest.setBlockHeight(height + 1);
    applyStateTransitionRequest.setBlockHash(nextHash);

    commitTransactionRequest = new CommitTransactionRequest();
    commitTransactionRequest.setBlockHeight(height + 1);

    await grpcClient.startTransaction(startTransactionRequest);
    await grpcClient.applyStateTransition(applyStateTransitionRequest);
    await grpcClient.commitTransaction(commitTransactionRequest);

    const { result: niceDocuments } = await driveApiClient.request('fetchDocuments', {
      contractId: stateTransition.getDataContract().getId(),
      type: 'niceDocument',
    });

    const { result: prettyDocuments } = await driveApiClient.request('fetchDocuments', {
      contractId: stateTransition.getDataContract().getId(),
      type: 'prettyDocument',
    });

    const { documents } = documentsStateTransition.toJSON();
    const storedDocuments = niceDocuments.concat(prettyDocuments);

    expect(documents).to.have.deep.members(storedDocuments);
  });
});
