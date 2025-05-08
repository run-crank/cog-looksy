import { expect } from 'chai';
import * as sinon from 'sinon';
import * as needle from 'needle';
import { LooksyApiClient } from '../../src/client/looksy-api-client';
import { API_ENDPOINTS } from '../../src/client/constants/endpoints';

describe('LooksyApiClient', () => {
    let client: LooksyApiClient;
    let needleStub: sinon.SinonStub;

    beforeEach(() => {
        needleStub = sinon.stub();
        client = new LooksyApiClient('https://api.example.com', needleStub as any);
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('constructor', () => {
        it('should initialize with correct endpoint', () => {
            expect(client).to.be.instanceOf(LooksyApiClient);
        });

        it('should remove trailing slash from endpoint', () => {
            const clientWithSlash = new LooksyApiClient('https://api.example.com/', needleStub as any);
            expect(clientWithSlash).to.be.instanceOf(LooksyApiClient);
        });
    });

    describe('compareImages', () => {
        const mockImage1 = 'base64image1';
        const mockImage2 = 'base64image2';
        const mockResponse = {
            statusCode: 200,
            body: {
                status: 'success',
                rmse: 0.3,
                diffImageUrl: 'https://example.com/diff.png',
                images: {
                    source1: { url: 'https://example.com/image1.png' },
                    source2: { url: 'https://example.com/image2.png' }
                },
                timestamp: '2024-03-20T12:00:00Z'
            }
        };

        it('should successfully compare images', async () => {
            needleStub.resolves(mockResponse);

            const result = await client.compareImages(mockImage1, mockImage2);

            expect(needleStub.calledOnce).to.be.true;
            expect(needleStub.firstCall.args[0]).to.equal('post');
            expect(needleStub.firstCall.args[1]).to.equal(`https://api.example.com${API_ENDPOINTS.COMPARE_IMAGES}`);
            expect(needleStub.firstCall.args[2]).to.deep.equal({
                image1_base64: mockImage1,
                image2_base64: mockImage2
            });
            expect(result).to.deep.equal(mockResponse);
        });

        it('should handle API errors', async () => {
            const apiError = new Error('API Error');
            needleStub.rejects(apiError);

            try {
                await client.compareImages(mockImage1, mockImage2);
                expect.fail('Should have thrown an error');
            } catch (err) {
                expect(err.message).to.equal('Error comparing images: Error: API Error');
            }
        });
    });
}); 