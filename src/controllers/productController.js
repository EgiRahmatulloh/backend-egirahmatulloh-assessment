import { db } from '../config/db.js';
import cloudinary from '../config/cloudinary.js';
import {
  formatProductForStorefront,
  formatProductForAdmin,
  buildInventoryUpdateFromVariant,
  getOrCreateCategory,
} from '../utils/productUtils.js';
import { emitInventoryBulkUpdate, emitInventoryUpdate } from '../realtime/inventoryGateway.js';
import logger from '../config/logger.js';

/**
 * @route GET /api/products
 * @desc Get all products for the storefront
 * @access Public
 */
export const getAllProducts = async (req, res, next) => {
  try {
    const productsFromDb = await db.product.findMany({
      where: { deletedAt: null },
      include: {
        variants: {
          include: { reviews: true },
          orderBy: { createdAt: 'asc' },
        },
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = productsFromDb
      .map(formatProductForStorefront)
      .filter(Boolean);

    res.json(formatted);
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/products/search
 * @desc Search for products
 * @access Public
 */
export const searchProducts = async (req, res, next) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Parameter query tidak boleh kosong.' });
    }

    const productsFromDb = await db.product.findMany({
      where: {
        deletedAt: null,
        name: {
          contains: query,
          mode: 'insensitive',
        },
      },
      include: {
        variants: {
          include: { reviews: true },
          orderBy: { createdAt: 'asc' },
        },
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = productsFromDb
      .map(formatProductForStorefront)
      .filter(Boolean);

    res.json(formatted);
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/products/admin
 * @desc Get all products for the admin panel
 * @access Private, Admin
 */
export const getAdminProducts = async (req, res, next) => {
    try {
      const products = await db.product.findMany({
        where: { deletedAt: null },
        include: {
          variants: {
            include: { reviews: true },
            orderBy: { createdAt: 'asc' },
          },
          category: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json(products.map(formatProductForAdmin));
    } catch (error) {
      next(error);
    }
  };

/**
 * @route POST /api/products
 * @desc Create a new product
 * @access Private, Admin
 */
export const createProduct = async (req, res, next) => {
    const { name, description, categoryName, price, stock, brand } = req.body;
    let imageUrl = null;

    if (!name || !description || !categoryName || price == null || stock == null || !brand) {
      return res.status(400).json({
        message:
          'Nama, deskripsi, kategori, harga, stok, dan brand produk wajib diisi',
      });
    }

    const numericPrice = Number(price);
    const numericStock = Number.isInteger(stock) ? stock : parseInt(stock, 10);

    if (Number.isNaN(numericPrice) || Number.isNaN(numericStock)) {
      return res.status(400).json({ message: 'Harga atau stok tidak valid' });
    }

    try {
      if (req.file) {
        const b64 = Buffer.from(req.file.buffer).toString("base64");
        let dataURI = "data:" + req.file.mimetype + ";base64," + b64;
        const cloudinaryResponse = await cloudinary.uploader.upload(dataURI, {
          folder: 'shopku_products',
        });
        imageUrl = cloudinaryResponse.secure_url;
      }

      const category = await getOrCreateCategory(categoryName);
      const product = await db.product.create({
        data: {
          name: name.trim(),
          description,
          categoryId: category.id,
          createdBy: req.userId,
          variants: {
            create: {
              sku: `SKU-${Date.now()}`,
              price: numericPrice,
              stock: numericStock,
              attributes: JSON.stringify({ brand: brand.trim() }),
              image: imageUrl,
            },
          },
        },
        include: {
          variants: {
            include: { reviews: true },
            orderBy: { createdAt: 'asc' },
          },
          category: true,
        },
      });

      const inventoryUpdate = buildInventoryUpdateFromVariant(product.variants[0]);
      if (inventoryUpdate) {
        emitInventoryUpdate(inventoryUpdate);
      }

      res.status(201).json(formatProductForAdmin(product));
    } catch (error) {
      next(error);
    }
  };

/**
 * @route PUT /api/products/:id
 * @desc Update a product
 * @access Private, Admin
 */
export const updateProduct = async (req, res, next) => {
    const { id } = req.params;
    const { name, description, categoryName, price, stock, brand, image } = req.body;
    let imageUrl = image; // Keep existing image if no new one is uploaded

    if (!name || !description || !categoryName || price == null || stock == null || !brand) {
      return res.status(400).json({
        message:
          'Nama, deskripsi, kategori, harga, stok, dan brand produk wajib diisi',
      });
    }

    const numericPrice = Number(price);
    const numericStock = Number.isInteger(stock) ? stock : parseInt(stock, 10);

    if (Number.isNaN(numericPrice) || Number.isNaN(numericStock)) {
      return res.status(400).json({ message: 'Harga atau stok tidak valid' });
    }

    try {
      if (req.file) {
        const b64 = Buffer.from(req.file.buffer).toString("base64");
        let dataURI = "data:" + req.file.mimetype + ";base64," + b64;
        const cloudinaryResponse = await cloudinary.uploader.upload(dataURI, {
          folder: 'shopku_products',
        });
        imageUrl = cloudinaryResponse.secure_url;
      } else if (image === '' || image === 'null') {
        imageUrl = null; // Explicitly clear image if requested
      }

      const existingProduct = await db.product.findUnique({
        where: { id },
        include: { variants: true },
      });

      if (!existingProduct || existingProduct.deletedAt) {
        return res.status(404).json({ message: 'Produk tidak ditemukan' });
      }

      const category = await getOrCreateCategory(categoryName);

      const updatedProduct = await db.$transaction(async (tx) => {
        await tx.product.update({
          where: { id },
          data: {
            name: name.trim(),
            description,
            categoryId: category.id,
          },
        });

        const primaryVariant = existingProduct.variants[0];
        const variantPayload = {
          price: numericPrice,
          stock: numericStock,
          attributes: JSON.stringify({ brand: brand.trim() }),
          image: imageUrl,
        };

        if (primaryVariant) {
          await tx.productVariant.update({
            where: { id: primaryVariant.id },
            data: variantPayload,
          });
        }
        else {
          await tx.productVariant.create({
            data: {
              productId: id,
              sku: `SKU-${Date.now()}`,
              ...variantPayload,
            },
          });
        }

        return tx.product.findUnique({
          where: { id },
          include: {
            variants: {
              include: { reviews: true },
              orderBy: { createdAt: 'asc' },
            },
            category: true,
          },
        });
      });

      const updatedVariant = updatedProduct?.variants?.[0];
      const inventoryUpdate = buildInventoryUpdateFromVariant(updatedVariant);
      if (inventoryUpdate) {
        emitInventoryUpdate(inventoryUpdate);
      }

      res.json(formatProductForAdmin(updatedProduct));
    } catch (error) {
      next(error);
    }
  };

/**
 * @route GET /api/products/inventory
 * @desc Get a snapshot of the current inventory
 * @access Private, Admin
 */
export const getInventorySnapshot = async (req, res, next) => {
    try {
      const variants = await db.productVariant.findMany({
        where: {
          product: { deletedAt: null },
        },
        select: {
          id: true,
          productId: true,
          stock: true,
          updatedAt: true,
        },
      });

      const payload = variants
        .map((variant) => buildInventoryUpdateFromVariant(variant))
        .filter(Boolean);

      res.json(payload);
    } catch (error) {
      next(error);
    }
  };

/**
 * @route DELETE /api/products/:id
 * @desc Delete a product
 * @access Private, Admin
 */
export const deleteProduct = async (req, res, next) => {
    const { id } = req.params;

    try {
      const existingProduct = await db.product.findUnique({
        where: { id },
        include: { variants: true },
      });

      if (!existingProduct || existingProduct.deletedAt) {
        return res.status(404).json({ message: 'Produk tidak ditemukan' });
      }

      const deletedAt = new Date();

      await db.product.update({
        where: { id },
        data: { deletedAt },
      });

      const inventoryUpdates = (existingProduct.variants || [])
        .map((variant) =>
          buildInventoryUpdateFromVariant(variant, {
            stock: 0,
            deleted: true,
            updatedAt: deletedAt.toISOString(),
          }),
        )
        .filter(Boolean);

      if (inventoryUpdates.length) {
        emitInventoryBulkUpdate(inventoryUpdates);
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
