
import jwt from 'jsonwebtoken';

// Middleware untuk verifikasi JWT
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) return res.sendStatus(401); // Jika tidak ada token

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // Jika token tidak valid
    req.userId = user.userId;
    req.userRole = user.role; // Tambahkan peran pengguna ke request
    next();
  });
};

// Middleware untuk otorisasi berdasarkan peran
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return res.status(403).json({ message: 'Anda tidak memiliki izin untuk mengakses ini' });
    }
    next();
  };
};

export const requireAdmin = authorizeRoles('ADMIN');
