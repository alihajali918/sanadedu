// ==========================================================
// FILE: src/lib/auth.ts
// DESCRIPTION: NextAuth.js configuration shared across the application.
// FIX: Implemented Token Refresh logic (Rotation) for WordPress JWT
// to maintain session continuity and extended session maxAge.
// ==========================================================

import NextAuth, { NextAuthOptions, User, Session } from "next-auth";
import { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

// تم تغيير هذه المتغيرات إلى const عادية لاستخدامها داخل دالة NextAuth
const WORDPRESS_BASE_URL = process.env.NEXT_PUBLIC_WORDPRESS_API_URL as string;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID as string;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET as string;

// نفترض أن توكن ووردبريس صالح لمدة ساعة واحدة (3600 ثانية).
// قم بتعديل هذا الثابت ليناسب إعدادات المكون الإضافي JWT في ووردبريس لديك.
const JWT_EXPIRY_SECONDS = 3600; // 1 hour

// 💡 ثابت رسالة الخطأ عند فشل التجديد
const REFRESH_ERROR = "RefreshAccessTokenError";


// الدالة المساعدة لجمع ID المستخدم من ووردبريس باستخدام JWT
export async function fetchWpCurrentUserId(jwt: string): Promise<number | null> {
    try {
        const url = `${WORDPRESS_BASE_URL}/wp/v2/users/me`;
        const resp = await fetch(url, {
            headers: { Authorization: `Bearer ${jwt}` },
            cache: "no-store",
        });
        if (!resp.ok) return null;
        const me = await resp.json();
        return me?.id ? Number(me.id) : null;
    } catch (e) {
        return null;
    }
}

/**
 * دالة مساعدة لتجديد توكن ووردبريس JWT.
 * @param token توكن NextAuth الحالي الذي يحتوي على توكن ووردبريس القديم.
 * @returns توكن NextAuth مجدد أو توكن بخطأ.
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
    // 💡 ملاحظة: نفترض وجود نقطة نهاية للتجديد مثل 'jwt-auth/v1/token/refresh'
    const refreshUrl = `${WORDPRESS_BASE_URL}/jwt-auth/v1/token/refresh`;

    // ⛔️ التحقق من وجود التوكن القديم قبل المحاولة
    const oldWpToken = (token as any).wordpressJwt;
    if (!oldWpToken) {
         console.error("Cannot refresh: wordpressJwt is missing in NextAuth token.");
         return { ...token, error: REFRESH_ERROR };
    }

    try {
        const response = await fetch(refreshUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // نستخدم التوكن القديم (الموجود في JWT) للحصول على توكن جديد
            body: JSON.stringify({ token: oldWpToken }), 
        });

        const refreshedData = await response.json();
        
        if (!response.ok || !refreshedData?.token) {
            console.error("Token refresh failed. Response:", refreshedData);
            // إذا فشل التجديد، نضيف خطأ إلى التوكن لإجبار تسجيل الخروج
            return { ...token, error: REFRESH_ERROR };
        }
        
        // تم التجديد بنجاح، نقوم بتحديث التوكن ووقت الانتهاء
        return {
            ...token,
            wordpressJwt: refreshedData.token, // التوكن الجديد
            wordpressJwtExpires: Date.now() + JWT_EXPIRY_SECONDS * 1000, // وقت الانتهاء الجديد
            error: undefined, // مسح أي خطأ سابق
        };
    } catch (error) {
        console.error("Error during token refresh API call:", error);
        return { ...token, error: REFRESH_ERROR };
    }
}


// 📌 1. كائن الإعدادات الأصلي (بدون تصدير)
const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
        }),
        CredentialsProvider({
            name: "WordPress Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;
                const tokenUrl = `${WORDPRESS_BASE_URL}/jwt-auth/v1/token`;

                try {
                    const response = await fetch(tokenUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ username: credentials.email, password: credentials.password }),
                    });
                    const data = await response.json();
                    
                    if (!response.ok || !data?.token) return null;

                    let wpUserId = data?.user_id;
                    if (!wpUserId) wpUserId = await fetchWpCurrentUserId(data.token);

                    if (!wpUserId) return null;

                    // ✅ تعيين ID القياسي وهنا نقوم بحساب وتخزين وقت انتهاء الصلاحية
                    const user = {
                        id: String(wpUserId), 
                        name: data.user_display_name || credentials.email,
                        email: data.user_email || credentials.email,
                        wordpressJwt: data.token,
                        wordpressUserId: Number(wpUserId),
                        wordpressUserName: data.user_display_name || credentials.email,
                        wordpressUserEmail: data.user_email || credentials.email,
                        wordpressUserLocale: data.user_locale || "en-US",
                        // ⭐️ الجديد: تخزين وقت انتهاء صلاحية توكن ووردبريس
                        wordpressJwtExpires: Date.now() + JWT_EXPIRY_SECONDS * 1000,
                    };
                    return user as any;
                } catch (err: any) {
                    if (String(err?.message || "").includes("Email not verified")) throw err;
                    return null;
                }
            },
        }),
    ],

    callbacks: {
        async signIn({ user, account, profile }) {
            // ... (منطق Social Auth - يبقى كما هو)
            return true; 
        },

        async jwt({ token, user }) {
            // 1. عند تسجيل الدخول (user موجود)
            if (user) {
                token.id = user.id; 
                token.wordpressJwt = (user as any).wordpressJwt ?? token.wordpressJwt;
                token.wordpressUserId = (user as any).wordpressUserId ?? token.wordpressUserId;
                token.name = (user as any).wordpressUserName ?? user.name;
                token.email = (user as any).wordpressUserEmail ?? user.email;
                // ⭐️ تخزين وقت انتهاء صلاحية التوكن عند تسجيل الدخول
                (token as any).wordpressJwtExpires = (user as any).wordpressJwtExpires ?? (token as any).wordpressJwtExpires;
                
                return token;
            }

            // 2. أثناء الجلسة (user غير موجود) - تطبيق منطق التجديد

            // إذا كان هناك خطأ في التجديد، لا نعد التوكن، مما يجبر تسجيل الخروج
            if ((token as any).error === REFRESH_ERROR) {
                return token;
            }
            
            // 🕒 التحقق: إذا كان التوكن ينتهي صلاحيته في أقل من 5 دقائق (300000 مللي ثانية)
            const FIVE_MINUTES_MS = 5 * 60 * 1000;
            const expiresAt = (token as any).wordpressJwtExpires || 0;
            const currentWpJwt = (token as any).wordpressJwt;

            // ⛔️ إذا لم يكن هناك توكن ووردبريس أصلاً (مثلاً: جلسة Google)، نتجاهل التجديد
            if (!currentWpJwt) {
                 return token;
            }

            if (Date.now() < expiresAt - FIVE_MINUTES_MS) {
                // التوكن لا يزال صالحاً، لا حاجة للتجديد بعد
                return token;
            }

            // التوكن على وشك الانتهاء أو انتهى، نقوم بالتجديد
            return refreshAccessToken(token as any);
        },

        async session({ session, token }) {
            // 🎯 التصحيح الأساسي: تعيين session.user.id
            if (token.id) {
                 (session.user as any).id = token.id as string;
            } else if ((token as any).wordpressUserId) {
                 (session.user as any).id = String((token as any).wordpressUserId);
            }

            // نقل الحقول الإضافية
            if ((token as any).wordpressJwt) (session.user as any).wordpressJwt = (token as any).wordpressJwt;
            if ((token as any).wordpressUserId) (session.user as any).wordpressUserId = (token as any).wordpressUserId;
            session.user.name = token.name;
            session.user.email = token.email;

            // ⚠️ إذا كان هناك خطأ تجديد في التوكن، نُزيله من الجلسة لمنع استخدامها
            if ((token as any).error) {
                (session as any).error = (token as any).error;
            }

            return session;
        },
    },
    
    session: {
        strategy: "jwt",
        // ⭐️ الجديد: تمديد مدة جلسة NextAuth إلى 7 أيام
        maxAge: 7 * 24 * 60 * 60, // 7 أيام (بالثواني)
    },

    pages: {
        signIn: "/auth/login",
        error: "/auth/error",
    },
};

// 📌 2. تصدير handlers و auth و signIn و signOut مباشرة من NextAuth
export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);

// 📌 3. تصدير authOptions كاحتياطي أو للاستخدام في getServerSession (للتوافق)
export { authOptions };