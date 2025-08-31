// src/app/api/stripe-webhook/route.ts

import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-07-30.basil',
});
const webhookSecret: string = process.env.STRIPE_WEBHOOK_SECRET!;
const wordpressApiAuth: string = process.env.WORDPRESS_API_AUTH!;

export async function POST(req: Request) {
    // ⭐⭐ أضف هذا السطر ⭐⭐
    console.log("Stripe webhook received an event!");

    const body = await req.text();
    const signature = req.headers.get('stripe-signature') as string;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
        console.error(`Webhook signature verification failed.`, err.message);
        return NextResponse.json({ error: 'Webhook signature verification failed.' }, { status: 400 });
    }

    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        const donatedAmount = paymentIntent.amount / 100;
        const caseId = paymentIntent.metadata.case_id;

        if (!caseId) {
            console.error('Case ID not found in metadata.');
            return NextResponse.json({ received: true });
        }

        try {
            // 1. جلب بيانات الحالة الحالية من ووردبريس
            const getCaseUrl = `${process.env.NEXT_PUBLIC_WORDPRESS_BASE_URL}/wp-json/wp/v2/cases/${caseId}`;
            const getResponse = await fetch(getCaseUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${wordpressApiAuth}`, // المصادقة
                    'Content-Type': 'application/json',
                },
            });

            if (!getResponse.ok) {
                throw new Error(`WordPress API (GET) returned an error: ${getResponse.statusText}`);
            }

            const caseData = await getResponse.json();
            // ⭐ افتراض: المبلغ الحالي مخزن في حقل `total_donated` داخل `acf`
            const currentDonated = caseData.acf?.total_donated || 0;

            // 2. حساب المبلغ الإجمالي الجديد
            const newTotalDonated = parseFloat(currentDonated) + donatedAmount;

            // 3. تحديث المبلغ الجديد في ووردبريس
            const updateUrl = `${process.env.NEXT_PUBLIC_WORDPRESS_BASE_URL}/wp-json/wp/v2/cases/${caseId}`;
            const updateResponse = await fetch(updateUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${wordpressApiAuth}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    acf: {
                        total_donated: newTotalDonated.toFixed(2), // نرسله كرقم مع منزلتين عشريتين
                    },
                }),
            });

            if (!updateResponse.ok) {
                throw new Error(`WordPress API (POST) returned an error: ${updateResponse.statusText}`);
            }

            console.log(`Donation of $${donatedAmount} successfully recorded for case ID: ${caseId}. New total: $${newTotalDonated}`);
            
        } catch (error) {
            console.error('Failed to update WordPress total_donated field:', error);
            return NextResponse.json({ error: 'Failed to update WordPress.' }, { status: 500 });
        }
    }

    return NextResponse.json({ received: true });
}