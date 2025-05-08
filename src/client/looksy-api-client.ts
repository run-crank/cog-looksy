import * as needle from 'needle';
import { API_ENDPOINTS } from './constants/endpoints';

export class LooksyApiClient {
    private endpoint: string;
    private client: typeof needle;

    constructor(endpoint: string, client: typeof needle) {
        this.endpoint = endpoint.replace(/\/$/, '');
        this.client = client;
    }

    async compareImages(image1: string, image2: string): Promise<any> {

        const url = `${this.endpoint}${API_ENDPOINTS.COMPARE_IMAGES}`;
        const payload = {
            image1_base64: image1,
            image2_base64: image2
        };

        try {
            const response = await this.client('post', url, payload, { json: true });
            return response;
        } catch (error) {
            throw new Error(`Error comparing images: ${error}`);
        }
    }
}