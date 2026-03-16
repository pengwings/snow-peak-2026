/** Returns the display name for a user, with special overrides. */
export function displayName(name: string | null | undefined): string {
  if (!name) return '';
  if (name === 'Jade') return 'Princess of Singapore';
  return name;
}
