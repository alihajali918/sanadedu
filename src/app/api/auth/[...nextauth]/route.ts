// ==========================================================
// FILE: src/app/api/auth/[...nextauth]/route.ts
// DESCRIPTION: NextAuth.js API route for handling authentication callbacks.
// This sets up Google OAuth and handles session creation, now including
// the WordPress JWT token and Credential Provider for traditional login.
// ==========================================================

// --- CORE IMPORTS ---
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials"; // <--- جديد: استيراد CredentialsProvider

// --- NEXTAUTH CONFIGURATION ---
const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    // <--- جديد: إضافة CredentialsProvider لتسجيل الدخول التقليدي
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

        const wordpressApiUrl = `${process.env.NEXT_PUBLIC_WORDPRESS_API_URL}/jwt-auth/v1/token`;

        try {
          const response = await fetch(wordpressApiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              username: credentials.email, // JWT plugin عادةً ما يقبل email كـ username
              password: credentials.password,
            }),
          });

          const data = await response.json();

          if (response.ok && data.token && data.user_id) {
            // عند تسجيل الدخول بنجاح عبر Credentials، قم بإنشاء كائن user
            // الذي سيتم تمريره إلى jwt callback
            const user = {
              id: data.user_id,
              name: data.user_display_name || credentials.email,
              email: data.user_email || credentials.email,
              wordpressJwt: data.token,
              wordpressUserId: data.user_id,
              wordpressUserName: data.user_display_name,
              wordpressUserEmail: data.user_email,
              wordpressUserLocale: data.user_locale || "en-US", // افترض أن الـ Backend يرسل locale
            };
            return user;
          } else {
            console.error("Error from WordPress backend during Credentials Auth:", data);
            return null; // فشل المصادقة
          }
        } catch (error) {
          console.error("Failed to connect to WordPress backend for Credentials Auth:", error);
          return null; // خطأ في الشبكة
        }
      },
    }),
    // <--- نهاية إضافة CredentialsProvider
  ],
  callbacks: {
    // signIn callback: Handles user authentication and interaction with WordPress backend
    async signIn({ user, account, profile }) {
      // هذا الـ callback سيتم استدعاؤه أيضاً لـ CredentialsProvider
      // إذا كان الـ provider هو 'credentials'، فإن `user` سيحتوي بالفعل على بياناتنا المخصصة
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

          console.log("User data from Google:", {
            email: user.email,
            fullName: user.name,
            givenName: (profile as any)?.given_name,
            familyName: (profile as any)?.family_name,
            derivedFirstName: firstName,
            derivedLastName: lastName,
            googleId: profile?.sub
          });

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

            console.log("WordPress API response success:", data);

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
      // إذا كان الـ provider هو 'credentials'، فإننا نعود بـ true هنا
      // لأن المصادقة قد تمت بالفعل في دالة authorize الخاصة بـ CredentialsProvider
      return true;
    },

    // jwt callback: Manipulates the JWT token that NextAuth stores
    async jwt({ token, user }) {
      // If 'user' exists, it means a new sign-in or user data update occurred
      if (user) {
        // Transfer WordPress specific data from 'user' to the 'token'
        token.wordpressJwt = (user as any).wordpressJwt;
        token.wordpressUserId = (user as any).wordpressUserId;
        token.wordpressUserName = (user as any).wordpressUserName;
        token.wordpressUserEmail = (user as any).wordpressUserEmail;
        token.locale = (user as any).wordpressUserLocale;
      }
      return token;
    },

    // session callback: Exposes custom data from the JWT token to the client-side session
    async session({ session, token }) {
      // Add WordPress specific data from 'token' to 'session.user'
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
