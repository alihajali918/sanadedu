// src/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const base = process.env.NEXT_PUBLIC_WORDPRESS_API_URL; // أو WORDPRESS_API_URL
          if (!base) return null;
          const loginUrl = `${base.replace(/\/$/, "")}/jwt-auth/v1/token`;
          if (!credentials?.email || !credentials?.password) return null;

          const res = await fetch(loginUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: credentials.email,
              password: credentials.password,
            }),
          });

          let data: any = null;
          try { data = await res.json(); } catch {}

          if (!res.ok) return null;

          const wpUserId = data?.user_id ?? data?.data?.user?.id;
          const wpToken  = data?.token;
          if (!wpUserId || !wpToken) return null;

          return {
            id: String(wpUserId),
            email: String(credentials.email),
            wordpressJwt: String(wpToken),
            wordpressUserId: String(wpUserId),
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.wordpressUserId = (user as any).wordpressUserId;
        token.wordpressJwt = (user as any).wordpressJwt;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.wordpressUserId = token.wordpressUserId as string | undefined;
        session.user.wordpressJwt = token.wordpressJwt as string | undefined;
      }
      return session;
    },
  },
  // secret: process.env.NEXTAUTH_SECRET, // فعّلها بالإنتاج
});
