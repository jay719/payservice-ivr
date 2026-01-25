-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "callerPhone" TEXT NOT NULL,
    "inmateId" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "confirmationCode" TEXT NOT NULL,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT,
    "stripeCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_callerPhone_key" ON "Account"("callerPhone");
