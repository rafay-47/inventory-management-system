-- CreateIndex
CREATE INDEX "InventoryTransaction_userId_transactionType_orderId_idx" ON "InventoryTransaction"("userId", "transactionType", "orderId");
