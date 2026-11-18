/**
 * Verificacion del modulo de kits y extracciones (Sprint 4 - Camila).
 *
 * Corre contra la base real. Deja un pedido de prueba y mueve stock:
 * correr `npm run db:seed` para restaurar.
 *
 *   npx tsx scripts/prueba-kits.ts
 */
import "dotenv/config";

import { prisma } from "../src/lib/prisma";
import { agregarItemCarrito, obtenerEstadoCarrito } from "../src/modules/carrito/services/carrito";
import { aprobarPedidoPendiente, crearPedidoPendiente } from "../src/modules/checkout/services/checkout";
import { registrarExtraccion } from "../src/modules/inventory/services/extracciones";
import { calcularStockKit } from "../src/modules/inventory/services/stock";

let fallos = 0;
function verificar(nombre: string, condicion: boolean, detalle = "") {
  if (condicion) {
    console.log(`  OK   ${nombre}`);
  } else {
    fallos++;
    console.log(`  FAIL ${nombre} ${detalle}`);
  }
}

async function main() {
  const admin = await prisma.usuario.findFirstOrThrow({
    where: { correo: "admin@sneaker.test" },
    select: { id: true, correo: true },
  });
  const cliente = await prisma.usuario.findFirst({
    where: { correo: "cliente@sneaker.test" },
    select: { id: true, correo: true, cliente: { select: { direcciones: { select: { id: true } } } } },
  });
  if (!cliente?.cliente) throw new Error("No existe cliente@sneaker.test: correr el seed.");
  if (cliente.cliente.direcciones.length === 0) {
    throw new Error("cliente@sneaker.test no tiene direccion: correr el seed.");
  }
  console.log(`Admin: ${admin.correo} | Cliente: ${cliente.correo}`);

  const kit = await prisma.kit.findFirst({
    where: { producto: { estado: "ACTIVO" }, componentes: { some: {} } },
    include: {
      producto: { select: { nombre: true, sku: true } },
      componentes: {
        include: {
          variante: {
            select: {
              id: true,
              stockActual: true,
              producto: { select: { nombre: true } },
            },
          },
        },
      },
    },
  });
  if (!kit || kit.componentes.length < 2) throw new Error("No hay un kit con 2+ componentes: correr el seed.");
  console.log(`Kit: ${kit.producto.nombre} (${kit.producto.sku})`);

  // ---------- 1) RN-06: stock calculado ----------
  console.log("\n[1] Stock calculado del kit (RN-06)");
  const stockCalculado = calcularStockKit(kit.componentes);
  const esperado = Math.min(
    ...kit.componentes.map((componente) =>
      Math.floor(componente.variante.stockActual / componente.cantidad),
    ),
  );
  verificar("stock = minimo de componentes", stockCalculado === esperado, `- ${stockCalculado} vs ${esperado}`);
  verificar("el stock no se persiste en la base", !("stockActual" in kit), "- el modelo Kit no tiene stockActual");

  // ---------- 2) Extraccion con motivo y responsable ----------
  console.log("\n[2] Extraccion de stock (RF-36 / RN-07)");
  const varianteExtraccion = kit.componentes[0].variante;
  const stockAntesExtraccion = (
    await prisma.varianteProducto.findUniqueOrThrow({
      where: { id: varianteExtraccion.id },
      select: { stockActual: true },
    })
  ).stockActual;
  const extraccion = await registrarExtraccion(admin.id, {
    varianteId: varianteExtraccion.id,
    cantidad: 1,
    motivo: "Prueba automatica: extraccion por danio en deposito",
  });
  verificar("descuenta una unidad", extraccion.stockResultante === stockAntesExtraccion - 1);
  const movimientoExtraccion = await prisma.movimientoStock.findUniqueOrThrow({
    where: { id: extraccion.movimientoId },
    include: { responsable: { select: { correo: true } } },
  });
  verificar("registra tipo EXTRACCION", movimientoExtraccion.tipo === "EXTRACCION");
  verificar("conserva motivo y responsable", Boolean(movimientoExtraccion.justificacion) && movimientoExtraccion.responsable.correo === admin.correo);

  // Restaurar el stock movido para no alterar la prueba de venta.
  await prisma.$transaction([
    prisma.varianteProducto.update({
      where: { id: varianteExtraccion.id },
      data: { stockActual: { increment: 1 } },
    }),
    prisma.movimientoStock.create({
      data: {
        tipo: "INGRESO",
        cantidad: 1,
        justificacion: "Restauracion de la prueba automatica de kits",
        stockResultante: stockAntesExtraccion,
        varianteProductoId: varianteExtraccion.id,
        responsableId: admin.id,
      },
    }),
  ]);

  // ---------- 3) Carrito: el kit reserva sus componentes ----------
  console.log("\n[3] Carrito y reserva de un kit");
  const carrito = await prisma.carrito.upsert({
    where: { clienteId: cliente.id },
    update: {},
    create: { clienteId: cliente.id },
  });
  await prisma.itemCarrito.deleteMany({ where: { carritoId: carrito.id } });
  await prisma.carrito.update({ where: { id: carrito.id }, data: { reservaExpiracion: null } });

  const stockAntesVenta = new Map(
    kit.componentes.map((componente) => [componente.varianteId, componente.variante.stockActual]),
  );

  await agregarItemCarrito(cliente.id, { kitProductoId: kit.productoId, cantidad: 1 });
  const itemKit = await prisma.itemCarrito.findFirst({
    where: { carritoId: carrito.id, kitProductoId: kit.productoId },
    select: { cantidad: true, varianteProductoId: true, kitProductoId: true },
  });
  verificar("agrega una linea de kit sin variante", Boolean(itemKit) && itemKit?.varianteProductoId === null && itemKit?.cantidad === 1);

  const estado = await obtenerEstadoCarrito(cliente.id);
  const linea = estado.items.find((item) => item.kitProductoId === kit.productoId);
  verificar("la vista marca la linea como kit", Boolean(linea?.esKit));
  verificar("muestra el stock calculado del kit", (linea?.stockDisponible ?? -1) >= 0, `- ${linea?.stockDisponible}`);

  // ---------- 4) Venta: descuento individual de componentes ----------
  console.log("\n[4] Venta del kit: descuento individual (RF-38 / RN-07)");
  const pedido = await crearPedidoPendiente(cliente.id, { cuponCodigo: null });
  await aprobarPedidoPendiente(pedido.numeroOrden, { metodoPago: "prueba-kits" });

  const itemPedido = await prisma.itemPedido.findFirst({
    where: { pedido: { numeroOrden: pedido.numeroOrden } },
    select: { kitProductoId: true, varianteProductoId: true, cantidad: true },
  });
  verificar("el pedido conserva la linea de kit", itemPedido?.kitProductoId === kit.productoId && itemPedido?.varianteProductoId === null);

  for (const componente of kit.componentes) {
    const actual = await prisma.varianteProducto.findUniqueOrThrow({
      where: { id: componente.varianteId },
      select: { stockActual: true },
    });
    const esperadoComponente =
      (stockAntesVenta.get(componente.varianteId) ?? 0) -
      (itemPedido?.cantidad ?? 1) * componente.cantidad;
    verificar(
      `descuenta ${componente.cantidad} de ${componente.variante.producto.nombre}`,
      actual.stockActual === esperadoComponente,
      `- ${actual.stockActual} vs ${esperadoComponente}`,
    );
  }

  const movimientosVenta = await prisma.movimientoStock.findMany({
    where: { pedido: { numeroOrden: pedido.numeroOrden }, tipo: "VENTA" },
    select: { cantidad: true, varianteProductoId: true, justificacion: true },
  });
  verificar(
    "escribe un movimiento VENTA por componente",
    movimientosVenta.length === kit.componentes.length,
    `- ${movimientosVenta.length} movimientos`,
  );
  verificar(
    "los movimientos identifican el kit",
    movimientosVenta.every((movimiento) => movimiento.justificacion?.includes(kit.producto.nombre)),
  );

  console.log(`\nPedido de prueba: ${pedido.numeroOrden}`);
  console.log(fallos === 0 ? "\nTodo OK. Correr npm run db:seed para restaurar el stock." : `\n${fallos} verificacion(es) fallaron.`);
  if (fallos > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
