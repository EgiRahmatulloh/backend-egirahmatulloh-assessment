import { db } from '../config/db.js';

// Middleware to get or create a cart for the user
export const getOrCreateCart = async (req, res, next) => {
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
