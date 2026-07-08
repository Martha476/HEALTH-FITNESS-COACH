const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  email_verified?: boolean;
};

export type AuthSessionResult = {
  token: string;
  user: AuthUser;
  message?: string;
};

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(name.length + 1));
}

function writeSessionStorage(token: string, user: AuthUser): void {
  localStorage.setItem("authToken", token);
  localStorage.setItem("user", JSON.stringify(user));
  document.cookie = `fitcoach_token=${encodeURIComponent(token)}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

export function persistAuthSession(token: string, user: AuthUser): void {
  writeSessionStorage(token, user);
  window.dispatchEvent(new Event("fitcoach-auth"));
}

export function syncAuthSession(token: string, user: AuthUser): void {
  writeSessionStorage(token, user);
}

export function clearAuthSession(): void {
  localStorage.removeItem("authToken");
  localStorage.removeItem("user");
  document.cookie = "fitcoach_token=; path=/; max-age=0; SameSite=Lax";
  window.dispatchEvent(new Event("fitcoach-auth"));
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("authToken") || readCookie("fitcoach_token");
}

/** Backend Google OAuth — avoids Supabase PKCE issues in Next.js. */
export function startGoogleSignIn(): void {
  window.location.href = `${API_URL}/api/auth/google`;
}

export async function validateSession(token: string): Promise<AuthUser | null> {
  // Try the backend first
  try {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) return await res.json();
  } catch {
    // backend unreachable — fall through to local JWT decode
  }

  // Fallback: decode JWT payload without network call
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.sub && payload.email) {
      return {
        id: payload.sub,
        email: payload.email,
        name: payload.name || payload.email.split("@")[0],
        email_verified: true,
      };
    }
  } catch {
    return null;
  }
  return null;
}

export function profileIsComplete(profile: Record<string, unknown>): boolean {
  const weight = profile.currentWeight ?? profile.weight_lbs ?? profile.current_weight;
  const goal = profile.primaryGoal ?? profile.primary_goal ?? profile.fitness_level;
  const age = profile.age;
  return Boolean(profile.name && weight && goal && age);
}

export async function fetchUserProfile(
  userId: string,
  token: string
): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${API_URL}/api/profile/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function resolvePostLoginPath(
  token: string,
  user: AuthUser
): Promise<string> {
  const scopedKey = `user_${user.id}_userProfile`;
  const localProfile =
    localStorage.getItem(scopedKey) || localStorage.getItem("userProfile");
  if (localProfile) {
    try {
      if (profileIsComplete(JSON.parse(localProfile))) {
        return "/dashboard";
      }
    } catch {
      /* ignore */
    }
  }

  const apiProfile = await fetchUserProfile(user.id, token);
  if (apiProfile && profileIsComplete(apiProfile)) {
    return "/dashboard";
  }

  return "/profile?new=true";
}

/** Route new users to profile setup, returning users to dashboard. */
export async function redirectAfterLogin(
  token: string,
  user: AuthUser
): Promise<void> {
  persistAuthSession(token, user);
  const path = await resolvePostLoginPath(token, user);
  window.location.replace(path);
}
