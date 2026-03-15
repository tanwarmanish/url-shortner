import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WordGeneratorService } from '../url/word-generator.service';
import { Note, NoteDocument } from './schemas/note.schema';

@Injectable()
export class NoteService {
  private readonly logger = new Logger(NoteService.name);

  constructor(
    @InjectModel(Note.name) private noteModel: Model<NoteDocument>,
    private readonly wordGeneratorService: WordGeneratorService,
  ) {}

  async createNote(
    content: string,
    expiryHours = 24,
  ): Promise<{ shortCode: string; expiresAt: Date }> {
    let shortCode = '';
    let normalizedCode = '';
    let exists = true;

    while (exists) {
      shortCode = this.wordGeneratorService.generateShortCode();
      normalizedCode = this.wordGeneratorService.normalizeShortCode(shortCode);
      exists = !!(await this.noteModel.findOne({ normalizedCode }).exec());
    }

    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    const note = new this.noteModel({
      content,
      shortCode,
      normalizedCode,
      expiresAt,
    });

    await note.save();
    this.logger.log(
      `Note created: ${shortCode} (expires ${expiresAt.toISOString()})`,
    );

    return { shortCode, expiresAt };
  }

  async getNote(shortCode: string): Promise<Note> {
    const normalizedCode =
      this.wordGeneratorService.normalizeShortCode(shortCode);

    const note = await this.noteModel.findOne({ normalizedCode }).exec();

    if (!note) {
      throw new NotFoundException('Note not found or has expired.');
    }

    return note;
  }
}
