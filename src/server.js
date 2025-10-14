import 'dotenv/config';
import express from 'express';
import cors from './config/cors.js';
import allRoutes from './routes/index.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors);
app.use(express.json());

app.use('/api', allRoutes);

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});