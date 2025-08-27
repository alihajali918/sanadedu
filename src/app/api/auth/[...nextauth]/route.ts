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

          // --- تعديل هنا: تقسيم الاسم الكامل إلى firstName و lastName ---
          let firstName = '';
          let lastName = '';

          // الأولوية للحقول المحددة من ملف تعريف جوجل إذا كانت متاحة (مثل given_name, family_name)
          // هذا يضمن دقة أعلى للأسماء
          if ((profile as any)?.given_name) {
            firstName = (profile as any).given_name;
          }
          if ((profile as any)?.family_name) {
            lastName = (profile as any).family_name;
          } else if (user.name) {
            // إذا لم تكن given_name و family_name متاحة، حاول تقسيم الاسم الكامل
            const nameParts = user.name.split(' ');
            if (nameParts.length > 1) {
              firstName = nameParts[0];
              lastName = nameParts.slice(1).join(' '); // باقي الأجزاء تعتبر اسم العائلة
            } else {
              firstName = nameParts[0];
              lastName = ''; // إذا كان جزء واحد فقط، نعتبره الاسم الأول فقط
            }
          }
          // --- نهاية التعديل لتقسيم الاسم ---

          // يمكنك إضافة console.log هنا لتأكيد أن firstName و lastName تم إعدادهما بشكل صحيح
          console.log("User data from Google:", {
            email: user.email,
            fullName: user.name, // الاسم الكامل الأصلي من Google
            givenName: (profile as any)?.given_name, // الاسم الأول من Google Profile
            familyName: (profile as any)?.family_name, // الاسم الأخير من Google Profile
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
              socialId: profile?.sub, // تم تغيير googleId إلى socialId ليتناسب مع ووردبريس
              email: user.email,
              firstName: firstName, // إرسال الاسم الأول بشكل منفصل
              lastName: lastName,   // إرسال الاسم الأخير بشكل منفصل
              provider: 'google',   // إضافة مزود الخدمة
            }),
          });

          const data = await response.json();

          if (response.ok && data.token && data.user_id) {
            // Augment the 'user' object with WordPress specific data
            // This data will be passed to the 'jwt' callback
            (user as any).wordpressJwt = data.token;
            (user as any).wordpressUserId = data.user_id;
            (user as any).wordpressUserName = data.user_display_name || user.name; // استخدام display_name من ووردبريس إذا توفر، وإلا الاسم الأصلي
            (user as any).wordpressUserEmail = data.user_email || user.email;

            // يمكنك إضافة console.log هنا لتأكيد استجابة WordPress
            console.log("WordPress API response success:", data);

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
