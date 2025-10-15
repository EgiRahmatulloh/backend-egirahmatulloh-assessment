import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../config/db.js';

// GET /api/auth/me - Mendapatkan data pengguna yang sedang login
export const getMe = async (req, res) => {
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
};

// POST /api/auth/register
export const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Nama, email, dan password diperlukan' });
  }

  try {
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email sudah terdaftar' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'USER', // Default role for new users
      },
    });

    // Jangan kirim password kembali
    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);

  } catch (error) {
    res.status(500).json({ message: 'Gagal membuat pengguna', error: error.message });
  }
};

// POST /api/auth/login
export const login = async (req, res) => {
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

    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const { password: _, ...userWithoutPassword } = user;

    res.json({ user: userWithoutPassword, token });

  } catch (error) {
    res.status(500).json({ message: 'Gagal login', error: error.message });
  }
};

// POST /api/auth/forgot-password
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      // Respon yang sama untuk email yang ada dan tidak ada untuk keamanan
      return res.status(200).json({ message: 'Jika email Anda terdaftar, Anda akan menerima instruksi reset password.' });
    }

    // Generate token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Set token expiry (e.g., 15 minutes)
    const resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000);

    await db.user.update({
      where: { email },
      data: {
        resetPasswordToken: hashedToken,
        resetPasswordExpire: resetPasswordExpire,
      },
    });

    // !! INSECURE: FOR SIMULATION ONLY
    // In a real app, you would email a link with the `resetToken`.
    // Here, we return it directly to simulate the email step.
    console.log(`Generated password reset token for ${email}: ${resetToken}`);
    res.status(200).json({ 
      message: 'Token reset password telah dibuat (simulasi pengiriman email).',
      simulation_token: resetToken 
    });

  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({ message: 'Terjadi kesalahan internal.' });
  }
};

// PUT /api/auth/reset-password/:token
export const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ message: 'Password baru diperlukan.' });
  }

  try {
    // Hash the token from the URL to match the one in the DB
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await db.user.findFirst({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpire: { gt: new Date() }, // Check if token is not expired
      },
    });

    if (!user) {
      return res.status(400).json({ message: 'Token tidak valid atau telah kedaluwarsa.' });
    }

    // Set new password
    const hashedPassword = await bcrypt.hash(password, 12);

    await db.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null, // Invalidate the token
        resetPasswordExpire: null,
      },
    });

    res.status(200).json({ message: 'Password berhasil direset. Silakan login.' });

  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ message: 'Gagal mereset password.' });
  }
};
