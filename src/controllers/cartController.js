import { db } from '../config/db.js';

/**
 * @route GET /api/cart
 * @desc Get the user's cart
 * @access Private
 */
export const getCart = async (req, res, next) => {
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
    next(error);
  }
};

/**
 * @route POST /api/cart/items
 * @desc Add an item to the cart
 * @access Private
 */
export const addCartItem = async (req, res, next) => {
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
    next(error);
  }
};

/**
 * @route PUT /api/cart/items/:itemId
 * @desc Update the quantity of a cart item
 * @access Private
 */
export const updateCartItem = async (req, res, next) => {
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
    next(error);
  }
};

/**
 * @route DELETE /api/cart/items/:itemId
 * @desc Delete an item from the cart
 * @access Private
 */
export const deleteCartItem = async (req, res, next) => {
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
    next(error);
  }
};
