import { Controller, Get } from '@nestjs/common';
import { MigrationService } from './services/migration.service';

@Controller()
export class AppController {
  constructor(private readonly migrationService: MigrationService) {}

  @Get('migrate-categories')
  async migrateCategories() {
    await this.migrationService.migrateCategories();
    return 'Categorías migradas con éxito.';
  }

  @Get('migrate-attributes')
  async migrateAttributes() {
    await this.migrationService.migrateAttributes();
    return 'Atributos migrados con éxito.';
  }

  @Get('migrate-attributes-terms')
  async migrateAttributesTerms() {
    await this.migrationService.migrateAllAttributeTerms();
    return 'Términos de atributos migrados con éxito.';
  }

  @Get('migrate-products')
  async migrateProducts() {
    await this.migrationService.migrateProducts();
    return 'Productos migrados con éxito.';
  }

  @Get('migrate-products-variations')
  async migrateProductsVariations() {
    await this.migrationService.migrateProductsVariations();
    return 'Variaciones migradas con éxito.';
  }
}
