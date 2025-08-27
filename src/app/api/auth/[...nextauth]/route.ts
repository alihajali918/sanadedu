// ==========================================================
// FILE: src/app/api/auth/[...nextauth]/route.ts
// DESCRIPTION: NextAuth.js API route for handling authentication callbacks.
// ==========================================================

// --- CORE IMPORTS ---
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

// --- NEXTAUTH CONFIGURATION ---
const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    CredentialsProvider({
      name: "WordPress Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // الخطوة 1: البحث عن اسم المستخدم (user login) باستخدام البريد الإلكتروني
        const userSearchApiUrl = `${process.env.NEXT_PUBLIC_WORDPRESS_API_URL}/wp/v2/users?search=${credentials.email}&per_page=1`;

        try {
          const userSearchResponse = await fetch(userSearchApiUrl, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          });

          const userSearchData = await userSearchResponse.json();
          if (!userSearchResponse.ok || userSearchData.length === 0) {
            console.error("User not found for the provided email.");
            return null;
          }

          // الخطوة 2: استخراج اسم المستخدم (user_login) الفعلي
          const wordpressUsername = userSearchData[0].slug;
          if (!wordpressUsername) {
            console.error("Could not retrieve WordPress username from API.");
            return null;
          }

          // الخطوة 3: المصادقة باستخدام اسم المستخدم المستخرج وكلمة المرور
          const wordpressTokenApiUrl = `${process.env.NEXT_PUBLIC_WORDPRESS_API_URL}/jwt-auth/v1/token`;
          const response = await fetch(wordpressTokenApiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              username: wordpressUsername,
              password: credentials.password,
            }),
          });

          const data = await response.json();

          if (response.ok && data.token && data.user_id) {
            const user = {
              id: data.user_id,
              name: data.user_display_name || credentials.email,
              email: data.user_email || credentials.email,
              wordpressJwt: data.token,
              wordpressUserId: data.user_id,
              wordpressUserName: data.user_display_name,
              wordpressUserEmail: data.user_email,
              wordpressUserLocale: data.user_locale || "en-US",
            };
            return user;
          } else {
            console.error("Error from WordPress backend during Credentials Auth:", data);
            return null;
          }
        } catch (error) {
          console.error("Failed to connect to WordPress backend for Credentials Auth:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          const wordpressApiUrl = `${process.env.NEXT_PUBLIC_WORDPRESS_API_URL}/sanad/v1/social-auth-process`;

          let firstName = '';
          let lastName = '';

          if ((profile as any)?.given_name) {
            firstName = (profile as any).given_name;
          }
          if ((profile as any)?.family_name) {
            lastName = (profile as any).family_name;
          } else if (user.name) {
            const nameParts = user.name.split(' ');
            if (nameParts.length > 1) {
              firstName = nameParts[0];
              lastName = nameParts.slice(1).join(' ');
            } else {
              firstName = nameParts[0];
              lastName = '';
            }
          }

          const response = await fetch(wordpressApiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              socialId: profile?.sub,
              email: user.email,
              firstName: firstName,
              lastName: lastName,
              provider: 'google',
            }),
          });

          const data = await response.json();

          if (response.ok && data.token && data.user_id) {
            (user as any).wordpressJwt = data.token;
            (user as any).wordpressUserId = data.user_id;
            (user as any).wordpressUserName = data.user_display_name || user.name;
            (user as any).wordpressUserEmail = data.user_email || user.email;
            (user as any).wordpressUserLocale = data.user_locale || "en-US";
            return true;
          } else {
            console.error("Error from WordPress backend during Google Auth:", data);
            return false;
          }
        } catch (error) {
          console.error("Failed to connect to WordPress backend for Google Auth:", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.wordpressJwt = (user as any).wordpressJwt;
        token.wordpressUserId = (user as any).wordpressUserId;
        token.wordpressUserName = (user as any).wordpressUserName;
        token.wordpressUserEmail = (user as any).wordpressUserEmail;
        token.locale = (user as any).wordpressUserLocale;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.wordpressJwt) {
        (session.user as any).wordpressJwt = token.wordpressJwt;
      }
      if (token.wordpressUserId) {
        (session.user as any).wordpressUserId = token.wordpressUserId;
      }
      if (token.wordpressUserName) {
        session.user.name = token.wordpressUserName;
      }
      if (token.wordpressUserEmail) {
        session.user.email = token.wordpressUserEmail;
      }
      if (token.locale) {
        (session.user as any).locale = token.locale;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
});

// --- EXPORT HANDLERS ---
export { handler as GET, handler as POST };