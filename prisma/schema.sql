node.exe : Loaded Prisma config from prisma7.config.ts.
En línea: 1 Carácter: 1
+ & "C:\Program Files\nodejs/node.exe" "C:\Program Files\nodejs/node_mo ...
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : NotSpecified: (Loaded Prisma c...sma7.config.ts.:String) [], RemoteException
    + FullyQualifiedErrorId : NativeCommandError
 

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('ADMIN', 'CLIENTE', 'VENDEDOR');

-- CreateEnum
CREATE TYPE "EstadoProducto" AS ENUM ('ACTIVO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "EstadoProveedor" AS ENUM ('ACTIVO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "EstadoPedido" AS ENUM ('CONFIRMADO', 'PREPARANDO', 'EN_CAMINO', 'RECIBIDO', 'CANCELADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('INGRESO', 'VENTA', 'EXTRACCION');

-- CreateTable
CREATE TABLE "categorias" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marcas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "marcas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proveedores" (
    "id" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "cuit" TEXT NOT NULL,
    "nombreContacto" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT,
    "direccion" TEXT,
    "estado" "EstadoProveedor" NOT NULL DEFAULT 'ACTIVO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proveedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "precioVenta" DECIMAL(12,2) NOT NULL,
    "costoCompra" DECIMAL(12,2) NOT NULL,
    "garantia" TEXT,
    "imagen" TEXT,
    "estado" "EstadoProducto" NOT NULL DEFAULT 'ACTIVO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "marcaId" TEXT NOT NULL,
    "proveedorId" TEXT,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kits" (
    "productoId" TEXT NOT NULL,

    CONSTRAINT "kits_pkey" PRIMARY KEY ("productoId")
);

-- CreateTable
CREATE TABLE "kit_componentes" (
    "kitProductoId" TEXT NOT NULL,
    "varianteId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "kit_componentes_pkey" PRIMARY KEY ("kitProductoId","varianteId")
);

-- CreateTable
CREATE TABLE "variantes_producto" (
    "id" TEXT NOT NULL,
    "talle" TEXT,
    "color" TEXT,
    "material" TEXT,
    "stockActual" INTEGER NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productoId" TEXT NOT NULL,

    CONSTRAINT "variantes_producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etiquetas_uso" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "etiquetas_uso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos_etiquetas" (
    "productoId" TEXT NOT NULL,
    "etiquetaId" TEXT NOT NULL,

    CONSTRAINT "productos_etiquetas_pkey" PRIMARY KEY ("productoId","etiquetaId")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "passwordHash" TEXT,
    "googleSub" TEXT,
    "rol" "RolUsuario" NOT NULL DEFAULT 'CLIENTE',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "usuarioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "telefono" TEXT,
    "dni" INTEGER,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("usuarioId")
);

-- CreateTable
CREATE TABLE "direcciones" (
    "id" TEXT NOT NULL,
    "destinatario" TEXT NOT NULL,
    "calle" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "piso" TEXT,
    "departamento" TEXT,
    "ciudad" TEXT NOT NULL,
    "provincia" TEXT NOT NULL,
    "codigoPostal" TEXT,
    "predeterminada" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clienteId" TEXT NOT NULL,

    CONSTRAINT "direcciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carritos" (
    "id" TEXT NOT NULL,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reservaExpiracion" TIMESTAMP(3),
    "clienteId" TEXT NOT NULL,

    CONSTRAINT "carritos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items_carrito" (
    "id" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "precioUnitario" DECIMAL(12,2) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "carritoId" TEXT NOT NULL,
    "varianteProductoId" TEXT NOT NULL,

    CONSTRAINT "items_carrito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos" (
    "id" TEXT NOT NULL,
    "numeroOrden" TEXT NOT NULL,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "EstadoPedido" NOT NULL DEFAULT 'CONFIRMADO',
    "costoEnvio" DECIMAL(12,2) NOT NULL,
    "montoSubtotal" DECIMAL(12,2) NOT NULL,
    "descuentoTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "montoTotal" DECIMAL(12,2) NOT NULL,
    "datosEnvio" JSONB NOT NULL,
    "metodoPago" TEXT,
    "pagoExternoId" TEXT,
    "preferenciaId" TEXT,
    "clienteId" TEXT NOT NULL,
    "direccionId" TEXT,
    "cuponId" TEXT,

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items_pedido" (
    "id" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "nombreProductoSnapshot" TEXT NOT NULL,
    "skuSnapshot" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "varianteProductoId" TEXT NOT NULL,

    CONSTRAINT "items_pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cupones" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "porcentajeDescuento" DECIMAL(5,2) NOT NULL,
    "fechaVigencia" TIMESTAMP(3) NOT NULL,
    "fechaVigenciaFin" TIMESTAMP(3),
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cupones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promociones" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "porcentajeDescuento" DECIMAL(5,2) NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promociones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promociones_productos" (
    "promocionId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,

    CONSTRAINT "promociones_productos_pkey" PRIMARY KEY ("promocionId","productoId")
);

-- CreateTable
CREATE TABLE "pedidos_promociones" (
    "pedidoId" TEXT NOT NULL,
    "promocionId" TEXT NOT NULL,
    "montoDescontado" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "pedidos_promociones_pkey" PRIMARY KEY ("pedidoId","promocionId")
);

-- CreateTable
CREATE TABLE "SuscripcionNewsletter" (
    "id" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "fechaSuscripcion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "usuarioId" TEXT,

    CONSTRAINT "SuscripcionNewsletter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_stock" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" "TipoMovimiento" NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "justificacion" TEXT,
    "stockResultante" INTEGER,
    "varianteProductoId" TEXT NOT NULL,
    "responsableId" TEXT NOT NULL,
    "proveedorId" TEXT,
    "pedidoId" TEXT,

    CONSTRAINT "movimientos_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favoritos" (
    "clienteId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favoritos_pkey" PRIMARY KEY ("clienteId","productoId")
);

-- CreateIndex
CREATE UNIQUE INDEX "categorias_nombre_key" ON "categorias"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_slug_key" ON "categorias"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "marcas_nombre_key" ON "marcas"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "marcas_slug_key" ON "marcas"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "proveedores_cuit_key" ON "proveedores"("cuit");

-- CreateIndex
CREATE UNIQUE INDEX "productos_sku_key" ON "productos"("sku");

-- CreateIndex
CREATE INDEX "productos_estado_idx" ON "productos"("estado");

-- CreateIndex
CREATE INDEX "productos_categoriaId_idx" ON "productos"("categoriaId");

-- CreateIndex
CREATE INDEX "productos_marcaId_idx" ON "productos"("marcaId");

-- CreateIndex
CREATE INDEX "variantes_producto_stockActual_idx" ON "variantes_producto"("stockActual");

-- CreateIndex
CREATE UNIQUE INDEX "variantes_producto_productoId_talle_color_material_key" ON "variantes_producto"("productoId", "talle", "color", "material");

-- CreateIndex
CREATE UNIQUE INDEX "etiquetas_uso_nombre_key" ON "etiquetas_uso"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "etiquetas_uso_slug_key" ON "etiquetas_uso"("slug");

-- CreateIndex
CREATE INDEX "productos_etiquetas_etiquetaId_idx" ON "productos_etiquetas"("etiquetaId");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_usuario_key" ON "usuarios"("usuario");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_correo_key" ON "usuarios"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_googleSub_key" ON "usuarios"("googleSub");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_dni_key" ON "clientes"("dni");

-- CreateIndex
CREATE INDEX "direcciones_clienteId_idx" ON "direcciones"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "carritos_clienteId_key" ON "carritos"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "items_carrito_carritoId_varianteProductoId_key" ON "items_carrito"("carritoId", "varianteProductoId");

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_numeroOrden_key" ON "pedidos"("numeroOrden");

-- CreateIndex
CREATE INDEX "pedidos_clienteId_fechaCreacion_idx" ON "pedidos"("clienteId", "fechaCreacion");

-- CreateIndex
CREATE INDEX "pedidos_estado_idx" ON "pedidos"("estado");

-- CreateIndex
CREATE INDEX "items_pedido_pedidoId_idx" ON "items_pedido"("pedidoId");

-- CreateIndex
CREATE UNIQUE INDEX "cupones_codigo_key" ON "cupones"("codigo");

-- CreateIndex
CREATE INDEX "promociones_fechaInicio_fechaFin_idx" ON "promociones"("fechaInicio", "fechaFin");

-- CreateIndex
CREATE INDEX "promociones_productos_productoId_idx" ON "promociones_productos"("productoId");

-- CreateIndex
CREATE UNIQUE INDEX "SuscripcionNewsletter_correo_key" ON "SuscripcionNewsletter"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "SuscripcionNewsletter_usuarioId_key" ON "SuscripcionNewsletter"("usuarioId");

-- CreateIndex
CREATE INDEX "movimientos_stock_varianteProductoId_fecha_idx" ON "movimientos_stock"("varianteProductoId", "fecha");

-- CreateIndex
CREATE INDEX "movimientos_stock_tipo_idx" ON "movimientos_stock"("tipo");

-- CreateIndex
CREATE INDEX "favoritos_productoId_idx" ON "favoritos"("productoId");

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_marcaId_fkey" FOREIGN KEY ("marcaId") REFERENCES "marcas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kits" ADD CONSTRAINT "kits_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kit_componentes" ADD CONSTRAINT "kit_componentes_kitProductoId_fkey" FOREIGN KEY ("kitProductoId") REFERENCES "kits"("productoId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kit_componentes" ADD CONSTRAINT "kit_componentes_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "variantes_producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variantes_producto" ADD CONSTRAINT "variantes_producto_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos_etiquetas" ADD CONSTRAINT "productos_etiquetas_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos_etiquetas" ADD CONSTRAINT "productos_etiquetas_etiquetaId_fkey" FOREIGN KEY ("etiquetaId") REFERENCES "etiquetas_uso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direcciones" ADD CONSTRAINT "direcciones_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("usuarioId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carritos" ADD CONSTRAINT "carritos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("usuarioId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_carrito" ADD CONSTRAINT "items_carrito_carritoId_fkey" FOREIGN KEY ("carritoId") REFERENCES "carritos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_carrito" ADD CONSTRAINT "items_carrito_varianteProductoId_fkey" FOREIGN KEY ("varianteProductoId") REFERENCES "variantes_producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("usuarioId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_cuponId_fkey" FOREIGN KEY ("cuponId") REFERENCES "cupones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_pedido" ADD CONSTRAINT "items_pedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items_pedido" ADD CONSTRAINT "items_pedido_varianteProductoId_fkey" FOREIGN KEY ("varianteProductoId") REFERENCES "variantes_producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promociones_productos" ADD CONSTRAINT "promociones_productos_promocionId_fkey" FOREIGN KEY ("promocionId") REFERENCES "promociones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promociones_productos" ADD CONSTRAINT "promociones_productos_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos_promociones" ADD CONSTRAINT "pedidos_promociones_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos_promociones" ADD CONSTRAINT "pedidos_promociones_promocionId_fkey" FOREIGN KEY ("promocionId") REFERENCES "promociones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuscripcionNewsletter" ADD CONSTRAINT "SuscripcionNewsletter_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_stock" ADD CONSTRAINT "movimientos_stock_varianteProductoId_fkey" FOREIGN KEY ("varianteProductoId") REFERENCES "variantes_producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_stock" ADD CONSTRAINT "movimientos_stock_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_stock" ADD CONSTRAINT "movimientos_stock_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_stock" ADD CONSTRAINT "movimientos_stock_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favoritos" ADD CONSTRAINT "favoritos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("usuarioId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favoritos" ADD CONSTRAINT "favoritos_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

