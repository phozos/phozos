import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { BaseService } from '../base.service';
import { ServiceUnavailableError, ValidationServiceError } from '../errors';
import { BusinessRuleValidators } from '../validation';

/**
 * Temporary Password Service Interface
 */
export interface ITemporaryPasswordService {
  generateAndEncryptTempPassword(): Promise<{ plainPassword: string; encryptedPassword: string }>;
}

/**
 * Temporary Password Service
 * Generates secure temporary passwords that become the user's main login password.
 * The generated password is used for both login authentication and admin reference.
 */
export class TemporaryPasswordService extends BaseService implements ITemporaryPasswordService {
  private static readonly BCRYPT_ROUNDS = 10;

  /**
   * Generate a new temporary password and return both plain and encrypted versions
   * The plain password becomes the user's main login password (after bcrypt hashing)
   * The encrypted version is stored for admin reference only
   * 
   * Generates a strong 16-character password that is cryptographically secure and hard to guess.
   * Guarantees inclusion of all required character types: uppercase, lowercase, numbers, and special characters.
   * 
   * @returns Object containing plainPassword (for login) and encryptedPassword (for admin reference)
   */
  async generateAndEncryptTempPassword(): Promise<{ 
    plainPassword: string; 
    encryptedPassword: string 
  }> {
    try {
      // Character sets for strong password generation
      const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const lowercase = 'abcdefghijklmnopqrstuvwxyz';
      const numbers = '0123456789';
      const specialChars = '!@#$%^&*(),.?';
      
      // Generate a strong 16-character password with guaranteed character type coverage
      // This ensures the password is hard to guess and always passes validation
      
      // Guarantee at least one of each required type (4 chars)
      const guaranteedChars = [
        uppercase[this.getSecureRandomInt(uppercase.length)],
        lowercase[this.getSecureRandomInt(lowercase.length)],
        numbers[this.getSecureRandomInt(numbers.length)],
        specialChars[this.getSecureRandomInt(specialChars.length)]
      ];
      
      // Generate 12 more random characters from all character sets
      const allChars = uppercase + lowercase + numbers + specialChars;
      const randomChars: string[] = [];
      for (let i = 0; i < 12; i++) {
        randomChars.push(allChars[this.getSecureRandomInt(allChars.length)]);
      }
      
      // Combine and shuffle all characters using Fisher-Yates algorithm
      const allPasswordChars = [...guaranteedChars, ...randomChars];
      for (let i = allPasswordChars.length - 1; i > 0; i--) {
        const j = this.getSecureRandomInt(i + 1);
        [allPasswordChars[i], allPasswordChars[j]] = [allPasswordChars[j], allPasswordChars[i]];
      }
      
      const plainPassword = allPasswordChars.join('');
      
      // Validate generated password meets requirements (should always pass now)
      BusinessRuleValidators.validatePasswordStrength(plainPassword);
      
      // Encrypt for admin reference storage
      const encryptedPassword = await bcrypt.hash(plainPassword, TemporaryPasswordService.BCRYPT_ROUNDS);
      
      console.log(`🔐 Generated cryptographically secure 16-character temporary password`);
      
      return {
        plainPassword,
        encryptedPassword
      };
    } catch (error) {
      return this.handleError(error, 'TemporaryPasswordService.generateAndEncryptTempPassword');
    }
  }

  /**
   * Get a cryptographically secure random integer between 0 and max (exclusive)
   * Uses crypto.randomBytes for secure random number generation
   */
  private getSecureRandomInt(max: number): number {
    const range = max;
    const bytesNeeded = Math.ceil(Math.log2(range) / 8);
    const maxValid = Math.floor(256 ** bytesNeeded / range) * range - 1;
    
    let randomValue: number;
    do {
      const bytes = randomBytes(bytesNeeded);
      randomValue = bytes.reduce((acc, byte, i) => acc + byte * (256 ** i), 0);
    } while (randomValue > maxValid);
    
    return randomValue % range;
  }
}

// Export singleton instance
export const temporaryPasswordService = new TemporaryPasswordService();