/**
 * Generates a deidentified patient identifier
 * Format: PEDI-YYYY-MM-DD-{randomHash}
 * No PHI included - just date and random hash
 */
export function generateDeidentifiedId(): string {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const randomHash = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `PEDI-${dateStr}-${randomHash}`;
}

