import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RedisCacheService } from './redis-cache.service';
import { Url, UrlSchema } from './schemas/url.schema';
import { UrlCleanupService } from './url-cleanup.service';
import { UrlController } from './url.controller';
import { UrlService } from './url.service';
import { WordGeneratorService } from './word-generator.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Url.name, schema: UrlSchema }])],
  controllers: [UrlController],
  providers: [
    RedisCacheService,
    WordGeneratorService,
    UrlService,
    UrlCleanupService,
  ],
  exports: [RedisCacheService],
})
export class UrlModule {}
