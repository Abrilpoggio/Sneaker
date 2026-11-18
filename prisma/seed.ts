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
        { talle: "42", color: "Negro", material: "Cuero", stockActual: 6 },
        { talle: "43", color: "Azul", material: "Cuero", stockActual: 4 },
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
        { talle: "36", color: "Blanco", material: "Cuero", stockActual: 7 },
        { talle: "37", color: "Blanco", material: "Cuero", stockActual: 10 },
        { talle: "38", color: "Negro", material: "Cuero", stockActual: 5 },
        { talle: "39", color: "Verde", material: "Cuero", stockActual: 4 },
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
        { talle: "42", color: "Blanco/Negro", material: "Cuero", stockActual: 7 },
        { talle: "43", color: "Rojo/Blanco", material: "Cuero", stockActual: 4 },
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
        { talle: "36", color: "Rojo", material: "Gamuza", stockActual: 6 },
        { talle: "37", color: "Rojo", material: "Gamuza", stockActual: 8 },
        { talle: "38", color: "Negro", material: "Gamuza", stockActual: 5 },
        { talle: "39", color: "Azul", material: "Gamuza", stockActual: 3 },
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
        { talle: "42", color: "Blanco/Gris", material: "Cuero", stockActual: 6 },
        { talle: "43", color: "Blanco/Azul", material: "Cuero", stockActual: 0 },
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
        { talle: "41", color: "Gris", material: "Mesh", stockActual: 7 },
        { talle: "42", color: "Blanco", material: "Cuero", stockActual: 5 },
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
        { talle: "42", color: "Negro", material: "Mesh", stockActual: 8 },
        // 10 unidades exactas: dispara el aviso de RN-09.
        { talle: "43", color: "Blanco", material: "Mesh", stockActual: 10 },
        { talle: "44", color: "Azul", material: "Mesh", stockActual: 0 },
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
        { talle: "32", color: "Negro/Rojo", material: "Mesh", stockActual: 8 },
        { talle: "34", color: "Rosa/Blanco", material: "Mesh", stockActual: 6 },
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
        { talle: "Unico", color: "Blanco/Negro", material: "Algodon", stockActual: 40 },
        { talle: "Unico", color: "Negro", material: "Algodon", stockActual: 25 },
        { talle: "Unico", color: "Blanco", material: "Algodon", stockActual: 18 },
      ],
    },
    {
      sku: "SNK-ACC-002",
      nombre: "Cordones Planos Sneaker Pack x3",
      descripcion: "Pack de 3 pares de cordones planos de algodón trenzado de 120 cm en blanco, rojo y negro.",
      precioVenta: 7999,
      costoCompra: 2400,
      garantia: null,
      imagen: "/productos/medias-deportivas-pack.png",
      categoria: "accesorios",
      marca: "kross",
      etiquetas: ["urban", "caminata"],
      variantes: [
        { talle: "120cm", color: "Blanco/Rojo/Negro", material: "Algodon", stockActual: 35 },
        { talle: "120cm", color: "Blanco", material: "Algodon", stockActual: 20 },
        { talle: "120cm", color: "Negro", material: "Algodon", stockActual: 22 },
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
        { talle: "41", color: "Azul Marino", material: "Lona", stockActual: 6 },
        { talle: "42", color: "Bordo", material: "Gamuza", stockActual: 5 },
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
        { talle: "36", color: "Negro", material: "Lona", stockActual: 8 },
        { talle: "37", color: "Blanco", material: "Lona", stockActual: 11 },
        { talle: "38", color: "Negro", material: "Lona", stockActual: 13 },
        { talle: "40", color: "Rojo", material: "Lona", stockActual: 4 },
        { talle: "41", color: "Negro", material: "Lona", stockActual: 7 },
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
        { talle: "41", color: "Negro/Gris", material: "Mesh", stockActual: 8 },
        { talle: "42", color: "Azul/Celeste", material: "Mesh", stockActual: 7 },
        { talle: "43", color: "Blanco", material: "Mesh", stockActual: 3 },
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
        { talle: "37", color: "Blanco/Beige", material: "Cuero", stockActual: 9 },
        { talle: "38", color: "Crema/Verde", material: "Cuero", stockActual: 8 },
        { talle: "39", color: "Rosa Pastel", material: "Cuero", stockActual: 5 },
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
        { talle: "31", color: "Blanco/Azul", material: "Cuero", stockActual: 8 },
        { talle: "33", color: "Blanco/Rosa", material: "Cuero", stockActual: 7 },
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
        { talle: "42", color: "Negro/Rojo", material: "Mesh", stockActual: 6 },
        { talle: "43", color: "Blanco/Azul", material: "Mesh", stockActual: 5 },
        { talle: "44", color: "Gris/Negro/Azul", material: "Mesh", stockActual: 4 },
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
        { talle: "41", color: "Negro/Plata", material: "Mesh", stockActual: 6 },
        { talle: "42", color: "Oliva/Gris", material: "Mesh", stockActual: 7 },
        { talle: "43", color: "Arena", material: "Mesh", stockActual: 4 },
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
        { talle: "38", color: "Rosa Claro", material: "Cuero", stockActual: 6 },
        { talle: "39", color: "Negro", material: "Cuero", stockActual: 5 },
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

  // ---------- Kit (RF-38, RF-39, RN-06) ----------
  // El stock de un kit NO se persiste: es el minimo del stock de sus
  // componentes, dividido por cuantas unidades de cada uno consume.
  // Con estos datos (12 y 40) el kit queda en 12.
  const productoZapatilla = creadas.find((p) => p.sku === "SNK-DEP-001")!;
  const productoMedias = creadas.find((p) => p.sku === "SNK-ACC-001")!;

  const kit = await prisma.producto.upsert({
    where: { sku: "SNK-KIT-001" },
    update: { imagen: "/productos/kit-carrera.png" },
    create: {
      sku: "SNK-KIT-001",
      nombre: "Kit Carrera: Zapatilla + Medias",
      descripcion: "Zapatilla de running con pack de medias. El stock depende de la variante mas limitada.",
      precioVenta: 94999,
      costoCompra: 56500,
      garantia: "6 meses",
      imagen: "/productos/kit-carrera.png",
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
