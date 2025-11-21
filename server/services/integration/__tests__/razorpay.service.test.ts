import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';
import { RazorpayService } from '../razorpay.service';
import config from '../../../config';

describe('RazorpayService - Webhook Signature Verification', () => {
  let razorpayService: RazorpayService;
  const mockWebhookSecret = 'test_webhook_secret_12345';
  const validPayload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_test123',
          amount: 50000,
          currency: 'INR'
        }
      }
    },
    created_at: Math.floor(Date.now() / 1000)
  });

  beforeEach(() => {
    // Mock config to use test webhook secret
    vi.spyOn(config.razorpay, 'webhookSecret', 'get').mockReturnValue(mockWebhookSecret);
    razorpayService = new RazorpayService();
  });

  describe('Valid Signature Tests', () => {
    it('should accept webhook with valid HMAC-SHA256 signature', () => {
      // Generate valid signature
      const validSignature = crypto
        .createHmac('sha256', mockWebhookSecret)
        .update(validPayload)
        .digest('hex');

      const result = razorpayService.verifyWebhookSignature(validPayload, validSignature);
      
      expect(result).toBe(true);
    });

    it('should accept webhook with Buffer payload and valid signature', () => {
      const payloadBuffer = Buffer.from(validPayload, 'utf8');
      const validSignature = crypto
        .createHmac('sha256', mockWebhookSecret)
        .update(payloadBuffer)
        .digest('hex');

      const result = razorpayService.verifyWebhookSignature(payloadBuffer, validSignature);
      
      expect(result).toBe(true);
    });

    it('should accept webhook with string payload and valid signature', () => {
      const validSignature = crypto
        .createHmac('sha256', mockWebhookSecret)
        .update(validPayload)
        .digest('hex');

      const result = razorpayService.verifyWebhookSignature(validPayload, validSignature);
      
      expect(result).toBe(true);
    });

    it('should accept webhook with complex nested JSON and valid signature', () => {
      const complexPayload = JSON.stringify({
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_test123',
              amount: 50000,
              currency: 'INR',
              notes: {
                userId: 'user_123',
                planId: 'plan_456',
                nested: {
                  deeply: {
                    value: 'test'
                  }
                }
              }
            }
          }
        },
        created_at: Math.floor(Date.now() / 1000)
      });

      const validSignature = crypto
        .createHmac('sha256', mockWebhookSecret)
        .update(complexPayload)
        .digest('hex');

      const result = razorpayService.verifyWebhookSignature(complexPayload, validSignature);
      
      expect(result).toBe(true);
    });
  });

  describe('Invalid Signature Tests', () => {
    it('should reject webhook with incorrect signature', () => {
      const invalidSignature = 'abc123def456invalid_signature';

      const result = razorpayService.verifyWebhookSignature(validPayload, invalidSignature);
      
      expect(result).toBe(false);
    });

    it('should reject webhook with empty signature', () => {
      const result = razorpayService.verifyWebhookSignature(validPayload, '');
      
      expect(result).toBe(false);
    });

    it('should reject webhook with signature from different secret', () => {
      const differentSecret = 'different_secret_key';
      const invalidSignature = crypto
        .createHmac('sha256', differentSecret)
        .update(validPayload)
        .digest('hex');

      const result = razorpayService.verifyWebhookSignature(validPayload, invalidSignature);
      
      expect(result).toBe(false);
    });

    it('should reject webhook with signature computed using wrong algorithm (SHA1)', () => {
      const sha1Signature = crypto
        .createHmac('sha1', mockWebhookSecret)
        .update(validPayload)
        .digest('hex');

      const result = razorpayService.verifyWebhookSignature(validPayload, sha1Signature);
      
      expect(result).toBe(false);
    });
  });

  describe('Tampered Payload Tests', () => {
    it('should reject webhook when payload is modified after signature generation', () => {
      const validSignature = crypto
        .createHmac('sha256', mockWebhookSecret)
        .update(validPayload)
        .digest('hex');

      // Tamper with payload
      const tamperedPayload = validPayload.replace('50000', '5000'); // Change amount

      const result = razorpayService.verifyWebhookSignature(tamperedPayload, validSignature);
      
      expect(result).toBe(false);
    });

    it('should reject webhook when single character is changed in payload', () => {
      const validSignature = crypto
        .createHmac('sha256', mockWebhookSecret)
        .update(validPayload)
        .digest('hex');

      // Change a single character
      const tamperedPayload = validPayload.replace('payment', 'Payment'); // Capitalize P

      const result = razorpayService.verifyWebhookSignature(tamperedPayload, validSignature);
      
      expect(result).toBe(false);
    });

    it('should reject webhook when whitespace is added to payload', () => {
      const validSignature = crypto
        .createHmac('sha256', mockWebhookSecret)
        .update(validPayload)
        .digest('hex');

      // Add extra whitespace
      const tamperedPayload = validPayload + ' ';

      const result = razorpayService.verifyWebhookSignature(tamperedPayload, validSignature);
      
      expect(result).toBe(false);
    });
  });

  describe('Secret Mismatch Tests', () => {
    it('should reject webhook when using empty secret', () => {
      vi.spyOn(config.razorpay, 'webhookSecret', 'get').mockReturnValue('');
      const serviceWithEmptySecret = new RazorpayService();
      
      const signature = crypto
        .createHmac('sha256', mockWebhookSecret)
        .update(validPayload)
        .digest('hex');

      const result = serviceWithEmptySecret.verifyWebhookSignature(validPayload, signature);
      
      expect(result).toBe(false);
    });

    it('should reject webhook when secret contains extra characters', () => {
      const extraCharSecret = mockWebhookSecret + 'EXTRA';
      vi.spyOn(config.razorpay, 'webhookSecret', 'get').mockReturnValue(extraCharSecret);
      const serviceWithDifferentSecret = new RazorpayService();
      
      const signature = crypto
        .createHmac('sha256', mockWebhookSecret)
        .update(validPayload)
        .digest('hex');

      const result = serviceWithDifferentSecret.verifyWebhookSignature(validPayload, signature);
      
      expect(result).toBe(false);
    });
  });

  describe('Edge Case Tests', () => {
    it('should handle empty payload correctly', () => {
      const emptyPayload = '';
      const validSignature = crypto
        .createHmac('sha256', mockWebhookSecret)
        .update(emptyPayload)
        .digest('hex');

      const result = razorpayService.verifyWebhookSignature(emptyPayload, validSignature);
      
      expect(result).toBe(true);
    });

    it('should handle payload with special characters', () => {
      const specialPayload = JSON.stringify({
        event: 'test.event',
        data: 'Special chars: <>&"\'\\n\\t\\r',
        unicode: '🔒🔐✅❌'
      });
      
      const validSignature = crypto
        .createHmac('sha256', mockWebhookSecret)
        .update(specialPayload)
        .digest('hex');

      const result = razorpayService.verifyWebhookSignature(specialPayload, validSignature);
      
      expect(result).toBe(true);
    });

    it('should handle very large payloads (10KB)', () => {
      const largeData = 'x'.repeat(10000);
      const largePayload = JSON.stringify({
        event: 'test.event',
        data: largeData
      });
      
      const validSignature = crypto
        .createHmac('sha256', mockWebhookSecret)
        .update(largePayload)
        .digest('hex');

      const result = razorpayService.verifyWebhookSignature(largePayload, validSignature);
      
      expect(result).toBe(true);
    });

    it('should be case-sensitive for signature comparison', () => {
      const validSignature = crypto
        .createHmac('sha256', mockWebhookSecret)
        .update(validPayload)
        .digest('hex');

      // Convert signature to uppercase
      const uppercaseSignature = validSignature.toUpperCase();

      const result = razorpayService.verifyWebhookSignature(validPayload, uppercaseSignature);
      
      // Should fail because hex signatures are lowercase and comparison is case-sensitive
      expect(result).toBe(false);
    });

    it('should handle payload with UTF-8 encoding correctly', () => {
      const utf8Payload = JSON.stringify({
        event: 'test.event',
        data: '测试数据', // Chinese characters
        emoji: '😀😃😄',
        special: 'Ñoño Äpfel Über'
      });
      
      const validSignature = crypto
        .createHmac('sha256', mockWebhookSecret)
        .update(utf8Payload)
        .digest('hex');

      const result = razorpayService.verifyWebhookSignature(utf8Payload, validSignature);
      
      expect(result).toBe(true);
    });

    it('should correctly handle Buffer to string conversion', () => {
      const payloadBuffer = Buffer.from(validPayload, 'utf8');
      const validSignature = crypto
        .createHmac('sha256', mockWebhookSecret)
        .update(payloadBuffer.toString('utf8'))
        .digest('hex');

      const result = razorpayService.verifyWebhookSignature(payloadBuffer, validSignature);
      
      expect(result).toBe(true);
    });
  });

  describe('Security Regression Tests', () => {
    it('should not be vulnerable to timing attacks (constant-time comparison)', () => {
      // While we can't directly test timing, we can verify that comparison works correctly
      const validSignature = crypto
        .createHmac('sha256', mockWebhookSecret)
        .update(validPayload)
        .digest('hex');

      // Test multiple invalid signatures with varying prefixes
      const almostValidSignature1 = validSignature.substring(0, validSignature.length - 1) + 'x';
      const almostValidSignature2 = 'x' + validSignature.substring(1);
      
      expect(razorpayService.verifyWebhookSignature(validPayload, almostValidSignature1)).toBe(false);
      expect(razorpayService.verifyWebhookSignature(validPayload, almostValidSignature2)).toBe(false);
    });

    it('should handle null bytes in payload', () => {
      const payloadWithNull = 'test\x00data';
      const validSignature = crypto
        .createHmac('sha256', mockWebhookSecret)
        .update(payloadWithNull)
        .digest('hex');

      const result = razorpayService.verifyWebhookSignature(payloadWithNull, validSignature);
      
      expect(result).toBe(true);
    });

    it('should not accept signature with additional valid-looking hex characters', () => {
      const validSignature = crypto
        .createHmac('sha256', mockWebhookSecret)
        .update(validPayload)
        .digest('hex');

      const signatureWithExtra = validSignature + 'abcd1234'; // Append valid hex

      const result = razorpayService.verifyWebhookSignature(validPayload, signatureWithExtra);
      
      expect(result).toBe(false);
    });
  });
});
