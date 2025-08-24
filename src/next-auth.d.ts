// src/types/next-auth.d.ts (or types/next-auth.d.ts)
import NextAuth from "next-auth";
import { JWT } from "next-auth/jwt"; // Import JWT type

// Declare module augmentation for 'next-auth'
declare module "next-auth" {
  // Extend the default Session object
  interface Session {
    user: {
      /** The user's WordPress JWT token. */
      wordpressJwt?: string;
      /** The user's WordPress ID. */
      wordpressUserId?: string;
      // You can add other WordPress-specific user data here if needed
      // e.g., role, capabilities, etc.
    } & DefaultSession["user"]; // Keep existing properties of DefaultSession user
  }

  // Extend the default User object (used in signIn, jwt callbacks)
  interface User {
    /** The user's WordPress JWT token. */
    wordpressJwt?: string;
    /** The user's WordPress ID. */
    wordpressUserId?: string;
    /** The user's WordPress display name. */
    wordpressUserName?: string;
    /** The user's WordPress email. */
    wordpressUserEmail?: string;
  }
}

// Declare module augmentation for 'next-auth/jwt'
declare module "next-auth/jwt" {
  // Extend the default JWT token
  interface JWT {
    /** The user's WordPress JWT token. */
    wordpressJwt?: string;
    /** The user's WordPress ID. */
    wordpressUserId?: string;
    /** The user's WordPress display name. */
    wordpressUserName?: string;
    /** The user's WordPress email. */
    wordpressUserEmail?: string;
  }
}
