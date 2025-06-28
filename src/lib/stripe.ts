
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

// The check for a placeholder key has been removed.
// The Stripe SDK will handle an invalid or missing key during API calls.
// Make sure to set a valid STRIPE_SECRET_KEY in your .env file.
if (!stripeSecretKey || stripeSecretKey.includes("YOUR_")) {
  console.error("Stripe Secret Key is missing or a placeholder. Stripe features will fail. Please check your .env file.");
}

export const stripe = new Stripe(stripeSecretKey!, {
  apiVersion: '2024-06-20',
  typescript: true,
});
