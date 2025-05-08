import { expect } from 'chai';
import { baseOperators } from '../../../src/client/constants/operators';

describe('Operators Constants', () => {
    describe('baseOperators', () => {
        it('should contain all expected operators', () => {
            const expectedOperators = [
                'be',
                'not be',
                'contain',
                'not contain',
                'be less than',
                'be greater than'
            ];

            expect(baseOperators).to.deep.equal(expectedOperators);
        });

        it('should be an array', () => {
            expect(Array.isArray(baseOperators)).to.be.true;
        });

        it('should not be empty', () => {
            expect(baseOperators.length).to.be.greaterThan(0);
        });
    });
}); 