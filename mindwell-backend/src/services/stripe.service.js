// src/services/stripe.service.js
const Stripe = require('stripe');

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-02-24.acacia', // Use the latest version
});

class StripeService {
    
    /**
     * Create a Payment Intent
     */
    async createPaymentIntent(amount, currency = 'usd', metadata = {}) {
        try {
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(amount * 100), // Convert to cents
                currency: currency,
                metadata: metadata,
                automatic_payment_methods: {
                    enabled: true,
                },
            });

            return {
                success: true,
                clientSecret: paymentIntent.client_secret,
                intentId: paymentIntent.id,
                paymentIntent: paymentIntent,
            };
        } catch (error) {
            console.error('Stripe PaymentIntent Error:', error.message);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Retrieve a Payment Intent
     */
    async retrievePaymentIntent(intentId) {
        try {
            const paymentIntent = await stripe.paymentIntents.retrieve(intentId);
            return {
                success: true,
                paymentIntent: paymentIntent,
            };
        } catch (error) {
            console.error('Stripe Retrieve Error:', error.message);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Confirm a Payment Intent
     */
    async confirmPaymentIntent(intentId, paymentMethodId) {
        try {
            const paymentIntent = await stripe.paymentIntents.confirm(intentId, {
                payment_method: paymentMethodId,
            });

            return {
                success: true,
                paymentIntent: paymentIntent,
            };
        } catch (error) {
            console.error('Stripe Confirm Error:', error.message);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Cancel a Payment Intent
     */
    async cancelPaymentIntent(intentId) {
        try {
            const paymentIntent = await stripe.paymentIntents.cancel(intentId);
            return {
                success: true,
                paymentIntent: paymentIntent,
            };
        } catch (error) {
            console.error('Stripe Cancel Error:', error.message);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Refund a Payment
     */
    async refundPayment(paymentIntentId, amount = null) {
        try {
            const refundParams = {
                payment_intent: paymentIntentId,
            };
            if (amount) {
                refundParams.amount = Math.round(amount * 100);
            }

            const refund = await stripe.refunds.create(refundParams);
            return {
                success: true,
                refund: refund,
            };
        } catch (error) {
            console.error('Stripe Refund Error:', error.message);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Verify Webhook Signature
     */
    verifyWebhookSignature(body, signature, webhookSecret) {
        try {
            const event = stripe.webhooks.constructEvent(
                body,
                signature,
                webhookSecret
            );
            return {
                success: true,
                event: event,
            };
        } catch (error) {
            console.error('Webhook Verification Error:', error.message);
            return {
                success: false,
                error: error.message,
            };
        }
    }
}

module.exports = new StripeService();