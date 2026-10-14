import type { PendingInvite } from './pendingInvite';

const INVITE_URL_RE = /^unithub:\/\/invite\?(.*)$/;

/**
 * Hand-rolled instead of `new URL(...)` — Hermes doesn't ship `URL`/
 * `URLSearchParams` without a polyfill, and this is simple enough not to
 * need one.
 */
function parseQuery(query: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const pair of query.split('&')) {
    if (!pair) continue;
    const [key, rawValue] = pair.split('=');
    if (!key) continue;
    result[decodeURIComponent(key)] = decodeURIComponent(rawValue ?? '');
  }
  return result;
}

/**
 * `unithub://invite?tenancyId=<id>&token=<token>` — minted by
 * `createTenantInvite` and shared out-of-band (see docs/DECISIONS.md #8).
 * `token` is optional on the link itself: a tenancy under 30 days old can be
 * claimed by phone match alone (functions/src/logic/claimTenantInvite.ts).
 *
 * Note: this only parses the URL once the OS hands it to the app. Routing a
 * real `unithub://` link into the app still needs the native registration
 * (iOS Info.plist CFBundleURLTypes / Android AndroidManifest.xml
 * intent-filter) — not yet wired, since there is no buildable native config
 * to verify it against until docs/SETUP.md's Firebase steps are done.
 */
export function parseInviteUrl(url: string): PendingInvite | null {
  const match = url.match(INVITE_URL_RE);
  if (!match?.[1]) return null;

  const query = parseQuery(match[1]);
  if (!query.tenancyId) return null;

  return query.token ? { tenancyId: query.tenancyId, inviteToken: query.token } : { tenancyId: query.tenancyId };
}
