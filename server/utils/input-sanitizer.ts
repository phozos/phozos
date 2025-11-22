import DOMPurify from 'isomorphic-dompurify';

/**
 * Input Sanitizer for XSS Prevention (P0.5)
 * 
 * Provides methods to sanitize user input to prevent XSS attacks
 * Uses isomorphic-dompurify for cross-platform compatibility
 */
export class InputSanitizer {
  /**
   * Sanitize HTML content allowing safe HTML tags
   * Use for rich text editors or content that should preserve formatting
   * 
   * Allowed tags: p, br, strong, em, u, h1-h6, ul, ol, li, a, blockquote
   */
  static sanitizeHTML(input: string | null | undefined): string {
    if (!input) return '';
    
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 'i', 'b',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li',
        'a', 'blockquote', 'code', 'pre'
      ],
      ALLOWED_ATTR: ['href', 'title', 'target'],
      ALLOW_DATA_ATTR: false,
      KEEP_CONTENT: true,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      FORCE_BODY: false
    });
  }

  /**
   * Sanitize plain text by stripping all HTML tags
   * Use for names, titles, labels, and other fields that should be plain text only
   */
  static sanitizePlainText(input: string | null | undefined): string {
    if (!input) return '';
    
    // Strip all HTML tags and decode entities
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [],
      KEEP_CONTENT: true,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false
    });
  }

  /**
   * Sanitize rich text content with extended HTML support
   * Use for blog posts, articles, or content requiring more formatting options
   * 
   * Includes additional tags: img, table, span with limited attributes
   */
  static sanitizeRichText(input: string | null | undefined): string {
    if (!input) return '';
    
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 'i', 'b',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'dl', 'dt', 'dd',
        'a', 'blockquote', 'code', 'pre',
        'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'span', 'div', 'hr'
      ],
      ALLOWED_ATTR: [
        'href', 'title', 'target', 'rel',
        'src', 'alt', 'width', 'height',
        'class', 'id'
      ],
      ALLOW_DATA_ATTR: false,
      KEEP_CONTENT: true,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      FORCE_BODY: false
    });
  }

  /**
   * Sanitize array of strings
   * Useful for features lists, tags, etc.
   */
  static sanitizeArray(inputs: string[] | null | undefined): string[] {
    if (!inputs || !Array.isArray(inputs)) return [];
    
    return inputs
      .filter(item => typeof item === 'string')
      .map(item => this.sanitizePlainText(item))
      .filter(item => item.length > 0);
  }

  /**
   * Sanitize an object's string values recursively
   * Use cautiously - only for trusted object structures
   */
  static sanitizeObject<T extends Record<string, any>>(
    obj: T,
    fieldsToSanitize: string[] = []
  ): T {
    if (!obj || typeof obj !== 'object') return obj;
    
    const sanitized = { ...obj };
    
    for (const key in sanitized) {
      if (fieldsToSanitize.length === 0 || fieldsToSanitize.includes(key)) {
        if (typeof sanitized[key] === 'string') {
          sanitized[key] = this.sanitizePlainText(sanitized[key]) as any;
        } else if (Array.isArray(sanitized[key])) {
          sanitized[key] = this.sanitizeArray(sanitized[key]) as any;
        }
      }
    }
    
    return sanitized;
  }
}
