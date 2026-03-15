import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';

export class CreateUrlDto {
  @ApiProperty({
    description: 'The URL to shorten',
    example: 'https://example.com/very/long/path/to/resource',
  })
  @IsNotEmpty({ message: 'URL is required' })
  @IsUrl(
    {
      require_protocol: true,
      require_valid_protocol: true,
      protocols: ['http', 'https'],
    },
    { message: 'Please provide a valid URL with http or https protocol' },
  )
  url: string;

  @ApiPropertyOptional({
    description: 'Use emoji short code instead of three words',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  useEmoji?: boolean;
}
