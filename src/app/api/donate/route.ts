import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { caseId, donationAmount } = await request.json();

        if (!caseId || !donationAmount) {
            return NextResponse.json({ message: 'Missing caseId or donationAmount' }, { status: 400 });
        }

        const wordpressApiUrl = process.env.WORDPRESS_API_URL;
        const accessToken = process.env.WORDPRESS_ACCESS_TOKEN;

        // جلب قيمة التبرع الحالية
        const currentDonationResponse = await fetch(`${wordpressApiUrl}/wp-json/wp/v2/cases/${caseId}`);
        const caseData = await currentDonationResponse.json();

        const currentDonated = caseData.acf.total_donated || 0;
        const newTotalDonated = currentDonated + donationAmount;

        // إرسال طلب إلى ووردبريس لتحديث حقل ACF
        const response = await fetch(`${wordpressApiUrl}/wp-json/wp/v2/cases/${caseId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                acf: {
                    total_donated: newTotalDonated
                }
            })
        });

        if (response.ok) {
            return NextResponse.json({ message: 'Donation successful and case updated' }, { status: 200 });
        } else {
            const error = await response.json();
            return NextResponse.json({ message: 'Failed to update WordPress', details: error }, { status: response.status });
        }

    } catch (error) {
        console.error('Donation API Error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}