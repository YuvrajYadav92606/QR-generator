import DOMPurify from 'dompurify'

/**
 * Sanitizes user input against Cross-Site Scripting (XSS) attacks.
 * Strips all HTML tags, script elements, javascript: schemes, and event handlers
 * while preserving valid user whitespace during typing.
 */
export function sanitizeInput(input: string): string {
  if (!input) return ''
  // Use DOMPurify configured with ALLOWED_TAGS: [] to guarantee pure text output
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  })
}
