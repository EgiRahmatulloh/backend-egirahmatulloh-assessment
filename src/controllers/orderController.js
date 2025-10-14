import { PaymentStatus } from '@prisma/client';
import { db } from '../config/db.js';
import { createPaymentIntentForOrder } from '../services/paymentService.js';

const ORDER_STATUS_DESCRIPTIONS = {
  PROCESSING: 'Pesanan diterima dan sedang diproses oleh penjual.',
  SHIPPED: 'Pesanan telah dikirim dan menunggu penjemputan kurir.',
  IN_TRANSIT: 'Pesanan sedang dalam perjalanan menuju alamat tujuan.',
  DELIVERED: 'Pesanan telah diterima oleh pembeli.',
  CANCELLED: 'Pesanan dibatalkan oleh penjual atau pembeli.',
};

const TRACKABLE_STATUSES = Object.keys(ORDER_STATUS_DESCRIPTIONS);

// GET /api/orders - Get user's order history
export const getOrderHistory = async (req, res) => {
  try {
    const orders = await db.order.findMany({
      where: { buyerId: req.userId },
      include: {
        orderItems: true,
        shippingInfo: true,
        payment: true,
        trackingUpdates: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil riwayat pesanan", error: error.message });
  }
};

// GET /api/orders/all - Get all orders (admin)
export const getAllOrders = async (req, res) => {
  try {
    const orders = await db.order.findMany({
      include: {
        orderItems: true,
        shippingInfo: true,
        payment: true,
        user: true,
        trackingUpdates: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil semua pesanan", error: error.message });
  }
};

// GET /api/orders/:orderId - Get a single order by ID
export const getOrderById = async (req, res) => {
  const { orderId } = req.params;
  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: { include: { variant: { include: { product: true } } } },
        shippingInfo: true,
        payment: true,
        trackingUpdates: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ message: "Pesanan tidak ditemukan" });
    }

    // Ensure the user is authorized to see this order
    if (order.buyerId !== req.userId) {
      return res.status(403).json({ message: "Tidak diizinkan" });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil detail pesanan", error: error.message });
  }
};


// POST /api/orders - Create a new order
export const createOrder = async (req, res) => {
    const { selectedAddressId, selectedDeliveryId } = req.body;

    if (!selectedAddressId || !selectedDeliveryId) {
        return res.status(400).json({ message: 'Alamat dan Opsi Pengiriman harus dipilih' });
    }

    try {
        // 1. Get user's cart and selected address
        const cart = await db.cart.findUnique({
            where: { userId: req.userId },
            include: { items: { include: { variant: true } } },
        });

        const address = await db.address.findUnique({
            where: { id: selectedAddressId, userId: req.userId },
        });

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: 'Keranjang Anda kosong' });
        }
        if (!address) {
            return res.status(404).json({ message: 'Alamat tidak ditemukan' });
        }

        // 2. Calculate prices (simplified for now)
        const subtotal = cart.items.reduce((sum, item) => sum + item.variant.price * item.quantity, 0);
        const shippingPrice = 15000; // Simplified, should come from deliveryOptions
        const taxPrice = 0; // Simplified
        const totalPrice = subtotal + shippingPrice + taxPrice;

        // 3. Create Order, OrderItems, and ShippingInfo in a transaction
        const newOrder = await db.$transaction(async (prisma) => {
            const order = await prisma.order.create({
                data: {
                    buyerId: req.userId,
                    totalPrice,
                    taxPrice,
                    shippingPrice,
                    orderStatus: 'PROCESSING',
                    shippingInfo: {
                        create: {
                            fullName: address.fullName,
                            phone: address.phone,
                            address: address.address,
                            city: address.city,
                            state: address.state,
                            country: address.country,
                            pincode: address.pincode,
                        },
                    },
                    orderItems: {
                        create: cart.items.map(item => ({
                            variantId: item.variantId,
                            quantity: item.quantity,
                            price: item.variant.price,
                            image: item.variant.image || '',
                            title: 'Product Title Placeholder', // Placeholder
                        })),
                    },
                    payment: {
                        create: {
                            paymentStatus: PaymentStatus.PENDING,
                            paymentType: 'ONLINE',
                        }
                    },
                    trackingUpdates: {
                      create: {
                        status: 'PROCESSING',
                        description: ORDER_STATUS_DESCRIPTIONS.PROCESSING,
                      },
                    }
                },
                include: {
                    orderItems: true,
                    shippingInfo: true,
                    payment: true,
                    trackingUpdates: true,
                }
            });

            return order;
        });

        let paymentIntent;
        try {
            paymentIntent = await createPaymentIntentForOrder(newOrder.id, totalPrice);
        } catch (paymentError) {
            console.error("Payment intent creation failed:", paymentError);
            await db.payment.update({
                where: { orderId: newOrder.id },
                data: {
                    paymentStatus: PaymentStatus.FAILED,
                    paymentType: 'ONLINE',
                },
            });
            return res.status(500).json({
                message: "Gagal memproses pembayaran",
                error: paymentError.message,
            });
        }

        const orderWithPayment = await db.order.findUnique({
            where: { id: newOrder.id },
            include: {
                orderItems: true,
                shippingInfo: true,
                payment: true,
                trackingUpdates: true,
            },
        });

        await db.cartItem.deleteMany({
            where: { cartId: cart.id },
        });

        res.status(201).json({
            order: orderWithPayment,
            paymentIntentClientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            stripePublishableKey: process.env.STRIPE_API_KEY || null,
        });

    } catch (error) {
        console.error("Order creation failed:", error);
        res.status(500).json({ message: "Gagal membuat pesanan", error: error.message });
    }
};

export const requestPaymentIntent = async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        payment: true,
      },
    });

    if (!order) {
      return res.status(404).json({ message: 'Pesanan tidak ditemukan' });
    }

    if (order.buyerId !== req.userId) {
      return res.status(403).json({ message: 'Tidak diizinkan' });
    }

    if (order.payment?.paymentStatus === PaymentStatus.PAID) {
      return res.status(400).json({ message: 'Pesanan sudah dibayar' });
    }

    const paymentIntent = await createPaymentIntentForOrder(orderId, order.totalPrice);

    const refreshedOrder = await db.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true,
        shippingInfo: true,
        payment: true,
        trackingUpdates: true,
      },
    });

    res.json({
      order: refreshedOrder,
      paymentIntentClientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      stripePublishableKey: process.env.STRIPE_API_KEY || null,
    });
  } catch (error) {
    console.error('Failed to generate payment intent:', error);
    res.status(500).json({ message: 'Gagal memproses pembayaran', error: error.message });
  }
};

// PUT /api/orders/:orderId/status - Update order status (admin)
export const updateOrderStatus = async (req, res) => {
  const { orderId } = req.params;
  const { status, description, trackingNumber } = req.body;

  if (!status || !TRACKABLE_STATUSES.includes(status)) {
    return res.status(400).json({ message: "Status pesanan tidak valid" });
  }

  try {
    const updatedOrder = await db.$transaction(async (prisma) => {
      const existingOrder = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!existingOrder) {
        throw new Error('Pesanan tidak ditemukan');
      }

      const updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          orderStatus: status,
          trackingNumber: typeof trackingNumber === 'string' && trackingNumber.trim().length > 0
            ? trackingNumber.trim()
            : existingOrder.trackingNumber,
        },
      });

      await prisma.orderTrackingUpdate.create({
        data: {
          orderId,
          status,
          description: (typeof description === 'string' && description.trim().length > 0)
            ? description.trim()
            : ORDER_STATUS_DESCRIPTIONS[status],
        },
      });

      return prisma.order.findUnique({
        where: { id: updated.id },
        include: {
          user: true,
          orderItems: true,
          shippingInfo: true,
          payment: true,
          trackingUpdates: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });
    });
    res.json(updatedOrder);
  } catch (error) {
    if (error.message === 'Pesanan tidak ditemukan') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: "Gagal memperbarui status pesanan", error: error.message });
  }
};
