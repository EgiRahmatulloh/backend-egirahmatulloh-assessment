import bcrypt from 'bcryptjs';
import { db } from '../config/db.js';
import cloudinary from '../config/cloudinary.js';

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

  // Handle avatar update following the project's existing pattern
  if (req.file) {
    try {
      const b64 = Buffer.from(req.file.buffer).toString("base64");
      let dataURI = "data:" + req.file.mimetype + ";base64," + b64;
      const cloudinaryResponse = await cloudinary.uploader.upload(dataURI, {
        folder: 'shopku_avatars',
        transformation: [{ width: 200, height: 200, crop: "fill" }]
      });
      updateData.avatar = cloudinaryResponse.secure_url;
    } catch (uploadError) {
      console.error('Cloudinary upload error:', uploadError);
      return res.status(500).json({ message: "Gagal mengunggah avatar" });
    }
  }

  if (Object.keys(updateData).length === 0 && !req.file) {
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
