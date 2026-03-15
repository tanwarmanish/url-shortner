import { Injectable } from '@nestjs/common';
import { ADJECTIVES, COLORS, NOUNS } from './words';

@Injectable()
export class WordGeneratorService {
  /**
   * Generates a what3words-style short code using camelCase
   * Example: "happyBlueMountain"
   */
  generateShortCode(): string {
    const adjective = this.getRandomWord(ADJECTIVES);
    const color = this.getRandomWord(COLORS);
    const noun = this.getRandomWord(NOUNS);

    // First word is lowercase, subsequent words are capitalized (camelCase)
    return (
      adjective.toLowerCase() +
      this.capitalize(color) +
      this.capitalize(noun)
    );
  }

  /**
   * Normalizes a short code to lowercase for lookup
   * This ensures that even if user enters "HappyBlueMountain" or "happybluemountain",
   * we can find the correct mapping
   */
  normalizeShortCode(shortCode: string): string {
    return shortCode.toLowerCase();
  }

  private getRandomWord(words: string[]): string {
    const randomIndex = Math.floor(Math.random() * words.length);
    return words[randomIndex];
  }

  private capitalize(word: string): string {
    if (!word) return word;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }
}
