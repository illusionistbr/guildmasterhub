import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { doc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('Stripe-Signature') as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('Stripe webhook secret not configured.');
    return new NextResponse('Webhook secret not configured', { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const guildId = session?.metadata?.guildId;

  if (!guildId) {
    console.error('Webhook Error: Missing guildId in metadata');
    return new NextResponse('Webhook Error: Missing guildId in metadata', { status: 400 });
  }
  
  const guildRef = doc(db, 'guilds', guildId);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        await updateDoc(guildRef, {
          plan: 'pro',
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: subscription.customer,
          stripePriceId: subscription.items.data[0].price.id,
          stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
          trialEndsAt: deleteField(),
          proTrialUsed: true,
        });
        break;
      }
      case 'invoice.payment_succeeded': {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        await updateDoc(guildRef, {
            stripePriceId: subscription.items.data[0].price.id,
            stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
        });
        break;
      }
      case 'customer.subscription.deleted':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        if (subscription.status === 'active') {
            // Subscription renewed or changed
            await updateDoc(guildRef, {
                plan: 'pro',
                stripePriceId: subscription.items.data[0].price.id,
                stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
            });
        } else {
            // Subscription cancelled or ended
            await updateDoc(guildRef, {
                plan: 'free',
                stripeSubscriptionId: deleteField(),
                stripePriceId: deleteField(),
                stripeCurrentPeriodEnd: deleteField(),
            });
        }
        break;
      }
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  } catch (error) {
    console.error('Webhook handler error:', error);
    return new NextResponse('Webhook handler error', { status: 500 });
  }

  return new NextResponse(null, { status: 200 });
}
