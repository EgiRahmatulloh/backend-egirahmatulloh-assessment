import cors from 'cors';

const corsOptions = {
  origin: '*', // Ganti dengan domain frontend Anda di produksi
  methods: 'GET, POST, PUT, DELETE, OPTIONS',
  allowedHeaders: 'Content-Type, Authorization',
};

export default cors(corsOptions);