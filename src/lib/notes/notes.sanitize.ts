import sanitizeHtml from 'sanitize-html';

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr',
    'strong', 'b', 'em', 'i', 'u', 's', 'strike',
    'ul', 'ol', 'li',
    'blockquote', 'pre', 'code',
    'a', 'span'
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    span: ['class'],
    code: ['class'],
    p: ['class'],
    h1: ['class'],
    h2: ['class'],
    h3: ['class'],
    ul: ['class'],
    ol: ['class'],
    li: ['class'],
    blockquote: ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    a: (tagName, attribs) => {
      const href = attribs.href || '';
      return {
        tagName: 'a',
        attribs: {
          href,
          target: '_blank',
          rel: 'noopener noreferrer nofollow',
        },
      };
    },
  },
};

/**
 * Sanitizes rich text HTML content to prevent XSS.
 */
export function sanitizeNoteContent(dirtyHtml: string): string {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') {
    return '';
  }
  return sanitizeHtml(dirtyHtml, SANITIZE_OPTIONS);
}

/**
 * Extracts a clean plain-text snippet from HTML content.
 */
export function extractPlainTextSnippet(html: string, maxLength: number = 160): string {
  if (!html || typeof html !== 'string') {
    return '';
  }
  const clean = sanitizeHtml(html, {
    allowedTags: [],
    allowedAttributes: {},
  });
  const decoded = clean
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  if (decoded.length <= maxLength) {
    return decoded;
  }
  return decoded.slice(0, maxLength).trimEnd() + '...';
}
