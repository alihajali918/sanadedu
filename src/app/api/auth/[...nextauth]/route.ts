// ==========================================================
// الملف: src/app/api/auth/[...nextauth]/route.ts
// الوصف: مسار API لـ NextAuth.js للتعامل مع استدعاءات المصادقة (callbacks).
// يقوم هذا الملف بإعداد مصادقة Google OAuth ويدير إنشاء الجلسة،
// ويشمل الآن رمز JWT الخاص بـ WordPress في جلسة NextAuth.
// ==========================================================

// --- الاستيرادات الأساسية ---
// تأكد من استيراد NextAuth كدالة افتراضية
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// --- إعداد NEXTAUTH ---
const handler = NextAuth({ // NextAuth يتم استدعاؤها الآن بشكل صحيح كدالة هنا
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  callbacks: {
    // وظيفة رد الاتصال signIn: تتعامل مع مصادقة المستخدم والتفاعل مع الواجهة الخلفية لـ WordPress
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
              googleId: profile?.sub, // المعرف الفريد لمستخدم Google
              email: user.email,
              name: user.name,
            }),
          });

          const data = await response.json();

          if (response.ok && data.token && data.user_id) {
            // إثراء كائن 'user' ببيانات WordPress المحددة
            // سيتم تمرير هذه البيانات إلى وظيفة رد الاتصال 'jwt'
            (user as any).wordpressJwt = data.token;
            (user as any).wordpressUserId = data.user_id;
            (user as any).wordpressUserName = data.user_display_name;
            (user as any).wordpressUserEmail = data.user_email;

            return true; // السماح لـ NextAuth بإكمال عملية تسجيل الدخول.
          } else {
            console.error("خطأ من الواجهة الخلفية لـ WordPress أثناء مصادقة Google:", data);
            return false; // منع تسجيل الدخول إذا فشلت معالجة WordPress
          }
        } catch (error) {
          console.error("فشل الاتصال بالواجهة الخلفية لـ WordPress لمصادقة Google:", error);
          return false; // منع تسجيل الدخول عند حدوث خطأ في الشبكة
        }
      }
      return true; // السماح بتسجيل الدخول للموفرين الآخرين إن وجدوا
    },

    // وظيفة رد الاتصال jwt: تعالج رمز JWT الذي يخزنه NextAuth
    async jwt({ token, user }) {
      // إذا كان 'user' موجودًا، فهذا يعني حدوث تسجيل دخول جديد أو تحديث لبيانات المستخدم
      if (user) {
        // نقل بيانات WordPress المحددة من 'user' إلى 'token'
        token.wordpressJwt = (user as any).wordpressJwt;
        token.wordpressUserId = (user as any).wordpressUserId;
        token.wordpressUserName = (user as any).wordpressUserName;
        token.wordpressUserEmail = (user as any).wordpressUserEmail;
      }
      return token;
    },

    // وظيفة رد الاتصال session: تعرض البيانات المخصصة من رمز JWT إلى جلسة جانب العميل
    async session({ session, token }) {
      // إضافة بيانات WordPress المحددة من 'token' إلى 'session.user'
      if (token.wordpressJwt) {
        (session.user as any).wordpressJwt = token.wordpressJwt;
      }
      if (token.wordpressUserId) {
        (session.user as any).wordpressUserId = token.wordpressUserId;
      }
      if (token.wordpressUserName) {
        session.user.name = token.wordpressUserName; // (اختياري) تجاوز الاسم الافتراضي
      }
      if (token.wordpressUserEmail) {
        session.user.email = token.wordpressUserEmail; // (اختياري) تجاوز البريد الإلكتروني الافتراضي
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login", // إعادة التوجيه إلى صفحة تسجيل الدخول المخصصة لدينا
    error: "/auth/error", // (اختياري) صفحة خطأ مخصصة لأخطاء NextAuth
  },
});

// --- تصدير المعالجات (EXPORTR HANDLERS) ---
// تصدير المعالج لطلبات GET و POST
export { handler as GET, handler as POST };
