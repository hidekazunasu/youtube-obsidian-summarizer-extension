export function sanitizePathSegment(input: string): string {
  const normalized = input
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/\.+$/g, '')
    .trim();

  return normalized || 'untitled';
}

export function formatDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function applyPattern(
  pattern: string,
  variables: Record<string, string>
): string {
  let output = pattern;
  for (const [key, value] of Object.entries(variables)) {
    output = output.replaceAll(`{${key}}`, value);
  }
  return output;
}

export function decodeHtmlEntities(text: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/html');
  return doc.documentElement.textContent ?? text;
}
