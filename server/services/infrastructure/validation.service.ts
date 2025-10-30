export interface IValidationService {
  validatePassword(password: string): { valid: boolean; error?: string };
  validateEmail(email: string): { valid: boolean; error?: string };
  validateMessageContent(message: string): { valid: boolean; error?: string };
}

export class ValidationService implements IValidationService {
  private readonly DISPOSABLE_DOMAINS = [
    '10minutemail.com',
    'tempmail.org', 
    'guerrillamail.com',
    'throwaway.email',
    'temp-mail.org',
    'mailinator.com'
  ];

  validatePassword(password: string): { valid: boolean; error?: string } {
    if (!password || password.length < 8) {
      return {
        valid: false,
        error: 'Password must be at least 8 characters long'
      };
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return {
        valid: false,
        error: 'Password must contain uppercase, lowercase, and number'
      };
    }

    return { valid: true };
  }

  validateEmail(email: string): { valid: boolean; error?: string } {
    if (!email || !email.includes('@')) {
      return {
        valid: false,
        error: 'Invalid email format'
      };
    }

    const emailLower = email.toLowerCase();
    const emailDomain = emailLower.split('@')[1];

    if (this.DISPOSABLE_DOMAINS.includes(emailDomain)) {
      return {
        valid: false,
        error: 'Disposable email addresses are not allowed'
      };
    }

    return { valid: true };
  }

  validateMessageContent(message: string): { valid: boolean; error?: string } {
    const cleanMessage = message.trim();

    // Character limit - 100 characters including spaces
    if (cleanMessage.length > 100) {
      return {
        valid: false,
        error: 'Message is too long. Please keep messages under 100 characters.'
      };
    }

    // No URLs/links allowed
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[^\s]+\.(com|org|net|edu|gov|mil|int|co|io|ly|me|tv|info|biz)[^\s]*)/gi;
    if (urlRegex.test(cleanMessage)) {
      return {
        valid: false,
        error: 'Links and URLs are not allowed in messages'
      };
    }

    // No file attachments indicators
    if (cleanMessage.includes('attachment:') || cleanMessage.includes('file:')) {
      return {
        valid: false,
        error: 'File attachments are not allowed'
      };
    }

    // Prevent excessive special characters (anti-paste)
    const specialCharCount = (cleanMessage.match(/[^a-zA-Z0-9\s\.,\?!\-'"]/g) || []).length;
    if (specialCharCount > cleanMessage.length * 0.3) {
      return {
        valid: false,
        error: 'Message contains too many special characters. Please type naturally.'
      };
    }

    return { valid: true };
  }
}

export const validationService = new ValidationService();
