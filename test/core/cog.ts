import * as fs from 'fs';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';
import { Duplex } from 'stream';
import { Metadata, ServerUnaryCall, sendUnaryData } from 'grpc';

import { Step as ProtoStep, StepDefinition, FieldDefinition, RunStepResponse, RunStepRequest, CogManifest, ManifestRequest } from '../../src/proto/cog_pb';
import { Cog } from '../../src/core/cog';

chai.use(sinonChai);

describe('Cog:GetManifest', () => {
  const expect = chai.expect;
  let cogUnderTest: Cog;
  let clientWrapperStub: any;
  let mockCall: Partial<ServerUnaryCall<ManifestRequest>>;

  beforeEach(() => {
    clientWrapperStub = sinon.stub();
    cogUnderTest = new Cog(clientWrapperStub);
    mockCall = {
      request: new ManifestRequest(),
      metadata: new Metadata(),
      cancelled: false,
      getPeer: () => '',
      sendMetadata: () => {},
    };
  });

  it('should return expected cog metadata', (done) => {
    const version: string = JSON.parse(fs.readFileSync('package.json').toString('utf8')).version;
    const callback: sendUnaryData<CogManifest> = (err, manifest) => {
      expect(manifest?.getName()).to.equal('stackmoxie/looksy');
      expect(manifest?.getLabel()).to.equal('Looksy');
      expect(manifest?.getVersion()).to.equal(version);
      done();
    };
    cogUnderTest.getManifest(mockCall as ServerUnaryCall<ManifestRequest>, callback);
  });

  it('should return expected cog auth fields', (done) => {
    const callback: sendUnaryData<CogManifest> = (err, manifest) => {
      const authFields: any[] = manifest?.getAuthFieldsList().map((field: FieldDefinition) => {
        return field.toObject();
      }) || [];

      // Endpoint auth field
      const endpoint: any = authFields.find(a => a.key === 'endpoint');
      expect(endpoint.type).to.equal(FieldDefinition.Type.URL);
      expect(endpoint.optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
      expect(!!endpoint.description).to.equal(true);

      done();
    };
    cogUnderTest.getManifest(mockCall as ServerUnaryCall<ManifestRequest>, callback);
  });

  it('should return expected step definitions', (done) => {
    const callback: sendUnaryData<CogManifest> = (err, manifest) => {
      const stepDefs: StepDefinition[] = manifest?.getStepDefinitionsList() || [];

      // Step definitions list includes CompareImagesUsingRMSE step
      const hasCompareImages: boolean = stepDefs.some(s => s.getStepId() === 'CompareImagesUsingRMSE');
      expect(hasCompareImages).to.equal(true);

      done();
    };
    cogUnderTest.getManifest(mockCall as ServerUnaryCall<ManifestRequest>, callback);
  });

});

describe('Cog:RunStep', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let grpcUnaryCall: any = {};
  let cogUnderTest: Cog;
  let clientWrapperStub: any;

  beforeEach(() => {
    protoStep = new ProtoStep();
    grpcUnaryCall.request = {
      getStep: function () {return protoStep},
      metadata: null
    };
    clientWrapperStub = sinon.stub();
    cogUnderTest = new Cog(clientWrapperStub);
  });

  it('authenticates client wrapper with call metadata', (done) => {
    // Construct grpc metadata and assert the client was authenticated.
    grpcUnaryCall.metadata = new Metadata();
    grpcUnaryCall.metadata.add('anythingReally', 'some-value');

    const callback: sendUnaryData<RunStepResponse> = (err, response) => {
      expect(clientWrapperStub).to.have.been.calledWith(grpcUnaryCall.metadata);
      done();
    };
    cogUnderTest.runStep(grpcUnaryCall, callback);
  });

  it('responds with error when called with unknown stepId', (done) => {
    protoStep.setStepId('NotRealStep');

    const callback: sendUnaryData<RunStepResponse> = (err, response) => {
      expect(response?.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
      expect(response?.getMessageFormat()).to.equal('Unknown step %s');
      done();
    };
    cogUnderTest.runStep(grpcUnaryCall, callback);
  });

  it('invokes step class as expected', (done) => {
    const expectedResponse = new RunStepResponse();
    const mockStepExecutor: any = {executeStep: sinon.stub()}
    mockStepExecutor.executeStep.resolves(expectedResponse);
    const mockTestStepMap: any = {TestStepId: sinon.stub()}
    mockTestStepMap.TestStepId.returns(mockStepExecutor);

    cogUnderTest = new Cog(clientWrapperStub, mockTestStepMap);
    protoStep.setStepId('TestStepId');

    const callback: sendUnaryData<RunStepResponse> = (err, response) => {
      expect(mockTestStepMap.TestStepId).to.have.been.calledOnce;
      expect(mockStepExecutor.executeStep).to.have.been.calledWith(protoStep);
      expect(response as RunStepResponse).to.deep.equal(expectedResponse);
      done();
    };
    cogUnderTest.runStep(grpcUnaryCall, callback);
  });

  it('responds with error when step class throws an exception', (done) => {
    const mockStepExecutor: any = {executeStep: sinon.stub()}
    mockStepExecutor.executeStep.throws()
    const mockTestStepMap: any = {TestStepId: sinon.stub()}
    mockTestStepMap.TestStepId.returns(mockStepExecutor);

    cogUnderTest = new Cog(clientWrapperStub, mockTestStepMap);
    protoStep.setStepId('TestStepId');

    const callback: sendUnaryData<RunStepResponse> = (err, response) => {
      expect(response?.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
      done();
    };
    cogUnderTest.runStep(grpcUnaryCall, callback);
  });

});

describe('Cog:RunSteps', () => {
  const expect = chai.expect;
  let protoStep: ProtoStep;
  let runStepRequest: RunStepRequest;
  let grpcDuplexStream: any;
  let cogUnderTest: Cog;
  let clientWrapperStub: any;

  beforeEach(() => {
    protoStep = new ProtoStep();
    runStepRequest = new RunStepRequest();
    grpcDuplexStream = new Duplex({objectMode: true});
    grpcDuplexStream._write = sinon.stub().callsArg(2);
    grpcDuplexStream._read = sinon.stub();
    grpcDuplexStream.metadata = new Metadata();
    clientWrapperStub = sinon.stub();
    cogUnderTest = new Cog(clientWrapperStub);
  });

  it('authenticates client wrapper with call metadata', () => {
    runStepRequest.setStep(protoStep);

    // Construct grpc metadata and assert the client was authenticated.
    grpcDuplexStream.metadata.add('anythingReally', 'some-value');

    cogUnderTest.runSteps(grpcDuplexStream);
    grpcDuplexStream.emit('data', runStepRequest);
    expect(clientWrapperStub).to.have.been.calledWith(grpcDuplexStream.metadata);

    // Does not attempt to reinstantiate client.
    grpcDuplexStream.emit('data', runStepRequest);
    return expect(clientWrapperStub).to.have.been.calledOnce;
  });

  it('responds with error when called with unknown stepId', (done) => {
    // Construct step request
    protoStep.setStepId('NotRealStep');
    runStepRequest.setStep(protoStep);

    // Open the stream and write a request.
    cogUnderTest.runSteps(grpcDuplexStream);
    grpcDuplexStream.emit('data', runStepRequest);

    // Allow the event loop to continue, then make assertions.
    setTimeout(() => {
      const result: RunStepResponse = grpcDuplexStream._write.lastCall.args[0];
      expect(result.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
      expect(result.getMessageFormat()).to.equal('Unknown step %s');
      done();
    }, 1);
  });

  it('invokes step class as expected', (done) => {
    // Construct a mock step executor and request request
    const expectedResponse = new RunStepResponse();
    const mockStepExecutor: any = {executeStep: sinon.stub()}
    mockStepExecutor.executeStep.resolves(expectedResponse);
    const mockTestStepMap: any = {TestStepId: sinon.stub()}
    mockTestStepMap.TestStepId.returns(mockStepExecutor);
    cogUnderTest = new Cog(clientWrapperStub, mockTestStepMap);
    protoStep.setStepId('TestStepId');
    runStepRequest.setStep(protoStep);

    // Open the stream and write a request.
    cogUnderTest.runSteps(grpcDuplexStream);
    grpcDuplexStream.emit('data', runStepRequest);

    // Allow the event loop to continue, then make assertions.
    setTimeout(() => {
      expect(mockTestStepMap.TestStepId).to.have.been.calledOnce;
      expect(mockStepExecutor.executeStep).to.have.been.calledWith(protoStep);
      expect(grpcDuplexStream._write.lastCall.args[0]).to.deep.equal(expectedResponse);
      done();
    }, 1);
  });

  it('responds with error when step class throws an exception', (done) => {
    // Construct a mock step executor and request request
    const mockStepExecutor: any = {executeStep: sinon.stub()}
    mockStepExecutor.executeStep.throws()
    const mockTestStepMap: any = {TestStepId: sinon.stub()}
    mockTestStepMap.TestStepId.returns(mockStepExecutor);
    cogUnderTest = new Cog(clientWrapperStub, mockTestStepMap);
    protoStep.setStepId('TestStepId');
    runStepRequest.setStep(protoStep);

    // Open the stream and write a request.
    cogUnderTest.runSteps(grpcDuplexStream);
    grpcDuplexStream.emit('data', runStepRequest);

    // Allow the event loop to continue, then make assertions.
    setTimeout(() => {
      const response: RunStepResponse = grpcDuplexStream._write.lastCall.args[0];
      expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
      done();
    });
  });

});
