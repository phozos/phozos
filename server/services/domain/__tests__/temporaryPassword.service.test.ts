import { describe, it, expect, beforeEach } from 'vitest';
import { TemporaryPasswordService } from '../temporaryPassword.service';
import bcrypt from 'bcrypt';

describe('TemporaryPasswordService', () => {
  let temporaryPasswordService: TemporaryPasswordService;

  beforeEach(() => {
    temporaryPasswordService = new TemporaryPasswordService();
  });

  describe('generateAndEncryptTempPassword', () => {
    it('should generate plain and encrypted temporary password', async () => {
      const result = await temporaryPasswordService.generateAndEncryptTempPassword();

      expect(result).toHaveProperty('plainPassword');
      expect(result).toHaveProperty('encryptedPassword');
      expect(typeof result.plainPassword).toBe('string');
      expect(typeof result.encryptedPassword).toBe('string');
      expect(result.plainPassword).toMatch(/^Reset.*!$/);
      
      const isValidHash = await bcrypt.compare(result.plainPassword, result.encryptedPassword);
      expect(isValidHash).toBe(true);
    });

    it('should generate cryptographically secure password', async () => {
      const result = await temporaryPasswordService.generateAndEncryptTempPassword();

      expect(result.plainPassword.length).toBeGreaterThan(0);
      expect(result.plainPassword).toMatch(/^Reset[A-Za-z0-9]{8}!$/);
      
      const isValidHash = await bcrypt.compare(result.plainPassword, result.encryptedPassword);
      expect(isValidHash).toBe(true);
    });

    it('should encrypt password with correct bcrypt rounds', async () => {
      const result = await temporaryPasswordService.generateAndEncryptTempPassword();

      expect(result.encryptedPassword).toMatch(/^\$2[aby]\$/);
      
      const roundsMatch = result.encryptedPassword.match(/^\$2[aby]\$(\d+)\$/);
      expect(roundsMatch).toBeTruthy();
      expect(Number(roundsMatch![1])).toBe(10);
    });

    it('should generate different passwords on multiple calls', async () => {
      const result1 = await temporaryPasswordService.generateAndEncryptTempPassword();
      const result2 = await temporaryPasswordService.generateAndEncryptTempPassword();

      expect(result1.plainPassword).not.toBe(result2.plainPassword);
      expect(result1.encryptedPassword).not.toBe(result2.encryptedPassword);
      
      const isValid1 = await bcrypt.compare(result1.plainPassword, result1.encryptedPassword);
      const isValid2 = await bcrypt.compare(result2.plainPassword, result2.encryptedPassword);
      expect(isValid1).toBe(true);
      expect(isValid2).toBe(true);
      
      const crossCheck1 = await bcrypt.compare(result1.plainPassword, result2.encryptedPassword);
      const crossCheck2 = await bcrypt.compare(result2.plainPassword, result1.encryptedPassword);
      expect(crossCheck1).toBe(false);
      expect(crossCheck2).toBe(false);
    });

    it('should generate passwords with proper format and length', async () => {
      const results = await Promise.all([
        temporaryPasswordService.generateAndEncryptTempPassword(),
        temporaryPasswordService.generateAndEncryptTempPassword(),
        temporaryPasswordService.generateAndEncryptTempPassword()
      ]);

      for (const result of results) {
        expect(result.plainPassword).toMatch(/^Reset[A-Za-z0-9]{8}!$/);
        expect(result.plainPassword.length).toBe(14);
        expect(result.encryptedPassword.startsWith('$2')).toBe(true);
      }
    });
  });
});
