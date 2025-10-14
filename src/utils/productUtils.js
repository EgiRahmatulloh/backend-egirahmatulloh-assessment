import { db } from '../config/db.js';

export const parseBrand = (attributes) => {
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

export const aggregateRating = (reviews = []) => {
  if (!reviews.length) {
    return { rating: 0, reviewCount: 0 };
  }

  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return {
    rating: total / reviews.length,
    reviewCount: reviews.length,
  };
};

export const formatProductForStorefront = (product) => {
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
    stock: mainVariant.stock,
  };
};

export const formatProductForAdmin = (product) => {
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

export const slugify = (value) => {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || `category-${Date.now()}`;
};

export const getOrCreateCategory = async (categoryName) => {
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
