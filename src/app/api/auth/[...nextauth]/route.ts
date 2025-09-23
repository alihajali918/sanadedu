// ==========================================================
// FILE: src/app/api/auth/[...nextauth]/route.ts
// DESCRIPTION: NextAuth.js route with Google + Credentials (WordPress).
// إصلاح: التعامل مع استجابة WP التي تُرجع token بدون user_id
// عبر طلب لاحق إلى wp/v2/users/me لاستخراج المعرّف.
// ==========================================================

import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

const WORDPRESS_BASE_URL = process.env.NEXT_PUBLIC_WORDPRESS_API_URL as string;
// مثال متوقّع: https://cms.sanadedu.org/wp-json

if (!WORDPRESS_BASE_URL) {
  console.warn("[NextAuth] Warning: NEXT_PUBLIC_WORDPRESS_API_URL is not set.");
}

async function fetchWpCurrentUserId(jwt: string): Promise<number | null> {
  try {
    // إذا كان WORDPRESS_BASE_URL = ".../wp-json"
    // فـ users/me = ".../wp-json/wp/v2/users/me"
    const url = `${WORDPRESS_BASE_URL}/wp/v2/users/me`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${jwt}` },
      cache: "no-store",
    });
    if (!resp.ok) {
      console.error("[WP users/me] HTTP", resp.status);
      return null;
    }
    const me = await resp.json();
    // عادة يرجع { id, name, slug, ... }
    if (me?.id) return Number(me.id);
    return null;
  } catch (e) {
    console.error("[WP users/me] fetch error:", e);
    return null;
  }
}

// ✨ تم إعادة الـ `export` هنا لحل الخطأ في الملفات الأخرى.
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),

    CredentialsProvider({
      name: "WordPress Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.error("[Credentials] Missing email or password.");
          return null;
        }

        const tokenUrl = `${WORDPRESS_BASE_URL}/jwt-auth/v1/token`;

        try {
          const response = await fetch(tokenUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: credentials.email,
              password: credentials.password,
            }),
          });

          const data = await response.json();
          console.log("[Credentials] WP Response:", data);

          // 1) التحقق من وجود التوكن، وإذا لم يكن موجودًا نعالج الأخطاء
          if (!response.ok || !data?.token) {
            if (data?.code === "rest_email_not_verified") {
              // نرمي خطأ مخصص يوصله NextAuth للواجهة في result.error
              throw new Error("Email not verified. Please check your inbox.");
            }
            console.error("[Credentials] WP backend error (no token):", data);
            return null;
          }

          // 2) جلب معرف المستخدم، وإذا لم يكن موجودًا نجري طلب آخر
          let wpUserId = data?.user_id;
          if (!wpUserId) {
            wpUserId = await fetchWpCurrentUserId(data.token);
          }

          if (!wpUserId) {
            console.error("[Credentials] Got token but couldn't resolve user_id.");
            return null;
          }

          const user = {
            id: String(wpUserId),
            name: data.user_display_name || credentials.email,
            email: data.user_email || credentials.email,
            wordpressJwt: data.token,
            wordpressUserId: Number(wpUserId),
            wordpressUserName: data.user_display_name || credentials.email,
            wordpressUserEmail: data.user_email || credentials.email,
            wordpressUserLocale: data.user_locale || "en-US",
          };
          return user as any;
        } catch (err: any) {
          console.error("[Credentials] WP connect error:", err?.message || err);
          if (String(err?.message || "").includes("Email not verified")) {
            throw err;
          }
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;

      try {
        const socialUrl = `${WORDPRESS_BASE_URL}/sanad/v1/social-auth-process`;

        let firstName = "";
        let lastName = "";
        const anyProfile = profile as any;

        if (anyProfile?.given_name) firstName = anyProfile.given_name;
        if (anyProfile?.family_name) {
          lastName = anyProfile.family_name;
        } else if (user.name) {
          const parts = user.name.split(" ");
          if (parts.length > 1) {
            firstName = firstName || parts[0];
            lastName = parts.slice(1).join(" ");
          } else {
            firstName = firstName || parts[0];
            lastName = "";
          }
        }

        const response = await fetch(socialUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            socialId: (profile as any)?.sub,
            email: user.email,
            firstName,
            lastName,
            provider: "google",
          }),
        });

        const data = await response.json();

        if (response.ok && data?.token) {
          (user as any).wordpressJwt = data.token;

          // لو ما فيه user_id حاول نجيبه
          let wpUserId = data?.user_id;
          if (!wpUserId) {
            wpUserId = await fetchWpCurrentUserId(data.token);
          }

          (user as any).wordpressUserId = wpUserId ?? null;
          (user as any).wordpressUserName =
            data.user_display_name || user.name || "";
          (user as any).wordpressUserEmail = data.user_email || user.email || "";
          (user as any).wordpressUserLocale = data.user_locale || "en-US";
          return true;
        }

        console.error("[Google] WP backend error:", data);
        return false;
      } catch (error) {
        console.error("[Google] Failed to connect WP social-auth:", error);
        return false;
      }
    },

    async jwt({ token, user }) {
      if (user) {
        token.wordpressJwt = (user as any).wordpressJwt ?? token.wordpressJwt;
        token.wordpressUserId =
          (user as any).wordpressUserId ?? token.wordpressUserId;

        token.wordpressUserName =
          (user as any).wordpressUserName ??
          (user as any).name ??
          (token as any).name ??
          token.name;

        token.wordpressUserEmail =
          (user as any).wordpressUserEmail ??
          (user as any).email ??
          (token as any).email ??
          token.email;

        (token as any).wordpressUserLocale =
          (user as any).wordpressUserLocale ??
          (user as any).locale ??
          (token as any).wordpressUserLocale ??
          "en-US";
      }
      return token;
    },

    async session({ session, token }) {
      if ((token as any).wordpressJwt) {
        (session.user as any).wordpressJwt = (token as any).wordpressJwt;
      }
      if ((token as any).wordpressUserId) {
        (session.user as any).wordpressUserId = (token as any).wordpressUserId;
      }
      if ((token as any).wordpressUserName) {
        session.user.name = (token as any).wordpressUserName;
      }
      if ((token as any).wordpressUserEmail) {
        session.user.email = (token as any).wordpressUserEmail;
      }
      if ((token as any).wordpressUserLocale) {
        (session.user as any).locale = (token as any).wordpressUserLocale;
      }
      return session;
    },
  },

  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
};

// ✨ هنا يكمن الحل: استخدم الإعدادات لإنشاء الـ handler
// وقم بتصديره كـ GET و POST ليتوافق مع Next.js App Router.
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
