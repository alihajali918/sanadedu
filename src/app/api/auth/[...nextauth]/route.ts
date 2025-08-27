// ==========================================================
// FILE: src/app/api/auth/[...nextauth]/route.ts
// DESCRIPTION: NextAuth.js API route for handling authentication callbacks.
// This sets up Google OAuth and handles session creation, including
// the WordPress JWT token and Credential Provider for traditional login.
// ==========================================================

// --- CORE IMPORTS ---
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

// --- NEXTAUTH CONFIGURATION ---
const handler = NextAuth({
  providers: [
    // Google OAuth Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    // Credentials Provider for WordPress traditional login
    CredentialsProvider({
      name: "WordPress Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          console.error("Credentials: Email or password missing.");
          return null;
        }

        // Step 1: Search for the WordPress username (user_login) using the provided email
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
            console.error("Credentials Auth: User not found for the provided email.");
            // Important: Return null to signify failed authorization
            return null;
          }

          // Step 2: Extract the actual WordPress username (slug typically matches user_login)
          const wordpressUsername = userSearchData[0].slug;
          if (!wordpressUsername) {
            console.error("Credentials Auth: Could not retrieve WordPress username from API.");
            return null;
          }

          // Step 3: Authenticate with WordPress JWT endpoint using the retrieved username and password
          const wordpressTokenApiUrl = `${process.env.NEXT_PUBLIC_WORDPRESS_API_URL}/jwt-auth/v1/token`;
          const response = await fetch(wordpressTokenApiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              username: wordpressUsername, // Use the actual WordPress username here
              password: credentials.password,
            }),
          });

          const data = await response.json();

          if (response.ok && data.token && data.user_id) {
            // If authentication is successful, construct the user object
            const user = {
              id: data.user_id.toString(), // NextAuth expects string ID
              name: data.user_display_name || credentials.email,
              email: data.user_email || credentials.email,
              wordpressJwt: data.token,
              wordpressUserId: data.user_id,
              wordpressUserName: data.user_display_name,
              wordpressUserEmail: data.user_email,
              wordpressUserLocale: data.user_locale || "en-US",
            };
            return user; // Return the user object for successful authorization
          } else {
            // Handle specific WordPress JWT errors (e.g., email not verified)
            if (data.code === 'rest_email_not_verified') {
                console.error("Credentials Auth Error: Email not verified for user:", credentials.email);
                // You might want to throw a specific error here or return null with a message
                throw new Error("Email not verified. Please check your inbox.");
            }
            console.error("Error from WordPress backend during Credentials Auth:", data);
            return null; // Return null for general authentication failure
          }
        } catch (error: any) {
          console.error("Failed to connect to WordPress backend for Credentials Auth:", error.message);
          // Propagate specific error messages if needed
          if (error.message.includes("Email not verified")) {
              throw error; // Re-throw to be caught by NextAuth error page
          }
          return null; // Return null for connection/other errors
        }
      },
    }),
  ],
  callbacks: {
    // This callback is called when a user signs in.
    // It's crucial for both Google and Credentials providers to populate the 'user' object with WordPress data.
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
            // Attach WordPress specific data to the NextAuth 'user' object
            // This data will then be available in the 'jwt' callback
            (user as any).wordpressJwt = data.token;
            (user as any).wordpressUserId = data.user_id;
            (user as any).wordpressUserName = data.user_display_name || user.name;
            (user as any).wordpressUserEmail = data.user_email || user.email;
            (user as any).wordpressUserLocale = data.user_locale || "en-US";
            return true; // Successfully processed Google sign-in
          } else {
            console.error("Error from WordPress backend during Google Auth:", data);
            return false; // Failed to process Google sign-in with WordPress
          }
        } catch (error) {
          console.error("Failed to connect to WordPress backend for Google Auth:", error);
          return false; // Failed to connect
        }
      }
      // For CredentialsProvider, the user object is already populated in the authorize function,
      // so we just return true here to allow the sign-in.
      return true;
    },

    // This callback is called whenever a JSON Web Token is created or updated.
    // It adds custom WordPress data to the JWT.
    async jwt({ token, user }) {
      if (user) {
        // 'user' is populated from the 'authorize' function (Credentials) or 'signIn' (Google)
        token.wordpressJwt = (user as any).wordpressJwt;
        token.wordpressUserId = (user as any).wordpressUserId;
        token.wordpressUserName = (user as any).wordpressUserName;
        token.wordpressUserEmail = (user as any).wordpressUserEmail;
        token.locale = (user as any).wordpressUserLocale;
      }
      return token;
    },

    // This callback is called whenever a session is checked.
    // It exposes the custom data from the JWT to the client-side session.
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
  // Custom pages for sign-in and error handling
  pages: {
    signIn: "/auth/login",
    error: "/auth/error", // This will be used to display errors like "Email not verified"
  },
});

// --- EXPORT HANDLERS ---
export { handler as GET, handler as POST };
