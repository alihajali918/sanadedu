import Stripe from 'stripe';
import { NextResponse, type NextRequest } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-08-27.basil',
});

// ✅ المفتاح السري لسترايب (يتم الحصول عليه من لوحة تحكم سترايب)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

// ✅ المفتاح السري الخاص بـ API ووردبريس (تم إنشاؤه من قِبلك)
const sanadApiKey = process.env.SANAD_API_KEY as string;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    // ✅ التحقق من أن الرسالة قادمة من سترايب
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (err: any) {
    console.error(`❌ Webhook signature verification failed.`, err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // ✅ الاستماع للحدث الذي يخبرنا باكتمال عملية الدفع
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    // 🆕 الخطوة الأساسية: استرجاع تفاصيل عناصر السلة مع التوسيع
    // 'expand' أمر ضروري للحصول على بيانات المنتج الكاملة، بما في ذلك الميتا داتا.
    const sessionWithLineItems = await stripe.checkout.sessions.retrieve(
        session.id,
        {
            expand: ['line_items.data.price.product'],
        }
    );

    const caseId = sessionWithLineItems.metadata?.caseId;
    const amountInCents = sessionWithLineItems.amount_total;

    if (caseId && amountInCents) {
      const amountInDollars = amountInCents / 100;

      console.log(`✅ تم استلام تبرع بنجاح للحالة رقم: ${caseId}`);
      console.log(`المبلغ المتبرع به: ${amountInDollars} دولار`);
      
      // 🆕 الخطوة الثانية: جمع بيانات المنتجات المتبرع بها
      const donatedItems = sessionWithLineItems.line_items?.data.map((item: any) => {
          const product = item.price?.product as Stripe.Product;
          // ✅ يجب أن يتم تخزين الـ ID الخاص بحقل ACF في الميتا داتا للمنتج على Stripe.
          // نستخدم اسم حقل افتراضي هنا، تأكد من أنه يطابق الاسم الذي تستخدمه.
          const acfFieldId = product.metadata?.acf_field_id; 
          
          if (!acfFieldId) {
            console.warn(`⚠️ المنتج "${product.name}" ليس لديه معرف ACF في الميتا داتا.`);
            return null;
          }

          return {
              id: acfFieldId,
              quantity: item.quantity,
          };
      }).filter(item => item !== null);

      try {
        // ✅ الخطوة الثالثة: إرسال طلب تحديث آمن إلى ووردبريس مع البيانات الجديدة
        const wpUpdateResponse = await fetch('https://cms.sanadedu.org/wp-json/sanad/v1/update-case', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            caseId: caseId,
            amount: amountInDollars,
            donatedItems: donatedItems, // 🆕 إرسال المنتجات وكمياتها
            api_key: sanadApiKey,
          }),
        });

        if (!wpUpdateResponse.ok) {
          console.error('❌ فشل في تحديث ووردبريس:', await wpUpdateResponse.text());
        } else {
          console.log('✅ تم تحديث ووردبريس بنجاح.');
        }
      } catch (error) {
        console.error('❌ خطأ في الاتصال بـ API ووردبريس:', error);
      }
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}