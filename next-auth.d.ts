// next-auth.d.ts
import { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

// قم بتوسيع أنواع البيانات الافتراضية لـ NextAuth لإضافة خصائصنا المخصصة
declare module "next-auth" {
  /**
   * تعريف كائن الجلسة (Session) المتاح في جانب العميل.
   * أضفنا خاصية 'wordpress' هنا لتضمين الـ JWT ومعرف المستخدم من ووردبريس.
   */
  interface Session {
    user: {
      wordpress: {
        token: string;
        userId: number;
      };
    } & DefaultSession["user"]; // دمج مع الخصائص الافتراضية للمستخدم في الجلسة
  }

  /**
   * تعريف كائن المستخدم (User) الذي يُمرر بين دوال الـ Callbacks.
   * هذه الخاصية اختيارية لأنها قد لا تكون موجودة في جميع سياقات المستخدم.
   */
  interface User {
    wordpress?: {
      token: string;
      userId: number;
    };
  }
}

// قم بتوسيع نوع الرمز (JWT) لتضمين بيانات ووردبريس.
declare module "next-auth/jwt" {
  /**
   * تعريف الرمز (JWT) الذي يُخزَّن داخليًا بواسطة NextAuth على الخادم.
   * أضفنا خاصية 'wordpress' لتمرير بيانات الـ JWT الخاصة بنا.
   */
  interface JWT {
    wordpress?: {
      token: string;
      userId: number;
    };
  }
}

// قم بتوسيع نوع ملف تعريف Google لإضافة خصائص الاسم الأول والأخير.
declare module "next-auth/providers/google" {
  /**
   * تعريف ملف تعريف Google (GoogleProfile) لتضمين الأسماء.
   * 'given_name' و 'family_name' هي خصائص عادة ما تأتي من ملف تعريف Google.
   */
  interface GoogleProfile extends Profile {
    given_name?: string; // الاسم الأول
    family_name?: string; // الاسم الأخير
    sub: string;         // المعرف الفريد من Google (مثل socialId)
  }
}
