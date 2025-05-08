import * as grpc from 'grpc';
import * as needle from 'needle';
import { Field } from '../core/base-step';
import { FieldDefinition } from '../proto/cog_pb';
import { ImageComparisonMixin } from './mixins/image-comparison';
import { LooksyApiClient } from './looksy-api-client';
/**
 * This is a wrapper class around the API client for your Cog. An instance of
 * this class is passed to the constructor of each of your steps, and can be
 * accessed on each step as this.client.
 */
class ClientWrapper {

  /**
   * This is an array of field definitions, each corresponding to a field that
   * your API client requires for authentication. Depending on the underlying
   * system, this could include bearer tokens, basic auth details, endpoints,
   * etc.
   *
   * If your Cog does not require authentication, set this to an empty array.
   */
  public static expectedAuthFields: Field[] = [{
    field: 'endpoint',
    type: FieldDefinition.Type.URL,
    description: 'REST API endpoint, e.g. https://image-compare-service-722879364416.us-central1.run.app',
  },
  ];

  /**
   * Private instance of the wrapped API client. You will almost certainly want
   * to swap this out for an API client specific to your Cog's needs.
   */
  client: LooksyApiClient;

  /**
   * Constructs an instance of the ClientWwrapper, authenticating the wrapped
   * client in the process.
   *
   * @param auth - An instance of GRPC Metadata for a given RunStep or RunSteps
   *   call. Will be populated with authentication metadata according to the
   *   expectedAuthFields array defined above.
   *
   * @param clientConstructor - An optional parameter Used only as a means to
   *   simplify automated testing. Should default to the class/constructor of
   *   the underlying/wrapped API client.
   */
  constructor (auth: grpc.Metadata, clientConstructor = LooksyApiClient) {
    // Call auth.get() for any field defined in the static expectedAuthFields
    // array here. The argument passed to get() should match the "field" prop
    // declared on the definition object above.
    console.debug('creating auth constructor');
    const endpoint = auth.get('endpoint')[0].toString();
    console.debug('endpoint', endpoint);
    this.client = new clientConstructor(endpoint, needle);
  }

}

interface ClientWrapper extends ImageComparisonMixin {}
applyMixins(ClientWrapper, [ImageComparisonMixin]);

function applyMixins(derivedCtor: any, baseCtors: any[]) {
  baseCtors.forEach((baseCtor) => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
          // tslint:disable-next-line:max-line-length
      Object.defineProperty(derivedCtor.prototype, name, Object.getOwnPropertyDescriptor(baseCtor.prototype, name));
    });
  });
}

export { ClientWrapper as ClientWrapper };
