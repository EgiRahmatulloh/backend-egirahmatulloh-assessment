import express from 'express';
import { db } from './db.js';
import { authenticateToken } from './auth.js'; // We will create this middleware

const router = express.Router();

// Middleware to get or create a cart for the user
const getOrCreateCart = async (req, res, next) => {
  try {
    let cart = await db.cart.findUnique({
      where: { userId: req.userId },
    });

    if (!cart) {
      cart = await db.cart.create({
        data: { userId: req.userId },
      });
    }
    req.cart = cart;
    next();
  } catch (error) {
    res.status(500).json({ message: "Gagal memproses keranjang", error: error.message });
  }
};

// All cart routes will be protected and will have access to the user's cart
router.use(authenticateToken, getOrCreateCart);

// GET /api/cart - Mendapatkan isi keranjang pengguna
router.get('/', async (req, res) => {
  try {
    const cartItems = await db.cartItem.findMany({
      where: { cartId: req.cart.id },
      include: {
        variant: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const formattedCart = cartItems.map(item => ({
      id: item.id, // This is the cart item ID
      productId: item.variant.product.id,
      name: item.variant.product.name,
      price: item.variant.price,
      image: item.variant.image,
      quantity: item.quantity,
      variantId: item.variantId,
    }));

    res.json(formattedCart);
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil isi keranjang", error: error.message });
  }
});

// POST /api/cart/items - Menambahkan item ke keranjang
router.post('/items', async (req, res) => {
  const { productId, quantity } = req.body;
  if (!productId || quantity == null) {
    return res.status(400).json({ message: "ProductId dan quantity diperlukan" });
  }

  try {
    // Find the first variant of the product (workaround for simplified frontend)
    const variant = await db.productVariant.findFirst({
      where: { productId: productId },
    });

    if (!variant) {
      return res.status(404).json({ message: "Produk tidak ditemukan" });
    }

    const existingItem = await db.cartItem.findFirst({
      where: {
        cartId: req.cart.id,
        variantId: variant.id,
      },
    });

    if (existingItem) {
      // If item exists, update its quantity
      await db.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
      });
    } else {
      // If item does not exist, create it
      await db.cartItem.create({
        data: {
          cartId: req.cart.id,
          variantId: variant.id,
          quantity: quantity,
        },
      });
    }

    // Fetch and return the updated cart
    const cartItems = await db.cartItem.findMany({
      where: { cartId: req.cart.id },
      include: { variant: { include: { product: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const formattedCart = cartItems.map(item => ({
      id: item.id,
      productId: item.variant.product.id,
      name: item.variant.product.name,
      price: item.variant.price,
      image: item.variant.image,
      quantity: item.quantity,
      variantId: item.variantId,
    }));

    res.status(200).json(formattedCart);
  } catch (error) {
    res.status(500).json({ message: "Gagal menambahkan item ke keranjang", error: error.message });
  }
});

// PUT /api/cart/items/:itemId - Mengubah kuantitas item
router.put('/items/:itemId', async (req, res) => {
  const { itemId } = req.params;
  const { quantity } = req.body;

  if (quantity == null || quantity <= 0) {
    return res.status(400).json({ message: "Kuantitas harus lebih besar dari 0" });
  }

  try {
    await db.cartItem.updateMany({
      where: {
        id: itemId,
        cartId: req.cart.id, // Ensure user can only update their own cart items
      },
      data: { quantity: quantity },
    });

    // Fetch and return the updated cart
    const cartItems = await db.cartItem.findMany({
      where: { cartId: req.cart.id },
      include: { variant: { include: { product: true } } },
      orderBy: { createdAt: 'asc' },
    });
    const formattedCart = cartItems.map(item => ({
      id: item.id,
      productId: item.variant.product.id,
      name: item.variant.product.name,
      price: item.variant.price,
      image: item.variant.image,
      quantity: item.quantity,
      variantId: item.variantId,
    }));
    res.status(200).json(formattedCart);

  } catch (error) {
     res.status(500).json({ message: "Gagal mengubah kuantitas item", error: error.message });
  }
});

// DELETE /api/cart/items/:itemId - Menghapus item dari keranjang
router.delete('/items/:itemId', async (req, res) => {
  const { itemId } = req.params;

  try {
    await db.cartItem.deleteMany({
      where: {
        id: itemId,
        cartId: req.cart.id, // Ensure user can only delete their own cart items
      },
    });

    // Fetch and return the updated cart
    const cartItems = await db.cartItem.findMany({
      where: { cartId: req.cart.id },
      include: { variant: { include: { product: true } } },
      orderBy: { createdAt: 'asc' },
    });
    const formattedCart = cartItems.map(item => ({
      id: item.id,
      productId: item.variant.product.id,
      name: item.variant.product.name,
      price: item.variant.price,
      image: item.variant.image,
      quantity: item.quantity,
      variantId: item.variantId,
    }));
    res.status(200).json(formattedCart);

  } catch (error) {
    res.status(500).json({ message: "Gagal menghapus item dari keranjang", error: error.message });
  }
});

export default router;
