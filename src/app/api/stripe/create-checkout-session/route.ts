
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Guild } from '@/types/guildmaster';
import { headers } from 'next/headers';

export async function POST(req: Request) {
  const { guildId, userId, priceId } = await req.json();
  const origin = headers().get('origin') || 'http://localhost:3000';

  if (!guildId || !userId || !priceId) {
    return new NextResponse('Missing guildId, userId, or priceId', { status: 400 });
  }

  try {
    const guildDocRef = doc(db, 'guilds', guildId);
    const guildDoc = await getDoc(guildDocRef);

    if (!guildDoc.exists()) {
      return new NextResponse('Guild not found', { status: 404 });
    }

    const guild = guildDoc.data() as Guild;
    let stripeCustomerId = guild.stripeCustomerId;

    // Create a Stripe customer if one doesn't exist
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        metadata: {
          guildId: guildId,
        },
      });
      stripeCustomerId = customer.id;
      await updateDoc(guildDocRef, { stripeCustomerId });
    }

    if (!priceId) {
        throw new Error("Stripe Price ID is not configured.");
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard/billing?guildId=${guildId}&success=true`,
      cancel_url: `${origin}/dashboard/billing?guildId=${guildId}&canceled=true`,
      metadata: {
        guildId,
        userId
      }
    });

    return NextResponse.json({ sessionId: session.id });

  } catch (error: any) {
    console.error('Stripe Checkout Error:', error);
    return new NextResponse(`Stripe Checkout Error: ${error.message}`, { status: 500 });
  }
}
