import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import * as chai from 'chai';
import { default as sinon } from 'ts-sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';

import { Step as CompareImagesUsingRMSE } from '../../../src/steps/images/image-comparison';
import { ClientWrapper } from '../../../src/client/client-wrapper';
import { base64Image1, base64Image2 } from '../../test-data';
import { StepDefinition, FieldDefinition, RunStepResponse } from '../../../src/proto/cog_pb';

chai.use(sinonChai);

describe('CompareImagesUsingRMSE', () => {
  const expect = chai.expect;
  let protoStep: any;
  let stepUnderTest: CompareImagesUsingRMSE;
  let clientWrapperStub: any;

  beforeEach(() => {
    clientWrapperStub = sinon.stub();
    clientWrapperStub.compareImages = sinon.stub();
    stepUnderTest = new CompareImagesUsingRMSE(clientWrapperStub);
    protoStep = { getData: () => new Struct() };
  });

  describe('Metadata', () => {
    it('should return expected step metadata', () => {
      const stepDef = stepUnderTest.getDefinition();
      expect(stepDef.getStepId()).to.equal('CompareImagesUsingRMSE');
      expect(stepDef.getName()).to.equal('Compare Images');
      expect(stepDef.getExpression()).to.equal('compare (?<image1>.+) and (?<image2>.+) using looksy with allowed rmse (?<rmse>[\\d.]+)');
      expect(stepDef.getType()).to.equal(StepDefinition.Type.VALIDATION);
    });

    it('should return expected step fields', () => {
      const stepDef = stepUnderTest.getDefinition();
      const fields = stepDef.getExpectedFieldsList();

      const image1 = fields.find(f => f.getKey() === 'image1');
      expect(image1).to.not.be.undefined;
      expect(image1?.getType()).to.equal(FieldDefinition.Type.STRING);
      expect(image1?.getOptionality()).to.equal(FieldDefinition.Optionality.REQUIRED);

      const image2 = fields.find(f => f.getKey() === 'image2');
      expect(image2).to.not.be.undefined;
      expect(image2?.getType()).to.equal(FieldDefinition.Type.STRING);
      expect(image2?.getOptionality()).to.equal(FieldDefinition.Optionality.REQUIRED);

      const rmse = fields.find(f => f.getKey() === 'rmse');
      expect(rmse).to.not.be.undefined;
      expect(rmse?.getType()).to.equal(FieldDefinition.Type.NUMERIC);
      expect(rmse?.getOptionality()).to.equal(FieldDefinition.Optionality.REQUIRED);
    });
  });

  describe('ExecuteStep', () => {
    describe('Image comparison success', () => {
      beforeEach(() => {
        protoStep = {
          getData: () => ({
            toJavaScript: () => ({
              image1: base64Image1,
              image2: base64Image2,
              rmse: 0.5,
            }),
          }),
        };
        clientWrapperStub.compareImages.returns(Promise.resolve({
          statusCode: 200,
          body: {
            rmse: 0.3,
            status: 'success',
            diffImageUrl: 'https://example.com/diff.png',
            images: {
              source1: { url: 'https://example.com/image1.png' },
              source2: { url: 'https://example.com/image2.png' },
            },
            timestamp: '2024-03-20T12:00:00Z',
          },
        }));
      });

      it('should respond with pass', async () => {
        const response = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
      });
    });

    describe('Image comparison failure', () => {
      beforeEach(() => {
        protoStep = {
          getData: () => ({
            toJavaScript: () => ({
              image1: base64Image1,
              image2: base64Image2,
              rmse: 0.1,
            }),
          }),
        };
        clientWrapperStub.compareImages.returns(Promise.resolve({
          statusCode: 200,
          body: {
            rmse: 0.3,
            status: 'success',
            diffImageUrl: 'https://example.com/diff.png',
            images: {
              source1: { url: 'https://example.com/image1.png' },
              source2: { url: 'https://example.com/image2.png' },
            },
            timestamp: '2024-03-20T12:00:00Z',
          },
        }));
      });

      it('should respond with fail', async () => {
        const response = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
      });
    });

    describe('API Error', () => {
      beforeEach(() => {
        protoStep = {
          getData: () => ({
            toJavaScript: () => ({
              image1: base64Image1,
              image2: base64Image2,
              rmse: 0.5,
            }),
          }),
        };
        clientWrapperStub.compareImages.returns(Promise.reject(new Error('API Error')));
      });

      it('should respond with error', async () => {
        const response = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
      });
    });

    describe('Invalid Response', () => {
      beforeEach(() => {
        protoStep = {
          getData: () => ({
            toJavaScript: () => ({
              image1: base64Image1,
              image2: base64Image2,
              rmse: 0.5,
            }),
          }),
        };
        clientWrapperStub.compareImages.returns(Promise.resolve({
          statusCode: 200,
          body: {
            status: 'success',
            // Missing rmse field
          },
        }));
      });

      it('should respond with error', async () => {
        const response = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
      });
    });
  });
}); 