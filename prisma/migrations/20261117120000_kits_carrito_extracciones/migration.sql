-- RF-38 / RN-06: un kit se vende como una linea propia del carrito y
-- del pedido. La linea apunta al kit en lugar de una variante; el
-- descuento de stock se aplica individualmente a cada componente.
ALTER TABLE "items_carrito" ALTER COLUMN "varianteProductoId" DROP NOT NULL;
ALTER TABLE "items_pedido" ALTER COLUMN "varianteProductoId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "items_carrito" ADD COLUMN "kitProductoId" TEXT;
ALTER TABLE "items_pedido" ADD COLUMN "kitProductoId" TEXT;
ALTER TABLE "items_pedido" ADD COLUMN "componentesKit" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "items_carrito_carritoId_kitProductoId_key" ON "items_carrito"("carritoId", "kitProductoId");

-- AddForeignKey
ALTER TABLE "items_carrito" ADD CONSTRAINT "items_carrito_kitProductoId_fkey" FOREIGN KEY ("kitProductoId") REFERENCES "kits"("productoId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_pedido" ADD CONSTRAINT "items_pedido_kitProductoId_fkey" FOREIGN KEY ("kitProductoId") REFERENCES "kits"("productoId") ON DELETE RESTRICT ON UPDATE CASCADE;
