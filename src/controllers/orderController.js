import { db } from '../config/db.js';

// GET /api/orders - Get user's order history
export const getOrderHistory = async (req, res) => {
  try {
    const orders = await db.order.findMany({
      where: { buyerId: req.userId },
      include: {
        orderItems: true,
        shippingInfo: true,
        payment: true,
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
                    // Create ShippingInfo from the selected Address
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
                    // Create OrderItems from CartItems
                    orderItems: {
                        create: cart.items.map(item => ({
                            variantId: item.variantId,
                            quantity: item.quantity,
                            price: item.variant.price,
                            image: item.variant.image || '',
                            title: 'Product Title Placeholder', // Placeholder
                        })),
                    },
                    // Create initial Payment record
                    payment: {
                        create: {
                            paymentStatus: 'PENDING',
                            paymentType: 'Belum Dipilih',
                        }
                    }
                },
                include: {
                    orderItems: true,
                    shippingInfo: true,
                    payment: true,
                }
            });

            // 4. Clear the user's cart
            await prisma.cartItem.deleteMany({
                where: { cartId: cart.id },
            });

            return order;
        });

        res.status(201).json(newOrder);

    } catch (error) {
        console.error("Order creation failed:", error);
        res.status(500).json({ message: "Gagal membuat pesanan", error: error.message });
    }
};
