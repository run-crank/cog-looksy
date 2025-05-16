import { BaseStep, Field, StepInterface, ExpectedRecord } from '../../core/base-step';
import { Step, FieldDefinition, StepDefinition, RecordDefinition, RunStepResponse } from '../../proto/cog_pb';
const fs = require('fs');
const path = require('path');

export class CompareImagesUsingRMSE extends BaseStep implements StepInterface {
  protected stepName: string = 'Compare Images';
  protected stepExpression: string = 'compare (?<image1>.+) and (?<image2>.+) using looksy with allowed rmse (?<rmse>[\\d.]+)';
  protected stepType: StepDefinition.Type = StepDefinition.Type.VALIDATION;
  protected actionList: string[] = ['compare'];
  protected targetObject: string = 'Compare Images';
  protected expectedFields: Field[] = [{
    field: 'image1',
    type: FieldDefinition.Type.STRING,
    description: 'The first image to compare',
  }, {
    field: 'image2',
    type: FieldDefinition.Type.STRING,
    description: 'The second image to compare',
  }, {
    field: 'rmse',
    type: FieldDefinition.Type.NUMERIC,
    description: 'The allowed RMSE value',
  }];

  protected expectedRecords: ExpectedRecord[] = [{
    id: 'imageComparisonResult',
    type: RecordDefinition.Type.KEYVALUE,
    fields: [{
      field: 'rmse',
      type: FieldDefinition.Type.NUMERIC,
      description: 'The RMSE value',
    }, {
      field: 'sucess',
      type: FieldDefinition.Type.STRING,
      description: 'Whether the comparison was successful',
    }],
    dynamicFields: true,
  }];

  async executeStep(step: Step): Promise<RunStepResponse> {
    console.debug('step execution started');
    // Add your implementation here
    const stepData: any = step.getData().toJavaScript();
    const image1 = stepData.image1;
    const image2 = stepData.image2;
    const rmse = stepData.rmse;

    // Log the input parameters
    console.log('Comparing images with the following parameters:');
    console.log(`Image 1: ${image1.substring(0, 50)}...`); // Only log the beginning of the base64 string
    console.log(`Image 2: ${image2.substring(0, 50)}...`); // Only log the beginning of the base64 string
    console.log(`Allowed RMSE: ${rmse}`);

    // Call the Looksy API to compare the images
    try {
      // Make the API call to Looksy's upload_compare_images endpoint
      const response = await this.client.compareImages(image1, image2);
      console.log('Response:', response.body);

      if (response.statusCode !== 200) {
        return this.error('Looksy could not compare the images', [response.statusCode.toString(), response.body.toString()]);
      }

      // Process the response
      if (response && response.body) {
        const result = response.body;
        if (result.rmse === undefined || result.rmse === null) {
          return this.error('Response from Looksy API does not contain RMSE value');
        }
        const actualRmse = result.rmse;

        // Create a record with the comparison results
        const record = this.keyValue('imageComparisonResult', 'Image Comparison Result', {
          rmse: actualRmse,
          success: actualRmse <= rmse ? 'true' : 'false',
          status: result.status,
          diffImageUrl: result.diffImageUrl,
          sourceImage1Url: result.images?.source1?.url,
          sourceImage2Url: result.images?.source2?.url,
          timestamp: result.timestamp,
        });

        // Determine if the comparison passed based on the RMSE threshold
        if (actualRmse <= rmse) {
          return this.pass(
            'Images compared successfully with RMSE of %d (threshold: %d)',
            [actualRmse, rmse],
            [record],
          );
        } else {
          return this.fail(
            'Image comparison failed with RMSE of %d, which exceeds the threshold of %d',
            [actualRmse, rmse],
            [record],
          );
        }
      } else {
        return this.error('Received an invalid response from the Looksy API');
      }
    } catch (error) {
      return this.error('Error calling Looksy API: %s', [error.toString()]);
    }
  }
}

export { CompareImagesUsingRMSE as Step };
