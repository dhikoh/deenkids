import * as sanitizeHtml from 'sanitize-html';

/**
 * Sanitization utility for user-generated content.
 * Strips dangerous HTML/JS while preserving safe formatting.
 */

/** Strip ALL HTML tags — for plain text fields (titles, names, etc.) */
export function sanitizeText(input: string): string {
  if (!input) return input;
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();
}

/** Allow basic formatting tags — for rich text content blocks */
export function sanitizeRichText(input: string): string {
  if (!input) return input;
  return sanitizeHtml(input, {
    allowedTags: [
      'b', 'i', 'u', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'a', 'img',
      'span', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'pre', 'code', 'sub', 'sup',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height'],
      span: ['class', 'style'],
      div: ['class'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan'],
    },
    allowedSchemes: ['http', 'https'],
    // Force all links to open in new tab with noopener
    transformTags: {
      a: (tagName: string, attribs: Record<string, string>) => ({
        tagName,
        attribs: {
          ...attribs,
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    },
  });
}

/** Recursively sanitize all string values in a JSON object/array */
export function sanitizeJsonDeep(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return sanitizeRichText(obj);
  if (Array.isArray(obj)) return obj.map(item => sanitizeJsonDeep(item));
  if (typeof obj === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeJsonDeep(value);
    }
    return sanitized;
  }
  return obj; // numbers, booleans, etc.
}
