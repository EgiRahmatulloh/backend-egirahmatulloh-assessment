import express from 'express';
import multer from 'multer';
import { db } from './db.js';
import { authenticateToken, requireAdmin } from './auth.js';
import cloudinary from './config/cloudinary.js';

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

const parseBrand = (attributes) => {
  if (!attributes) {
    return 'Unknown';
  }

  try {
    const parsed = JSON.parse(attributes);
    return parsed?.brand || 'Unknown';
  } catch {
    return 'Unknown';
  }
};

const aggregateRating = (reviews = []) => {
  if (!reviews.length) {
    return { rating: 0, reviewCount: 0 };
  }

  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return {
    rating: total / reviews.length,
    reviewCount: reviews.length,
  };
};

const formatProductForStorefront = (product) => {
  const mainVariant = product.variants[0];
  if (!mainVariant) {
    return null;
  }

  const { rating, reviewCount } = aggregateRating(mainVariant.reviews);

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: mainVariant.price,
    image: mainVariant.image || '',
    category: product.category?.name ?? '',
    brand: parseBrand(mainVariant.attributes),
    rating,
    reviewCount,
  };
};

const formatProductForAdmin = (product) => {
  const mainVariant = product.variants[0];
  const { rating, reviewCount } = aggregateRating(mainVariant?.reviews);

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    categoryId: product.categoryId,
    category: product.category?.name ?? '',
    price: mainVariant?.price ?? 0,
    stock: mainVariant?.stock ?? 0,
    image: mainVariant?.image || '',
    brand: parseBrand(mainVariant?.attributes),
    rating,
    reviewCount,
    createdBy: product.createdBy,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
};

const slugify = (value) => {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || `category-${Date.now()}`;
};

const getOrCreateCategory = async (categoryName) => {
  const trimmed = categoryName?.trim();
  if (!trimmed) {
    throw new Error('Nama kategori tidak boleh kosong');
  }

  const existing = await db.category.findFirst({
    where: { name: trimmed },
  });

  if (existing) {
    return existing;
  }

  const baseSlug = slugify(trimmed);
  let slugCandidate = baseSlug;
  let attempt = 1;

  while (true) {
    try {
      return await db.category.create({
        data: {
          name: trimmed,
          slug: slugCandidate,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        slugCandidate = `${baseSlug}-${attempt++}`;
      } else {
        throw error;
      }
    }
  }
};

router.get('/', async (req, res) => {
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
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Gagal mengambil data produk.' });
  }
});

router.get('/search', async (req, res) => {
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
    console.error('Error searching products:', error);
    res.status(500).json({ error: 'Gagal mencari produk.' });
  }
});

router.get(
  '/admin',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
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
      res
        .status(500)
        .json({ message: 'Gagal mengambil data produk admin', error: error.message });
    }
  }
);

router.post(
  '/',
  authenticateToken,
  requireAdmin,
  upload.single('image'),
  async (req, res) => {
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

      res.status(201).json(formatProductForAdmin(product));
    } catch (error) {
      console.error('Error creating product:', error);
      res.status(500).json({ message: 'Gagal membuat produk', error: error.message });
    }
  }
);

router.put(
  '/:id',
  authenticateToken,
  requireAdmin,
  upload.single('image'),
  async (req, res) => {
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

      res.json(formatProductForAdmin(updatedProduct));
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({ message: 'Gagal memperbarui produk', error: error.message });
    }
  }
);

router.delete(
  '/:id',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    const { id } = req.params;

    try {
      const existingProduct = await db.product.findUnique({
        where: { id },
        select: { id: true, deletedAt: true },
      });

      if (!existingProduct || existingProduct.deletedAt) {
        return res.status(404).json({ message: 'Produk tidak ditemukan' });
      }

      await db.product.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({ message: 'Gagal menghapus produk', error: error.message });
    }
  }
);

export default router;
