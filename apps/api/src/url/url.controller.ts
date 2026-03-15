import { Body, Controller, Get, HttpStatus, Param, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CreateUrlDto } from './dto/create-url.dto';
import { UrlService } from './url.service';

@ApiTags('urls')
@Controller()
export class UrlController {
  constructor(
    private readonly urlService: UrlService,
    private readonly configService: ConfigService,
  ) {}

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
    const result = await this.urlService.createShortUrl(
      createUrlDto.url,
      createUrlDto.useEmoji,
    );

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
   * GET /s
   * Opens the React shortener page
   */
  @Get('s')
  @SkipThrottle()
  @ApiOperation({
    summary: 'Open shortener UI',
    description: 'Redirects to the React shortener page.',
  })
  @ApiResponse({ status: 302, description: 'Redirects to React app' })
  openShortenerPage(@Res() res: Response) {
    const webAppUrl = this.configService.get<string>(
      'WEB_APP_URL',
      'http://localhost:4200',
    );

    return res.redirect(HttpStatus.FOUND, webAppUrl);
  }

  /**
   * GET /s/*
   * Redirects to the React app route where the URL is shortened via POST flow
   */
  @Get('s/*')
  @SkipThrottle()
  @ApiOperation({
    summary: 'Open frontend shorten route',
    description:
      'Redirects to frontend /s/* route so the React app performs shortening via POST /shorten.',
  })
  @ApiResponse({ status: 302, description: 'Redirects to frontend /s/* route' })
  openShortenerPathOnFrontend(@Req() req: Request, @Res() res: Response) {
    const webAppUrl = this.configService.get<string>(
      'WEB_APP_URL',
      'http://localhost:4200',
    );
    const pathValue = (req.params as Record<string, string>)[0] ?? '';
    const encodedPath = pathValue
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');

    return res.redirect(HttpStatus.FOUND, `${webAppUrl}/s/${encodedPath}`);
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
   * GET /resolve/:shortCode
   * Resolves short code and returns original URL while incrementing clicks
   */
  @Get('resolve/:shortCode')
  @SkipThrottle()
  @ApiOperation({
    summary: 'Resolve short URL',
    description:
      'Resolves short code and returns original URL for frontend-driven redirect flow.',
  })
  @ApiParam({
    name: 'shortCode',
    description: 'The short code (case-insensitive)',
    example: 'happyBlueMountain',
  })
  @ApiResponse({ status: 200, description: 'Short URL resolved successfully' })
  @ApiResponse({ status: 404, description: 'Short URL not found' })
  async resolveShortCode(@Param('shortCode') shortCode: string) {
    const originalUrl = await this.urlService.getOriginalUrl(shortCode);

    return {
      success: true,
      data: {
        shortCode,
        originalUrl,
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
