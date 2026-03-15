import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WordGeneratorService } from '../url/word-generator.service';
import { NoteController } from './note.controller';
import { NoteService } from './note.service';
import { Note, NoteSchema } from './schemas/note.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Note.name, schema: NoteSchema }]),
  ],
  controllers: [NoteController],
  providers: [NoteService, WordGeneratorService],
})
export class NoteModule {}
