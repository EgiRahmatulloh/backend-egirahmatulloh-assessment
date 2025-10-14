-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'IN_TRANSIT';

-- CreateTable
CREATE TABLE "order_tracking_updates" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_tracking_updates_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "order_tracking_updates" ADD CONSTRAINT "order_tracking_updates_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
