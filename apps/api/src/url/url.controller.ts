import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { CreateUrlDto } from './dto/create-url.dto';
import { UrlService } from './url.service';

@ApiTags('urls')
@Controller()
export class UrlController {
  constructor(private readonly urlService: UrlService) {}

  /**
   * POST /shorten
   * Creates a shortened URL from the provided original URL
   */
  @Post('shorten')
  @Throttle({ short: { ttl: 60000, limit: 10 }, long: { ttl: 600000, limit: 50 } })
  @ApiOperation({ summary: 'Shorten a URL', description: 'Creates a what3words-style short code for the provided URL' })
  @ApiResponse({ status: 201, description: 'URL shortened successfully' })
  @ApiResponse({ status: 400, description: 'Invalid URL provided' })
  @ApiResponse({ status: 429, description: 'Too many requests - rate limit exceeded' })
  async createShortUrl(@Body() createUrlDto: CreateUrlDto) {
    const result = await this.urlService.createShortUrl(createUrlDto.url);

    return {
      success: true,
      message: 'URL shortened successfully',
      data: {
        originalUrl: createUrlDto.url,
        shortCode: result.shortCode,
        shortUrl: result.shortUrl,
      },
    };
  }

  /**
   * GET /stats/:shortCode
   * Get statistics for a shortened URL
   */
  @Get('stats/:shortCode')
  @ApiOperation({ summary: 'Get URL statistics', description: 'Returns click count and other stats for a short URL' })
  @ApiParam({ name: 'shortCode', description: 'The short code (case-insensitive)', example: 'happyBlueMountain' })
  @ApiResponse({ status: 200, description: 'URL stats retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Short URL not found' })
  async getUrlStats(@Param('shortCode') shortCode: string) {
    const stats = await this.urlService.getUrlStats(shortCode);

    return {
      success: true,
      data: {
        originalUrl: stats.originalUrl,
        shortCode: stats.shortCode,
        clicks: stats.clicks,
        createdAt: stats.createdAt,
      },
    };
  }

  /**
   * GET /:shortCode
   * Redirects to the original URL using 302 redirect
   */
  @Get(':shortCode')
  @SkipThrottle()
  @ApiOperation({ summary: 'Redirect to original URL', description: 'Redirects to the original URL (302 Found)' })
  @ApiParam({ name: 'shortCode', description: 'The short code (case-insensitive)', example: 'happyBlueMountain' })
  @ApiResponse({ status: 302, description: 'Redirects to the original URL' })
  @ApiResponse({ status: 404, description: 'Short URL not found' })
  async redirectToOriginal(
    @Param('shortCode') shortCode: string,
    @Res() res: Response,
  ) {
    const originalUrl = await this.urlService.getOriginalUrl(shortCode);

    // Using 302 Found for redirect (302 is standard for URL shorteners)
    return res.redirect(HttpStatus.FOUND, originalUrl);
  }
}
