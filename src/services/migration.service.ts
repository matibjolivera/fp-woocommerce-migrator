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

  private async fetchDataFromSource(
    url: string,
    params: object = {},
  ): Promise<any[]> {
    let data = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const response = await axios.get(url, {
        auth: {
          username: this.sourceWooCommerceKey,
          password: this.sourceWooCommerceSecret,
        },
        params: { ...params, page },
      });

      data = data.concat(response.data);
      totalPages = Number(response.headers['x-wp-totalpages']);
      page++;
    }

    return data;
  }

  private async migrateData(
    data: any[],
    apiUrl: string,
    logPrefix: string,
    migrateCallback,
  ) {
    console.log(`Total items to migrate: ${data.length}`);

    for (const item of data) {
      try {
        await migrateCallback(item, apiUrl);
        console.log(`${logPrefix} migrated: ${item.name}`);
      } catch (e) {
        console.log(`Error migrating a ${logPrefix.toLowerCase()}:`, e);
      }
    }
  }

  async migrateCategories() {
    try {
      const allCategories = await this.fetchDataFromSource(
        `${this.sourceWooCommerceURL}/wp-json/wc/v3/products/categories`,
      );

      const apiUrl = `${this.destinationWooCommerceURL}/wp-json/wc/v3/products/categories`;

      await this.migrateData(
        allCategories,
        apiUrl,
        'Category',
        async (category, apiUrl) => {
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
        },
      );
    } catch (error) {
      console.error('Error during category migration:', error);
    }
  }

  async migrateAttributes() {
    try {
      const allAttributes = await this.fetchDataFromSource(
        `${this.sourceWooCommerceURL}/wp-json/wc/v3/products/attributes`,
      );

      const apiUrl = `${this.destinationWooCommerceURL}/wp-json/wc/v3/products/attributes`;

      await this.migrateData(
        allAttributes,
        apiUrl,
        'Attribute',
        async (attribute, apiUrl) => {
          delete attribute.id;
          delete attribute._links;

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
        },
      );
    } catch (error) {
      console.error('Error during attribute migration:', error);
    }
  }

  async migrateAllAttributeTerms() {
    try {
      const allAttributes = await this.fetchDataFromSource(
        `${this.sourceWooCommerceURL}/wp-json/wc/v3/products/attributes`,
      );

      console.log('Total attributes to migrate terms:', allAttributes.length);

      for (const attribute of allAttributes) {
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
      const apiUrl = `${this.destinationWooCommerceURL}/wp-json/wc/v3/products/attributes/${attributeId}/terms`;

      const allTerms = await this.fetchDataFromSource(
        `${this.sourceWooCommerceURL}/wp-json/wc/v3/products/attributes/${attributeId}/terms`,
      );

      console.log(
        `Total terms to migrate for attribute ID ${attributeId}:`,
        allTerms.length,
      );

      await this.migrateData(
        allTerms,
        apiUrl,
        'Attribute term',
        async (term, apiUrl) => {
          delete term.id;
          delete term._links;

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
        },
      );
    } catch (error) {
      console.error(
        `Error during attribute term migration for attribute ID ${attributeId}:`,
        error,
      );
    }
  }

  async migrateProducts() {
    try {
      // Paso 1: Obtener todos los productos del sitio de origen
      const products = await this.fetchDataFromSource(
        `${this.sourceWooCommerceURL}/wp-json/wc/v3/products`,
      );

      // Paso 2: Migrar cada producto al sitio de destino
      await this.migrateData(
        products,
        `${this.destinationWooCommerceURL}/wp-json/wc/v3/products`,
        'Product',
        async (product: any, apiUrl: string) => {
          try {
            // Extraer las URLs de las imágenes del producto
            const imageUrls = product.images.map((image: any) => ({
              src: image.src,
            }));

            // Crear el objeto de producto a migrar
            const productToMigrate = {
              name: product.name,
              type: product.type,
              regular_price: product.regular_price,
              description: product.description,
              short_description: product.short_description,
              images: imageUrls, // Solo las URLs de las imágenes
            };

            // Migrar el producto al sitio de destino
            const authorizationHeader =
              this.oauthService.getAuthorizationHeader(apiUrl, 'POST');
            const migratedProductResponse = await axios.post(
              apiUrl,
              productToMigrate,
              {
                headers: {
                  Authorization: authorizationHeader,
                  'Content-Type': 'application/json',
                },
              },
            );

            const migratedProduct = migratedProductResponse.data;
            console.log(`Product migrated: ${migratedProduct.name}`);
          } catch (error) {
            console.error('Error migrating product:', error);
          }
        },
      );
    } catch (error) {
      console.error('Error during product migration:', error);
    }
  }

  async migrateProductsVariations() {
    try {
      // 1. Obtener todas las variaciones de productos del sitio de origen
      // 2. Iterar sobre cada variación
      // 3. Migrar cada variación al sitio de destino
      // 4. Manejar las asociaciones de categorías, atributos, etc.
    } catch (error) {
      console.error('Error during variation migration:', error);
    }
  }
}
