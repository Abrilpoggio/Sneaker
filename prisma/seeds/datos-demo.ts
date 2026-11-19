import bcrypt from "bcryptjs";
import { PrismaClient } from "../../src/generated/prisma/client";
import {
  EstadoPedido,
  RolUsuario,
  TipoMovimiento,
} from "../../src/generated/prisma/enums";

/**
 * RNF-05: Carga masiva de datos de prueba para demostracion (Sprint 4 - Tadeo Rochas).
 *
 * Pobla la base de datos con un amplio volumen de clientes, direcciones en
 * distintas provincias argentinas, y un historial representativo de ventas
 * y pedidos distribuidos a lo largo del tiempo (ultimos 120 dias).
 *
 * Respeta todas las reglas de negocio del sistema:
 * - RN-02: maximo 3 direcciones por cliente.
 * - RN-08: maximo 1 cupon por compra.
 * - RN-06/RN-07: venta de variantes individuales y de Kits con snapshot de componentes.
 * - RF-30: pedidos en estados CONFIRMADO, PREPARANDO, EN_CAMINO, RECIBIDO, CANCELADO, RECHAZADO.
 * - RF-45: calculo de costo de envio segun ciudad/provincia con `calcularCostoEnvio`.
 * - RF-36 / RF-37: movimientos de stock tipo VENTA (y restitucion INGRESO en cancelados).
 *
 * Es idempotente (usa `upsert` por numeroOrden y por email).
 */

function normalizar(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function calcularCostoEnvio(ciudad: string, provincia: string): number {
  if (normalizar(ciudad) === normalizar("Concepcion del Uruguay")) {
    return 5000;
  }
  const prov = normalizar(provincia);
  const tarifas: Record<string, number> = {
    "entre rios": 6500,
    "santa fe": 8000,
    "buenos aires": 10000,
    "ciudad autonoma de buenos aires": 10000,
    "capital federal": 10000,
    cordoba: 11000,
    mendoza: 11500,
    "tierra del fuego": 16000,
  };
  return tarifas[prov] ?? 13000;
}

interface ClienteDemoDef {
  usuario: string;
  correo: string;
  nombre: string;
  apellido: string;
  telefono: string;
  dni: number;
  direcciones: Array<{
    destinatario: string;
    calle: string;
    numero: string;
    piso?: string;
    departamento?: string;
    ciudad: string;
    provincia: string;
    codigoPostal: string;
    predeterminada: boolean;
  }>;
}

const CLIENTES_DEMO: ClienteDemoDef[] = [
  {
    usuario: "camila.vineg",
    correo: "camila.vineg@sneaker.test",
    nombre: "Camila",
    apellido: "Viñeg",
    telefono: "3442551003",
    dni: 36224119,
    direcciones: [
      {
        destinatario: "Camila Viñeg",
        calle: "Urquiza",
        numero: "450",
        piso: "2",
        departamento: "B",
        ciudad: "Concepcion del Uruguay",
        provincia: "Entre Rios",
        codigoPostal: "3260",
        predeterminada: true,
      },
    ],
  },
  {
    usuario: "lucas.martinez",
    correo: "lucas.martinez@gmail.com",
    nombre: "Lucas",
    apellido: "Martinez",
    telefono: "01145892301",
    dni: 38412954,
    direcciones: [
      {
        destinatario: "Lucas Martinez",
        calle: "Av. Santa Fe",
        numero: "3240",
        piso: "5",
        departamento: "A",
        ciudad: "Palermo",
        provincia: "Ciudad Autonoma de Buenos Aires",
        codigoPostal: "1425",
        predeterminada: true,
      },
    ],
  },
  {
    usuario: "sofia.rodriguez",
    correo: "sofia.rodriguez@hotmail.com",
    nombre: "Sofia",
    apellido: "Rodriguez",
    telefono: "03414890123",
    dni: 40192837,
    direcciones: [
      {
        destinatario: "Sofia Rodriguez",
        calle: "Bv. Oroño",
        numero: "1120",
        ciudad: "Rosario",
        provincia: "Santa Fe",
        codigoPostal: "2000",
        predeterminada: true,
      },
      {
        destinatario: "Estudio Rodriguez",
        calle: "Cordoba",
        numero: "1450",
        piso: "8",
        departamento: "C",
        ciudad: "Rosario",
        provincia: "Santa Fe",
        codigoPostal: "2000",
        predeterminada: false,
      },
    ],
  },
  {
    usuario: "mateo.fernandez",
    correo: "mateo.fernandez@yahoo.com",
    nombre: "Mateo",
    apellido: "Fernandez",
    telefono: "03514789012",
    dni: 41837462,
    direcciones: [
      {
        destinatario: "Mateo Fernandez",
        calle: "Av. Hipolito Yrigoyen",
        numero: "380",
        ciudad: "Cordoba",
        provincia: "Cordoba",
        codigoPostal: "5000",
        predeterminada: true,
      },
    ],
  },
  {
    usuario: "valen.lopez",
    correo: "valen.lopez@gmail.com",
    nombre: "Valentina",
    apellido: "Lopez",
    telefono: "03442156677",
    dni: 39582910,
    direcciones: [
      {
        destinatario: "Valentina Lopez",
        calle: "San Martin",
        numero: "820",
        ciudad: "Concepcion del Uruguay",
        provincia: "Entre Rios",
        codigoPostal: "3260",
        predeterminada: true,
      },
    ],
  },
  {
    usuario: "joaco.benitez",
    correo: "joaco.benitez@outlook.com",
    nombre: "Joaquin",
    apellido: "Benitez",
    telefono: "03434221190",
    dni: 37918234,
    direcciones: [
      {
        destinatario: "Joaquin Benitez",
        calle: "Alameda de la Federacion",
        numero: "560",
        ciudad: "Parana",
        provincia: "Entre Rios",
        codigoPostal: "3100",
        predeterminada: true,
      },
    ],
  },
  {
    usuario: "marti.romero",
    correo: "marti.romero@gmail.com",
    nombre: "Martina",
    apellido: "Romero",
    telefono: "02614332211",
    dni: 42109845,
    direcciones: [
      {
        destinatario: "Martina Romero",
        calle: "Av. San Martin",
        numero: "1540",
        piso: "3",
        departamento: "12",
        ciudad: "Mendoza",
        provincia: "Mendoza",
        codigoPostal: "5500",
        predeterminada: true,
      },
    ],
  },
  {
    usuario: "nico.diaz",
    correo: "nico.diaz@gmail.com",
    nombre: "Nicolas",
    apellido: "Diaz",
    telefono: "02214889900",
    dni: 35847291,
    direcciones: [
      {
        destinatario: "Nicolas Diaz",
        calle: "Calle 7",
        numero: "850",
        ciudad: "La Plata",
        provincia: "Buenos Aires",
        codigoPostal: "1900",
        predeterminada: true,
      },
    ],
  },
  {
    usuario: "flor.alvarez",
    correo: "flor.alvarez@gmail.com",
    nombre: "Florencia",
    apellido: "Alvarez",
    telefono: "03442154433",
    dni: 38291047,
    direcciones: [
      {
        destinatario: "Florencia Alvarez",
        calle: "Galarza",
        numero: "710",
        ciudad: "Concepcion del Uruguay",
        provincia: "Entre Rios",
        codigoPostal: "3260",
        predeterminada: true,
      },
    ],
  },
  {
    usuario: "agus.torres",
    correo: "agus.torres@hotmail.com",
    nombre: "Agustin",
    apellido: "Torres",
    telefono: "03874312244",
    dni: 43219876,
    direcciones: [
      {
        destinatario: "Agustin Torres",
        calle: "Balcarce",
        numero: "620",
        ciudad: "Salta",
        provincia: "Salta",
        codigoPostal: "4400",
        predeterminada: true,
      },
    ],
  },
  {
    usuario: "lu.gimenez",
    correo: "lu.gimenez@gmail.com",
    nombre: "Lucia",
    apellido: "Gimenez",
    telefono: "03814256789",
    dni: 36987452,
    direcciones: [
      {
        destinatario: "Lucia Gimenez",
        calle: "25 de Mayo",
        numero: "430",
        ciudad: "San Miguel de Tucuman",
        provincia: "Tucuman",
        codigoPostal: "4000",
        predeterminada: true,
      },
    ],
  },
  {
    usuario: "facu.morales",
    correo: "facu.morales@yahoo.com",
    nombre: "Facundo",
    apellido: "Morales",
    telefono: "03446428811",
    dni: 40982314,
    direcciones: [
      {
        destinatario: "Facundo Morales",
        calle: "25 de Mayo",
        numero: "950",
        ciudad: "Gualeguaychu",
        provincia: "Entre Rios",
        codigoPostal: "2820",
        predeterminada: true,
      },
    ],
  },
  {
    usuario: "cami.herrera",
    correo: "cami.herrera@gmail.com",
    nombre: "Camila",
    apellido: "Herrera",
    telefono: "02901423344",
    dni: 39182745,
    direcciones: [
      {
        destinatario: "Camila Herrera",
        calle: "San Martin",
        numero: "680",
        ciudad: "Ushuaia",
        provincia: "Tierra del Fuego",
        codigoPostal: "9410",
        predeterminada: true,
      },
    ],
  },
  {
    usuario: "martin.castro",
    correo: "martin.castro@outlook.com",
    nombre: "Martin",
    apellido: "Castro",
    telefono: "02234912233",
    dni: 37465829,
    direcciones: [
      {
        destinatario: "Martin Castro",
        calle: "Guemes",
        numero: "2840",
        ciudad: "Mar del Plata",
        provincia: "Buenos Aires",
        codigoPostal: "7600",
        predeterminada: true,
      },
    ],
  },
  {
    usuario: "juli.ortiz",
    correo: "juli.ortiz@gmail.com",
    nombre: "Julieta",
    apellido: "Ortiz",
    telefono: "03424567890",
    dni: 41562938,
    direcciones: [
      {
        destinatario: "Julieta Ortiz",
        calle: "San Jeronimo",
        numero: "2150",
        ciudad: "Santa Fe",
        provincia: "Santa Fe",
        codigoPostal: "3000",
        predeterminada: true,
      },
    ],
  },
  {
    usuario: "santi.silva",
    correo: "santi.silva@gmail.com",
    nombre: "Santiago",
    apellido: "Silva",
    telefono: "03442158912",
    dni: 42873910,
    direcciones: [
      {
        destinatario: "Santiago Silva",
        calle: "Leguizamon",
        numero: "310",
        ciudad: "Concepcion del Uruguay",
        provincia: "Entre Rios",
        codigoPostal: "3260",
        predeterminada: true,
      },
    ],
  },
];

export async function sembrarDatosDemo(prisma: PrismaClient) {
  console.log("\n--- RNF-05: Sembrando datos masivos de prueba para demostracion ---");

  const passwordHash = await bcrypt.hash("sneaker1234", 10);

  // 1. Obtener usuario admin para ser responsable de movimientos de stock
  const admin = await prisma.usuario.findFirst({
    where: { correo: "admin@sneaker.test" },
    select: { id: true },
  });

  if (!admin) {
    console.warn("  Aviso: Admin no encontrado todavia. Se omite carga demo.");
    return;
  }

  // 2. Sembrar clientes demo con direcciones
  const clientesCreados: Array<{
    id: string;
    nombre: string;
    apellido: string;
    correo: string;
    direccionId: string;
    ciudad: string;
    provincia: string;
    direccion: ClienteDemoDef["direcciones"][0];
  }> = [];

  // Incluir tambien los dos clientes base del seed (Abril y Tadeo)
  const clientesBase = await prisma.cliente.findMany({
    where: {
      usuario: {
        correo: { in: ["cliente@sneaker.test", "cliente2@sneaker.test"] },
      },
    },
    include: {
      usuario: true,
      direcciones: { take: 1 },
    },
  });

  for (const cb of clientesBase) {
    if (cb.direcciones.length > 0) {
      const d = cb.direcciones[0];
      clientesCreados.push({
        id: cb.usuarioId,
        nombre: cb.nombre,
        apellido: cb.apellido,
        correo: cb.usuario.correo,
        direccionId: d.id,
        ciudad: d.ciudad,
        provincia: d.provincia,
        direccion: {
          destinatario: d.destinatario,
          calle: d.calle,
          numero: d.numero,
          piso: d.piso ?? undefined,
          departamento: d.departamento ?? undefined,
          ciudad: d.ciudad,
          provincia: d.provincia,
          codigoPostal: d.codigoPostal ?? "3260",
          predeterminada: d.predeterminada,
        },
      });
    }
  }

  for (const c of CLIENTES_DEMO) {
    const usuarioExistente = await prisma.usuario.findFirst({
      where: {
        OR: [{ correo: c.correo }, { usuario: c.usuario }],
      },
    });

    let usuarioId: string;
    if (usuarioExistente) {
      await prisma.usuario.update({
        where: { id: usuarioExistente.id },
        data: {
          correo: c.correo,
          usuario: c.usuario,
          passwordHash,
          rol: RolUsuario.CLIENTE,
          activo: true,
        },
      });
      usuarioId = usuarioExistente.id;
    } else {
      const u = await prisma.usuario.create({
        data: {
          usuario: c.usuario,
          correo: c.correo,
          passwordHash,
          rol: RolUsuario.CLIENTE,
          activo: true,
        },
      });
      usuarioId = u.id;
    }

    if (c.dni) {
      const clienteConDni = await prisma.cliente.findUnique({
        where: { dni: c.dni },
      });
      if (clienteConDni && clienteConDni.usuarioId !== usuarioId) {
        await prisma.cliente.update({
          where: { usuarioId: clienteConDni.usuarioId },
          data: { dni: null },
        });
      }
    }

    const cliente = await prisma.cliente.upsert({
      where: { usuarioId },
      update: {
        nombre: c.nombre,
        apellido: c.apellido,
        telefono: c.telefono,
        dni: c.dni,
      },
      create: {
        usuarioId,
        nombre: c.nombre,
        apellido: c.apellido,
        telefono: c.telefono,
        dni: c.dni,
      },
    });

    let direccionSeleccionadaId = "";
    let direccionSeleccionadaObj = c.direcciones[0];

    for (const dir of c.direcciones) {
      const existente = await prisma.direccion.findFirst({
        where: { clienteId: cliente.usuarioId, calle: dir.calle, numero: dir.numero },
      });

      if (!existente) {
        const dNueva = await prisma.direccion.create({
          data: {
            clienteId: cliente.usuarioId,
            destinatario: dir.destinatario,
            calle: dir.calle,
            numero: dir.numero,
            piso: dir.piso,
            departamento: dir.departamento,
            ciudad: dir.ciudad,
            provincia: dir.provincia,
            codigoPostal: dir.codigoPostal,
            predeterminada: dir.predeterminada,
          },
        });
        if (dir.predeterminada || !direccionSeleccionadaId) {
          direccionSeleccionadaId = dNueva.id;
          direccionSeleccionadaObj = dir;
        }
      } else {
        if (dir.predeterminada || !direccionSeleccionadaId) {
          direccionSeleccionadaId = existente.id;
          direccionSeleccionadaObj = dir;
        }
      }
    }

    clientesCreados.push({
      id: cliente.usuarioId,
      nombre: c.nombre,
      apellido: c.apellido,
      correo: c.correo,
      direccionId: direccionSeleccionadaId,
      ciudad: direccionSeleccionadaObj.ciudad,
      provincia: direccionSeleccionadaObj.provincia,
      direccion: direccionSeleccionadaObj,
    });
  }

  console.log(`  ${clientesCreados.length} clientes listos con sus direcciones.`);

  // 3. Obtener variantes de productos y kits disponibles
  const variantes = await prisma.varianteProducto.findMany({
    include: {
      producto: {
        include: {
          categoria: true,
          marca: true,
        },
      },
    },
  });

  const kits = await prisma.kit.findMany({
    include: {
      producto: {
        include: {
          categoria: true,
          marca: true,
        },
      },
      componentes: {
        include: {
          variante: {
            include: {
              producto: true,
            },
          },
        },
      },
    },
  });

  if (variantes.length === 0) {
    console.warn("  Aviso: No hay variantes cargadas para generar pedidos.");
    return;
  }

  // 4. Obtener cupon BIENVENIDO10 si existe
  const cuponBienvenida = await prisma.cupon.findUnique({
    where: { codigo: "BIENVENIDO10" },
  });

  // 5. Generar un historial de pedidos realistas
  const METODOS_PAGO = [
    "mercadopago_credit_card",
    "mercadopago_debit_card",
    "mercadopago_account_money",
    "transferencia_bancaria",
  ];

  const ahora = new Date();
  const DIAS_HISTORIAL = 110;
  const TOTAL_PEDIDOS_OBJETIVO = 78;

  let pedidosNuevos = 0;
  let movimientosNuevos = 0;

  for (let i = 1; i <= TOTAL_PEDIDOS_OBJETIVO; i++) {
    const indiceStr = i.toString().padStart(4, "0");
    const diasAtras = Math.floor(
      ((TOTAL_PEDIDOS_OBJETIVO - i) / TOTAL_PEDIDOS_OBJETIVO) * DIAS_HISTORIAL,
    );
    const fechaPedido = new Date(ahora.getTime() - diasAtras * 24 * 60 * 60 * 1000);
    fechaPedido.setHours(10 + (i % 12), (i * 17) % 60, (i * 23) % 60);

    const anio = fechaPedido.getFullYear();
    const mes = String(fechaPedido.getMonth() + 1).padStart(2, "0");
    const dia = String(fechaPedido.getDate()).padStart(2, "0");
    const numeroOrden = `SNK-${anio}${mes}${dia}-${indiceStr}`;

    const pedidoExistente = await prisma.pedido.findUnique({
      where: { numeroOrden },
    });
    if (pedidoExistente) {
      continue;
    }

    let estado: EstadoPedido;
    if (diasAtras > 15) {
      if (i % 25 === 0) {
        estado = EstadoPedido.CANCELADO;
      } else if (i % 37 === 0) {
        estado = EstadoPedido.RECHAZADO;
      } else {
        estado = EstadoPedido.RECIBIDO;
      }
    } else if (diasAtras > 5) {
      estado = EstadoPedido.EN_CAMINO;
    } else if (diasAtras > 1) {
      estado = i % 3 === 0 ? EstadoPedido.PREPARANDO : EstadoPedido.CONFIRMADO;
    } else {
      estado = EstadoPedido.CONFIRMADO;
    }

    const cliente = clientesCreados[i % clientesCreados.length];
    const costoEnvio = calcularCostoEnvio(cliente.ciudad, cliente.provincia);

    const usarKit = kits.length > 0 && i % 6 === 0;
    const itemsData: Array<{
      cantidad: number;
      precioUnitario: number;
      subtotal: number;
      nombreProductoSnapshot: string;
      skuSnapshot: string;
      varianteProductoId?: string;
      kitProductoId?: string;
      componentesKit?: any;
    }> = [];

    let subtotalAcumulado = 0;

    if (usarKit) {
      const kit = kits[i % kits.length];
      const precioUnit = Number(kit.producto.precioVenta);
      const cantidad = 1;
      const sub = precioUnit * cantidad;
      subtotalAcumulado += sub;

      const compSnapshot = kit.componentes.map((c) => ({
        varianteId: c.varianteId,
        sku: c.variante?.producto?.sku ?? "",
        nombre: c.variante?.producto?.nombre ?? "",
        talle: c.variante?.talle ?? "",
        color: c.variante?.color ?? "",
        cantidad: c.cantidad,
      }));

      itemsData.push({
        cantidad,
        precioUnitario: precioUnit,
        subtotal: sub,
        nombreProductoSnapshot: kit.producto.nombre,
        skuSnapshot: kit.producto.sku,
        kitProductoId: kit.productoId,
        componentesKit: compSnapshot,
      });
    } else {
      const cantidadItems = (i % 3 === 0) ? 2 : 1;
      for (let j = 0; j < cantidadItems; j++) {
        const v = variantes[(i * 3 + j * 7) % variantes.length];
        const cantidad = (i % 7 === 0) ? 2 : 1;
        const precioUnit = Number(v.producto.precioVenta);
        const sub = precioUnit * cantidad;
        subtotalAcumulado += sub;

        itemsData.push({
          cantidad,
          precioUnitario: precioUnit,
          subtotal: sub,
          nombreProductoSnapshot: `${v.producto.nombre} (${v.talle} - ${v.color})`,
          skuSnapshot: v.sku,
          varianteProductoId: v.id,
        });
      }
    }

    let descuentoTotal = 0;
    let cuponId: string | undefined = undefined;
    if (cuponBienvenida && i % 5 === 0 && estado !== EstadoPedido.RECHAZADO) {
      descuentoTotal = Math.round((subtotalAcumulado * Number(cuponBienvenida.porcentajeDescuento)) / 100);
      cuponId = cuponBienvenida.id;
    }

    const montoTotal = Math.max(0, subtotalAcumulado - descuentoTotal) + (estado === EstadoPedido.RECHAZADO ? 0 : costoEnvio);
    const metodoPago = METODOS_PAGO[i % METODOS_PAGO.length];

    const datosEnvioSnapshot = {
      destinatario: cliente.direccion.destinatario,
      calle: cliente.direccion.calle,
      numero: cliente.direccion.numero,
      piso: cliente.direccion.piso ?? null,
      departamento: cliente.direccion.departamento ?? null,
      ciudad: cliente.direccion.ciudad,
      provincia: cliente.direccion.provincia,
      codigoPostal: cliente.direccion.codigoPostal,
    };

    try {
      const pedidoCreado = await prisma.pedido.create({
        data: {
          numeroOrden,
          fechaCreacion: fechaPedido,
          estado,
          costoEnvio,
          montoSubtotal: subtotalAcumulado,
          descuentoTotal,
          montoTotal,
          metodoPago,
          pagoExternoId: `MP-DEMO-${anio}${mes}${dia}-${indiceStr}`,
          preferenciaId: `PREF-${indiceStr}`,
          clienteId: cliente.id,
          direccionId: cliente.direccionId || null,
          cuponId: cuponId || null,
          datosEnvio: datosEnvioSnapshot,
          items: {
            create: itemsData.map((item) => ({
              cantidad: item.cantidad,
              precioUnitario: item.precioUnitario,
              subtotal: item.subtotal,
              nombreProductoSnapshot: item.nombreProductoSnapshot,
              skuSnapshot: item.skuSnapshot,
              varianteProductoId: item.varianteProductoId,
              kitProductoId: item.kitProductoId,
              componentesKit: item.componentesKit,
            })),
          },
        },
      });

      pedidosNuevos++;

      if (estado !== EstadoPedido.RECHAZADO) {
        for (const item of itemsData) {
          if (item.varianteProductoId) {
            await prisma.movimientoStock.create({
              data: {
                fecha: fechaPedido,
                tipo: TipoMovimiento.VENTA,
                cantidad: item.cantidad,
                responsableId: admin.id,
                pedidoId: pedidoCreado.id,
                varianteProductoId: item.varianteProductoId,
                justificacion: `Venta orden ${pedidoCreado.numeroOrden}`,
              },
            });
            movimientosNuevos++;

            if (estado === EstadoPedido.CANCELADO) {
              const fechaCancelacion = new Date(fechaPedido.getTime() + 2 * 60 * 60 * 1000);
              await prisma.movimientoStock.create({
                data: {
                  fecha: fechaCancelacion,
                  tipo: TipoMovimiento.INGRESO,
                  cantidad: item.cantidad,
                  responsableId: admin.id,
                  pedidoId: pedidoCreado.id,
                  varianteProductoId: item.varianteProductoId,
                  justificacion: `Restitucion automatica por cancelacion orden ${pedidoCreado.numeroOrden} (RF-37)`,
                },
              });
              movimientosNuevos++;
            }
          } else if (item.componentesKit && Array.isArray(item.componentesKit)) {
            for (const comp of item.componentesKit) {
              if (comp.varianteId) {
                await prisma.movimientoStock.create({
                  data: {
                    fecha: fechaPedido,
                    tipo: TipoMovimiento.VENTA,
                    cantidad: (comp.cantidad || 1) * item.cantidad,
                    responsableId: admin.id,
                    pedidoId: pedidoCreado.id,
                    varianteProductoId: comp.varianteId,
                    justificacion: `Venta orden ${pedidoCreado.numeroOrden} (Kit)`,
                  },
                });
                movimientosNuevos++;
              }
            }
          }
        }
      }
    } catch (errPedido: any) {
      console.warn(`  Aviso: No se pudo crear pedido ${numeroOrden}:`, errPedido?.message || errPedido);
    }
  }

  console.log(`  ${pedidosNuevos} pedidos historicos procesados.`);
  console.log(`  ${movimientosNuevos} movimientos de stock de auditoria procesados.`);
  console.log("--- RNF-05 completado con exito ---\n");
}
