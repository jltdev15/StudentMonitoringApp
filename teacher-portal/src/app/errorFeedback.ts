export function pageValidationMessage(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
