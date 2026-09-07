/**
 * The app is mounted under a path prefix (see `basePath` in next.config.ts):
 * brian-yu.com proxies /snow-peak/* to this deployment. <Link>, router.push
 * and next/image add the prefix themselves; plain fetch() and raw asset URLs
 * do not, so those go through the helpers here.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** fetch() for our own API routes, with the base path applied. */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE_PATH}${path}`, init);
}
