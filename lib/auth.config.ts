import type { NextAuthOptions } from "next-auth";
import { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

const WORDPRESS_BASE_URL = process.env.NEXT_PUBLIC_WORDPRESS_API_URL!;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const JWT_EXPIRY_SECONDS = 3600;
const REFRESH_ERROR = "RefreshAccessTokenError";

async function fetchWpCurrentUserId(jwt: string): Promise<number | null> {
  try {
    const url = `${WORDPRESS_BASE_URL}/wp/v2/users/me`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${jwt}` },
      cache: "no-store",
    });
    if (!resp.ok) return null;
    const me = await resp.json();
    return me?.id ? Number(me.id) : null;
  } catch {
    return null;
  }
}

async function refreshAccessToken(token: JWT): Promise<JWT> {
  const refreshUrl = `${WORDPRESS_BASE_URL}/jwt-auth/v1/token/refresh`;
  const oldWpToken = (token as any).wordpressJwt;
  if (!oldWpToken) return { ...token, error: REFRESH_ERROR };

  try {
    const response = await fetch(refreshUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: oldWpToken }),
    });
    const refreshed = await response.json();
    if (!response.ok || !refreshed?.token)
      return { ...token, error: REFRESH_ERROR };

    return {
      ...token,
      wordpressJwt: refreshed.token,
      wordpressJwtExpires: Date.now() + JWT_EXPIRY_SECONDS * 1000,
      error: undefined,
    };
  } catch {
    return { ...token, error: REFRESH_ERROR };
  }
}

export const authConfig: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: "WordPress Credentials",
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const tokenUrl = `${WORDPRESS_BASE_URL}/jwt-auth/v1/token`;
        const res = await fetch(tokenUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: credentials.email,
            password: credentials.password,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data?.token) return null;

        const wpUserId = data.user_id || (await fetchWpCurrentUserId(data.token));
        if (!wpUserId) return null;

        return {
          id: String(wpUserId),
          name: data.user_display_name || credentials.email,
          email: data.user_email || credentials.email,
          wordpressJwt: data.token,
          wordpressUserId: Number(wpUserId),
          wordpressJwtExpires: Date.now() + JWT_EXPIRY_SECONDS * 1000,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.wordpressJwt = (user as any).wordpressJwt;
        token.wordpressUserId = (user as any).wordpressUserId;
        token.wordpressJwtExpires = (user as any).wordpressJwtExpires;
      }

      const expiresAt = (token as any).wordpressJwtExpires || 0;
      if (!expiresAt || Date.now() < expiresAt - 5 * 60 * 1000) return token;
      return refreshAccessToken(token);
    },

    async session({ session, token }) {
      (session.user as any).wordpressJwt = (token as any).wordpressJwt;
      (session.user as any).wordpressUserId = (token as any).wordpressUserId;
      if ((token as any).error)
        (session as any).error = (token as any).error;
      return session;
    },
  },
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: "/auth/login", error: "/auth/error" },
};
