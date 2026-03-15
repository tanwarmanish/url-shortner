import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { CreateNoteDto } from './dto/create-note.dto';
import { NoteService } from './note.service';

@ApiTags('notes')
@Controller('note')
export class NoteController {
  constructor(private readonly noteService: NoteService) {}

  @Post()
  @Throttle({
    short: { ttl: 60000, limit: 10 },
    long: { ttl: 600000, limit: 30 },
  })
  @ApiOperation({ summary: 'Create a shareable note' })
  @ApiResponse({ status: 201, description: 'Note created' })
  async createNote(@Body() dto: CreateNoteDto) {
    const result = await this.noteService.createNote(
      dto.content,
      dto.expiryHours,
    );

    return {
      success: true,
      message: 'Note created successfully',
      data: {
        shortCode: result.shortCode,
        expiresAt: result.expiresAt,
      },
    };
  }

  @Get(':noteCode')
  @SkipThrottle()
  @ApiOperation({ summary: 'Get a note by code' })
  @ApiParam({ name: 'noteCode', description: 'The note short code' })
  @ApiResponse({ status: 200, description: 'Note retrieved' })
  @ApiResponse({ status: 404, description: 'Note not found or expired' })
  async getNote(@Param('noteCode') noteCode: string) {
    const note = await this.noteService.getNote(noteCode);

    return {
      success: true,
      data: {
        content: note.content,
        shortCode: note.shortCode,
        expiresAt: note.expiresAt,
        createdAt: note.createdAt,
      },
    };
  }
}
