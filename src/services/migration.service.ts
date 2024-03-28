import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { OAuthService } from './oauth.service';

@Injectable()
export class MigrationService {
  private readonly sourceWooCommerceURL: string;
  private readonly sourceWooCommerceKey: string;
  private readonly sourceWooCommerceSecret: string;

  constructor(private readonly oauthService: OAuthService) {
    this.sourceWooCommerceURL = process.env.SOURCE_WC_URL;
    this.sourceWooCommerceKey = process.env.SOURCE_WC_KEY;
    this.sourceWooCommerceSecret = process.env.SOURCE_WC_SECRET;
  }

  async migrateCategories() {
    try {
      let allCategories = [];
      let page = 1;
      let totalPages = 1;

      while (page <= totalPages) {
        const categoriesResponse = await axios.get(
          `${this.sourceWooCommerceURL}/wp-json/wc/v3/products/categories`,
          {
            auth: {
              username: this.sourceWooCommerceKey,
              password: this.sourceWooCommerceSecret,
            },
            params: {
              page: page,
            },
          },
        );

        allCategories = allCategories.concat(categoriesResponse.data);

        totalPages = Number(categoriesResponse.headers['x-wp-totalpages']);

        page++;
      }

      console.log('Total categories to migrate:', allCategories.length);

      const destinationWooCommerceURL = process.env.DESTINATION_WC_URL;
      const apiUrl = `${destinationWooCommerceURL}/wp-json/wc/v3/products/categories`;

      for (const category of allCategories) {
        try {
          delete category.id;
          delete category.meta_data;

          const authorizationHeader = this.oauthService.getAuthorizationHeader(
            apiUrl,
            'POST',
          );

          await axios.post(apiUrl, category, {
            headers: {
              Authorization: authorizationHeader,
              'Content-Type': 'application/json',
            },
          });

          console.log(`Category migrated: ${category.name}`);
        } catch (e) {
          console.log('Error migrating a category:', e);
        }
      }
    } catch (error) {
      console.error('Error during category migration:', error);
    }
  }
}
