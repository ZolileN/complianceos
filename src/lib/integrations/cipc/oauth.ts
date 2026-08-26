type CachedToken = {
  token: string;
  expiresAt: number;
};

let cachedToken: CachedToken | null = null;

/** Reset cached token — used in tests. */
export function resetCipcOAuthCache(): void {
  cachedToken = null;
}

/**
 * Obtain an OAuth2 access token for the CIPC direct gateway.
 * Uses client_credentials grant when CIPC_OAUTH_TOKEN_URL is configured.
 */
export async function getCipcOAuthToken(): Promise<string | null> {
  const tokenUrl = process.env.CIPC_OAUTH_TOKEN_URL || '';
  const clientId = process.env.CIPC_CLIENT_ID || '';
  const clientSecret = process.env.CIPC_CLIENT_SECRET || '';

  if (!tokenUrl || !clientId || !clientSecret) {
    return null;
  }

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  try {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    });

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
    };

    if (!data.access_token) return null;

    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    };

    return cachedToken.token;
  } catch {
    return null;
  }
}
