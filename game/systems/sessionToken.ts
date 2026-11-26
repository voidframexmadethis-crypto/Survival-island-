const SESSION_TOKEN_KEY = 'survival_island_session_token_v1';

/**
 * The website keeps its httpOnly cookie. Native uses this signed bearer token
 * because capacitor://localhost cannot reliably send a Vercel cookie.
 */
export function getSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const token = window.localStorage.getItem(SESSION_TOKEN_KEY);
    return token && token.trim() ? token : null;
  } catch {
    return null;
  }
}

export function setSessionToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (token && token.trim()) {
      window.localStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(SESSION_TOKEN_KEY);
    }
  } catch {
    // Storage can be unavailable in restricted WebViews; auth still works in-memory for the session.
  }
}

export function getAuthHeaders(): Record<string, string> {
  const token = getSessionToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
