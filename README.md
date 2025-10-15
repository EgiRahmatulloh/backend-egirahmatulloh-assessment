# Backend Service

This is the backend service for the e-commerce application. It is built with Node.js, Express, and Prisma.

## Features

*   User authentication and authorization (JWT)
*   Product and order management
*   Shopping cart functionality
*   Payment integration with Stripe
*   Real-time inventory updates with Socket.IO
*   Image uploads to Cloudinary

## Prerequisites

*   Node.js (v18 or higher)
*   npm
*   A running PostgreSQL database

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/username/repo.git
cd backend-egirahmatulloh-assessment
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root of the project and add the following variables. You can copy the `.env.example` file.

```bash
cp .env.example .env
```

See the `.env.example` file for a list of all required environment variables.

### 4. Apply database migrations

```bash
npx prisma migrate dev
```

### 5. Seed the database (optional)

```bash
npm run prisma:seed
```

### 6. Run the application

For development:

```bash
npm run dev
```

The server will start on `http://localhost:3000` (or the port specified in your `.env` file).

For production:

```bash
npm start
```

## API Endpoints

The API endpoints are defined in the `src/routes` directory.

## Project Structure

```
.
├── prisma/
│   ├── schema.prisma   # Database schema
│   └── seed.js         # Database seed script
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # Route handlers
│   ├── middleware/     # Express middleware
│   ├── realtime/       # Socket.IO logic
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   └── utils/          # Utility functions
├── .env.example        # Example environment variables
├── package.json
└── server.js           # Server entry point
```
