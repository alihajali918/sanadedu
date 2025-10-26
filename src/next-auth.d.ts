import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

/**
 * هذا الملف يقوم بـ "Module Augmentation" (توسيع الوحدة)
 * لكائنات NextAuth (Session, User, JWT) لإضافة حقول WordPress المخصصة.
 * يجب وضعه في مسار معروف لـ TypeScript، مثل: src/types/next-auth.d.ts
 */

// 1. توسيع وحدة 'next-auth'
declare module "next-auth" {
  /**
   * كائن الجلسة (Session Object) - يمكن الوصول إليه عبر useSession أو auth()
   */
  interface Session {
    user: {
      // ✅ الحقول المضافة من WordPress
      /** The user's WordPress JWT token, used for API calls. */
      wordpressJwt?: string;
      /** The user's numeric WordPress ID. */
      wordpressUserId?: number; 
      /** The user's WordPress locale/language. (جديد/مصحح) */
      wordpressUserLocale?: string; 
      
      // تبقى الخصائص القياسية: id, name, email, image
      id?: string;
    } & DefaultSession["user"];
  }

  /**
   * كائن المستخدم (User Object) - يُستخدم عند تسجيل الدخول (signIn)
   */
  interface User {
    /** The user's WordPress JWT token. */
    wordpressJwt?: string;
    /** The user's numeric WordPress ID. */
    wordpressUserId?: number; 
    /** The user's WordPress display name. */
    wordpressUserName?: string;
    /** The user's WordPress email. */
    wordpressUserEmail?: string;
    /** The user's WordPress locale/language. */
    wordpressUserLocale?: string;
  }
}

// 2. توسيع وحدة 'next-auth/jwt'
declare module "next-auth/jwt" {
  /**
   * كائن التوكن (JWT Token) - يُستخدم لتخزين البيانات بين الـ JWT والـ Session
   */
  interface JWT {
    // ✅ الحقول المضافة من WordPress
    /** The user's WordPress JWT token. */
    wordpressJwt?: string;
    /** The user's numeric WordPress ID. */
    wordpressUserId?: number;
    /** The user's WordPress display name. */
    wordpressUserName?: string;
    /** The user's WordPress email. */
    wordpressUserEmail?: string;
    /** The user's WordPress locale/language. */
    wordpressUserLocale?: string;
  }
}