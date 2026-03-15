import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model } from 'mongoose';
import { RedisCacheService } from './redis-cache.service';
import { Url, UrlDocument } from './schemas/url.schema';
import { WordGeneratorService } from './word-generator.service';

@Injectable()
export class UrlService {
  private readonly logger = new Logger(UrlService.name);

  constructor(
    @InjectModel(Url.name) private urlModel: Model<UrlDocument>,
    private readonly wordGeneratorService: WordGeneratorService,
    private readonly redisCacheService: RedisCacheService,
  ) {}

  /**
   * Creates a shortened URL for the given original URL
   * Returns the camelCased short code for display
   */
  async createShortUrl(
    originalUrl: string,
    useEmoji = false,
    password?: string,
  ): Promise<{ shortCode: string; shortUrl: string }> {
    // Only reuse existing code if no password is set (password links are always unique)
    if (!password) {
      const existingMappings = await this.urlModel
        .find({ originalUrl, passwordHash: null })
        .exec();

      const match = existingMappings.find((m) => {
        const isEmoji = !/^[a-zA-Z]+$/.test(m.shortCode);
        return useEmoji ? isEmoji : !isEmoji;
      });

      if (match) {
        return {
          shortCode: match.shortCode,
          shortUrl: `/${match.shortCode}`,
        };
      }
    }

    // Generate a unique short code
    let shortCode: string = '';
    let normalizedCode: string = '';
    let exists = true;

    while (exists) {
      shortCode = useEmoji
        ? this.wordGeneratorService.generateEmojiCode()
        : this.wordGeneratorService.generateShortCode();
      normalizedCode = this.wordGeneratorService.normalizeShortCode(shortCode);
      exists = !!(await this.urlModel.findOne({ normalizedCode }).exec());
    }

    // Create and save the new URL mapping
    const passwordHash = password
      ? await bcrypt.hash(password, 10)
      : null;

    const newUrl = new this.urlModel({
      originalUrl,
      shortCode,
      normalizedCode,
      lastAccessedAt: new Date(),
      passwordHash,
    });

    await newUrl.save();

    // Warm the cache (skip for password-protected URLs)
    if (!passwordHash) {
      await this.redisCacheService.setUrl(normalizedCode, originalUrl);
    }

    return {
      shortCode,
      shortUrl: `/${shortCode}`,
    };
  }

  /**
   * Retrieves the original URL for a given short code
   * Uses Redis cache-aside: check cache first, fall back to MongoDB
   * Updates lastAccessedAt and increments click count
   */
  async getOriginalUrl(shortCode: string): Promise<string> {
    const normalizedCode =
      this.wordGeneratorService.normalizeShortCode(shortCode);

    // Try Redis first
    const cached = await this.redisCacheService.getUrl(normalizedCode);

    if (cached) {
      this.logger.debug(`Cache hit: ${normalizedCode}`);
      // Fire-and-forget Mongo update for clicks + recency
      void this.urlModel
        .updateOne(
          { normalizedCode },
          { $inc: { clicks: 1 }, $set: { lastAccessedAt: new Date() } },
        )
        .exec();
      void this.redisCacheService.touchRecency(normalizedCode);
      return cached;
    }

    this.logger.debug(`Cache miss: ${normalizedCode}`);

    const urlDoc = await this.urlModel
      .findOneAndUpdate(
        { normalizedCode },
        { $inc: { clicks: 1 }, $set: { lastAccessedAt: new Date() } },
        { new: true },
      )
      .exec();

    if (!urlDoc) {
      throw new NotFoundException(
        `Short URL not found: ${shortCode}. Please check the URL and try again.`,
      );
    }

    // Populate cache for next hit (skip password-protected)
    if (!urlDoc.passwordHash) {
      await this.redisCacheService.setUrl(normalizedCode, urlDoc.originalUrl);
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

  /**
   * Check if a short code is password-protected
   */
  async isPasswordProtected(shortCode: string): Promise<boolean> {
    const normalizedCode =
      this.wordGeneratorService.normalizeShortCode(shortCode);
    const urlDoc = await this.urlModel.findOne({ normalizedCode }).exec();
    return !!urlDoc?.passwordHash;
  }

  /**
   * Verify password and return original URL if correct
   */
  async verifyPasswordAndGetUrl(
    shortCode: string,
    password: string,
  ): Promise<string> {
    const normalizedCode =
      this.wordGeneratorService.normalizeShortCode(shortCode);

    const urlDoc = await this.urlModel
      .findOneAndUpdate(
        { normalizedCode },
        { $inc: { clicks: 1 }, $set: { lastAccessedAt: new Date() } },
        { new: true },
      )
      .exec();

    if (!urlDoc) {
      throw new NotFoundException('Short URL not found.');
    }

    if (!urlDoc.passwordHash) {
      return urlDoc.originalUrl;
    }

    const valid = await bcrypt.compare(password, urlDoc.passwordHash);
    if (!valid) {
      throw new NotFoundException('Incorrect password.');
    }

    return urlDoc.originalUrl;
  }
}
