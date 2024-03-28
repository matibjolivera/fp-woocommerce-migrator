import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MigrationService } from './services/migration.service';
import { OAuthService } from './services/oauth.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, MigrationService, OAuthService],
})
export class AppModule {}
