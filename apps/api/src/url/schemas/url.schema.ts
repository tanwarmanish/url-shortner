import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UrlDocument = Url & Document;

@Schema({ timestamps: true })
export class Url {
  @Prop({ required: true })
  originalUrl: string;

  @Prop({ required: true, unique: true })
  shortCode: string;

  @Prop({ required: true, unique: true })
  normalizedCode: string;

  @Prop({ default: 0 })
  clicks: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const UrlSchema = SchemaFactory.createForClass(Url);

// Index for faster lookups
UrlSchema.index({ normalizedCode: 1 });
UrlSchema.index({ originalUrl: 1 });
