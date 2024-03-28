import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { OAuthService } from './oauth.service';

@Injectable()
export class MigrationService {
  private readonly sourceWooCommerceURL: string;
  private readonly sourceWooCommerceKey: string;
  private readonly sourceWooCommerceSecret: string;
  private readonly destinationWooCommerceURL: string;

  constructor(private readonly oauthService: OAuthService) {
    this.sourceWooCommerceURL = process.env.SOURCE_WC_URL;
    this.sourceWooCommerceKey = process.env.SOURCE_WC_KEY;
    this.sourceWooCommerceSecret = process.env.SOURCE_WC_SECRET;
    this.destinationWooCommerceURL = process.env.DESTINATION_WC_URL;
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

      const apiUrl = `${this.destinationWooCommerceURL}/wp-json/wc/v3/products/categories`;

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

  async migrateAttributes() {
    try {
      // Obtener atributos de productos del WooCommerce de origen
      const attributesResponse = await axios.get(
        `${this.sourceWooCommerceURL}/wp-json/wc/v3/products/attributes`,
        {
          auth: {
            username: this.sourceWooCommerceKey,
            password: this.sourceWooCommerceSecret,
          },
        },
      );

      const attributes = attributesResponse.data;

      console.log('Total attributes to migrate:', attributes.length);

      const apiUrl = `${this.destinationWooCommerceURL}/wp-json/wc/v3/products/attributes`;

      for (const attribute of attributes) {
        try {
          // Eliminar propiedades que no son necesarias
          delete attribute.id;
          delete attribute._links;
          console.log(attribute);

          const authorizationHeader = this.oauthService.getAuthorizationHeader(
            apiUrl,
            'POST',
          );

          await axios.post(apiUrl, attribute, {
            headers: {
              Authorization: authorizationHeader,
              'Content-Type': 'application/json',
            },
          });

          console.log(`Attribute migrated: ${attribute.name}`);
        } catch (e) {
          console.log('Error migrating an attribute:', e);
        }
      }
    } catch (error) {
      console.error('Error during attribute migration:', error);
    }
  }

  async migrateAllAttributeTerms() {
    try {
      // Obtener atributos de productos del WooCommerce de origen
      const attributesResponse = await axios.get(
        `${this.sourceWooCommerceURL}/wp-json/wc/v3/products/attributes`,
        {
          auth: {
            username: this.sourceWooCommerceKey,
            password: this.sourceWooCommerceSecret,
          },
        },
      );

      const attributes = attributesResponse.data;

      console.log('Total attributes to migrate terms:', attributes.length);

      // Iterar sobre cada atributo para obtener sus términos y migrarlos al destino
      for (const attribute of attributes) {
        try {
          const attributeId = attribute.id;
          await this.migrateAttributeTerms(attributeId);
        } catch (e) {
          console.log(
            `Error migrating attribute terms for attribute ID ${attribute.id}:`,
            e,
          );
        }
      }
    } catch (error) {
      console.error('Error during migration of attribute terms:', error);
    }
  }

  async migrateAttributeTerms(attributeId: number) {
    try {
      // Obtener términos de atributo del WooCommerce de origen
      const termsResponse = await axios.get(
        `${this.sourceWooCommerceURL}/wp-json/wc/v3/products/attributes/${attributeId}/terms`,
        {
          auth: {
            username: this.sourceWooCommerceKey,
            password: this.sourceWooCommerceSecret,
          },
        },
      );

      const terms = termsResponse.data;

      console.log(
        `Total terms to migrate for attribute ID ${attributeId}:`,
        terms.length,
      );

      const apiUrl = `${this.destinationWooCommerceURL}/wp-json/wc/v3/products/attributes/${attributeId}/terms`;

      // Iterar sobre cada término y migrarlo al destino
      for (const term of terms) {
        try {
          // Eliminar propiedades que no son necesarias
          delete term.id;
          delete term._links;
          console.log(term);

          const authorizationHeader = this.oauthService.getAuthorizationHeader(
            apiUrl,
            'POST',
          );

          await axios.post(apiUrl, term, {
            headers: {
              Authorization: authorizationHeader,
              'Content-Type': 'application/json',
            },
          });

          console.log(`Attribute term migrated: ${term.name}`);
        } catch (e) {
          console.log('Error migrating an attribute term:', e);
        }
      }
    } catch (error) {
      console.error(
        `Error during attribute term migration for attribute ID ${attributeId}:`,
        error,
      );
    }
  }
}
