import { markPaymentFailed, markPaymentSucceeded } from '../services/paymentService.js';
import { getStripeClient } from '../utils/stripe.js';
import logger from '../config/logger.js';

/**
 * @route POST /api/payments/webhook
 * @desc Handle Stripe webhooks
 * @access Public
 */
export const stripeWebhookHandler = async (req, res, next) => {
  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.error('Stripe webhook secret is not configured.');
    return res.status(500).send('Stripe webhook secret is not configured.');
  }

  if (!signature) {
    return res.status(400).send('Missing stripe-signature header.');
  }

  let event;

  try {
    event = getStripeClient().webhooks.constructEvent(
      req.body,
      signature,
      webhookSecret,
    );
  } catch (error) {
    logger.error('Stripe webhook signature verification failed:', error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  logger.info(`Received Stripe webhook event: ${event.id}, type: ${event.type}`);

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await markPaymentSucceeded(event.data.object.id);
        break;
      case 'payment_intent.payment_failed':
        await markPaymentFailed(
          event.data.object.id,
          event?.data?.object?.last_payment_error?.message,
        );
        break;
      case 'payment_intent.canceled':
        await markPaymentFailed(event.data.object.id, 'Payment intent canceled.');
        break;
      default:
        logger.info(`Unhandled Stripe webhook event type: ${event.type}`);
        break;
    }
  } catch (error) {
    logger.error('Stripe webhook processing error:', error);
    return next(error);
  }

  res.json({ received: true });
};
