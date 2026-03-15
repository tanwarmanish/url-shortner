import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UrlDocument = Url & Document;

@Schema({ timestamps: true })
export class Url {
  @Prop({ required: true })
  originalUrl: string;

  @Prop({ required: true, unique: true })
  shortCode: string;

  @Prop({ required: true })
  normalizedCode: string;

  @Prop({ default: 0 })
  clicks: number;

  @Prop({ type: Date, default: Date.now })
  lastAccessedAt: Date;

  @Prop({ default: null })
  passwordHash: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const UrlSchema = SchemaFactory.createForClass(Url);

// Index for faster lookups
UrlSchema.index({ normalizedCode: 1 }, { unique: true });
UrlSchema.index({ originalUrl: 1 });
// Index for cleanup queries (oldest inactive first)
UrlSchema.index({ lastAccessedAt: 1 });
