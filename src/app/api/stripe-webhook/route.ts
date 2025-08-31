import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-07-30.basil',
});

const webhookSecret: string = process.env.STRIPE_WEBHOOK_SECRET!;
const wordpressApiAuth: string = process.env.WORDPRESS_API_AUTH!;

export async function POST(req: Request) {
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
            const wordpressBaseUrl = process.env.NEXT_PUBLIC_WORDPRESS_BASE_URL;
            const getCaseUrl = `${wordpressBaseUrl}/wp-json/wp/v2/cases/${caseId}`;
            
            const getResponse = await fetch(getCaseUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${wordpressApiAuth}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!getResponse.ok) {
                console.error(`Failed to GET case data from WordPress. Status: ${getResponse.status}, Text: ${getResponse.statusText}`);
                throw new Error(`WordPress API (GET) returned an error: ${getResponse.statusText}`);
            }

            const caseData = await getResponse.json();
            console.log("Successfully fetched case data. Attempting to update...");
            const currentDonated = caseData.acf?.total_donated || 0;
            const newTotalDonated = parseFloat(currentDonated) + donatedAmount;

            const updateUrl = `${wordpressBaseUrl}/wp-json/wp/v2/cases/${caseId}`;
            const updateResponse = await fetch(updateUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${wordpressApiAuth}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    acf: {
                        total_donated: newTotalDonated.toFixed(2),
                    },
                }),
            });

            if (!updateResponse.ok) {
                console.error(`Failed to POST case data to WordPress. Status: ${updateResponse.status}, Text: ${updateResponse.statusText}`);
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
