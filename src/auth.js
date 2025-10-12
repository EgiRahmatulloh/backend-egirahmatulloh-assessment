
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './db.js';
const router = express.Router();

// Middleware untuk verifikasi JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) return res.sendStatus(401); // Jika tidak ada token

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // Jika token tidak valid
    req.userId = user.userId;
    next();
  });
};

// GET /api/auth/me - Mendapatkan data pengguna yang sedang login
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      return res.status(404).json({ message: "Pengguna tidak ditemukan" });
    }
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil data pengguna', error: error.message });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Nama, email, dan password diperlukan' });
  }

  try {
    db.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email sudah terdaftar' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    // Jangan kirim password kembali
    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);

  } catch (error) {
    res.status(500).json({ message: 'Gagal membuat pengguna', error: error.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email dan password diperlukan' });
  }

  try {
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Kredensial tidak valid' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Kredensial tidak valid' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const { password: _, ...userWithoutPassword } = user;

    res.json({ user: userWithoutPassword, token });

  } catch (error) {
    res.status(500).json({ message: 'Gagal login', error: error.message });
  }
});

export default router;
