import { db } from '../config/db.js';

// GET /api/addresses - Get all addresses for a user
export const getAllAddresses = async (req, res) => {
  try {
    const addresses = await db.address.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(addresses);
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil alamat", error: error.message });
  }
};

// POST /api/addresses - Create a new address
export const createAddress = async (req, res) => {
  const { fullName, phone, address, city, state, country, pincode, isDefault } = req.body;

  // Basic validation
  if (!fullName || !phone || !address || !city || !state || !country || !pincode) {
    return res.status(400).json({ message: "Semua field wajib diisi" });
  }

  try {
    // If isDefault is true, set all other addresses for this user to not be default
    if (isDefault) {
      await db.address.updateMany({
        where: { userId: req.userId },
        data: { isDefault: false },
      });
    }

    const newAddress = await db.address.create({
      data: {
        userId: req.userId,
        ...req.body,
      },
    });
    res.status(201).json(newAddress);
  } catch (error) {
    res.status(500).json({ message: "Gagal membuat alamat baru", error: error.message });
  }
};

// PUT /api/addresses/:addressId - Update an address
export const updateAddress = async (req, res) => {
  const { addressId } = req.params;
  const { isDefault } = req.body;

  try {
    // If isDefault is true, set all other addresses for this user to not be default
    if (isDefault) {
      await db.address.updateMany({
        where: { userId: req.userId, NOT: { id: addressId } },
        data: { isDefault: false },
      });
    }

    const updatedAddress = await db.address.update({
      where: { id: addressId },
      data: req.body,
    });
    res.json(updatedAddress);
  } catch (error) {
    res.status(500).json({ message: "Gagal mengupdate alamat", error: error.message });
  }
};

// DELETE /api/addresses/:addressId - Delete an address
export const deleteAddress = async (req, res) => {
  const { addressId } = req.params;

  try {
    await db.address.delete({
      where: { id: addressId, userId: req.userId },
    });
    res.status(204).send(); // No Content
  } catch (error) {
    res.status(500).json({ message: "Gagal menghapus alamat", error: error.message });
  }
};
