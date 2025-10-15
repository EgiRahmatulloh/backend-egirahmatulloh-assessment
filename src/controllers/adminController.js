import { db } from '../config/db.js';

export const getDashboardStats = async (req, res) => {
  try {
    const totalPaidOrders = await db.order.count({
      where: { orderStatus: 'DELIVERED' },
    });

    const totalCustomers = await db.user.count({
      where: { role: 'USER' },
    });

    const totalSales = await db.order.aggregate({
      _sum: { totalPrice: true },
      where: { orderStatus: 'DELIVERED' },
    });

    res.json({
      totalPaidOrders,
      totalCustomers,
      totalSales: totalSales._sum.totalPrice || 0,
    });
  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    res.status(500).json({ message: 'Gagal mengambil data statistik', error: error.message });
  }
};

export const getSalesOverview = async (req, res) => {
  try {
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const sales = await db.order.groupBy({
      by: ['createdAt'],
      where: {
        orderStatus: 'DELIVERED',
        createdAt: {
          gte: last7Days,
        },
      },
      _sum: {
        totalPrice: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    res.json(sales);
  } catch (error) {
    console.error('Error in getSalesOverview:', error);
    res.status(500).json({ message: 'Gagal mengambil data ringkasan penjualan', error: error.message });
  }
};

export const getRecentSales = async (req, res) => {
  try {
    const recentSales = await db.order.findMany({
      where: { orderStatus: 'DELIVERED' },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
      include: {
        user: {
          select: {
            name: true,
            avatar: true,
            email: true,
          },
        },
      },
    });

    console.log('recentSales:', recentSales);

    res.json(recentSales);
  } catch (error) {
    console.error('Error in getRecentSales:', error);
    res.status(500).json({ message: 'Gagal mengambil data penjualan terbaru', error: error.message });
  }
};
