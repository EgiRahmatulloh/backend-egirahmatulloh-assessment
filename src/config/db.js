
import { PrismaClient } from '@prisma/client';

// Inisialisasi Prisma Client sekali dan ekspor instance-nya
export const db = new PrismaClient();
