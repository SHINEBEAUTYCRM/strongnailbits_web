/**
 * Server-safe HTML cleaner for CS-Cart inline styles.
 * Uses regex since DOMParser is unavailable in Node.js.
 */

export function cleanCSCartHTML(html: string): string {
  if (!html) return '';

  let result = html;

  // Remove all style="..." attributes
  result = result.replace(/\s*style="[^"]*"/gi, '');
  result = result.replace(/\s*style='[^']*'/gi, '');

  // Replace <font ...> with content, strip the tag
  result = result.replace(/<font[^>]*>([\s\S]*?)<\/font>/gi, '$1');

  // Remove class="..." attributes
  result = result.replace(/\s*class="[^"]*"/gi, '');
  result = result.replace(/\s*class='[^']*'/gi, '');

  // Remove dangerous elements
  result = result.replace(/<script[\s\S]*?<\/script>/gi, '');
  result = result.replace(/<iframe[\s\S]*?<\/iframe>/gi, '');
  result = result.replace(/<object[\s\S]*?<\/object>/gi, '');
  result = result.replace(/<embed[^>]*\/?>/gi, '');

  // Remove empty spans: <span> </span> or <span></span>
  result = result.replace(/<span>\s*<\/span>/gi, '');

  // Unwrap attribute-less spans: <span>content</span> → content
  result = result.replace(/<span>([\s\S]*?)<\/span>/gi, '$1');

  // Replace &nbsp; with normal space
  result = result.replace(/&nbsp;/g, ' ');

  // Collapse multiple spaces into one
  result = result.replace(/[ \t]+/g, ' ');

  // Remove empty paragraphs
  result = result.replace(/<p>\s*<\/p>/gi, '');

  // Trim lines
  result = result
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');

  return result.trim();
}
