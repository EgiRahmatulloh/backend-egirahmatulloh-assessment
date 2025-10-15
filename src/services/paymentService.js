import { PaymentStatus } from '@prisma/client';
import { db } from '../config/db.js';
import { getStripeClient } from '../utils/stripe.js';
import { emitInventoryUpdate } from '../realtime/inventoryGateway.js';
import { buildInventoryUpdateFromVariant } from '../utils/productUtils.js';

const DEFAULT_CURRENCY = (process.env.STRIPE_CURRENCY || 'idr').toLowerCase();
const ZERO_DECIMAL_CURRENCIES = new Set([
  'bif',
  'clp',
  'djf',
  'gnf',
  'idr',
  'jpy',
  'kmf',
  'krw',
  'mga',
  'pyg',
  'rwf',
  'ugx',
  'vnd',
  'vuv',
  'xaf',
  'xof',
  'xpf',
]);

export const createPaymentIntentForOrder = async (orderId, totalAmount) => {
  if (!orderId) {
    throw new Error('Order ID is required to create a payment intent.');
  }

  const numericAmount = Number(totalAmount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error('Total amount must be a positive number.');
  }

  const paymentRecord = await db.payment.findUnique({
    where: { orderId },
  });

  if (!paymentRecord) {
    throw new Error('Payment record not found for the order.');
  }

  if (paymentRecord.paymentStatus === PaymentStatus.PAID) {
    throw new Error('Order is already paid.');
  }

  const stripe = getStripeClient();
  const amountInMinorUnit = ZERO_DECIMAL_CURRENCIES.has(DEFAULT_CURRENCY)
    ? Math.round(numericAmount * 100) // Mengalikan dengan 100 untuk mata uang zero-decimal seperti IDR agar sesuai dengan ekspektasi Stripe
    : Math.round(numericAmount * 100);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInMinorUnit,
    currency: DEFAULT_CURRENCY,
    automatic_payment_methods: { enabled: true },
    metadata: { orderId },
  });

  await db.payment.update({
    where: { orderId },
    data: {
      paymentType: 'ONLINE',
      paymentStatus: PaymentStatus.PENDING,
      paymentIntentId: paymentIntent.id,
    },
  });

  return paymentIntent;
};

export const markPaymentSucceeded = async (paymentIntentId) => {
  if (!paymentIntentId) {
    throw new Error('Payment intent ID is required.');
  }

  await db.$transaction(async (prisma) => {
    const paymentRecord = await prisma.payment.findUnique({
      where: { paymentIntentId },
      include: {
        order: {
          include: {
            orderItems: {
              include: {
                variant: true,
              },
            },
          },
        },
      },
    });

    if (!paymentRecord || !paymentRecord.order) {
      return;
    }

    if (paymentRecord.paymentStatus === PaymentStatus.PAID) {
      return;
    }

    await prisma.payment.update({
      where: { id: paymentRecord.id },
      data: {
        paymentStatus: PaymentStatus.PAID,
        paymentType: 'ONLINE',
      },
    });

    await prisma.order.update({
      where: { id: paymentRecord.orderId },
      data: {
        paidAt: new Date(),
      },
    });

    for (const item of paymentRecord.order.orderItems) {
      if (!item.variant) {
        continue;
      }

      const updatedStock = Math.max(item.variant.stock - item.quantity, 0);

      await prisma.productVariant.update({
        where: { id: item.variantId },
        data: { stock: updatedStock },
      });

      const inventoryUpdate = buildInventoryUpdateFromVariant(
        {
          ...item.variant,
          stock: updatedStock,
          updatedAt: new Date(),
        },
      );
      if (inventoryUpdate) {
        emitInventoryUpdate(inventoryUpdate);
      }
    }
  });
};

export const markPaymentFailed = async (paymentIntentId, failureReason) => {
  if (!paymentIntentId) {
    throw new Error('Payment intent ID is required.');
  }

  await db.payment.updateMany({
    where: { paymentIntentId },
    data: {
      paymentStatus: PaymentStatus.FAILED,
      paymentType: 'ONLINE',
    },
  });

  if (failureReason) {
    console.error('Stripe payment failed:', failureReason);
  }
};
