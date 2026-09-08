/**
 * URL safety helper.
 *
 * MVP0 renders no WebView or remote HTML (see SECURITY.md "no-WebView rule"),
 * so there is no CSP to configure yet. When web-rendered content arrives
 * (profiles links, support articles), every external URL must pass through
 * `isSafeExternalUrl` first: https-only, no embedded credentials, optional
 * host allowlist.
 */
export function isSafeExternalUrl(raw: string, allowedHosts: readonly string[] = []): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;
  if (url.username !== '' || url.password !== '') return false;
  if (allowedHosts.length > 0) {
    const host = url.hostname.toLowerCase();
    const permitted = allowedHosts.some(
      (allowed) => host === allowed.toLowerCase() || host.endsWith(`.${allowed.toLowerCase()}`),
    );
    if (!permitted) return false;
  }
  return true;
}
