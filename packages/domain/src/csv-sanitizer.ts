/**
 * Neutralizes spreadsheet formula injection characters (=, +, -, @)
 * and properly escapes fields for CSV output according to RFC 4180.
 */
export function sanitizeCsvField(val: unknown): string {
  if (val === null || val === undefined) {
    return '';
  }

  let str = String(val);

  // If text starts with dangerous spreadsheet formula triggers, prefix with single quote
  if (/^[=+\-@]/.test(str)) {
    str = `'${str}`;
  }

  // If string contains commas, newlines, or quotes, escape double quotes and wrap in quotes
  if (/[",\r\n]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

export function generateCsvString(headers: string[], rows: (unknown[])[]): string {
  const headerLine = headers.map((h) => sanitizeCsvField(h)).join(',');
  const rowLines = rows.map((row) => row.map((cell) => sanitizeCsvField(cell)).join(','));
  return [headerLine, ...rowLines].join('\r\n');
}
