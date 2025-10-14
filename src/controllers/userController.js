import bcrypt from 'bcryptjs';
import { db } from '../config/db.js';

// PUT /api/users/me - Update user profile
export const updateUserProfile = async (req, res) => {
  const { name, password } = req.body;
  const updateData = {};

  if (name) {
    updateData.name = name;
  }

  if (password) {
    if (password.length < 6) {
      return res.status(400).json({ message: "Password minimal harus 6 karakter" });
    }
    updateData.password = await bcrypt.hash(password, 12);
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ message: "Tidak ada data untuk diupdate" });
  }

  try {
    const updatedUser = await db.user.update({
      where: { id: req.userId },
      data: updateData,
    });

    const { password: _, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ message: "Gagal mengupdate profil", error: error.message });
  }
};
