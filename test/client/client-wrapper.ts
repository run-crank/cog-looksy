import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';
import * as needle from 'needle';

import { ClientWrapper } from '../../src/client/client-wrapper';
import { Metadata } from 'grpc';

chai.use(sinonChai);

describe('ClientWrapper', () => {
  const expect = chai.expect;
  let clientConstructorStub: any;
  let metadata: Metadata;
  let clientWrapperUnderTest: ClientWrapper;

  beforeEach(() => {
    clientConstructorStub = sinon.stub();
    clientConstructorStub.prototype.compareImages = sinon.stub();
    
    metadata = new Metadata();
    metadata.add('endpoint', 'https://image-compare-service.example.com');
  });

  it('authenticates with the endpoint', () => {
    // Create a new client wrapper with our metadata
    clientWrapperUnderTest = new ClientWrapper(metadata, clientConstructorStub);
    
    // Assert that the client constructor was called with the correct endpoint and needle
    expect(clientConstructorStub).to.have.been.calledWith(
      'https://image-compare-service.example.com',
      needle
    );
  });

  it('compareImages passes through to the client', async () => {
    const image1 = 'base64encodedimage1';
    const image2 = 'base64encodedimage2';
    const expectedResponse = {
      statusCode: 200,
      body: {
        rmse: 0.5,
        status: 'success',
        diffImageUrl: 'https://example.com/diff.png',
        images: {
          source1: { url: 'https://example.com/image1.png' },
          source2: { url: 'https://example.com/image2.png' }
        },
        timestamp: '2023-01-01T00:00:00Z'
      }
    };
    
    clientConstructorStub.prototype.compareImages.resolves(expectedResponse);
    clientWrapperUnderTest = new ClientWrapper(metadata, clientConstructorStub);
    
    const result = await clientWrapperUnderTest.compareImages(image1, image2);
    
    expect(clientWrapperUnderTest.client.compareImages).to.have.been.calledWith(image1, image2);
    expect(result).to.deep.equal(expectedResponse);
  });
});
