import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsIn,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

/** Max ~500 words ≈ 3500 characters */
const MAX_CONTENT_LENGTH = 3500;

const VALID_EXPIRY_HOURS = [1, 6, 12, 24];

export class CreateNoteDto {
  @ApiProperty({
    description: 'Note content (max ~500 words)',
    example: 'Hello, this is a shareable note!',
  })
  @IsNotEmpty({ message: 'Content is required' })
  @IsString()
  @MaxLength(MAX_CONTENT_LENGTH, {
    message: `Content must be at most ${MAX_CONTENT_LENGTH} characters (~500 words)`,
  })
  content: string;

  @ApiPropertyOptional({
    description: 'Expiry in hours (1, 6, 12, or 24). Default: 24',
    default: 24,
    enum: VALID_EXPIRY_HOURS,
  })
  @IsOptional()
  @IsIn(VALID_EXPIRY_HOURS, {
    message: 'expiryHours must be 1, 6, 12, or 24',
  })
  expiryHours?: number;
}
