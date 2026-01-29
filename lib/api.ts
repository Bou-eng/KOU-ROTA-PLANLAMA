const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

// Single-source builder for all API URLs
function buildUrl(path: string): string {
  if (!path.startsWith("/")) {
    path = "/" + path;
  }
  return API_BASE + path;
}

/**
 * Health check: Test if backend is reachable
 * Returns true if backend responds, false if network error
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(buildUrl("/health"), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return response.ok;
  } catch (err) {
    console.error("[health] Backend unreachable:", err);
    return false;
  }
}

// Normalize token: strip Bearer prefix if present, handle null/empty
function normalizeToken(token?: string | null): string | null {
  if (!token) return null;
  const trimmed = token.trim();
  if (!trimmed) return null;
  return trimmed.startsWith("Bearer ") ? trimmed.slice(7).trim() : trimmed;
}

export async function apiPost<T>(
  path: string,
  body: Record<string, unknown>,
  token?: string,
  extraHeaders?: Record<string, string>
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(extraHeaders || {}),
  };

  const normalizedToken = normalizeToken(token);
  if (normalizedToken) {
    headers["Authorization"] = `Bearer ${normalizedToken}`;
    console.log(
      "[api] POST",
      path,
      "| auth header set, token prefix:",
      normalizedToken.slice(0, 10) + "..."
    );
  } else if (token !== undefined) {
    console.warn("[api] POST", path, "| token provided but empty/invalid");
  }

  try {
    const response = await fetch(buildUrl(path), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      throw new Error((errorData.detail as string) || "İstek başarısız");
    }

    return response.json() as Promise<T>;
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error(
        `Sunucuya bağlanılamadı (${API_BASE}). Backend (API) çalışıyor mu?`
      );
    }
    throw err;
  }
}

export async function apiPatch<T>(
  path: string,
  body: Record<string, unknown>,
  token?: string,
  extraHeaders?: Record<string, string>
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(extraHeaders || {}),
  };

  const normalizedToken = normalizeToken(token);
  if (normalizedToken) {
    headers["Authorization"] = `Bearer ${normalizedToken}`;
  }

  try {
    const response = await fetch(buildUrl(path), {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      throw new Error((errorData.detail as string) || "İstek başarısız");
    }

    return response.json() as Promise<T>;
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error(
        `Sunucuya bağlanılamadı (${API_BASE}). Backend (API) çalışıyor mu?`
      );
    }
    throw err;
  }
}

export async function apiGet<T>(
  path: string,
  token?: string,
  extraHeaders?: Record<string, string>
): Promise<T> {
  const headers: HeadersInit = {
    ...(extraHeaders || {}),
  };

  const normalizedToken = normalizeToken(token);
  if (normalizedToken) {
    headers["Authorization"] = `Bearer ${normalizedToken}`;
    console.log(
      "[api] GET",
      path,
      "| calling with auth:",
      !!normalizedToken,
      "| token prefix:",
      normalizedToken.slice(0, 10) + "..."
    );
  } else if (token !== undefined) {
    console.warn("[api] GET", path, "| token provided but empty/invalid");
  }

  try {
    const response = await fetch(buildUrl(path), {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      throw new Error((errorData.detail as string) || "İstek başarısız");
    }

    return response.json() as Promise<T>;
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error(
        `Sunucuya bağlanılamadı (${API_BASE}). Backend (API) çalışıyor mu?`
      );
    }
    throw err;
  }
}

export async function apiDelete<T>(
  path: string,
  token?: string,
  extraHeaders?: Record<string, string>
): Promise<T> {
  const headers: HeadersInit = {
    ...(extraHeaders || {}),
  };

  const normalizedToken = normalizeToken(token);
  if (normalizedToken) {
    headers["Authorization"] = `Bearer ${normalizedToken}`;
  }

  try {
    const response = await fetch(buildUrl(path), {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      throw new Error((errorData.detail as string) || "İstek başarısız");
    }

    return response.json() as Promise<T>;
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error(
        `Sunucuya bağlanılamadı (${API_BASE}). Backend (API) çalışıyor mu?`
      );
    }
    throw err;
  }
}
