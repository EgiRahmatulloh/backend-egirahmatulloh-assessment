# Backend Service

Ini adalah layanan backend untuk aplikasi e-commerce. Dibangun dengan Node.js, Express, and Prisma.

## Fitur

*   Autentikasi dan otorisasi user (JWT)
*   Manajemen produk dan order
*   Fungsionalitas shopping cart
*   Integrasi pembayaran dengan Stripe
*   Update inventaris real-time dengan Socket.IO
*   Upload gambar ke Cloudinary

## Arsitektur

Backend ini mengikuti struktur proyek Node.js standar, dengan pemisahan concerns yang jelas.

*   **Framework:** [Express.js](https://expressjs.com/) digunakan sebagai web framework karena kesederhanaan dan fleksibilitasnya.
*   **Database:** [PostgreSQL](https://www.postgresql.org/) digunakan sebagai database karena ketahanan dan keandalannya.
*   **ORM:** [Prisma](https://www.prisma.io/) digunakan sebagai Object-Relational Mapper (ORM) untuk berinteraksi dengan database. Ini menyediakan API yang type-safe dan intuitif untuk operasi database.
*   **Autentikasi:** Autentikasi ditangani menggunakan JSON Web Tokens (JWT). Ketika seorang user login, JWT dibuat dan dikirim ke client. Client kemudian menyertakan token ini di header `Authorization` dari request berikutnya untuk mengakses route yang dilindungi.
*   **Komunikasi Real-time:** [Socket.IO](https://socket.io/) digunakan untuk komunikasi real-time antara server dan client. Ini digunakan untuk mendorong update inventaris ke client secara real-time.
*   **Penyimpanan Gambar:** [Cloudinary](https://cloudinary.com/) digunakan untuk menyimpan dan menyajikan gambar produk dan avatar user.
*   **Pembayaran:** [Stripe](https://stripe.com/) digunakan untuk memproses pembayaran.

## Memulai

### 1. Clone repository

```bash
git clone https://github.com/username/repo.git
cd backend-egirahmatulloh-assessment
```

### 2. Install dependencies

```bash
npm install
```

### 3. Siapkan environment variables

Buat file `.env` di root proyek dan tambahkan variabel berikut. Anda dapat menyalin file `.env.example`.

```bash
cp .env.example .env
```

Lihat file `.env.example` untuk daftar semua environment variables yang diperlukan.

### 4. Terapkan migrasi database

```bash
npx prisma migrate dev
```

### 5. Seed database (opsional)

```bash
npm run prisma:seed
```

### 6. Jalankan aplikasi

Untuk development:

```bash
npm run dev
```

Server akan dimulai di `http://localhost:3000` (atau port yang ditentukan di file `.env` Anda).

Untuk production:

```bash
npm start
```

## Akun Default (Setelah Seeding)

Setelah menjalankan `npm run prisma:seed`, akun berikut akan dibuat:

*   **User Biasa:**
    *   **Email:** `user@example.com`
    *   **Password:** `password123`

*   **Admin:**
    *   **Email:** `admin@example.com`
    *   **Password:** `admin123`

## API Endpoints

### Admin (`/api/admin`)

| Method | Endpoint                    | Access  | Deskripsi                               |
| :----- | :-------------------------- | :------ | :---------------------------------------- |
| `GET`    | `/stats`                    | Private, Admin | Dapatkan statistik dashboard             |
| `GET`    | `/stats/overview`           | Private, Admin | Dapatkan data ringkasan penjualan        |
| `GET`    | `/stats/recent-sales`       | Private, Admin | Dapatkan data penjualan terbaru          |

### Autentikasi (`/api/auth`)

| Method | Endpoint                    | Access  | Deskripsi                               |
| :----- | :-------------------------- | :------ | :---------------------------------------- |
| `GET`    | `/me`                       | Private | Dapatkan user yang sedang login          |
| `POST`   | `/register`                 | Public  | Daftarkan user baru                       |
| `POST`   | `/login`                    | Public  | Otentikasi user dan kembalikan token    |
| `POST`   | `/forgot-password`          | Public  | Minta token reset password            |
| `PUT`    | `/reset-password/:token`    | Public  | Reset password user menggunakan token   |

### Cart (`/api/cart`)

| Method | Endpoint          | Access  | Deskripsi                      |
| :----- | :---------------- | :------ | :------------------------------- |
| `GET`    | `/`               | Private | Dapatkan cart user              |
| `POST`   | `/items`          | Private | Tambahkan item ke cart          |
| `PUT`    | `/items/:itemId`  | Private | Update kuantitas item cart |
| `DELETE` | `/items/:itemId`  | Private | Hapus item dari cart     |

### Orders (`/api/orders`)

| Method | Endpoint                             | Access        | Deskripsi                                      |
| :----- | :----------------------------------- | :------------ | :----------------------------------------------- |
| `GET`    | `/`                                  | Private       | Dapatkan riwayat order user                         |
| `GET`    | `/all`                               | Private, Admin| Dapatkan semua order (admin)                           |
| `GET`    | `/:orderId`                          | Private       | Dapatkan satu order berdasarkan ID                         |
| `POST`   | `/`                                  | Private       | Buat order baru                               |
| `POST`   | `/:orderId/payment-intent`           | Private       | Minta payment intent baru untuk order yang ada |
| `PUT`    | `/:orderId/status`                   | Private, Admin| Update status order (admin)                      |

### Payments (`/api/payments`)

| Method | Endpoint   | Access | Deskripsi              |
| :----- | :--------- | :----- | :----------------------- |
| `POST`   | `/webhook` | Public | Tangani webhook Stripe   |

### Products (`/api/products`)

| Method | Endpoint         | Access        | Deskripsi                               |
| :----- | :--------------- | :------------ | :---------------------------------------- |
| `GET`    | `/`              | Public        | Dapatkan semua produk untuk storefront       |
| `GET`    | `/search`        | Public        | Cari produk                       |
| `GET`    | `/admin`         | Private, Admin| Dapatkan semua produk untuk panel admin      |
| `POST`   | `/`              | Private, Admin| Buat produk baru                      |
| `PUT`    | `/:id`           | Private, Admin| Update produk                          |
| `GET`    | `/inventory`     | Private, Admin| Dapatkan snapshot inventaris saat ini   |
| `DELETE` | `/:id`           | Private, Admin| Hapus produk                          |

### Users (`/api/users`)

| Method | Endpoint | Access  | Deskripsi          |
| :----- | :------- | :------ | :------------------- |
| `PUT`    | `/me`    | Private | Update profil user  |

## Struktur Proyek

```
.
├── prisma/
│   ├── schema.prisma   # Skema database
│   └── seed.js         # Skrip seed database
├── src/
│   ├── config/         # File konfigurasi
│   ├── controllers/    # Penangan route
│   ├── middleware/     # Middleware Express
│   ├── realtime/       # Logika Socket.IO
│   ├── routes/         # Rute API
│   ├── services/       # Logika bisnis
│   └── utils/          # Fungsi utilitas
├── .env.example        # Contoh environment variables
├── package.json
└── server.js           # Titik masuk server
```
