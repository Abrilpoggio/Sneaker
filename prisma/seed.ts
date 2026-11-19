import "dotenv/config";
import bcrypt from "bcryptjs";

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { RolUsuario, EstadoProducto, TipoMovimiento } from "../src/generated/prisma/enums";
import { sembrarDatosDemo } from "./seeds/datos-demo";

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
  { nombre: "Mujeres", slug: "mujeres" },
  { nombre: "Hombres", slug: "hombres" },
  { nombre: "Niños", slug: "niños" },
  { nombre: "Medias", slug: "medias" },
  { nombre: "Accesorios", slug: "accesorios" },
  { nombre: "Kits", slug: "kits" },
];

const MARCAS = [
  { nombre: "Nike", slug: "nike" },
  { nombre: "Adidas", slug: "adidas" },
  { nombre: "Puma", slug: "puma" },
  { nombre: "New Balance", slug: "new-balance" },
  { nombre: "Vans", slug: "vans" },
  { nombre: "Converse", slug: "converse" },
  { nombre: "Reebok", slug: "reebok" },
  { nombre: "Asics", slug: "asics" },
  { nombre: "Salomon", slug: "salomon" },
  { nombre: "Fila", slug: "fila" },
  { nombre: "Topper", slug: "topper" },
  { nombre: "On Running", slug: "on-running" },
  { nombre: "Kross", slug: "kross" },
  { nombre: "Olympikus", slug: "olympikus" },
];

const ETIQUETAS = [
  { nombre: "Basquet", slug: "basquet" },
  { nombre: "Running", slug: "running" },
  { nombre: "Futbol", slug: "futbol" },
  { nombre: "Caminata", slug: "caminata" },
  { nombre: "Training", slug: "training" },
  { nombre: "Urban", slug: "urban" },
  { nombre: "Skate", slug: "skate" },
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

  const adminUsuario = await prisma.usuario.upsert({
    where: { correo: "admin@sneaker.test" },
    update: { rol: RolUsuario.ADMIN, passwordHash: hash },
    create: {
      usuario: "admin",
      correo: "admin@sneaker.test",
      passwordHash: hash,
      rol: RolUsuario.ADMIN,
    },
  });

  await prisma.cliente.upsert({
    where: { usuarioId: adminUsuario.id },
    update: { nombre: "Admin", apellido: "Sneaker" },
    create: {
      usuarioId: adminUsuario.id,
      nombre: "Admin",
      apellido: "Sneaker",
      telefono: "3442400000",
    },
  });

  const direccionesAdmin = await prisma.direccion.count({ where: { clienteId: adminUsuario.id } });
  if (direccionesAdmin === 0) {
    await prisma.direccion.create({
      data: {
        clienteId: adminUsuario.id,
        destinatario: "Admin Sneaker",
        calle: "9 de Julio",
        numero: "500",
        ciudad: "Concepcion del Uruguay",
        provincia: "Entre Rios",
        codigoPostal: "3260",
        predeterminada: true,
      },
    });
  }

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
      sku: "nike-air-force-1-07",
      nombre: "Nike Air Force 1 '07",
      descripcion:
        "Las Nike Air Force 1 '07 combinan cuero premium con amortiguación Nike Air. Silueta clásica de básquet y uso urbano.",
      precioVenta: 119999,
      costoCompra: 68000,
      garantia: "6 meses",
      imagen: "/productos/nike-air-force-1-07-1.png",
      categoria: "urbanas",
      marca: "nike",
      etiquetas: ["basquet", "urban", "caminata"],
      variantes: [
        { talle: "39", color: "Blanco", material: "Cuero", stockActual: 8 },
        { talle: "40", color: "Blanco", material: "Cuero", stockActual: 12 },
        { talle: "41", color: "Blanco", material: "Cuero", stockActual: 9 },
        { talle: "42", color: "Blanco", material: "Cuero", stockActual: 0 },
        { talle: "43", color: "Blanco", material: "Cuero", stockActual: 4 },
        { talle: "39", color: "Negro", material: "Cuero", stockActual: 6 },
        { talle: "40", color: "Negro", material: "Cuero", stockActual: 0 },
        { talle: "41", color: "Negro", material: "Cuero", stockActual: 7 },
        { talle: "42", color: "Negro", material: "Cuero", stockActual: 5 },
        { talle: "43", color: "Negro", material: "Cuero", stockActual: 3 },
        { talle: "40", color: "Azul", material: "Cuero", stockActual: 0 },
        { talle: "41", color: "Azul", material: "Cuero", stockActual: 0 },
      ],
    },
    {
      sku: "adidas-forum-low-cl",
      nombre: "Adidas Forum Low CL",
      descripcion:
        "Silueta de 1984 con perfil bajo, capellada de cuero y las tres tiras en contraste. Ideal para uso diario.",
      precioVenta: 99999,
      costoCompra: 56000,
      garantia: "6 meses",
      imagen: "/productos/adidas-forum-low-cl-1.png",
      categoria: "mujeres",
      marca: "adidas",
      etiquetas: ["caminata", "urban"],
      variantes: [
        { talle: "36", color: "Blanco/Negro", material: "Cuero", stockActual: 7 },
        { talle: "37", color: "Blanco/Negro", material: "Cuero", stockActual: 10 },
        { talle: "38", color: "Blanco/Negro", material: "Cuero", stockActual: 0 },
        { talle: "39", color: "Blanco/Negro", material: "Cuero", stockActual: 5 },
        { talle: "36", color: "Blanco/Verde", material: "Cuero", stockActual: 6 },
        { talle: "37", color: "Blanco/Verde", material: "Cuero", stockActual: 0 },
        { talle: "38", color: "Blanco/Verde", material: "Cuero", stockActual: 8 },
        { talle: "39", color: "Blanco/Verde", material: "Cuero", stockActual: 4 },
        { talle: "37", color: "Blanco/Rosa", material: "Cuero", stockActual: 0 },
      ],
    },
    {
      sku: "nike-dunk-low-panda",
      nombre: "Nike Dunk Low Retro Panda",
      descripcion:
        "Clásico diseño bicolor blanco y negro en cuero liso, con cuello acolchado de perfil bajo y suela de goma.",
      precioVenta: 129999,
      costoCompra: 74000,
      garantia: "6 meses",
      imagen: "/productos/nike-dunk-low-panda.jpg",
      categoria: "hombres",
      marca: "nike",
      etiquetas: ["urban", "basquet"],
      variantes: [
        { talle: "40", color: "Blanco/Negro", material: "Cuero", stockActual: 11 },
        { talle: "41", color: "Blanco/Negro", material: "Cuero", stockActual: 9 },
        { talle: "42", color: "Blanco/Negro", material: "Cuero", stockActual: 0 },
        { talle: "43", color: "Blanco/Negro", material: "Cuero", stockActual: 7 },
        { talle: "40", color: "Rojo/Blanco", material: "Cuero", stockActual: 6 },
        { talle: "41", color: "Rojo/Blanco", material: "Cuero", stockActual: 0 },
        { talle: "42", color: "Rojo/Blanco", material: "Cuero", stockActual: 8 },
        { talle: "43", color: "Rojo/Blanco", material: "Cuero", stockActual: 4 },
        { talle: "41", color: "Gris/Blanco", material: "Cuero", stockActual: 0 },
      ],
    },
    {
      sku: "puma-suede-classic-roja",
      nombre: "Puma Suede Classic XXI",
      descripcion:
        "Capellada de gamuza suave con franja Formstrip blanca y suela de caucho antideslizante.",
      precioVenta: 84999,
      costoCompra: 46000,
      garantia: "6 meses",
      imagen: "/productos/puma-suede-roja.jpg",
      categoria: "mujeres",
      marca: "puma",
      etiquetas: ["urban", "caminata"],
      variantes: [
        { talle: "36", color: "Rojo/Blanco", material: "Gamuza", stockActual: 6 },
        { talle: "37", color: "Rojo/Blanco", material: "Gamuza", stockActual: 8 },
        { talle: "38", color: "Rojo/Blanco", material: "Gamuza", stockActual: 0 },
        { talle: "39", color: "Rojo/Blanco", material: "Gamuza", stockActual: 5 },
        { talle: "36", color: "Negro/Blanco", material: "Gamuza", stockActual: 0 },
        { talle: "37", color: "Negro/Blanco", material: "Gamuza", stockActual: 7 },
        { talle: "38", color: "Negro/Blanco", material: "Gamuza", stockActual: 6 },
        { talle: "39", color: "Negro/Blanco", material: "Gamuza", stockActual: 4 },
        { talle: "37", color: "Azul/Blanco", material: "Gamuza", stockActual: 0 },
      ],
    },
    {
      sku: "new-balance-550-verde",
      nombre: "New Balance 550 Heritage",
      descripcion:
        "Inspirada en el básquet de los años 80, confeccionada en cuero perforado blanco con detalles en verde bosque.",
      precioVenta: 134999,
      costoCompra: 78000,
      garantia: "6 meses",
      imagen: "/productos/new-balance-550-verde.jpg",
      categoria: "hombres",
      marca: "new-balance",
      etiquetas: ["urban", "basquet"],
      variantes: [
        { talle: "40", color: "Blanco/Verde", material: "Cuero", stockActual: 5 },
        { talle: "41", color: "Blanco/Verde", material: "Cuero", stockActual: 8 },
        { talle: "42", color: "Blanco/Verde", material: "Cuero", stockActual: 6 },
        { talle: "43", color: "Blanco/Verde", material: "Cuero", stockActual: 0 },
        { talle: "40", color: "Blanco/Azul", material: "Cuero", stockActual: 7 },
        { talle: "41", color: "Blanco/Azul", material: "Cuero", stockActual: 0 },
        { talle: "42", color: "Blanco/Azul", material: "Cuero", stockActual: 5 },
        { talle: "43", color: "Blanco/Azul", material: "Cuero", stockActual: 4 },
        { talle: "41", color: "Blanco/Gris", material: "Cuero", stockActual: 0 },
      ],
    },
    {
      sku: "nike-air-max-90-negra",
      nombre: "Nike Air Max 90 Essential",
      descripcion:
        "Amortiguación Air visible en el talón, capellada combinada en mesh respirable y refuerzos sintéticos.",
      precioVenta: 139999,
      costoCompra: 82000,
      garantia: "6 meses",
      imagen: "/productos/nike-air-max-90-negra.jpg",
      categoria: "deportivas",
      marca: "nike",
      etiquetas: ["running", "training", "caminata"],
      variantes: [
        { talle: "39", color: "Negro", material: "Mesh", stockActual: 9 },
        { talle: "40", color: "Negro", material: "Mesh", stockActual: 14 },
        { talle: "41", color: "Negro", material: "Mesh", stockActual: 0 },
        { talle: "42", color: "Negro", material: "Mesh", stockActual: 5 },
        { talle: "39", color: "Blanco/Gris", material: "Mesh", stockActual: 6 },
        { talle: "40", color: "Blanco/Gris", material: "Mesh", stockActual: 0 },
        { talle: "41", color: "Blanco/Gris", material: "Mesh", stockActual: 8 },
        { talle: "42", color: "Blanco/Gris", material: "Mesh", stockActual: 7 },
        { talle: "40", color: "Rojo/Negro", material: "Mesh", stockActual: 0 },
      ],
    },
    {
      sku: "SNK-DEP-001",
      nombre: "On Cloudmonster 3 Running",
      descripcion: "Zapatilla de máximo retorno de energía con tecnología CloudTec para running diario.",
      precioVenta: 149999,
      costoCompra: 88000,
      garantia: "6 meses",
      imagen: "/productos/zapatilla-deportiva-cloud.png",
      categoria: "deportivas",
      marca: "on-running",
      etiquetas: ["running", "caminata"],
      variantes: [
        { talle: "40", color: "Gris/Naranja", material: "Mesh", stockActual: 12 },
        { talle: "42", color: "Gris/Naranja", material: "Mesh", stockActual: 8 },
        // 10 unidades exactas: dispara el aviso de RN-09.
        { talle: "43", color: "Gris/Naranja", material: "Mesh", stockActual: 10 },
        { talle: "44", color: "Gris/Naranja", material: "Mesh", stockActual: 0 },
        { talle: "40", color: "Gris/Azul", material: "Mesh", stockActual: 7 },
        { talle: "42", color: "Gris/Azul", material: "Mesh", stockActual: 0 },
        { talle: "43", color: "Gris/Azul", material: "Mesh", stockActual: 6 },
        { talle: "44", color: "Gris/Azul", material: "Mesh", stockActual: 5 },
        { talle: "42", color: "Negro", material: "Mesh", stockActual: 0 },
      ],
    },
    {
      sku: "topper-trekking-negra",
      nombre: "Topper Tierra Trail",
      descripcion: "Calzado resistente todo terreno con suela de alto agarre y puntera reforzada.",
      precioVenta: 76999,
      costoCompra: 42000,
      garantia: "6 meses",
      imagen: "/productos/zapatilla-urbana-corte-alto.png",
      categoria: "deportivas",
      marca: "topper",
      etiquetas: ["caminata", "training"],
      variantes: [
        { talle: "39", color: "Negro", material: "Cuero", stockActual: 0 },
        { talle: "41", color: "Negro", material: "Cuero", stockActual: 0 },
      ],
    },
    {
      sku: "SNK-KID-001",
      nombre: "Kross Junior Velcro Sport",
      descripcion: "Zapatilla infantil liviana con abrojo regulable y cordones elásticos para uso escolar y deportivo.",
      precioVenta: 54999,
      costoCompra: 29000,
      garantia: "6 meses",
      imagen: "/productos/zapatilla-ninos-velcro.jpg",
      categoria: "niños",
      marca: "kross",
      etiquetas: ["caminata", "running", "futbol"],
      variantes: [
        { talle: "28", color: "Blanco/Azul/Rojo", material: "Mesh", stockActual: 10 },
        { talle: "30", color: "Blanco/Azul/Rojo", material: "Mesh", stockActual: 12 },
        { talle: "32", color: "Blanco/Azul/Rojo", material: "Mesh", stockActual: 0 },
        { talle: "34", color: "Blanco/Azul/Rojo", material: "Mesh", stockActual: 6 },
        { talle: "28", color: "Rosa/Blanco", material: "Mesh", stockActual: 8 },
        { talle: "30", color: "Rosa/Blanco", material: "Mesh", stockActual: 0 },
        { talle: "32", color: "Rosa/Blanco", material: "Mesh", stockActual: 9 },
        { talle: "34", color: "Rosa/Blanco", material: "Mesh", stockActual: 5 },
        { talle: "30", color: "Negro/Rojo", material: "Mesh", stockActual: 0 },
      ],
    },
    {
      sku: "SNK-ACC-001",
      nombre: "Medias Deportivas Pack x3",
      descripcion: "Pack de 3 pares de medias de algodón peinado con refuerzo en talón y puntera.",
      precioVenta: 14999,
      costoCompra: 5200,
      garantia: null,
      imagen: "/productos/medias-deportivas-blancas.jpg",
      categoria: "medias",
      marca: "kross",
      etiquetas: ["running", "training"],
      variantes: [
        { talle: "35-38", color: "Blanco", material: "Algodon", stockActual: 40 },
        { talle: "39-42", color: "Blanco", material: "Algodon", stockActual: 25 },
        { talle: "43-45", color: "Blanco", material: "Algodon", stockActual: 18 },
      ],
    },
    {
      sku: "SNK-ACC-002",
      nombre: "Cordones Planos Sneaker Pack x3",
      descripcion: "Pack de 3 pares de cordones planos de algodón trenzado en blanco, rojo y negro.",
      precioVenta: 7999,
      costoCompra: 2400,
      garantia: null,
      imagen: "/productos/medias-deportivas-pack.png",
      categoria: "accesorios",
      marca: "kross",
      etiquetas: ["urban", "caminata"],
      variantes: [
        { talle: "100cm", color: "Blanco/Rojo/Negro", material: "Algodon", stockActual: 35 },
        { talle: "120cm", color: "Blanco/Rojo/Negro", material: "Algodon", stockActual: 20 },
        { talle: "140cm", color: "Blanco/Rojo/Negro", material: "Algodon", stockActual: 22 },
      ],
    },
    {
      sku: "vans-old-skool-negra",
      nombre: "Vans Old Skool Classic",
      descripcion:
        "Clásica zapatilla de skate en lona y gamuza resistente con la icónica banda lateral Sidestripe y suela waffle.",
      precioVenta: 92999,
      costoCompra: 51000,
      garantia: "6 meses",
      imagen: "/productos/vans-old-skool-negra.jpg",
      categoria: "urbanas",
      marca: "vans",
      etiquetas: ["skate", "urban"],
      variantes: [
        { talle: "38", color: "Negro/Blanco", material: "Lona", stockActual: 10 },
        { talle: "39", color: "Negro/Blanco", material: "Lona", stockActual: 14 },
        { talle: "40", color: "Negro/Blanco", material: "Lona", stockActual: 9 },
        { talle: "41", color: "Negro/Blanco", material: "Lona", stockActual: 0 },
        { talle: "42", color: "Negro/Blanco", material: "Lona", stockActual: 5 },
        { talle: "38", color: "Bordo/Blanco", material: "Gamuza", stockActual: 6 },
        { talle: "39", color: "Bordo/Blanco", material: "Gamuza", stockActual: 0 },
        { talle: "40", color: "Bordo/Blanco", material: "Gamuza", stockActual: 8 },
        { talle: "41", color: "Bordo/Blanco", material: "Gamuza", stockActual: 7 },
        { talle: "42", color: "Bordo/Blanco", material: "Gamuza", stockActual: 4 },
        { talle: "40", color: "Azul Marino", material: "Lona", stockActual: 0 },
      ],
    },
    {
      sku: "converse-chuck-taylor-high",
      nombre: "Converse Chuck Taylor All Star Hi",
      descripcion:
        "Bota clásica de lona con puntera de goma reforzada, ojales metálicos y suela vulcanizada de estilo atemporal.",
      precioVenta: 87999,
      costoCompra: 48000,
      garantia: "6 meses",
      imagen: "/productos/converse-chuck-taylor-high.jpg",
      categoria: "urbanas",
      marca: "converse",
      etiquetas: ["urban", "caminata"],
      variantes: [
        { talle: "36", color: "Negro/Blanco", material: "Lona", stockActual: 8 },
        { talle: "37", color: "Negro/Blanco", material: "Lona", stockActual: 11 },
        { talle: "38", color: "Negro/Blanco", material: "Lona", stockActual: 13 },
        { talle: "40", color: "Negro/Blanco", material: "Lona", stockActual: 0 },
        { talle: "41", color: "Negro/Blanco", material: "Lona", stockActual: 7 },
        { talle: "36", color: "Rojo/Blanco", material: "Lona", stockActual: 5 },
        { talle: "37", color: "Rojo/Blanco", material: "Lona", stockActual: 0 },
        { talle: "38", color: "Rojo/Blanco", material: "Lona", stockActual: 9 },
        { talle: "40", color: "Rojo/Blanco", material: "Lona", stockActual: 6 },
        { talle: "41", color: "Rojo/Blanco", material: "Lona", stockActual: 4 },
        { talle: "38", color: "Blanco", material: "Lona", stockActual: 0 },
      ],
    },
    {
      sku: "asics-gel-nimbus-26",
      nombre: "Asics Gel-Nimbus 26",
      descripcion:
        "Zapatilla de running de máxima amortiguación con espuma FF Blast Plus Eco y tecnología PureGEL en el talón.",
      precioVenta: 164999,
      costoCompra: 96000,
      garantia: "6 meses",
      imagen: "/productos/asics-gel-nimbus-azul.jpg",
      categoria: "deportivas",
      marca: "asics",
      etiquetas: ["running", "training"],
      variantes: [
        { talle: "39", color: "Azul/Celeste", material: "Mesh", stockActual: 6 },
        { talle: "40", color: "Azul/Celeste", material: "Mesh", stockActual: 10 },
        { talle: "41", color: "Azul/Celeste", material: "Mesh", stockActual: 0 },
        { talle: "42", color: "Azul/Celeste", material: "Mesh", stockActual: 7 },
        { talle: "43", color: "Azul/Celeste", material: "Mesh", stockActual: 3 },
        { talle: "39", color: "Negro/Lima", material: "Mesh", stockActual: 5 },
        { talle: "40", color: "Negro/Lima", material: "Mesh", stockActual: 0 },
        { talle: "41", color: "Negro/Lima", material: "Mesh", stockActual: 8 },
        { talle: "42", color: "Negro/Lima", material: "Mesh", stockActual: 6 },
        { talle: "43", color: "Negro/Lima", material: "Mesh", stockActual: 4 },
        { talle: "41", color: "Blanco/Plata", material: "Mesh", stockActual: 0 },
      ],
    },
    {
      sku: "reebok-club-c-85-vintage",
      nombre: "Reebok Club C 85 Vintage",
      descripcion:
        "Zapatilla retro inspirada en el tenis de los años 80, confeccionada en cuero suave color crema con suela gum.",
      precioVenta: 96999,
      costoCompra: 54000,
      garantia: "6 meses",
      imagen: "/productos/reebok-club-c-vintage.jpg",
      categoria: "mujeres",
      marca: "reebok",
      etiquetas: ["urban", "caminata"],
      variantes: [
        { talle: "35", color: "Crema/Verde", material: "Cuero", stockActual: 6 },
        { talle: "36", color: "Crema/Verde", material: "Cuero", stockActual: 11 },
        { talle: "37", color: "Crema/Verde", material: "Cuero", stockActual: 0 },
        { talle: "38", color: "Crema/Verde", material: "Cuero", stockActual: 8 },
        { talle: "39", color: "Crema/Verde", material: "Cuero", stockActual: 5 },
        { talle: "35", color: "Crema/Rosa", material: "Cuero", stockActual: 0 },
        { talle: "36", color: "Crema/Rosa", material: "Cuero", stockActual: 7 },
        { talle: "37", color: "Crema/Rosa", material: "Cuero", stockActual: 9 },
        { talle: "38", color: "Crema/Rosa", material: "Cuero", stockActual: 6 },
        { talle: "39", color: "Crema/Rosa", material: "Cuero", stockActual: 4 },
        { talle: "37", color: "Crema/Azul", material: "Cuero", stockActual: 0 },
      ],
    },
    {
      sku: "adidas-superstar-kids",
      nombre: "Adidas Superstar Kids",
      descripcion:
        "Versión infantil del ícono urbano con puntera shell-toe de goma, capellada de cuero y plantilla cómoda.",
      precioVenta: 74999,
      costoCompra: 41000,
      garantia: "6 meses",
      imagen: "/productos/adidas-superstar-ninos.jpg",
      categoria: "niños",
      marca: "adidas",
      etiquetas: ["urban", "caminata"],
      variantes: [
        { talle: "27", color: "Blanco/Negro", material: "Cuero", stockActual: 9 },
        { talle: "29", color: "Blanco/Negro", material: "Cuero", stockActual: 12 },
        { talle: "31", color: "Blanco/Negro", material: "Cuero", stockActual: 0 },
        { talle: "33", color: "Blanco/Negro", material: "Cuero", stockActual: 7 },
        { talle: "27", color: "Blanco/Rosa", material: "Cuero", stockActual: 8 },
        { talle: "29", color: "Blanco/Rosa", material: "Cuero", stockActual: 0 },
        { talle: "31", color: "Blanco/Rosa", material: "Cuero", stockActual: 10 },
        { talle: "33", color: "Blanco/Rosa", material: "Cuero", stockActual: 7 },
        { talle: "27", color: "Blanco/Azul", material: "Cuero", stockActual: 0 },
        { talle: "29", color: "Blanco/Azul", material: "Cuero", stockActual: 6 },
        { talle: "31", color: "Blanco/Azul", material: "Cuero", stockActual: 8 },
        { talle: "33", color: "Blanco/Azul", material: "Cuero", stockActual: 5 },
        { talle: "29", color: "Negro", material: "Cuero", stockActual: 0 },
        { talle: "31", color: "Negro", material: "Cuero", stockActual: 0 },
      ],
    },
    {
      sku: "puma-rsx-efekt-gris",
      nombre: "Puma RS-X Efekt",
      descripcion:
        "Silueta chunky con diseño futurista, superposiciones de gamuza y mesh y entresuela esculpida de gran confort.",
      precioVenta: 124999,
      costoCompra: 71000,
      garantia: "6 meses",
      imagen: "/productos/puma-rsx-gris-negro.jpg",
      categoria: "hombres",
      marca: "puma",
      etiquetas: ["urban", "caminata"],
      variantes: [
        { talle: "40", color: "Gris/Negro/Azul", material: "Mesh", stockActual: 8 },
        { talle: "41", color: "Gris/Negro/Azul", material: "Mesh", stockActual: 10 },
        { talle: "42", color: "Gris/Negro/Azul", material: "Mesh", stockActual: 0 },
        { talle: "43", color: "Gris/Negro/Azul", material: "Mesh", stockActual: 5 },
        { talle: "44", color: "Gris/Negro/Azul", material: "Mesh", stockActual: 4 },
        { talle: "40", color: "Gris/Rojo", material: "Mesh", stockActual: 6 },
        { talle: "41", color: "Gris/Rojo", material: "Mesh", stockActual: 0 },
        { talle: "42", color: "Gris/Rojo", material: "Mesh", stockActual: 7 },
        { talle: "43", color: "Gris/Rojo", material: "Mesh", stockActual: 5 },
        { talle: "44", color: "Gris/Rojo", material: "Mesh", stockActual: 3 },
        { talle: "42", color: "Negro", material: "Mesh", stockActual: 0 },
      ],
    },
    {
      sku: "salomon-xt6-trail",
      nombre: "Salomon XT-6 Trail",
      descripcion:
        "Zapatilla técnica de trail running con chasis ACS, sistema de ajuste Quicklace y suela Contagrip de alto agarre.",
      precioVenta: 179999,
      costoCompra: 105000,
      garantia: "6 meses",
      imagen: "/productos/salomon-xt6-trail.jpg",
      categoria: "deportivas",
      marca: "salomon",
      etiquetas: ["running", "caminata"],
      variantes: [
        { talle: "39", color: "Oliva/Gris", material: "Mesh", stockActual: 5 },
        { talle: "40", color: "Oliva/Gris", material: "Mesh", stockActual: 8 },
        { talle: "41", color: "Oliva/Gris", material: "Mesh", stockActual: 0 },
        { talle: "42", color: "Oliva/Gris", material: "Mesh", stockActual: 7 },
        { talle: "43", color: "Oliva/Gris", material: "Mesh", stockActual: 4 },
        { talle: "39", color: "Negro/Plata", material: "Mesh", stockActual: 0 },
        { talle: "40", color: "Negro/Plata", material: "Mesh", stockActual: 6 },
        { talle: "41", color: "Negro/Plata", material: "Mesh", stockActual: 8 },
        { talle: "42", color: "Negro/Plata", material: "Mesh", stockActual: 5 },
        { talle: "43", color: "Negro/Plata", material: "Mesh", stockActual: 4 },
        { talle: "41", color: "Arena", material: "Mesh", stockActual: 0 },
      ],
    },
    {
      sku: "fila-disruptor-ii",
      nombre: "Fila Disruptor II",
      descripcion:
        "Zapatilla chunky de cuero sintético blanco con entresuela elevada y clásica suela dentada de goma.",
      precioVenta: 89999,
      costoCompra: 49000,
      garantia: "6 meses",
      imagen: "/productos/fila-disruptor-blanca.jpg",
      categoria: "mujeres",
      marca: "fila",
      etiquetas: ["urban", "caminata"],
      variantes: [
        { talle: "35", color: "Blanco", material: "Cuero", stockActual: 7 },
        { talle: "36", color: "Blanco", material: "Cuero", stockActual: 12 },
        { talle: "37", color: "Blanco", material: "Cuero", stockActual: 10 },
        { talle: "38", color: "Blanco", material: "Cuero", stockActual: 0 },
        { talle: "39", color: "Blanco", material: "Cuero", stockActual: 5 },
        { talle: "35", color: "Rosa Pastel", material: "Cuero", stockActual: 6 },
        { talle: "36", color: "Rosa Pastel", material: "Cuero", stockActual: 8 },
        { talle: "37", color: "Rosa Pastel", material: "Cuero", stockActual: 0 },
        { talle: "38", color: "Rosa Pastel", material: "Cuero", stockActual: 7 },
        { talle: "39", color: "Rosa Pastel", material: "Cuero", stockActual: 4 },
        { talle: "37", color: "Negro", material: "Cuero", stockActual: 0 },
      ],
    },
    {
      sku: "nike-pegasus-40-running",
      nombre: "Nike Pegasus 40 Running",
      descripcion:
        "Zapatilla de running de respuesta reactiva con doble unidad Zoom Air, espuma Nike React y capellada de mesh técnico respirable.",
      precioVenta: 145000,
      costoCompra: 84000,
      garantia: "6 meses",
      imagen: "/productos/nike-pegasus-40-running.jpg",
      categoria: "deportivas",
      marca: "nike",
      etiquetas: ["running", "training", "caminata"],
      variantes: [
        { talle: "39", color: "Azul Marino/Naranja", material: "Mesh", stockActual: 8 },
        { talle: "40", color: "Azul Marino/Naranja", material: "Mesh", stockActual: 12 },
        { talle: "41", color: "Azul Marino/Naranja", material: "Mesh", stockActual: 10 },
        { talle: "42", color: "Azul Marino/Naranja", material: "Mesh", stockActual: 0 },
        { talle: "43", color: "Azul Marino/Naranja", material: "Mesh", stockActual: 5 },
        { talle: "44", color: "Azul Marino/Naranja", material: "Mesh", stockActual: 4 },
        { talle: "39", color: "Verde/Lima", material: "Mesh", stockActual: 6 },
        { talle: "40", color: "Verde/Lima", material: "Mesh", stockActual: 9 },
        { talle: "41", color: "Verde/Lima", material: "Mesh", stockActual: 0 },
        { talle: "42", color: "Verde/Lima", material: "Mesh", stockActual: 7 },
        { talle: "43", color: "Verde/Lima", material: "Mesh", stockActual: 5 },
        { talle: "44", color: "Verde/Lima", material: "Mesh", stockActual: 3 },
        { talle: "41", color: "Negro/Blanco", material: "Mesh", stockActual: 0 },
      ],
    },
    {
      sku: "adidas-samba-clasica",
      nombre: "Adidas Samba OG Clásica",
      descripcion:
        "Ícono histórico nacido en las canchas e inmortalizado en la calle, con capellada de cuero suave, puntera en T de gamuza y suela color caramelo.",
      precioVenta: 115000,
      costoCompra: 65000,
      garantia: "6 meses",
      imagen: "/productos/adidas-samba-clasica.jpg",
      categoria: "urbanas",
      marca: "adidas",
      etiquetas: ["urban", "futbol", "caminata"],
      variantes: [
        { talle: "38", color: "Negro/Blanco", material: "Cuero", stockActual: 9 },
        { talle: "39", color: "Negro/Blanco", material: "Cuero", stockActual: 14 },
        { talle: "40", color: "Negro/Blanco", material: "Cuero", stockActual: 11 },
        { talle: "41", color: "Negro/Blanco", material: "Cuero", stockActual: 0 },
        { talle: "42", color: "Negro/Blanco", material: "Cuero", stockActual: 6 },
        { talle: "43", color: "Negro/Blanco", material: "Cuero", stockActual: 4 },
        { talle: "38", color: "Blanco/Negro", material: "Cuero", stockActual: 8 },
        { talle: "39", color: "Blanco/Negro", material: "Cuero", stockActual: 10 },
        { talle: "40", color: "Blanco/Negro", material: "Cuero", stockActual: 0 },
        { talle: "41", color: "Blanco/Negro", material: "Cuero", stockActual: 7 },
        { talle: "42", color: "Blanco/Negro", material: "Cuero", stockActual: 5 },
        { talle: "43", color: "Blanco/Negro", material: "Cuero", stockActual: 4 },
        { talle: "40", color: "Bordo/Blanco", material: "Cuero", stockActual: 0 },
      ],
    },
    {
      sku: "vans-authentic-roja",
      nombre: "Vans Authentic Roja",
      descripcion:
        "Silueta original de perfil bajo de 1966 confeccionada en lona resistente roja, ojales metálicos y clásica suela waffle vulcanizada.",
      precioVenta: 80000,
      costoCompra: 44000,
      garantia: "6 meses",
      imagen: "/productos/vans-authentic-roja.jpg",
      categoria: "urbanas",
      marca: "vans",
      etiquetas: ["skate", "urban", "caminata"],
      variantes: [
        { talle: "36", color: "Rojo/Blanco", material: "Lona", stockActual: 7 },
        { talle: "37", color: "Rojo/Blanco", material: "Lona", stockActual: 10 },
        { talle: "38", color: "Rojo/Blanco", material: "Lona", stockActual: 12 },
        { talle: "39", color: "Rojo/Blanco", material: "Lona", stockActual: 0 },
        { talle: "40", color: "Rojo/Blanco", material: "Lona", stockActual: 8 },
        { talle: "41", color: "Rojo/Blanco", material: "Lona", stockActual: 5 },
        { talle: "36", color: "Negro/Blanco", material: "Lona", stockActual: 6 },
        { talle: "37", color: "Negro/Blanco", material: "Lona", stockActual: 0 },
        { talle: "38", color: "Negro/Blanco", material: "Lona", stockActual: 9 },
        { talle: "39", color: "Negro/Blanco", material: "Lona", stockActual: 8 },
        { talle: "40", color: "Negro/Blanco", material: "Lona", stockActual: 7 },
        { talle: "41", color: "Negro/Blanco", material: "Lona", stockActual: 4 },
        { talle: "39", color: "Azul/Blanco", material: "Lona", stockActual: 0 },
      ],
    },
    {
      sku: "new-balance-327",
      nombre: "New Balance 327",
      descripcion:
        "Diseño retro-moderno inspirado en el running de los años 70, con capellada combinada en gamuza y nylon, logo N sobredimensionado y suela dentada envolvente.",
      precioVenta: 130000,
      costoCompra: 74000,
      garantia: "6 meses",
      imagen: "/productos/new-balance-327.jpg",
      categoria: "urbanas",
      marca: "new-balance",
      etiquetas: ["urban", "caminata"],
      variantes: [
        { talle: "37", color: "Beige/Verde Oliva", material: "Gamuza", stockActual: 6 },
        { talle: "38", color: "Beige/Verde Oliva", material: "Gamuza", stockActual: 9 },
        { talle: "39", color: "Beige/Verde Oliva", material: "Gamuza", stockActual: 11 },
        { talle: "40", color: "Beige/Verde Oliva", material: "Gamuza", stockActual: 0 },
        { talle: "41", color: "Beige/Verde Oliva", material: "Gamuza", stockActual: 7 },
        { talle: "42", color: "Beige/Verde Oliva", material: "Gamuza", stockActual: 5 },
        { talle: "37", color: "Gris/Blanco", material: "Gamuza", stockActual: 5 },
        { talle: "38", color: "Gris/Blanco", material: "Gamuza", stockActual: 0 },
        { talle: "39", color: "Gris/Blanco", material: "Gamuza", stockActual: 8 },
        { talle: "40", color: "Gris/Blanco", material: "Gamuza", stockActual: 9 },
        { talle: "41", color: "Gris/Blanco", material: "Gamuza", stockActual: 6 },
        { talle: "42", color: "Gris/Blanco", material: "Gamuza", stockActual: 4 },
        { talle: "40", color: "Negro/Blanco", material: "Gamuza", stockActual: 0 },
      ],
    },
    {
      sku: "olympikus-corre-3",
      nombre: "Olympikus Corre 3",
      descripcion:
        "Zapatilla de alto rendimiento desarrollada con entresuela Eleva Pro, suela con caucho Gripper antideslizante y capellada ultraliviana Oxitec.",
      precioVenta: 85000,
      costoCompra: 47000,
      garantia: "6 meses",
      imagen: "/productos/olympikus-corre-3.jpg",
      categoria: "deportivas",
      marca: "olympikus",
      etiquetas: ["running", "training", "caminata"],
      variantes: [
        { talle: "38", color: "Lima/Verde", material: "Mesh", stockActual: 8 },
        { talle: "39", color: "Lima/Verde", material: "Mesh", stockActual: 10 },
        { talle: "40", color: "Lima/Verde", material: "Mesh", stockActual: 13 },
        { talle: "41", color: "Lima/Verde", material: "Mesh", stockActual: 0 },
        { talle: "42", color: "Lima/Verde", material: "Mesh", stockActual: 6 },
        { talle: "43", color: "Lima/Verde", material: "Mesh", stockActual: 5 },
        { talle: "38", color: "Azul/Celeste", material: "Mesh", stockActual: 7 },
        { talle: "39", color: "Azul/Celeste", material: "Mesh", stockActual: 0 },
        { talle: "40", color: "Azul/Celeste", material: "Mesh", stockActual: 9 },
        { talle: "41", color: "Azul/Celeste", material: "Mesh", stockActual: 8 },
        { talle: "42", color: "Azul/Celeste", material: "Mesh", stockActual: 5 },
        { talle: "43", color: "Azul/Celeste", material: "Mesh", stockActual: 4 },
        { talle: "40", color: "Naranja/Negro", material: "Mesh", stockActual: 0 },
      ],
    },
    {
      sku: "fila-teratach-basquet",
      nombre: "Fila Teratach 600 Básquet",
      descripcion:
        "Bota clásica de básquet de fines de los 80 en cuero blanco con cuello acolchado de caña media-alta y detalles en rojo y azul marino.",
      precioVenta: 110000,
      costoCompra: 62000,
      garantia: "6 meses",
      imagen: "/productos/fila-teratach-basquet.jpg",
      categoria: "hombres",
      marca: "fila",
      etiquetas: ["basquet", "urban"],
      variantes: [
        { talle: "40", color: "Blanco/Rojo/Azul", material: "Cuero", stockActual: 7 },
        { talle: "41", color: "Blanco/Rojo/Azul", material: "Cuero", stockActual: 10 },
        { talle: "42", color: "Blanco/Rojo/Azul", material: "Cuero", stockActual: 8 },
        { talle: "43", color: "Blanco/Rojo/Azul", material: "Cuero", stockActual: 0 },
        { talle: "44", color: "Blanco/Rojo/Azul", material: "Cuero", stockActual: 4 },
        { talle: "40", color: "Blanco/Verde", material: "Cuero", stockActual: 6 },
        { talle: "41", color: "Blanco/Verde", material: "Cuero", stockActual: 0 },
        { talle: "42", color: "Blanco/Verde", material: "Cuero", stockActual: 7 },
        { talle: "43", color: "Blanco/Verde", material: "Cuero", stockActual: 5 },
        { talle: "44", color: "Blanco/Verde", material: "Cuero", stockActual: 3 },
        { talle: "42", color: "Blanco/Negro", material: "Cuero", stockActual: 0 },
      ],
    },
    {
      sku: "nike-jordan-1-low-bred",
      nombre: "Nike Air Jordan 1 Low Bred Toe",
      descripcion:
        "Silueta legendaria inspirada en el modelo original de 1985, confeccionada en cuero genuino rojo, blanco y negro con unidad Air-Sole encapsulada.",
      precioVenta: 155000,
      costoCompra: 89000,
      garantia: "6 meses",
      imagen: "/productos/jordan-1-low-bred-toe.jpg",
      categoria: "hombres",
      marca: "nike",
      etiquetas: ["basquet", "urban"],
      variantes: [
        { talle: "39", color: "Rojo/Blanco/Negro", material: "Cuero", stockActual: 7 },
        { talle: "40", color: "Rojo/Blanco/Negro", material: "Cuero", stockActual: 11 },
        { talle: "41", color: "Rojo/Blanco/Negro", material: "Cuero", stockActual: 9 },
        { talle: "42", color: "Rojo/Blanco/Negro", material: "Cuero", stockActual: 0 },
        { talle: "43", color: "Rojo/Blanco/Negro", material: "Cuero", stockActual: 5 },
        { talle: "44", color: "Rojo/Blanco/Negro", material: "Cuero", stockActual: 3 },
        { talle: "39", color: "Azul/Blanco/Negro", material: "Cuero", stockActual: 5 },
        { talle: "40", color: "Azul/Blanco/Negro", material: "Cuero", stockActual: 8 },
        { talle: "41", color: "Azul/Blanco/Negro", material: "Cuero", stockActual: 0 },
        { talle: "42", color: "Azul/Blanco/Negro", material: "Cuero", stockActual: 7 },
        { talle: "43", color: "Azul/Blanco/Negro", material: "Cuero", stockActual: 6 },
        { talle: "44", color: "Azul/Blanco/Negro", material: "Cuero", stockActual: 4 },
        { talle: "41", color: "Gris/Negro", material: "Cuero", stockActual: 0 },
      ],
    },
    {
      sku: "adidas-gazelle-indoor-rosa",
      nombre: "Adidas Gazelle Indoor Rosa",
      descripcion:
        "Edición clásica en gamuza suave color rosa pastel con las tres tiras dentadas blancas y suela traslúcida de caucho color caramelo.",
      precioVenta: 118000,
      costoCompra: 66000,
      garantia: "6 meses",
      imagen: "/productos/adidas-gazelle-rosa.jpg",
      categoria: "mujeres",
      marca: "adidas",
      etiquetas: ["urban", "caminata"],
      variantes: [
        { talle: "35", color: "Rosa/Blanco", material: "Gamuza", stockActual: 8 },
        { talle: "36", color: "Rosa/Blanco", material: "Gamuza", stockActual: 13 },
        { talle: "37", color: "Rosa/Blanco", material: "Gamuza", stockActual: 10 },
        { talle: "38", color: "Rosa/Blanco", material: "Gamuza", stockActual: 9 },
        { talle: "39", color: "Rosa/Blanco", material: "Gamuza", stockActual: 0 },
        { talle: "40", color: "Rosa/Blanco", material: "Gamuza", stockActual: 4 },
        { talle: "35", color: "Verde/Blanco", material: "Gamuza", stockActual: 6 },
        { talle: "36", color: "Verde/Blanco", material: "Gamuza", stockActual: 8 },
        { talle: "37", color: "Verde/Blanco", material: "Gamuza", stockActual: 0 },
        { talle: "38", color: "Verde/Blanco", material: "Gamuza", stockActual: 7 },
        { talle: "39", color: "Verde/Blanco", material: "Gamuza", stockActual: 6 },
        { talle: "40", color: "Verde/Blanco", material: "Gamuza", stockActual: 5 },
        { talle: "37", color: "Celeste/Blanco", material: "Gamuza", stockActual: 0 },
      ],
    },
    {
      sku: "adidas-drop-step-low",
      nombre: "Adidas Drop Step Low Tricolor",
      descripcion:
        "Diseño urbano con ADN de básquet retro, paneles combinados en cuero y gamuza con detalles en azul, amarillo y rojo.",
      precioVenta: 112000,
      costoCompra: 63000,
      garantia: "6 meses",
      imagen: "/productos/zapatilla-drop-step.png",
      categoria: "urbanas",
      marca: "adidas",
      etiquetas: ["basquet", "urban", "caminata"],
      variantes: [
        { talle: "39", color: "Blanco/Azul/Rojo", material: "Cuero", stockActual: 9 },
        { talle: "40", color: "Blanco/Azul/Rojo", material: "Cuero", stockActual: 12 },
        { talle: "41", color: "Blanco/Azul/Rojo", material: "Cuero", stockActual: 8 },
        { talle: "42", color: "Blanco/Azul/Rojo", material: "Cuero", stockActual: 0 },
        { talle: "43", color: "Blanco/Azul/Rojo", material: "Cuero", stockActual: 5 },
        { talle: "39", color: "Blanco/Verde/Naranja", material: "Cuero", stockActual: 6 },
        { talle: "40", color: "Blanco/Verde/Naranja", material: "Cuero", stockActual: 0 },
        { talle: "41", color: "Blanco/Verde/Naranja", material: "Cuero", stockActual: 7 },
        { talle: "42", color: "Blanco/Verde/Naranja", material: "Cuero", stockActual: 5 },
        { talle: "43", color: "Blanco/Verde/Naranja", material: "Cuero", stockActual: 4 },
        { talle: "41", color: "Negro", material: "Cuero", stockActual: 0 },
      ],
    },
    {
      sku: "adidas-adizero-sl-running",
      nombre: "Adidas Adizero SL Lightstrike",
      descripcion:
        "Zapatilla de entrenamiento y competencia ultraliviana equipada con espuma Lightstrike Pro en el antepié y mesh técnico de alta ventilación.",
      precioVenta: 142000,
      costoCompra: 81000,
      garantia: "6 meses",
      imagen: "/productos/zapatilla-urbana-adizero.png",
      categoria: "deportivas",
      marca: "adidas",
      etiquetas: ["running", "training"],
      variantes: [
        { talle: "38", color: "Blanco/Negro", material: "Mesh", stockActual: 7 },
        { talle: "39", color: "Blanco/Negro", material: "Mesh", stockActual: 10 },
        { talle: "40", color: "Blanco/Negro", material: "Mesh", stockActual: 14 },
        { talle: "41", color: "Blanco/Negro", material: "Mesh", stockActual: 0 },
        { talle: "42", color: "Blanco/Negro", material: "Mesh", stockActual: 6 },
        { talle: "38", color: "Negro/Blanco", material: "Mesh", stockActual: 5 },
        { talle: "39", color: "Negro/Blanco", material: "Mesh", stockActual: 0 },
        { talle: "40", color: "Negro/Blanco", material: "Mesh", stockActual: 8 },
        { talle: "41", color: "Negro/Blanco", material: "Mesh", stockActual: 7 },
        { talle: "42", color: "Negro/Blanco", material: "Mesh", stockActual: 4 },
        { talle: "40", color: "Lima", material: "Mesh", stockActual: 0 },
      ],
    },
    {
      sku: "puma-future-play-turf",
      nombre: "Puma Future Play TT Fútbol 5",
      descripcion:
        "Botín de fútbol para césped sintético con capellada texturizada de control, cuello elástico envolvente y suela multitaco de caucho de baja abrasión.",
      precioVenta: 105000,
      costoCompra: 58000,
      garantia: "6 meses",
      imagen: "/productos/puma-future-turf.jpg",
      categoria: "deportivas",
      marca: "puma",
      etiquetas: ["futbol", "training"],
      variantes: [
        { talle: "39", color: "Azul/Coral", material: "Sintetico", stockActual: 8 },
        { talle: "40", color: "Azul/Coral", material: "Sintetico", stockActual: 12 },
        { talle: "41", color: "Azul/Coral", material: "Sintetico", stockActual: 10 },
        { talle: "42", color: "Azul/Coral", material: "Sintetico", stockActual: 0 },
        { talle: "43", color: "Azul/Coral", material: "Sintetico", stockActual: 6 },
        { talle: "39", color: "Verde/Amarillo", material: "Sintetico", stockActual: 6 },
        { talle: "40", color: "Verde/Amarillo", material: "Sintetico", stockActual: 0 },
        { talle: "41", color: "Verde/Amarillo", material: "Sintetico", stockActual: 9 },
        { talle: "42", color: "Verde/Amarillo", material: "Sintetico", stockActual: 7 },
        { talle: "43", color: "Verde/Amarillo", material: "Sintetico", stockActual: 5 },
        { talle: "41", color: "Negro", material: "Sintetico", stockActual: 0 },
      ],
    },
    {
      sku: "new-balance-574-kids",
      nombre: "New Balance 574 Hook & Loop Kids",
      descripcion:
        "Clásico modelo infantil en gamuza y mesh respirable con doble cierre de abrojo reforzado y entresuela de EVA liviana.",
      precioVenta: 68000,
      costoCompra: 37000,
      garantia: "6 meses",
      imagen: "/productos/new-balance-574-kids.jpg",
      categoria: "niños",
      marca: "new-balance",
      etiquetas: ["caminata", "urban"],
      variantes: [
        { talle: "28", color: "Azul Marino/Gris", material: "Gamuza", stockActual: 9 },
        { talle: "29", color: "Azul Marino/Gris", material: "Gamuza", stockActual: 11 },
        { talle: "30", color: "Azul Marino/Gris", material: "Gamuza", stockActual: 10 },
        { talle: "31", color: "Azul Marino/Gris", material: "Gamuza", stockActual: 0 },
        { talle: "32", color: "Azul Marino/Gris", material: "Gamuza", stockActual: 6 },
        { talle: "33", color: "Azul Marino/Gris", material: "Gamuza", stockActual: 5 },
        { talle: "28", color: "Bordo/Gris", material: "Gamuza", stockActual: 7 },
        { talle: "29", color: "Bordo/Gris", material: "Gamuza", stockActual: 0 },
        { talle: "30", color: "Bordo/Gris", material: "Gamuza", stockActual: 8 },
        { talle: "31", color: "Bordo/Gris", material: "Gamuza", stockActual: 6 },
        { talle: "32", color: "Bordo/Gris", material: "Gamuza", stockActual: 5 },
        { talle: "33", color: "Bordo/Gris", material: "Gamuza", stockActual: 4 },
        { talle: "30", color: "Negro/Gris", material: "Gamuza", stockActual: 0 },
      ],
    },
    {
      sku: "medias-crew-tricolor-pack",
      nombre: "Medias Deportivas Crew Pack x3 Tricolor",
      descripcion:
        "Pack de 3 pares de medias caña alta en negro, gris melange y bordó con arco de compresión elástico y planta acolchada.",
      precioVenta: 16999,
      costoCompra: 6500,
      garantia: null,
      imagen: "/productos/medias-crew-negras-pack.jpg",
      categoria: "medias",
      marca: "kross",
      etiquetas: ["basquet", "urban", "training"],
      variantes: [
        { talle: "35-38", color: "Negro/Gris/Bordo", material: "Algodon", stockActual: 24 },
        { talle: "39-42", color: "Negro/Gris/Bordo", material: "Algodon", stockActual: 32 },
        { talle: "43-45", color: "Negro/Gris/Bordo", material: "Algodon", stockActual: 18 },
      ],
    },
    {
      sku: "medias-soquetes-invisibles-pack",
      nombre: "Soquetes Invisibles Running Pack x3",
      descripcion:
        "Pack de 3 pares de medias invisibles de corte bajo con lengüeta trasera antideslizante y tejido respirable de secado rápido.",
      precioVenta: 13499,
      costoCompra: 4900,
      garantia: null,
      imagen: "/productos/medias-soquetes-pack.jpg",
      categoria: "medias",
      marca: "kross",
      etiquetas: ["running", "caminata", "training"],
      variantes: [
        { talle: "35-38", color: "Blanco/Gris/Negro", material: "Algodon", stockActual: 28 },
        { talle: "39-42", color: "Blanco/Gris/Negro", material: "Algodon", stockActual: 35 },
        { talle: "43-45", color: "Blanco/Gris/Negro", material: "Algodon", stockActual: 20 },
      ],
    },
    {
      sku: "cordones-reflectivos-running-pack",
      nombre: "Cordones Redondos Reflectivos Pack x2",
      descripcion:
        "Pack de 2 pares de cordones tubulares de alta resistencia con hebras reflectivas 3M para entrenamiento nocturno y trail running.",
      precioVenta: 9499,
      costoCompra: 3100,
      garantia: null,
      imagen: "/productos/cordones-reflectivos-running.jpg",
      categoria: "accesorios",
      marca: "kross",
      etiquetas: ["running", "training"],
      variantes: [
        { talle: "120cm", color: "Verde Fluor/Negro", material: "Poliester", stockActual: 30 },
        { talle: "140cm", color: "Verde Fluor/Negro", material: "Poliester", stockActual: 22 },
      ],
    },
    {
      sku: "cordones-elasticos-lock-pack",
      nombre: "Cordones Elásticos Autoajustables Lock x2",
      descripcion:
        "Sistema de cordones elásticos sin nudos con tanca de bloqueo rápido, ideal para triatlón, running y calzado infantil.",
      precioVenta: 11999,
      costoCompra: 4200,
      garantia: null,
      imagen: "/productos/cordones-elasticos-lock.jpg",
      categoria: "accesorios",
      marca: "kross",
      etiquetas: ["running", "training", "caminata"],
      variantes: [
        { talle: "100cm", color: "Rojo/Negro", material: "Elastico", stockActual: 26 },
        { talle: "120cm", color: "Rojo/Negro", material: "Elastico", stockActual: 30 },
      ],
    },
    {
      sku: "plantillas-ortopedicas-gel-sport",
      nombre: "Plantillas Deportivas Gel Shock Absorber",
      descripcion:
        "Par de plantillas anatómicas recortables con cápsulas de gel de doble densidad en talón y metatarso para reducir el impacto articular.",
      precioVenta: 18999,
      costoCompra: 7400,
      garantia: "3 meses",
      imagen: "/productos/plantillas-gel-sport.jpg",
      categoria: "accesorios",
      marca: "kross",
      etiquetas: ["running", "basquet", "caminata", "training"],
      variantes: [
        { talle: "35-38", color: "Negro/Rojo/Azul", material: "Gel", stockActual: 18 },
        { talle: "39-42", color: "Negro/Rojo/Azul", material: "Gel", stockActual: 25 },
        { talle: "43-45", color: "Negro/Rojo/Azul", material: "Gel", stockActual: 16 },
      ],
    },
    {
      sku: "spray-protector-impermeable-gamuza",
      nombre: "Spray Impermeabilizante + Goma Gamuza",
      descripcion:
        "Combo protector hidrofugante en aerosol de 200 ml que repele agua y manchas sin alterar la respirabilidad, más borrador en seco para gamuza y nubuck.",
      precioVenta: 22499,
      costoCompra: 9200,
      garantia: null,
      imagen: "/productos/spray-protector-gamuza.jpg",
      categoria: "accesorios",
      marca: "kross",
      etiquetas: ["urban", "caminata"],
      variantes: [
        { talle: "200ml", color: "Incoloro", material: "Sintetico", stockActual: 22 },
      ],
    },
    {
      sku: "set-limpieza-sneaker-lab",
      nombre: "Set Limpieza Premium Cepillo + Espuma",
      descripcion:
        "Estuche de cuidado integral para zapatillas con espuma limpiadora biodegradable de 150 ml, cepillo de madera de cerdas suaves y paño de microfibra.",
      precioVenta: 26999,
      costoCompra: 11500,
      garantia: null,
      imagen: "/productos/kit-limpieza-sneaker.jpg",
      categoria: "accesorios",
      marca: "kross",
      etiquetas: ["urban", "caminata"],
      variantes: [
        { talle: "150ml", color: "Negro/Madera", material: "Sintetico", stockActual: 20 },
      ],
    },
  ];

  const creadas: { sku: string; id: string; variantes: { id: string; stock: number }[] }[] = [];

  for (const p of productos) {
    const producto = await prisma.producto.upsert({
      where: { sku: p.sku },
      update: {
        nombre: p.nombre,
        descripcion: p.descripcion,
        precioVenta: p.precioVenta,
        imagen: p.imagen,
        categoriaId: catPorSlug.get(p.categoria)!.id,
        marcaId: marcaPorSlug.get(p.marca)!.id,
      },
      create: {
        sku: p.sku,
        nombre: p.nombre,
        descripcion: p.descripcion,
        precioVenta: p.precioVenta,
        costoCompra: p.costoCompra,
        garantia: p.garantia,
        imagen: p.imagen,
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
        // Restauracion: si el stock difiere del valor de la semilla
        // (por corridas del arnes de pruebas o ajustes manuales) se
        // vuelve al valor semilla, con su movimiento de rastro (RN-07).
        if (existente.stockActual !== v.stockActual) {
          await prisma.varianteProducto.update({
            where: { id: existente.id },
            data: { stockActual: v.stockActual },
          });
          if (v.stockActual > 0) {
            await prisma.movimientoStock.create({
              data: {
                tipo: TipoMovimiento.INGRESO,
                cantidad: v.stockActual,
                justificacion: "Restauracion de semilla",
                varianteProductoId: existente.id,
                responsableId: (
                  await prisma.usuario.findUniqueOrThrow({ where: { correo: "admin@sneaker.test" } })
                ).id,
                stockResultante: v.stockActual,
              },
            });
          }
        }
        variantes.push({ id: existente.id, stock: v.stockActual });
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

  // ---------- Kits y Combos (RF-38, RF-39, RN-06) ----------
  // El stock de un kit NO se persiste: es el minimo del stock de sus
  // componentes, dividido por cuantas unidades de cada uno consume.
  const stockPorVariante = new Map(
    creadas.flatMap((p) => p.variantes.map((v) => [v.id, v.stock] as const)),
  );

  const kitsSemilla = [
    {
      sku: "SNK-KIT-001",
      nombre: "Kit Carrera: Zapatilla + Medias",
      descripcion:
        "Zapatilla de running On Cloudmonster con pack x3 de medias deportivas. El stock se calcula en tiempo real según sus componentes.",
      precioVenta: 149999,
      costoCompra: 88000,
      imagen: "/productos/kit-carrera.png",
      marca: "kross",
      componentes: [
        { sku: "SNK-DEP-001", indiceVariante: 0, cantidad: 1 },
        { sku: "SNK-ACC-001", indiceVariante: 0, cantidad: 1 },
      ],
    },
    {
      sku: "SNK-KIT-002",
      nombre: "Combo Urbano: Dunk Low + 2 Medias + Cordones",
      descripcion:
        "Combo completo urbano que incluye Nike Dunk Low Retro Panda, 2 packs de medias blancas y pack de cordones planos de repuesto.",
      precioVenta: 144999,
      costoCompra: 84000,
      imagen: "/productos/kit-urbano-dunk.jpg",
      marca: "nike",
      componentes: [
        { sku: "nike-dunk-low-panda", indiceVariante: 0, cantidad: 1 },
        { sku: "SNK-ACC-001", indiceVariante: 1, cantidad: 2 },
        { sku: "SNK-ACC-002", indiceVariante: 1, cantidad: 1 },
      ],
    },
    {
      sku: "SNK-KIT-003",
      nombre: "Combo Skate Pro: Vans Old Skool + Medias Crew + Cordones",
      descripcion:
        "Kit skater con zapatilla Vans Old Skool Classic, pack x3 de medias caña alta tricolor y cordones planos extra.",
      precioVenta: 109999,
      costoCompra: 61000,
      imagen: "/productos/kit-skate-vans.jpg",
      marca: "vans",
      componentes: [
        { sku: "vans-old-skool-negra", indiceVariante: 1, cantidad: 1 },
        { sku: "medias-crew-tricolor-pack", indiceVariante: 1, cantidad: 1 },
        { sku: "SNK-ACC-002", indiceVariante: 1, cantidad: 1 },
      ],
    },
    {
      sku: "SNK-KIT-004",
      nombre: "Combo Básquet Pro: Jordan 1 Low + Medias + Set Limpieza",
      descripcion:
        "Pack premium de básquet con Nike Air Jordan 1 Low Bred Toe, pack de medias deportivas Crew y set de limpieza con espuma y cepillo.",
      precioVenta: 179999,
      costoCompra: 102000,
      imagen: "/productos/kit-basquet-pro.jpg",
      marca: "nike",
      componentes: [
        { sku: "nike-jordan-1-low-bred", indiceVariante: 1, cantidad: 1 },
        { sku: "medias-crew-tricolor-pack", indiceVariante: 1, cantidad: 1 },
        { sku: "set-limpieza-sneaker-lab", indiceVariante: 0, cantidad: 1 },
      ],
    },
  ];

  for (const k of kitsSemilla) {
    const kitProd = await prisma.producto.upsert({
      where: { sku: k.sku },
      update: {
        nombre: k.nombre,
        descripcion: k.descripcion,
        precioVenta: k.precioVenta,
        imagen: k.imagen,
        categoriaId: catPorSlug.get("kits")!.id,
        marcaId: marcaPorSlug.get(k.marca)!.id,
      },
      create: {
        sku: k.sku,
        nombre: k.nombre,
        descripcion: k.descripcion,
        precioVenta: k.precioVenta,
        costoCompra: k.costoCompra,
        garantia: "6 meses",
        imagen: k.imagen,
        estado: EstadoProducto.ACTIVO,
        categoriaId: catPorSlug.get("kits")!.id,
        marcaId: marcaPorSlug.get(k.marca)!.id,
        proveedorId: proveedor.id,
      },
    });

    await prisma.kit.upsert({
      where: { productoId: kitProd.id },
      update: {},
      create: { productoId: kitProd.id },
    });

    const resueltos = k.componentes.map((c) => {
      const prodComp = creadas.find((p) => p.sku === c.sku)!;
      return {
        varianteId: prodComp.variantes[c.indiceVariante].id,
        cantidad: c.cantidad,
      };
    });

    await prisma.kitComponente.deleteMany({
      where: {
        kitProductoId: kitProd.id,
        varianteId: { notIn: resueltos.map((c) => c.varianteId) },
      },
    });

    for (const componente of resueltos) {
      await prisma.kitComponente.upsert({
        where: {
          kitProductoId_varianteId: {
            kitProductoId: kitProd.id,
            varianteId: componente.varianteId,
          },
        },
        update: { cantidad: componente.cantidad },
        create: { kitProductoId: kitProd.id, ...componente },
      });
    }

    const stockCalculado = Math.floor(
      Math.min(
        ...resueltos.map((c) => (stockPorVariante.get(c.varianteId) ?? 0) / c.cantidad),
      ),
    );

    console.log(
      `  ${k.sku} - ${resueltos.length} componentes, stock calculado = ${stockCalculado} (RN-06)`,
    );
  }

  // Limpieza de variantes obsoletas (de semillas anteriores con colores que no coincidian con la foto)
  const variantesVigentesIds = creadas.flatMap((p) => p.variantes.map((v) => v.id));
  const obsoletas = await prisma.varianteProducto.findMany({
    where: {
      id: { notIn: variantesVigentesIds },
      itemsPedido: { none: {} },
      componentesKit: { none: {} },
    },
    select: { id: true },
  });
  if (obsoletas.length > 0) {
    const obsoletasIds = obsoletas.map((o) => o.id);
    await prisma.itemCarrito.deleteMany({ where: { varianteProductoId: { in: obsoletasIds } } });
    await prisma.movimientoStock.deleteMany({ where: { varianteProductoId: { in: obsoletasIds } } });
    await prisma.varianteProducto.deleteMany({ where: { id: { in: obsoletasIds } } });
    console.log(`  ${obsoletasIds.length} variantes obsoletas limpiadas`);
  }


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

  // RNF-05: Carga masiva de datos de prueba (Sprint 4)
  try {
    await sembrarDatosDemo(prisma);
  } catch (errDemo: unknown) {
    console.error(
      "\n[Aviso RNF-05] Error al sembrar datos de prueba demo:",
      errDemo instanceof Error ? errDemo.message : errDemo,
    );
  }

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
