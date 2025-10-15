// ==========================================================
// FILE: src/lib/auth.ts 
// DESCRIPTION: NextAuth.js configuration shared across the application.
// ==========================================================

import { NextAuthOptions, User, Session } from "next-auth";
import { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

const WORDPRESS_BASE_URL = process.env.NEXT_PUBLIC_WORDPRESS_API_URL as string;

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

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
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

                    // ✅ تعيين ID القياسي هنا
                    const user = {
                        id: String(wpUserId), 
                        name: data.user_display_name || credentials.email,
                        email: data.user_email || credentials.email,
                        wordpressJwt: data.token,
                        wordpressUserId: Number(wpUserId),
                        wordpressUserName: data.user_display_name || credentials.email,
                        wordpressUserEmail: data.user_email || credentials.email,
                        wordpressUserLocale: data.user_locale || "en-US",
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
            if (user) {
                // نقل ID القياسي والحقول المخصصة إلى الـ Token
                token.id = user.id; 
                token.wordpressJwt = (user as any).wordpressJwt ?? token.wordpressJwt;
                token.wordpressUserId = (user as any).wordpressUserId ?? token.wordpressUserId;
                token.name = (user as any).wordpressUserName ?? user.name;
                token.email = (user as any).wordpressUserEmail ?? user.email;
            }
            return token;
        },

        async session({ session, token }) {
            // 🎯 التصحيح الأساسي: تعيين session.user.id
            if (token.id) {
                 (session.user as any).id = token.id as string; // ✅ تعيين ID القياسي
            } else if ((token as any).wordpressUserId) {
                 (session.user as any).id = String((token as any).wordpressUserId); // ✅ احتياطي
            }

            // نقل الحقول الإضافية
            if ((token as any).wordpressJwt) (session.user as any).wordpressJwt = (token as any).wordpressJwt;
            if ((token as any).wordpressUserId) (session.user as any).wordpressUserId = (token as any).wordpressUserId;
            session.user.name = token.name;
            session.user.email = token.email;

            return session;
        },
    },
    
    session: {
        strategy: "jwt",
    },

    pages: {
        signIn: "/auth/login",
        error: "/auth/error",
    },
};

// 📌 تذكير: يجب إضافة هذا الـ Type Declaration في ملف next-auth.d.ts لتعريف الحقول المخصصة لـ TypeScript.