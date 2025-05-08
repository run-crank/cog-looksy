import { LooksyApiClient } from '../looksy-api-client';

export class ImageComparisonMixin {
  client: LooksyApiClient;

  public async compareImages(image1: string, image2: string) {
    return this.client.compareImages(image1, image2);
  }
}
