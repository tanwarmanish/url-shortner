import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NoteDocument = Note & Document;

@Schema({ timestamps: true })
export class Note {
  @Prop({ required: true })
  content: string;

  @Prop({ required: true, unique: true })
  shortCode: string;

  @Prop({ required: true })
  normalizedCode: string;

  @Prop({ required: true, type: Date })
  expiresAt: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const NoteSchema = SchemaFactory.createForClass(Note);

NoteSchema.index({ normalizedCode: 1 }, { unique: true });
// TTL index — MongoDB automatically deletes expired docs
NoteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
