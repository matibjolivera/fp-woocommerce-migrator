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
}
