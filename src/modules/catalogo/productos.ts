/**
 * Datos de productos.
 *
 * Las fotos son las que el mockup de Figma usa internamente
 * (exportadas con `npm run figma` y renombradas a mano). El
 * archivo de Figma repite la misma foto en varias instancias,
 * por eso hay una sola imagen por producto.
 *
 * Los nombres del mockup (Pegasus Premium, Cloudrunner 3, ...)
 * son texto de relleno del diseno: no coinciden con las fotos.
 * Aca se usa el nombre real del producto que muestra la foto.
 *
 * Precios y stock son datos de prueba del seed; en produccion
 * esto viene de la base (Sprint 2).
 */

export interface Producto {
  slug: string;
  nombre: string;
  marca: string;
  categoria: "Urbanas" | "Deportivas" | "Medias" | "Accesorios";
  precio: number;
  precioAnterior?: number;
  descuento?: number;
  stock: number;
  imagen: string;
  talles: number[];
  etiquetas: string[];
  descripcion: string;
  materiales: string;
}

export const PRODUCTOS: Producto[] = [
  {
    slug: "nike-air-force-1-07",
    nombre: "Nike Air Force 1 '07",
    marca: "Nike",
    categoria: "Deportivas",
    precio: 39999,
    precioAnterior: 87900,
    descuento: 45,
    stock: 12,
    imagen: "/productos/nike-air-force-1-07-1.png",
    talles: [35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45],
    etiquetas: ["Running", "Caminata", "Uso diario"],
    descripcion:
      "Las Nike Air Force 1 '07 son las zapatillas de básquet que lo empezaron todo. Con la misma amortiguación Nike Air que las hizo famosas, combinan cuero premium con una silueta que aguantó décadas sin perder vigencia. La suela de goma con pivot points mejora el agarre en cancha, y el cuello acolchado da sujeción sin rozar.",
    materiales:
      "Capellada en cuero premium. Suela de goma con amortiguación Nike Air. Cuello acolchado.",
  },
  {
    slug: "adidas-forum-low-cl",
    nombre: "Adidas Forum Low CL",
    marca: "Adidas",
    categoria: "Deportivas",
    precio: 54999,
    stock: 8,
    imagen: "/productos/adidas-forum-low-cl-1.png",
    talles: [35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45],
    etiquetas: ["Uso diario", "Caminata"],
    descripcion:
      "Las Adidas Forum Low CL recuperan la silueta de 1984 con un perfil bajo y acabado limpio. La capellada de cuero y las tres tiras en contraste las hacen fáciles de combinar, y la suela de goma ofrece tracción para el uso diario. Un clásico de calle que no pasa de moda.",
    materiales:
      "Capellada de cuero. Tres tiras en contraste. Suela de goma.",
  },
];

export const buscarProducto = (slug: string) =>
  PRODUCTOS.find((p) => p.slug === slug);

export const formatoPrecio = (n: number) =>
  `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;