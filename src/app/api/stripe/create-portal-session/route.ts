import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Guild } from '@/types/guildmaster';
import { headers } from 'next/headers';

export async function POST(req: Request) {
  const { guildId } = await req.json();
  const origin = headers().get('origin') || 'http://localhost:3000';

  if (!guildId) {
    return new NextResponse('Missing guildId', { status: 400 });
  }

  try {
    const guildDocRef = doc(db, 'guilds', guildId);
    const guildDoc = await getDoc(guildDocRef);

    if (!guildDoc.exists()) {
      return new NextResponse('Guild not found', { status: 404 });
    }

    const guild = guildDoc.data() as Guild;
    const stripeCustomerId = guild.stripeCustomerId;

    if (!stripeCustomerId) {
      return new NextResponse('Stripe customer ID not found for this guild.', { status: 400 });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${origin}/dashboard/billing?guildId=${guildId}`,
    });

    return NextResponse.json({ url: portalSession.url });

  } catch (error: any) {
    console.error('Stripe Portal Session Error:', error);
    return new NextResponse(`Stripe Portal Session Error: ${error.message}`, { status: 500 });
  }
}
