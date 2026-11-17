/**
 * Prueba end-to-end del motor de checkout de Camila (Sprint 3) y de
 * los servicios de Tadeo (Sprint 3): tarifas de envio (RF-45), correo
 * de confirmacion (RF-28) y newsletter (RF-43, RF-44).
 *
 * Corre contra la base real del proyecto. No se versiona: es un
 * arnes de verificacion manual. Deja pedidos de prueba y descuenta
 * stock real: correr `npm run db:seed` para restaurar.
 *
 *   npx tsx scripts/prueba-checkout.ts
 */
import "dotenv/config";

import { prisma } from "../src/lib/prisma";
import {
  ErrorNegocioCheckout,
  aprobarPedidoPendiente,
  crearPedidoPendiente,
  obtenerPedidoConfirmado,
  resumenCheckout,
  validarCupon,
} from "../src/modules/checkout/services/checkout";
import {
  agregarItemCarrito,
  cancelarReservaCarrito,
  ErrorNegocioCarrito,
  iniciarReservaCarrito,
  obtenerEstadoCarrito,
} from "../src/modules/carrito/services/carrito";
import { pagarSimuladoAprobado, pagarSimuladoRechazado } from "../src/modules/checkout/services/pagos";
import {
  TARIFA_CIUDAD,
  TARIFA_PROVINCIA_DEFAULT,
  TARIFAS_PROVINCIA,
  calcularCostoEnvio,
} from "../src/modules/envios/tarifas";
import {
  construirCorreoConfirmacion,
  enviarCorreoConfirmacionPedido,
  obtenerPedidoParaCorreo,
} from "../src/modules/emails/services/correo";
import {
  enviarNovedades,
  suscribirseNewsletter,
} from "../src/modules/newsletter/services/newsletter";
import { correoHabilitado } from "../src/lib/env";

let fallos = 0;
function verificar(nombre: string, condicion: boolean, detalle = "") {
  if (condicion) {
    console.log(`  OK   ${nombre}`);
  } else {
    fallos++;
    console.log(`  FAIL ${nombre} ${detalle}`);
  }
}
async function esperaError(nombre: string, codigo: string, llamada: () => Promise<unknown>) {
  try {
    await llamada();
    verificar(`${nombre} (rechaza con ${codigo})`, false, "- no lanzo error");
  } catch (error) {
    const esNegocio =
      error instanceof ErrorNegocioCheckout || error instanceof ErrorNegocioCarrito;
    verificar(
      `${nombre} (rechaza con ${codigo})`,
      esNegocio && (error as Error).name.startsWith("ErrorNegocio") &&
        (error as ErrorNegocioCheckout).codigo === codigo,
      `- recibio: ${error instanceof Error ? (error as ErrorNegocioCheckout).codigo : String(error)}`,
    );
  }
}

async function main() {
  const cliente = await prisma.usuario.findFirst({
    where: { correo: "cliente@sneaker.test" },
    select: { id: true, correo: true, cliente: { select: { direcciones: { select: { id: true } } } } },
  });
  if (!cliente) throw new Error("No existe cliente@sneaker.test: correr el seed.");
  const usuarioId = cliente.id;
  console.log(`Cliente: ${cliente.correo}`);

  // RF-45: la direccion congelada en el pedido es la predeterminada
  // del cliente (misma lectura que la pagina de checkout).
  const direccion = await prisma.direccion.findFirstOrThrow({
    where: { clienteId: usuarioId },
    orderBy: [{ predeterminada: "desc" }, { creadoEn: "asc" }],
    select: { ciudad: true, provincia: true },
  });
  const costoEnvioEsperado = calcularCostoEnvio(direccion.ciudad, direccion.provincia);
  console.log(`Direccion: ${direccion.ciudad}, ${direccion.provincia} | envio ${costoEnvioEsperado}`);

  // Estado inicial limpio.
  const carritoPrevio = await prisma.carrito.findUnique({ where: { clienteId: usuarioId } });
  if (carritoPrevio) {
    await prisma.itemCarrito.deleteMany({ where: { carritoId: carritoPrevio.id } });
    await prisma.carrito.update({ where: { id: carritoPrevio.id }, data: { reservaExpiracion: null } });
  }

  const variante = await prisma.varianteProducto.findFirst({
    where: { producto: { sku: "SNK-DEP-001", estado: "ACTIVO" }, stockActual: { gte: 3 } },
    select: { id: true, stockActual: true, producto: { select: { precioVenta: true, nombre: true } } },
  });
  if (!variante) throw new Error("No hay variante con stock >= 3 de SNK-DEP-001.");
  const precio = Number(variante.producto.precioVenta);
  console.log(`Variante: ${variante.id} | precio ${precio} | stock ${variante.stockActual}`);

  // ---------- 1) RF-22: validacion de cupones ----------
  console.log("\n[1] Validacion de cupones");
  const cupon = await validarCupon({ codigo: "bienvenido10" });
  verificar("BIENVENIDO10 vigente (normalizado a mayusculas)", cupon.codigo === "BIENVENIDO10");
  await esperaError("cupon inexistente", "CUPON_INEXISTENTE", () =>
    validarCupon({ codigo: "NOEXISTE999" }),
  );

  // ---------- 2) Alta de item y reserva (Abril) ----------
  console.log("\n[2] Carrito y reserva");
  await esperaError("exceso de stock al agregar", "STOCK_INSUFICIENTE", () =>
    agregarItemCarrito(usuarioId, { varianteId: variante.id, cantidad: variante.stockActual + 5 }),
  );
  await agregarItemCarrito(usuarioId, { varianteId: variante.id, cantidad: 2 });
  const expiracion = await iniciarReservaCarrito(usuarioId);
  verificar("reserva activa (> ahora)", expiracion.getTime() > Date.now());
  await esperaError("alta con reserva vigente", "CARRITO_RESERVADO", () =>
    agregarItemCarrito(usuarioId, { varianteId: variante.id, cantidad: 1 }),
  );

  const carrito = await obtenerEstadoCarrito(usuarioId);
  verificar("carrito con 1 linea de 2", carrito.items.length === 1 && carrito.items[0].cantidad === 2);

  // ---------- 3) Resumen: promo 15% global + cupon 10% combinados ----------
  console.log("\n[3] Resumen con promocion + cupon");
  const resumen = await resumenCheckout(carrito, "BIENVENIDO10");
  const subtotalEsperado = precio * 2;
  const promoEsperada = Math.round((subtotalEsperado * 15) / 100);
  const cuponEsperado = Math.round(((subtotalEsperado - promoEsperada) * 10) / 100);
  console.log(`  subtotal ${resumen.subtotal} | promos -${resumen.descuentoPromociones} | cupon -${resumen.descuentoCupon} | total ${resumen.total}`);
  verificar("subtotal = precio x cantidad", resumen.subtotal === subtotalEsperado);
  verificar("promo 15% aplicada (Temporada Basketball global)", resumen.descuentoPromociones === promoEsperada);
  verificar("cupon 10% sobre base con promo", resumen.descuentoCupon === cuponEsperado);
  verificar("total = subtotal - promos - cupon", resumen.total === subtotalEsperado - promoEsperada - cuponEsperado);
  verificar("linea con badge de promo", resumen.items[0].promocion?.nombre === "Temporada Basketball");

  const sinCupon = await resumenCheckout(carrito, null);
  verificar("sin cupon: solo promo", sinCupon.descuentoCupon === 0 && sinCupon.descuentoPromociones === promoEsperada);

  // ---------- 4) Fase 1: pedido PENDIENTE congelado ----------
  console.log("\n[4] Pedido pendiente");
  const pendiente = await crearPedidoPendiente(usuarioId, { cuponCodigo: "BIENVENIDO10" });
  const pedidoPendiente = await prisma.pedido.findUniqueOrThrow({
    where: { numeroOrden: pendiente.numeroOrden },
    select: {
      estado: true, montoSubtotal: true, descuentoTotal: true, montoTotal: true, costoEnvio: true,
      cuponId: true, cupon: { select: { codigo: true } },
      promociones: { select: { montoDescontado: true } },
      datosEnvio: true, items: { select: { cantidad: true, precioUnitario: true } },
    },
  });
  verificar("estado PENDIENTE", pedidoPendiente.estado === "PENDIENTE");
  verificar("numeroOrden SNK-...", /^SNK-\d{8}-[A-Z0-9]{4}$/.test(pendiente.numeroOrden));
  verificar("montoSubtotal congelado", Number(pedidoPendiente.montoSubtotal) === subtotalEsperado);
  verificar("descuentoTotal = promos + cupon", Number(pedidoPendiente.descuentoTotal) === promoEsperada + cuponEsperado);
  verificar("RF-45: costoEnvio = tarifa del destino", Number(pedidoPendiente.costoEnvio) === costoEnvioEsperado);
  verificar("RF-45: montoTotal incluye el envio", Number(pedidoPendiente.montoTotal) === resumen.total + costoEnvioEsperado);
  verificar("cupon vinculado al pedido", pedidoPendiente.cupon?.codigo === "BIENVENIDO10");
  verificar("promocion auditada en pedido", pedidoPendiente.promociones.length === 1 && Number(pedidoPendiente.promociones[0].montoDescontado) === promoEsperada);
  const envio = pedidoPendiente.datosEnvio as { calle?: string };
  verificar("snapshot de envio presente", Boolean(envio.calle));

  const stockAntes = (await prisma.varianteProducto.findUniqueOrThrow({ where: { id: variante.id }, select: { stockActual: true } })).stockActual;

  // ---------- 5) Fase 2: aprobacion (stock, movimientos, carrito) ----------
  console.log("\n[5] Aprobacion del pago");
  await aprobarPedidoPendiente(pendiente.numeroOrden, { metodoPago: "simulado", pagoExternoId: "PAY-TEST-1" });
  const aprobado = await prisma.pedido.findUniqueOrThrow({
    where: { numeroOrden: pendiente.numeroOrden },
    select: { estado: true, metodoPago: true, pagoExternoId: true },
  });
  verificar("estado CONFIRMADO", aprobado.estado === "CONFIRMADO");
  verificar("metodo de pago registrado", aprobado.metodoPago === "simulado" && aprobado.pagoExternoId === "PAY-TEST-1");

  const stockDespues = (await prisma.varianteProducto.findUniqueOrThrow({ where: { id: variante.id }, select: { stockActual: true } })).stockActual;
  verificar("stock descontado en 2", stockAntes - stockDespues === 2, `(${stockAntes} -> ${stockDespues})`);

  const movimiento = await prisma.movimientoStock.findFirstOrThrow({
    where: { pedidoId: pendiente.id },
    select: { tipo: true, cantidad: true, responsableId: true, stockResultante: true },
  });
  verificar("MovimientoStock VENTA con pedido y responsable", movimiento.tipo === "VENTA" && movimiento.cantidad === 2 && movimiento.responsableId === usuarioId);

  const carritoPostPago = await obtenerEstadoCarrito(usuarioId);
  verificar("carrito vaciado", carritoPostPago.items.length === 0);
  verificar("reserva liberada", !carritoPostPago.reservaActiva);

  // Idempotencia del webhook repetido.
  await aprobarPedidoPendiente(pendiente.numeroOrden, { metodoPago: "simulado", pagoExternoId: "PAY-TEST-1" });
  const stockTrasReplay = (await prisma.varianteProducto.findUniqueOrThrow({ where: { id: variante.id }, select: { stockActual: true } })).stockActual;
  verificar("replay de aprobacion no vuelve a descontar stock", stockTrasReplay === stockDespues);

  const confirmado = await obtenerPedidoConfirmado(usuarioId, pendiente.numeroOrden);
  verificar("RF-27: pedido visible para su dueno", confirmado?.numeroOrden === pendiente.numeroOrden && confirmado.estado === "CONFIRMADO");
  const ajeno = await obtenerPedidoConfirmado("usuario-fantasma", pendiente.numeroOrden);
  verificar("RF-27: pedido oculto para otro usuario", ajeno === null);

  // ---------- 6) RF-25: pago rechazado ----------
  console.log("\n[6] Pago rechazado");
  await agregarItemCarrito(usuarioId, { varianteId: variante.id, cantidad: 1 });
  await iniciarReservaCarrito(usuarioId);
  const stockPreRechazo = (await prisma.varianteProducto.findUniqueOrThrow({ where: { id: variante.id }, select: { stockActual: true } })).stockActual;
  const numeroRechazado = await pagarSimuladoRechazado(usuarioId);
  const rechazado = await prisma.pedido.findUniqueOrThrow({
    where: { numeroOrden: numeroRechazado },
    select: { estado: true, montoSubtotal: true },
  });
  verificar("estado RECHAZADO", rechazado.estado === "RECHAZADO");
  const stockPostRechazo = (await prisma.varianteProducto.findUniqueOrThrow({ where: { id: variante.id }, select: { stockActual: true } })).stockActual;
  verificar("stock intacto tras rechazo", stockPostRechazo === stockPreRechazo);
  const carritoPostRechazo = await obtenerEstadoCarrito(usuarioId);
  verificar("carrito conservado para reintento", carritoPostRechazo.items.length === 1);
  verificar("reserva sigue activa tras rechazo", carritoPostRechazo.reservaActiva);

  // ---------- 7) RN-05: carrera por stock en la fase 2 ----------
  console.log("\n[7] Carrera por stock (fase 2)");
  const numeroCarrera = await crearPedidoPendiente(usuarioId).then((p) => p.numeroOrden);
  // Un tercero se lleva el stock entre la creacion y la aprobacion.
  await prisma.varianteProducto.update({ where: { id: variante.id }, data: { stockActual: 0 } });
  await esperaError("aprobacion sin stock", "STOCK_INSUFICIENTE", () =>
    aprobarPedidoPendiente(numeroCarrera, { metodoPago: "simulado" }),
  );
  const estadoCarrera = (await prisma.pedido.findUniqueOrThrow({ where: { numeroOrden: numeroCarrera }, select: { estado: true } })).estado;
  verificar("pedido sigue PENDIENTE tras falla de stock", estadoCarrera === "PENDIENTE");
  await prisma.varianteProducto.update({ where: { id: variante.id }, data: { stockActual: stockPreRechazo } });

  // ---------- 8) Camino simulado completo (fase 1 + fase 2 en linea) ----------
  console.log("\n[8] Camino simulado completo");
  await cancelarReservaCarrito(usuarioId);
  await agregarItemCarrito(usuarioId, { varianteId: variante.id, cantidad: 1 });
  await iniciarReservaCarrito(usuarioId);
  const numeroCompleto = await pagarSimuladoAprobado(usuarioId);
  const completo = await prisma.pedido.findUniqueOrThrow({
    where: { numeroOrden: numeroCompleto },
    select: { estado: true },
  });
  verificar("pago simulado aprobado deja pedido CONFIRMADO", completo.estado === "CONFIRMADO");
  const carritoFinal = await obtenerEstadoCarrito(usuarioId);
  verificar("carrito vacio tras camino simulado", carritoFinal.items.length === 0);
  verificar("reserva liberada tras camino simulado", !carritoFinal.reservaActiva);

  // ---------- 9) RF-45: tarifas de envio ----------
  console.log("\n[9] RF-45: tarifas de envio");
  verificar(
    "ciudad de la tienda = tarifa base",
    calcularCostoEnvio("Concepcion del Uruguay", "Entre Rios") === TARIFA_CIUDAD,
  );
  verificar(
    "normalizacion: mayusculas y acentos",
    calcularCostoEnvio("CONCEPCIÓN DEL URUGUAY", "ENTRE RÍOS") === TARIFA_CIUDAD,
  );
  verificar(
    "otra ciudad en la provincia = tarifa de provincia",
    calcularCostoEnvio("Parana", "Entre Rios") === TARIFAS_PROVINCIA["entre rios"],
  );
  verificar(
    "otra provincia con tarifa cargada",
    calcularCostoEnvio("La Plata", "Buenos Aires") === TARIFAS_PROVINCIA["buenos aires"],
  );
  verificar(
    "provincia sin tarifa = valor por defecto",
    calcularCostoEnvio("Salta", "Salta") === TARIFA_PROVINCIA_DEFAULT,
  );
  verificar("tarifa provincia > tarifa base", TARIFA_PROVINCIA_DEFAULT > TARIFA_CIUDAD);

  // ---------- 10) RF-28: correo de confirmacion ----------
  console.log("\n[10] RF-28: correo de confirmacion");
  const pedidoCorreo = await obtenerPedidoParaCorreo(numeroCompleto);
  verificar("pedido confirmado recuperado para el correo", Boolean(pedidoCorreo));
  if (pedidoCorreo) {
    verificar("estado CONFIRMADO", pedidoCorreo.estado === "CONFIRMADO");
    verificar("correo del cliente presente", pedidoCorreo.cliente.usuario.correo.length > 0);
    const html = construirCorreoConfirmacion(pedidoCorreo);
    verificar(
      "agradecimiento en el correo",
      /Gracias por tu compra/i.test(html),
    );
    verificar(
      "detalle del producto en el correo",
      html.includes(pedidoCorreo.items[0]?.nombreProductoSnapshot ?? "###"),
    );
    verificar(
      "cupon aplicado en el correo",
      pedidoCorreo.cupon ? html.includes(pedidoCorreo.cupon.codigo) : true,
    );
    verificar(
      "descuentos visibles en el correo",
      promoEsperada > 0 ? html.includes("Promociones") : true,
    );
    verificar(
      "total con envio en el correo",
      html.includes("Total"),
    );
    verificar("numero de orden en el asunto/html", html.includes(pedidoCorreo.numeroOrden));
  }
  const resultadoCorreo = await enviarCorreoConfirmacionPedido(numeroCompleto);
  verificar(
    `envio de confirmacion (${correoHabilitado() ? "proveedor real" : "modo simulado"})`,
    resultadoCorreo === (correoHabilitado() ? "ENVIADO" : "SIMULADO"),
  );
  verificar(
    "pedido inexistente devuelve null",
    (await enviarCorreoConfirmacionPedido("SNK-99999999-XXXX")) === null,
  );

  // ---------- 11) RF-43 / RF-44: newsletter ----------
  console.log("\n[11] RF-43/44: newsletter");
  const correoPrueba = "prueba-newsletter@sneaker.test";
  // Limpieza previa para que la prueba sea repetible.
  await prisma.suscripcionNewsletter.deleteMany({ where: { correo: correoPrueba } });

  const alta = await suscribirseNewsletter({ correo: correoPrueba });
  verificar("suscripcion nueva (RF-43)", alta.estado === "NUEVO");
  const repetida = await suscribirseNewsletter({ correo: correoPrueba });
  verificar("suscripcion idempotente", repetida.estado === "YA_SUSCRIPTO");
  await prisma.suscripcionNewsletter.update({
    where: { correo: correoPrueba },
    data: { activo: false },
  });
  const reactivada = await suscribirseNewsletter({ correo: correoPrueba });
  verificar("reactivacion tras baja", reactivada.estado === "REACTIVADO");

  try {
    await suscribirseNewsletter({ correo: "correo-invalido" });
    verificar("correo invalido rechazado", false, "- no lanzo ZodError");
  } catch (error) {
    verificar(
      "correo invalido rechazado",
      error instanceof Error && error.name === "ZodError",
      `- recibio: ${String(error)}`,
    );
  }

  const campana = await enviarNovedades({
    asunto: "Prueba arnes: novedades Sneaker",
    mensaje: "Campana de prueba del arnes (RF-44).",
  });
  verificar("campana cubre a todos los suscriptos", campana.correosEnviados === campana.suscriptos);
  verificar(
    `modo de envio (${correoHabilitado() ? "proveedor real" : "modo simulado"})`,
    campana.modo === (correoHabilitado() ? "ENVIADO" : "SIMULADO"),
  );
  verificar("campana llego al suscriptor de prueba", campana.suscriptos >= 1);

  // Limpieza de la suscripcion de prueba.
  await prisma.suscripcionNewsletter.deleteMany({ where: { correo: correoPrueba } });

  // ---------- Limpieza ----------
  console.log("\nLimpieza del carrito de prueba");
  await cancelarReservaCarrito(usuarioId);
  await prisma.itemCarrito.deleteMany({ where: { carrito: { clienteId: usuarioId } } });

  console.log(fallos === 0 ? "\nTODAS LAS PRUEBAS PASARON" : `\n${fallos} PRUEBAS FALLARON`);
  process.exitCode = fallos === 0 ? 0 : 1;
}

main()
  .catch((error) => {
    console.error("Error inesperado:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
