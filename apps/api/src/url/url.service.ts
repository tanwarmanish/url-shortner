import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Url, UrlDocument } from './schemas/url.schema';
import { WordGeneratorService } from './word-generator.service';

@Injectable()
export class UrlService {
  constructor(
    @InjectModel(Url.name) private urlModel: Model<UrlDocument>,
    private readonly wordGeneratorService: WordGeneratorService,
  ) {}

  /**
   * Creates a shortened URL for the given original URL
   * Returns the camelCased short code for display
   */
  async createShortUrl(
    originalUrl: string,
  ): Promise<{ shortCode: string; shortUrl: string }> {
    // Check if URL already exists to avoid duplicates
    const existingMapping = await this.urlModel
      .findOne({ originalUrl })
      .exec();

    if (existingMapping) {
      return {
        shortCode: existingMapping.shortCode,
        shortUrl: `/${existingMapping.shortCode}`,
      };
    }

    // Generate a unique short code
    let shortCode: string = '';
    let normalizedCode: string = '';
    let exists = true;

    while (exists) {
      shortCode = this.wordGeneratorService.generateShortCode();
      normalizedCode = this.wordGeneratorService.normalizeShortCode(shortCode);
      exists = !!(await this.urlModel.findOne({ normalizedCode }).exec());
    }

    // Create and save the new URL mapping
    const newUrl = new this.urlModel({
      originalUrl,
      shortCode,
      normalizedCode,
    });

    await newUrl.save();

    return {
      shortCode,
      shortUrl: `/${shortCode}`,
    };
  }

  /**
   * Retrieves the original URL for a given short code
   * Handles case-insensitive lookup and increments click count
   */
  async getOriginalUrl(shortCode: string): Promise<string> {
    const normalizedCode =
      this.wordGeneratorService.normalizeShortCode(shortCode);

    const urlDoc = await this.urlModel
      .findOneAndUpdate(
        { normalizedCode },
        { $inc: { clicks: 1 } },
        { new: true },
      )
      .exec();

    if (!urlDoc) {
      throw new NotFoundException(
        `Short URL not found: ${shortCode}. Please check the URL and try again.`,
      );
    }

    return urlDoc.originalUrl;
  }

  /**
   * Gets all URL mappings (for debugging/admin purposes)
   */
  async getAllMappings(): Promise<Url[]> {
    return this.urlModel.find().sort({ createdAt: -1 }).exec();
  }

  /**
   * Get URL stats by short code
   */
  async getUrlStats(shortCode: string): Promise<Url> {
    const normalizedCode =
      this.wordGeneratorService.normalizeShortCode(shortCode);

    const urlDoc = await this.urlModel.findOne({ normalizedCode }).exec();

    if (!urlDoc) {
      throw new NotFoundException(
        `Short URL not found: ${shortCode}. Please check the URL and try again.`,
      );
    }

    return urlDoc;
  }
}
