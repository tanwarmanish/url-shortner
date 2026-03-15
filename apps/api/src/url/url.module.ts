import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Url, UrlSchema } from './schemas/url.schema';
import { UrlController } from './url.controller';
import { UrlService } from './url.service';
import { WordGeneratorService } from './word-generator.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Url.name, schema: UrlSchema }])],
  controllers: [UrlController],
  providers: [UrlService, WordGeneratorService],
})
export class UrlModule {}
