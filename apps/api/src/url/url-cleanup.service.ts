import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { RedisCacheService } from './redis-cache.service';
import { Url, UrlDocument } from './schemas/url.schema';

@Injectable()
export class UrlCleanupService {
  private readonly logger = new Logger(UrlCleanupService.name);
  private readonly inactivityDays: number;
  private readonly maxUrls: number;
  private readonly batchSize = 500;

  constructor(
    @InjectModel(Url.name) private urlModel: Model<UrlDocument>,
    private readonly redisCacheService: RedisCacheService,
    private readonly configService: ConfigService,
  ) {
    this.inactivityDays = this.configService.get<number>(
      'URL_INACTIVITY_DAYS',
      7,
    );
    this.maxUrls = this.configService.get<number>('MONGO_MAX_URLS', 100000);
  }

  /** Runs every hour — deletes URLs inactive for N days, then enforces max count */
  @Cron(CronExpression.EVERY_HOUR)
  async handleCleanup() {
    this.logger.log('Starting URL cleanup job');
    const startTime = Date.now();

    const inactiveDeleted = await this.deleteInactiveUrls();
    const capDeleted = await this.enforceMaxUrls();

    const elapsed = Date.now() - startTime;
    this.logger.log(
      `Cleanup done in ${elapsed}ms — inactive: ${inactiveDeleted}, cap: ${capDeleted}`,
    );
  }

  /** Delete URLs not accessed in the last N days */
  private async deleteInactiveUrls(): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.inactivityDays);

    let totalDeleted = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const staleUrls = await this.urlModel
        .find({
          $or: [
            { lastAccessedAt: { $lt: cutoff } },
            // Legacy docs without lastAccessedAt fall back to createdAt
            { lastAccessedAt: { $exists: false }, createdAt: { $lt: cutoff } },
          ],
        })
        .select('normalizedCode')
        .limit(this.batchSize)
        .lean()
        .exec();

      if (staleUrls.length === 0) break;

      const codes = staleUrls.map((u) => u.normalizedCode);
      const ids = staleUrls.map((u) => u._id);

      await this.urlModel.deleteMany({ _id: { $in: ids } }).exec();
      await this.redisCacheService.invalidateMany(codes);

      totalDeleted += staleUrls.length;

      if (staleUrls.length < this.batchSize) break;
    }

    if (totalDeleted > 0) {
      this.logger.log(
        `Deleted ${totalDeleted} URLs inactive for ${this.inactivityDays}+ days`,
      );
    }

    return totalDeleted;
  }

  /** Enforce max URL count by deleting oldest-accessed records first */
  private async enforceMaxUrls(): Promise<number> {
    const count = await this.urlModel.countDocuments().exec();

    if (count <= this.maxUrls) return 0;

    const excess = count - this.maxUrls;
    let totalDeleted = 0;
    let remaining = excess;

    while (remaining > 0) {
      const batch = Math.min(remaining, this.batchSize);

      const oldest = await this.urlModel
        .find()
        .sort({ lastAccessedAt: 1, createdAt: 1 })
        .select('normalizedCode')
        .limit(batch)
        .lean()
        .exec();

      if (oldest.length === 0) break;

      const codes = oldest.map((u) => u.normalizedCode);
      const ids = oldest.map((u) => u._id);

      await this.urlModel.deleteMany({ _id: { $in: ids } }).exec();
      await this.redisCacheService.invalidateMany(codes);

      totalDeleted += oldest.length;
      remaining -= oldest.length;
    }

    if (totalDeleted > 0) {
      this.logger.log(
        `Enforced cap: deleted ${totalDeleted} oldest URLs (max: ${this.maxUrls})`,
      );
    }

    return totalDeleted;
  }
}
