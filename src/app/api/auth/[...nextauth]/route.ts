// ==========================================================
// FILE: src/app/api/auth/[...nextauth]/route.ts
// DESCRIPTION: NextAuth.js API route for handling authentication callbacks.
// This sets up Google OAuth and handles session creation, now including
// the WordPress JWT token in the NextAuth session.
// ==========================================================

// Import the NextAuth *function* directly
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({ // <-- Here, NextAuth is correctly called as a function
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          const wordpressApiUrl = `${process.env.NEXT_PUBLIC_WORDPRESS_API_URL}/sanad/v1/social-auth-process`;

          const response = await fetch(wordpressApiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              googleId: profile?.sub,
              email: user.email,
              name: user.name,
            }),
          });

          const data = await response.json();

          if (response.ok && data.token && data.user_id) {
            (user as any).wordpressJwt = data.token;
            (user as any).wordpressUserId = data.user_id;
            (user as any).wordpressUserName = data.user_display_name;
            (user as any).wordpressUserEmail = data.user_email;

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
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
});

export { handler as GET, handler as POST };