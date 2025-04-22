import { BaseCommand } from '$cli/command';
import { server } from '@colibri-hq/sdk/oauth';

export class OAuthCommand extends BaseCommand<typeof OAuthCommand> {
  static description = 'Show information about the OAuth server';

  public async run() {
    const { instance } = this.flags;
    const { configuration } = server(instance, {
      issuer: process.env.ISSUER_URL!,
      jwtSecret: process.env.JWT_SECRET_KEY!,
    });

    this.log('OAuth Server Information:');
    this.log(`Authorization Endpoint: ${configuration.authorizationEndpoint}`);
    this.log(`Token Endpoint: ${configuration.tokenEndpoint}`);
    this.log(`Revocation Endpoint: ${configuration.revocationEndpoint}`);
    this.log(`Introspection Endpoint: ${configuration.introspectionEndpoint}`);
    this.log(`Scopes Supported: ${configuration.scopesSupported.join(', ')}`);
    this.log(`Response Types Supported: ${configuration.responseTypesSupported.join(', ')}`);
    this.log(`Grant Types Supported: ${configuration.grantTypesSupported.join(', ')}`);
    this.log(`Token Endpoint Authentication Methods Supported: ${configuration.tokenEndpointAuthMethodsSupported.join(
      ', ')}`);
    this.log(`Token Endpoint Authentication Signing Algorithms Supported: ${configuration.tokenEndpointAuthSigningAlgValuesSupported.join(
      ', ')}`);
    this.log(`JWKs URI: ${configuration.jwksUri}`);
    this.log(`Registration Endpoint: ${configuration.registrationEndpoint}`);
    this.log(`Issuer: ${configuration.issuer}`);
    this.log(`Authorization Response Types Supported: ${configuration.authorizationResponseTypesSupported.join(
      ', ')}`);
    this.log(`User Info Endpoint: ${configuration.userInfoEndpoint}`);
    this.log(`User Info Signing Algorithm: ${configuration.userInfoSigningAlg}`);
    this.log(`User Info Signing Key: ${configuration.userInfoSigningKey}`);
    this.log(`User Info Encryption Algorithm: ${configuration.userInfoEncryptionAlg}`);
    this.log(`User Info Encryption Key: ${configuration.userInfoEncryptionKey}`);
    this.log(`User Info Encryption Method: ${configuration.userInfoEncryptionMethod}`);
    this.log(`User Info Signing Algorithm: ${configuration.userInfoSigningAlg}`);
    this.log(`User Info Signing Key: ${configuration.userInfoSigningKey}`);
    this.log(`User Info Encryption Algorithm: ${configuration.userInfoEncryptionAlg}`);
    this.log(`User Info Encryption Key: ${configuration.userInfoEncryptionKey}`);
    this.log(`User Info Encryption Method: ${configuration.userInfoEncryptionMethod}`);
  }
}
