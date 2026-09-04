// Single source of truth for routes reachable without a session.
// Used by both the server proxy (src/proxy.ts) and the client route guard
// (application-frame.tsx) — keep them from drifting apart again.
export const PUBLIC_PATHS = ["/", "/login", "/forbidden", "/request-access"] as const;

export function isPublicPath(pathname: string) {
  return (PUBLIC_PATHS as readonly string[]).includes(pathname);
}
