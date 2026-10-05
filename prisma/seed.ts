import "dotenv/config";
import bcrypt from "bcryptjs";

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { RolUsuario, EstadoProducto, TipoMovimiento } from "../src/generated/prisma/enums";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/**
 * Semilla minima del Sprint 1.
 *
 * Sirve para verificar que el schema del UML se aplica bien y que el login
 * funciona. La poblacion masiva que exige RNF-05 (busquedas, filtros,
 * compras, stock y estadisticas) se completa en el Sprint 4.
 *
 * Todo es `upsert`, asi que se puede volver a ejecutar sin duplicar nada.
 */

const CATEGORIAS = [
  { nombre: "Deportivas", slug: "deportivas" },
  { nombre: "Urbanas", slug: "urbanas" },
  { nombre: "Accesorios", slug: "accesorios" },
  { nombre: "Kits", slug: "kits" },
];

const MARCAS = [
  { nombre: "Nike", slug: "nike" },
  { nombre: "Adidas", slug: "adidas" },
  { nombre: "Puma", slug: "puma" },
  { nombre: "New Balance", slug: "new-balance" },
  { nombre: "Kross", slug: "kross" },
];

const ETIQUETAS = [
  { nombre: "Basquet", slug: "basquet" },
  { nombre: "Running", slug: "running" },
  { nombre: "Futbol", slug: "futbol" },
  { nombre: "Caminata", slug: "caminata" },
  { nombre: "Training", slug: "training" },
  { nombre: "Urban", slug: "urban" },
];

async function main() {
  console.log("Sembrando datos base...\n");

  // ---------- Tablas maestras ----------
  const categorias = await Promise.all(
    CATEGORIAS.map((c) => prisma.categoria.upsert({ where: { slug: c.slug }, update: {}, create: c })),
  );
  const marcas = await Promise.all(
    MARCAS.map((m) => prisma.marca.upsert({ where: { slug: m.slug }, update: {}, create: m })),
  );
  const etiquetas = await Promise.all(
    ETIQUETAS.map((e) => prisma.etiquetaUso.upsert({ where: { slug: e.slug }, update: {}, create: e })),
  );

  const catPorSlug = new Map(categorias.map((c) => [c.slug, c]));
  const marcaPorSlug = new Map(marcas.map((m) => [m.slug, m]));
  const etiquetaPorSlug = new Map(etiquetas.map((e) => [e.slug, e]));

  console.log(`  ${categorias.length} categorias | ${marcas.length} marcas | ${etiquetas.length} etiquetas`);

  // ---------- Proveedor ----------
  const proveedor = await prisma.proveedor.upsert({
    where: { cuit: "30112233445" },
    update: {},
    create: {
      razonSocial: "Distribuidora Central S.R.L.",
      cuit: "30112233445",
      nombreContacto: "Nicolas Gomez",
      telefono: "03415-400000",
      email: "ventas@distribuidoracentral.test",
      direccion: "Av. principal 123, Concepcion del Uruguay, Entre Rios",
    },
  });

  // ---------- Usuarios ----------
  const hash = await bcrypt.hash("sneaker1234", 12);

  await prisma.usuario.upsert({
    where: { correo: "admin@sneaker.test" },
    update: { rol: RolUsuario.ADMIN, passwordHash: hash },
    create: {
      usuario: "admin",
      correo: "admin@sneaker.test",
      passwordHash: hash,
      rol: RolUsuario.ADMIN,
    },
  });

  const clientesSemilla = [
    {
      usuario: "poggi",
      correo: "cliente@sneaker.test",
      nombre: "Abril",
      apellido: "Poggio",
      telefono: "3435551001",
      dni: 35111222,
    },
    {
      usuario: "rochas",
      correo: "cliente2@sneaker.test",
      nombre: "Tadeo",
      apellido: "Rochas",
      telefono: "3435551002",
      dni: 35111223,
    },
  ];

  for (const c of clientesSemilla) {
    await prisma.usuario.upsert({
      where: { correo: c.correo },
      update: { passwordHash: hash },
      create: {
        usuario: c.usuario,
        correo: c.correo,
        passwordHash: hash,
        rol: RolUsuario.CLIENTE,
      },
    });

    const usuario = await prisma.usuario.findUniqueOrThrow({ where: { correo: c.correo } });

    await prisma.cliente.upsert({
      where: { usuarioId: usuario.id },
      update: { nombre: c.nombre, apellido: c.apellido, telefono: c.telefono, dni: c.dni },
      create: {
        usuarioId: usuario.id,
        nombre: c.nombre,
        apellido: c.apellido,
        telefono: c.telefono,
        dni: c.dni,
      },
    });

    // RF-17 / RN-02: se deja una direccion de ejemplo. El tope de 3 se
    // valida en el servicio, todavia no implementado.
    const existentes = await prisma.direccion.count({ where: { clienteId: usuario.id } });
    if (existentes === 0) {
      await prisma.direccion.create({
        data: {
          clienteId: usuario.id,
          destinatario: `${c.nombre} ${c.apellido}`,
          calle: "25 de Mayo",
          numero: "1234",
          ciudad: "Concepcion del Uruguay",
          provincia: "Entre Rios",
          codigoPostal: "323000",
          predeterminada: true,
        },
      });
    }
  }

  console.log(`  1 administrador | ${clientesSemilla.length} clientes con direccion`);

  // ---------- Productos ----------
  const productos = [
    {
      sku: "SNK-DEP-001",
      nombre: "Zapatilla Basket Running X",
      descripcion: "Zapatilla liviana para running daily. Capellada de mesh y suela de goma.",
      precioVenta: 89999,
      costoCompra: 52000,
      garantia: "6 meses",
      categoria: "deportivas",
      marca: "kross",
      etiquetas: ["running", "caminata"],
      variantes: [
        { talle: "40", color: "Negro", material: "Mesh", stockActual: 12 },
        { talle: "42", color: "Negro", material: "Mesh", stockActual: 8 },
        // 10 unidades exactas: dispara el aviso de RN-09.
        { talle: "43", color: "Blanco", material: "Cuero", stockActual: 10 },
        { talle: "44", color: "Blanco", material: "Cuero", stockActual: 0 },
      ],
    },
    {
      sku: "SNK-URB-001",
      nombre: "Zapatilla Urbana Corte Alto",
      descripcion: "Cuero sintetico, suela vulcanizada y plantilla acolchada.",
      precioVenta: 74999,
      costoCompra: 41000,
      garantia: "6 meses",
      categoria: "urbanas",
      marca: "kross",
      etiquetas: ["urban"],
      variantes: [
        { talle: "40", color: "Marron", material: "Cuero", stockActual: 5 },
        { talle: "42", color: "Marron", material: "Cuero", stockActual: 3 },
        { talle: "43", color: "Negro", material: "Cuero", stockActual: 7 },
      ],
    },
    {
      sku: "SNK-ACC-001",
      nombre: "Medias Deportivas Pack x3",
      descripcion: "Pack de 3 pares de medias algodon con franja dielectrica.",
      precioVenta: 12999,
      costoCompra: 4500,
      garantia: null,
      categoria: "accesorios",
      marca: "kross",
      etiquetas: ["running", "training"],
      variantes: [
        { talle: "Unico", color: "Blanco", material: "Algodon", stockActual: 40 },
      ],
    },
  ];

  const creadas: { sku: string; id: string; variantes: { id: string; stock: number }[] }[] = [];

  for (const p of productos) {
    const producto = await prisma.producto.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        sku: p.sku,
        nombre: p.nombre,
        descripcion: p.descripcion,
        precioVenta: p.precioVenta,
        costoCompra: p.costoCompra,
        garantia: p.garantia,
        estado: EstadoProducto.ACTIVO,
        categoriaId: catPorSlug.get(p.categoria)!.id,
        marcaId: marcaPorSlug.get(p.marca)!.id,
        proveedorId: proveedor.id,
      },
    });

    for (const slug of p.etiquetas) {
      const etiqueta = etiquetaPorSlug.get(slug)!;
      await prisma.productoEtiqueta.upsert({
        where: { productoId_etiquetaId: { productoId: producto.id, etiquetaId: etiqueta.id } },
        update: {},
        create: { productoId: producto.id, etiquetaId: etiqueta.id },
      });
    }

    const variantes = [];

    for (const v of p.variantes) {
      // El UNIQUE es (productoId, talle, color, material): se resuelve la
      // variante por sus tres atributos naturales en lugar del id.
      const existente = await prisma.varianteProducto.findFirst({
        where: {
          productoId: producto.id,
          talle: v.talle,
          color: v.color,
          material: v.material,
        },
      });

      if (existente) {
        variantes.push({ id: existente.id, stock: existente.stockActual });
        continue;
      }

      const variante = await prisma.varianteProducto.create({
        data: {
          productoId: producto.id,
          talle: v.talle,
          color: v.color,
          material: v.material,
          stockActual: v.stockActual,
        },
      });

      // RF-35 / RN-07: toda entrada de stock deja rastro en MovimientoStock.
      if (v.stockActual > 0) {
        await prisma.movimientoStock.create({
          data: {
            tipo: TipoMovimiento.INGRESO,
            cantidad: v.stockActual,
            justificacion: "Carga inicial de la semilla",
            varianteProductoId: variante.id,
            responsableId: (
              await prisma.usuario.findUniqueOrThrow({ where: { correo: "admin@sneaker.test" } })
            ).id,
            proveedorId: proveedor.id,
            stockResultante: v.stockActual,
          },
        });
      }

      variantes.push({ id: variante.id, stock: v.stockActual });
    }

    creadas.push({ sku: p.sku, id: producto.id, variantes });
    console.log(`  ${p.sku} - ${p.variantes.length} variantes`);
  }

  // ---------- Kit (RF-38, RF-39, RN-06) ----------
  // El stock de un kit NO se persiste: es el minimo del stock de sus
  // componentes, dividido por cuantas unidades de cada uno consume.
  // Con estos datos (12 y 40) el kit queda en 12.
  const productoZapatilla = creadas.find((p) => p.sku === "SNK-DEP-001")!;
  const productoMedias = creadas.find((p) => p.sku === "SNK-ACC-001")!;

  const kit = await prisma.producto.upsert({
    where: { sku: "SNK-KIT-001" },
    update: {},
    create: {
      sku: "SNK-KIT-001",
      nombre: "Kit Carrera: Zapatilla + Medias",
      descripcion: "Zapatilla de running con pack de medias. El stock depende de la variante mas limitada.",
      precioVenta: 94999,
      costoCompra: 56500,
      garantia: "6 meses",
      estado: EstadoProducto.ACTIVO,
      categoriaId: catPorSlug.get("kits")!.id,
      marcaId: marcaPorSlug.get("kross")!.id,
      proveedorId: proveedor.id,
    },
  });

  await prisma.kit.upsert({
    where: { productoId: kit.id },
    update: {},
    create: { productoId: kit.id },
  });

  const componentes = [
    { varianteId: productoZapatilla.variantes[0].id, cantidad: 1 },
    { varianteId: productoMedias.variantes[0].id, cantidad: 1 },
  ];

  for (const componente of componentes) {
    await prisma.kitComponente.upsert({
      where: {
        kitProductoId_varianteId: { kitProductoId: kit.id, varianteId: componente.varianteId },
      },
      update: { cantidad: componente.cantidad },
      create: { kitProductoId: kit.id, ...componente },
    });
  }

  const stockPorVariante = new Map(
    creadas.flatMap((p) => p.variantes.map((v) => [v.id, v.stock] as const)),
  );

  const stockCalculado = Math.floor(
    Math.min(
      ...componentes.map((c) => (stockPorVariante.get(c.varianteId) ?? 0) / c.cantidad),
    ),
  );

  console.log(`  SNK-KIT-001 - 2 componentes, stock calculado = ${stockCalculado} (RN-06)`);

  // ---------- Cupon y promocion (RF-22, RF-41, RN-08) ----------
  const hoy = new Date();
  const enTresMeses = new Date(hoy);
  enTresMeses.setMonth(enTresMeses.getMonth() + 3);

  await prisma.cupon.upsert({
    where: { codigo: "BIENVENIDO10" },
    update: {},
    create: {
      codigo: "BIENVENIDO10",
      porcentajeDescuento: 10,
      fechaVigencia: hoy,
      fechaVigenciaFin: enTresMeses,
      descripcion: "10% de descuento en la primera compra",
      activo: true,
    },
  });

  await prisma.promocion.upsert({
    where: { id: "promo-temporada" },
    update: {},
    create: {
      id: "promo-temporada",
      nombre: "Temporada Basketball",
      porcentajeDescuento: 15,
      fechaInicio: hoy,
      fechaFin: enTresMeses,
      activa: true,
    },
  });

  console.log("  1 cupon (BIENVENIDO10) | 1 promocion (Temporada Basketball)");

  console.log("\nListo.");
  console.log("Accesos de prueba:");
  console.log("  admin@sneaker.test  / sneaker1234   (ADMIN)");
  console.log("  cliente@sneaker.test / sneaker1234  (CLIENTE)");
  console.log("  cliente2@sneaker.test / sneaker1234 (CLIENTE)");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
