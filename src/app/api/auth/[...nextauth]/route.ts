// ==========================================================
// FILE: src/app/api/auth/[...nextauth]/route.ts
// DESCRIPTION: NextAuth.js API route for handling authentication callbacks.
// This sets up Google OAuth and handles session creation, now including
// the WordPress JWT token in the NextAuth session.
// ==========================================================

// --- CORE IMPORTS ---
// Ensure NextAuth is imported as the default function
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// --- NEXTAUTH CONFIGURATION ---
const handler = NextAuth({ // NextAuth is now correctly called as a function here
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  callbacks: {
    // signIn callback: Handles user authentication and interaction with WordPress backend
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
              googleId: profile?.sub, // Google user's unique ID
              email: user.email,
              name: user.name,
            }),
          });

          const data = await response.json();

          if (response.ok && data.token && data.user_id) {
            // Augment the 'user' object with WordPress specific data
            // This data will be passed to the 'jwt' callback
            (user as any).wordpressJwt = data.token;
            (user as any).wordpressUserId = data.user_id;
            (user as any).wordpressUserName = data.user_display_name;
            (user as any).wordpressUserEmail = data.user_email;

            return true; // Allow NextAuth to complete the sign-in process.
          } else {
            console.error("Error from WordPress backend during Google Auth:", data);
            return false; // Prevent sign-in if WordPress processing fails
          }
        } catch (error) {
          console.error("Failed to connect to WordPress backend for Google Auth:", error);
          return false; // Prevent sign-in on network error
        }
      }
      return true; // Allow sign-in for other providers if any
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
        session.user.name = token.wordpressUserName; // Optionally overwrite the default name
      }
      if (token.wordpressUserEmail) {
        session.user.email = token.wordpressUserEmail; // Optionally overwrite the default email
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login", // Redirects to our custom login page
    error: "/auth/error", // Optional: A custom error page for NextAuth errors
  },
});

// --- EXPORT HANDLERS ---
// Export the handler for both GET and POST requests
export { handler as GET, handler as POST };
