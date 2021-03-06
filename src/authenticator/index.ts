import axios, { AxiosResponse } from 'axios';
import { config } from '../config';
import Logger from '../helpers/logger';

export class FronteggAuthenticator {

  public accessToken: string = '';
  private accessTokenExpiry = Date.now();
  private clientId: string = '';
  private apiKey: string = '';

  public async init(clientId: string, apiKey: string) {
    this.clientId = clientId;
    this.apiKey = apiKey;

    return this.authenticate();
  }

  public async refreshAuthentication() {
    await this.authenticate();
  }

  public async validateAuthentication() {
    if (this.accessToken === '' || this.accessTokenExpiry === 0 || Date.now() >= this.accessTokenExpiry) {
      Logger.info('authentication token needs refresh - going to refresh it');
      await this.refreshAuthentication();
    }
  }

  private async authenticate() {
    Logger.info('posting authentication request');

    let response: AxiosResponse<any>;
    try {
      response = await axios.post(config.urls.authenticationService, {
        clientId: this.clientId,
        secret: this.apiKey,
      });
    } catch (e) {
      Logger.error('failed to authenticate with frontegg - ', e.message);
      this.accessToken = '';
      this.accessTokenExpiry = 0;
      throw new Error('Failed to authenticate with frontegg');
    }

    Logger.info('authenticated with frontegg');

    // Get the token and the expiration time
    const { token, expiresIn } = response.data;
    // Save the token
    this.accessToken = token;
    // Next refresh is when we have only 20% of the sliding window remaining
    const nextRefresh = (expiresIn * 1000) * 0.8;
    this.accessTokenExpiry = Date.now() + nextRefresh;

    setTimeout(() => {
      this.refreshAuthentication();
    }, nextRefresh);
  }
}
