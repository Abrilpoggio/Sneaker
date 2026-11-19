/**
 * Servicio de favoritos del cliente (RF-20).
 *
 * Permite consultar los IDs marcados como favoritos por el usuario
 * autenticado, listar sus productos favoritos con stock y promociones
 * vigentes, y alternar (agregar / quitar) un producto.
 */

import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/permissions";
import { resolverComprador } from "@/modules/carrito/services/carrito";
import {
  obtenerPromocionesVigentes,
  resolverMejorPromocion,
  type ProductoCatalogo,
} from "@/modules/catalogo/catalogo";
import { calcularStockProducto } from "@/modules/inventory/services/stock";

/**
 * Devuelve el conjunto de IDs de productos favoritos de la sesion actual.
 * Nunca lanza excepcion para invitados o sesiones sin perfil cliente.
 */
export async function obtenerIdsFavoritosActual(): Promise<Set<string>> {
  try {
    const sesion = await sesionActual();
    if (!sesion?.user) return new Set();

    const clienteId = await resolverComprador(sesion.user.id, sesion.user.email);
    const filas = await prisma.favorito.findMany({
      where: { clienteId },
      select: { productoId: true },
    });
    return new Set(filas.map((f) => f.productoId));
  } catch {
    return new Set();
  }
}

/**
 * Lista los productos activos guardados en favoritos por un cliente,
 * ordenados del mas reciente al mas antiguo.
 */
export async function listarFavoritosCliente(
  clienteId: string,
): Promise<ProductoCatalogo[]> {
  const [filas, promocionesVigentes] = await Promise.all([
    prisma.favorito.findMany({
      where: {
        clienteId,
        producto: { is: { estado: "ACTIVO" } },
      },
      orderBy: { creadoEn: "desc" },
      select: {
        producto: {
          select: {
            id: true,
            sku: true,
            nombre: true,
            descripcion: true,
            precioVenta: true,
            imagen: true,
            categoria: { select: { nombre: true } },
            marca: { select: { nombre: true } },
            etiquetas: { select: { etiqueta: { select: { nombre: true } } } },
            variantes: { select: { stockActual: true } },
            kit: {
              select: {
                componentes: {
                  select: {
                    cantidad: true,
                    variante: { select: { stockActual: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
    obtenerPromocionesVigentes(),
  ]);

  return filas.map(({ producto }) => {
    const precio = Number(producto.precioVenta);
    const promo = resolverMejorPromocion(producto.id, precio, promocionesVigentes);
    const variantes = producto.variantes;
    return {
      id: producto.id,
      sku: producto.sku,
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      precio,
      porcentajeDescuento: promo.porcentajeDescuento,
      precioConDescuento: promo.precioConDescuento,
      nombrePromocion: promo.nombrePromocion,
      imagen: producto.imagen,
      categoria: producto.categoria.nombre,
      marca: producto.marca.nombre,
      etiquetas: producto.etiquetas.map(({ etiqueta }) => etiqueta.nombre),
      stockTotal: calcularStockProducto(variantes, producto.kit),
      variantesDisponibles: variantes.filter((v) => v.stockActual > 0).length,
      variantesTotales: variantes.length,
    };
  });
}

/**
 * Agrega o quita un producto de la lista de favoritos del cliente.
 */
export async function alternarFavorito(
  clienteId: string,
  productoId: string,
): Promise<{ esFavorito: boolean; sku: string | null }> {
  const producto = await prisma.producto.findFirst({
    where: { id: productoId, estado: "ACTIVO" },
    select: { id: true, sku: true },
  });
  if (!producto) {
    throw new Error("El producto no está disponible.");
  }

  const existente = await prisma.favorito.findUnique({
    where: {
      clienteId_productoId: {
        clienteId,
        productoId: producto.id,
      },
    },
    select: { productoId: true },
  });

  if (existente) {
    await prisma.favorito.delete({
      where: {
        clienteId_productoId: {
          clienteId,
          productoId: producto.id,
        },
      },
    });
    return { esFavorito: false, sku: producto.sku };
  }

  await prisma.favorito.create({
    data: {
      clienteId,
      productoId: producto.id,
    },
  });
  return { esFavorito: true, sku: producto.sku };
}
