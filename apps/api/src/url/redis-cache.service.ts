import {
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

const RECENCY_KEY = 'url:recency';

@Injectable()
export class RedisCacheService implements OnModuleInit, OnModuleDestroy {
  private client!: RedisClientType;
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly maxKeys: number;
  private connected = false;

  constructor(private readonly configService: ConfigService) {
    this.maxKeys = this.configService.get<number>('REDIS_MAX_KEYS', 10000);
  }

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (!redisUrl) {
      this.logger.warn('REDIS_URL not set — cache is disabled');
      return;
    }

    this.client = createClient({ url: redisUrl }) as RedisClientType;
    this.client.on('error', (err) =>
      this.logger.error('Redis client error', err),
    );

    try {
      await this.client.connect();
      this.connected = true;
      this.logger.log('Connected to Redis');
    } catch (err) {
      this.logger.error('Failed to connect to Redis — cache disabled', err);
    }
  }

  async onModuleDestroy() {
    if (this.connected) {
      await this.client.quit();
      this.logger.log('Redis connection closed');
    }
  }

  isAvailable(): boolean {
    return this.connected;
  }

  /** Get cached originalUrl for a normalizedCode */
  async getUrl(normalizedCode: string): Promise<string | null> {
    if (!this.connected) return null;

    try {
      const value = await this.client.get(`url:${normalizedCode}`);
      return typeof value === 'string' ? value : null;
    } catch {
      return null;
    }
  }

  /** Cache a normalizedCode -> originalUrl mapping and update recency index */
  async setUrl(normalizedCode: string, originalUrl: string): Promise<void> {
    if (!this.connected) return;

    try {
      const ttl = this.configService.get<number>('REDIS_KEY_TTL', 86400);
      await this.client.set(`url:${normalizedCode}`, originalUrl, { EX: ttl });
      await this.client.zAdd(RECENCY_KEY, {
        score: Date.now(),
        value: normalizedCode,
      });
      await this.trimIfNeeded();
    } catch (err) {
      this.logger.error('Redis setUrl error', err);
    }
  }

  /** Refresh recency score on access */
  async touchRecency(normalizedCode: string): Promise<void> {
    if (!this.connected) return;

    try {
      await this.client.zAdd(RECENCY_KEY, {
        score: Date.now(),
        value: normalizedCode,
      });
    } catch {
      // Non-critical — skip silently
    }
  }

  /** Remove a single key from cache and recency index */
  async invalidate(normalizedCode: string): Promise<void> {
    if (!this.connected) return;

    try {
      await this.client.del(`url:${normalizedCode}`);
      await this.client.zRem(RECENCY_KEY, normalizedCode);
    } catch {
      // Non-critical
    }
  }

  /** Bulk invalidate after Mongo cleanup */
  async invalidateMany(normalizedCodes: string[]): Promise<void> {
    if (!this.connected || normalizedCodes.length === 0) return;

    try {
      const keys = normalizedCodes.map((c) => `url:${c}`);
      await this.client.del(keys);
      await this.client.zRem(RECENCY_KEY, normalizedCodes);
    } catch (err) {
      this.logger.error('Redis invalidateMany error', err);
    }
  }

  /** Trim oldest entries when max count is exceeded */
  private async trimIfNeeded(): Promise<void> {
    try {
      const count = await this.client.zCard(RECENCY_KEY);

      if (count <= this.maxKeys) return;

      const excess = count - this.maxKeys;
      // Get oldest N entries
      const oldest = await this.client.zRange(RECENCY_KEY, 0, excess - 1);

      if (oldest.length === 0) return;

      const keys = oldest.map((c) => `url:${c}`);
      await this.client.del(keys);
      await this.client.zRemRangeByRank(RECENCY_KEY, 0, excess - 1);
      this.logger.log(`Trimmed ${oldest.length} oldest entries from Redis`);
    } catch (err) {
      this.logger.error('Redis trim error', err);
    }
  }
}
