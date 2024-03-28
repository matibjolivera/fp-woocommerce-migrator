// oauth.service.ts

import { Injectable } from '@nestjs/common';
import * as OAuth from 'oauth-1.0a';
import { createHmac } from 'crypto';

@Injectable()
export class OAuthService {
  private consumerKey: string;
  private consumerSecret: string;
  private baseUrl: string;

  private oauth: OAuth;

  constructor() {
    this.consumerKey = process.env.WC_CONSUMER_KEY;
    this.consumerSecret = process.env.WC_CONSUMER_SECRET;
    this.baseUrl = process.env.WC_BASE_URL; // URL base de la API de WooCommerce

    this.oauth = new OAuth({
      consumer: {
        key: this.consumerKey,
        secret: this.consumerSecret,
      },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string, key) {
        return createHmac('sha1', key).update(base_string).digest('base64');
      },
    });
  }

  getAuthorizationHeader(url: string, method: string): string {
    const requestData = {
      url: url,
      method: method,
    };

    const oauthData = this.oauth.authorize(requestData);

    return this.oauth.toHeader(oauthData).Authorization;
  }
}
