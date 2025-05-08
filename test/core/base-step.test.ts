import { expect } from 'chai';
import { BaseStep, Field, ExpectedRecord } from '../../src/core/base-step';
import { ClientWrapper } from '../../src/client/client-wrapper';
import { StepDefinition, Step as PbStep, RunStepResponse, StepRecord, TableRecord, BinaryRecord, FieldDefinition, RecordDefinition } from '../../src/proto/cog_pb';
import * as util from '@run-crank/utilities';
import { Metadata } from 'grpc';

class TestStep extends BaseStep {
    protected stepName = 'Test Step';
    protected stepExpression = 'test step';
    protected stepType = StepDefinition.Type.VALIDATION;
    protected expectedFields: Field[] = [
        {
            field: 'testField',
            type: FieldDefinition.Type.STRING,
            description: 'Test field',
            help: 'Test help',
            optionality: FieldDefinition.Optionality.REQUIRED
        }
    ];
    protected expectedRecords: ExpectedRecord[] = [
        {
            id: 'testRecord',
            type: RecordDefinition.Type.KEYVALUE,
            fields: [
                {
                    field: 'testField',
                    type: FieldDefinition.Type.STRING,
                    description: 'Test field'
                }
            ],
            dynamicFields: true
        }
    ];
    protected stepHelp = 'Test help';

    async executeStep(step: PbStep): Promise<RunStepResponse> {
        return this.pass('Test passed');
    }
}

describe('BaseStep', () => {
    let step: TestStep;
    let clientWrapper: ClientWrapper;
    let metadata: Metadata;

    beforeEach(() => {
        metadata = new Metadata();
        metadata.add('endpoint', 'https://api.example.com');
        clientWrapper = new ClientWrapper(metadata);
        step = new TestStep(clientWrapper);
    });

    describe('getId', () => {
        it('should return the constructor name', () => {
            expect(step.getId()).to.equal('TestStep');
        });
    });

    describe('getDefinition', () => {
        it('should return a complete step definition', () => {
            const definition = step.getDefinition();
            expect(definition.getStepId()).to.equal('TestStep');
            expect(definition.getName()).to.equal('Test Step');
            expect(definition.getType()).to.equal(StepDefinition.Type.VALIDATION);
            expect(definition.getExpression()).to.equal('test step');
            expect(definition.getHelp()).to.equal('Test help');

            const fields = definition.getExpectedFieldsList();
            expect(fields.length).to.equal(1);
            expect(fields[0].getKey()).to.equal('testField');
            expect(fields[0].getType()).to.equal(FieldDefinition.Type.STRING);
            expect(fields[0].getDescription()).to.equal('Test field');
            expect(fields[0].getHelp()).to.equal('Test help');
            expect(fields[0].getOptionality()).to.equal(FieldDefinition.Optionality.REQUIRED);

            const records = definition.getExpectedRecordsList();
            expect(records.length).to.equal(1);
            expect(records[0].getId()).to.equal('testRecord');
            expect(records[0].getType()).to.equal(RecordDefinition.Type.KEYVALUE);
            expect(records[0].getMayHaveMoreFields()).to.be.true;

            const recordFields = records[0].getGuaranteedFieldsList();
            expect(recordFields.length).to.equal(1);
            expect(recordFields[0].getKey()).to.equal('testField');
            expect(recordFields[0].getType()).to.equal(FieldDefinition.Type.STRING);
            expect(recordFields[0].getDescription()).to.equal('Test field');
        });
    });

    describe('assert', () => {
        it('should use the utilities assert function', () => {
            const result = step.assert('be', 'test', 'test', 'field');
            expect(result).to.have.property('valid', true);
            expect(result).to.have.property('message', 'The field field was set to test, as expected');
        });
    });

    describe('response methods', () => {
        it('should create a pass response', () => {
            const response = step['pass']('Test passed', ['arg1'], []);
            expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
            expect(response.getMessageFormat()).to.equal('Test passed');
            expect(response.getMessageArgsList().length).to.equal(1);
        });

        it('should create a fail response', () => {
            const response = step['fail']('Test failed', ['arg1'], []);
            expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
            expect(response.getMessageFormat()).to.equal('Test failed');
            expect(response.getMessageArgsList().length).to.equal(1);
        });

        it('should create an error response', () => {
            const response = step['error']('Test error', ['arg1'], []);
            expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
            expect(response.getMessageFormat()).to.equal('Test error');
            expect(response.getMessageArgsList().length).to.equal(1);
        });
    });

    describe('record methods', () => {
        it('should create a key-value record', () => {
            const record = step['keyValue']('id', 'name', { key: 'value' });
            expect(record.getId()).to.equal('id');
            expect(record.getName()).to.equal('name');
            const keyValue = record.getKeyValue();
            expect(keyValue).to.not.be.undefined;
            expect(keyValue?.toJavaScript()).to.deep.equal({ key: 'value' });
        });

        it('should create a table record', () => {
            const record = step['table']('id', 'name', { header: 'Header' }, [{ row: 'value' }]);
            expect(record.getId()).to.equal('id');
            expect(record.getName()).to.equal('name');
            const table = record.getTable();
            expect(table).to.not.be.undefined;
            if (table) {
                const headers = table.getHeaders();
                expect(headers).to.not.be.undefined;
                expect(headers?.toJavaScript()).to.deep.equal({ header: 'Header' });
                const rows = table.getRowsList();
                expect(rows.length).to.equal(1);
                expect(rows[0].toJavaScript()).to.deep.equal({ row: 'value' });
            }
        });

        it('should create a binary record', () => {
            const record = step['binary']('id', 'name', 'image/png', 'base64data');
            expect(record.getId()).to.equal('id');
            expect(record.getName()).to.equal('name');
            const binary = record.getBinary();
            expect(binary).to.not.be.undefined;
            expect(binary?.getMimeType()).to.equal('image/png');
            expect(binary?.getData()).to.equal('base64data');
        });
    });
}); 