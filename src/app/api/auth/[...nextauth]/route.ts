// ==========================================================
// FILE: src/app/api/auth/[...nextauth]/route.ts
// DESCRIPTION: NextAuth.js API route for handling authentication callbacks.
// This sets up Google OAuth and handles session creation, now including
// the WordPress JWT token in the NextAuth session.
// ==========================================================

import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // This callback is executed when a user signs in with Google.
      // Here, we send the Google user data to our WordPress backend
      // to create/link the user and get a JWT token.

      if (account?.provider === "google") {
        try {
        const wordpressApiUrl = `${process.env.NEXT_PUBLIC_WORDPRESS_API_URL}/sanad/v1/google-auth-test`;

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

          if (response.ok) {
            // If WordPress successfully processes the Google user and returns a JWT token.
            // Store the JWT token and user details directly in localStorage here.
            // This is a common pattern for client-side JWT usage with NextAuth.
            // NextAuth's session is primarily for NextAuth's own session management.
            if (typeof window !== 'undefined') { // Ensure localStorage is available (client-side)
              localStorage.setItem('jwtToken', data.token);
              localStorage.setItem('userName', data.user_display_name);
              localStorage.setItem('userEmail', data.user_email);
              localStorage.setItem('wordpressUserId', data.user_id);
            }
            
            // Return true to allow NextAuth to complete the sign-in process.
            // Custom data is typically not returned directly from signIn for type compatibility.
            return true; 
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
    async jwt({ token, user, account }) {
      // The 'jwt' callback is called whenever a JWT is created (e.g., at sign in).
      // For Google provider, 'user' here typically contains basic Google profile info.
      // We are no longer passing custom data directly from signIn to user in jwt callback
      // because we handle JWT storage in localStorage in signIn.
      // If you need to add custom data to the NextAuth token/session, you'd fetch it here
      // or ensure it's passed via the 'user' object from a custom credential provider.
      return token;
    },
    async session({ session, token, user }) {
      // The 'session' callback is called whenever a session is checked.
      // We'll primarily rely on localStorage for the WordPress JWT.
      // The session object can still be useful for basic user info from NextAuth.
      return session;
    },
  },
  pages: {
    signIn: "/auth/login", // Redirects to our custom login page
    error: "/auth/error", // Optional: A custom error page for NextAuth errors
  },
});

export { handler as GET, handler as POST };

