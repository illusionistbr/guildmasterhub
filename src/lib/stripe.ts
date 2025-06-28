import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey || stripeSecretKey.includes("YOUR_")) {
  throw new Error('Chave secreta do Stripe (STRIPE_SECRET_KEY) ausente ou é um placeholder. Verifique seu arquivo .env e substitua o valor de exemplo por sua chave real.');
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20',
  typescript: true,
});
