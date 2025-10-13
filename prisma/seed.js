
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

// Data produk dari frontend untuk seeding
const initialProducts = [
  {
    id: 1,
    name: 'Laptop Modern Pro',
    price: 12500000,
    image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300&h=180&fit=crop',
    rating: 5,
    reviewCount: 23,
    category: 'Elektronik',
    brand: 'TechPro',
    description: 'Rasakan performa komputasi terbaik dengan Laptop Modern Pro. Ditenagai prosesor terbaru, layar Retina yang memukau, dan desain yang ramping, laptop ini sempurna untuk para profesional dan kreator.',
  },
  {
    id: 2,
    name: 'Headphone Wireless',
    price: 2350000,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=180&fit=crop',
    rating: 4.5,
    reviewCount: 18,
    category: 'Elektronik',
    brand: 'ModernStyle',
    description: 'Nikmati kebebasan audio nirkabel dengan kualitas suara premium. Headphone ini menawarkan peredam bising aktif, daya tahan baterai sepanjang hari, dan kenyamanan luar biasa untuk penggunaan jangka panjang.',
  },
  {
    id: 3,
    name: 'Smartwatch Premium',
    price: 4750000,
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=180&fit=crop',
    rating: 5,
    reviewCount: 31,
    category: 'Elektronik',
    brand: 'TechPro',
    description: 'Tetap terhubung dan lacak kebugaran Anda dengan Smartwatch Premium. Menampilkan desain elegan, monitor detak jantung, GPS, dan berbagai tampilan jam yang dapat disesuaikan.',
  },
  {
    id: 4,
    name: 'Speaker Bluetooth',
    price: 1850000,
    image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=300&h=180&fit=crop',
    rating: 4.2,
    reviewCount: 15,
    category: 'Elektronik',
    brand: 'ModernStyle',
    description: 'Bawa pesta ke mana saja dengan speaker Bluetooth portabel ini. Menghasilkan suara yang jernih dan bass yang kuat, tahan air, dan memiliki masa pakai baterai hingga 12 jam.',
  },
  {
    id: 5,
    name: 'Modern T-Shirt',
    price: 350000,
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&h=180&fit=crop',
    rating: 4.8,
    reviewCount: 45,
    category: 'Fashion',
    brand: 'ModernStyle',
    description: 'Tingkatkan gaya kasual Anda dengan T-shirt Modern kami. Terbuat dari 100% katun premium, menawarkan kenyamanan dan daya tahan. Tersedia dalam berbagai warna.',
  },
  {
    id: 6,
    name: 'Eco Coffee Maker',
    price: 950000,
    image: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=300&h=180&fit=crop',
    rating: 3.9,
    reviewCount: 22,
    category: 'Rumah Tangga',
    brand: 'EcoLife',
    description: 'Mulailah hari Anda dengan secangkir kopi yang sempurna. Pembuat kopi ramah lingkungan ini menggunakan filter yang dapat digunakan kembali dan menyeduh kopi dengan suhu optimal untuk rasa terbaik.',
  },
];

async function main() {
  console.log('Start seeding ...');

  // Hapus data lama
  await prisma.review.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.address.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // Buat user default
  const userPassword = await bcrypt.hash('password123', 12);
  const user = await prisma.user.create({
    data: {
      email: 'testuser@example.com',
      name: 'Test User',
      password: userPassword,
      role: 'USER',
    },
  });

  // Buat admin default
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  // Buat alamat untuk user
  await prisma.address.create({
    data: {
      userId: user.id,
      fullName: 'Test User',
      phone: '081234567890',
      address: 'Jl. Jenderal Sudirman No. 5',
      city: 'Jakarta Selatan',
      state: 'DKI Jakarta',
      country: 'Indonesia',
      pincode: '12190',
      isDefault: true,
    },
  });

  await prisma.address.create({
    data: {
      userId: user.id,
      fullName: 'Test User (Kantor)',
      phone: '081234567891',
      address: 'Gedung Perkantoran ABC, Lantai 10',
      city: 'Jakarta Pusat',
      state: 'DKI Jakarta',
      country: 'Indonesia',
      pincode: '10210',
      isDefault: false,
    },
  });

  // Buat alamat untuk admin
  await prisma.address.create({
    data: {
      userId: admin.id,
      fullName: 'Admin User',
      phone: '089876543210',
      address: 'Jl. Admin No. 1',
      city: 'Jakarta Barat',
      state: 'DKI Jakarta',
      country: 'Indonesia',
      pincode: '11450',
      isDefault: true,
    },
  });

  // Buat kategori unik
  const categories = [...new Set(initialProducts.map(p => p.category))];
  const createdCategories = {};
  for (const categoryName of categories) {
    const category = await prisma.category.create({
      data: {
        name: categoryName,
        slug: categoryName.toLowerCase(),
      },
    });
    createdCategories[categoryName] = category;
  }

  // Buat produk dan variannya (dibuat oleh admin)
  for (const productData of initialProducts) {
    const product = await prisma.product.create({
      data: {
        name: productData.name,
        description: productData.description,
        user: {
          connect: { id: admin.id },
        },
        category: {
          connect: { id: createdCategories[productData.category].id },
        },
        variants: {
          create: {
            sku: `SKU-${productData.id}`,
            price: productData.price,
            stock: 100, // Stok default
            attributes: JSON.stringify({ brand: productData.brand }), // Simpan brand di atribut
            image: productData.image,
          },
        },
      },
    });

    // Buat review dummy (dibuat oleh user biasa)
    const variant = await prisma.productVariant.findFirst({
        where: { productId: product.id }
    });

    if (variant) {
        await prisma.review.create({
            data: {
                rating: productData.rating,
                comment: 'Ini adalah review yang bagus.',
                user: {
                    connect: { id: user.id }
                },
                variant: {
                    connect: { id: variant.id }
                }
            }
        });
    }
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
