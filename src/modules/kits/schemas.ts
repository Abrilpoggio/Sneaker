import { z } from "zod";

/**
 * Esquemas del ABM de kits (Sprint 4 - Camila Viegas. RF-38, RN-06).
 * Un kit es un Producto con su registro `Kit` y 2..* componentes.
 */

const monto = z
  .string()
  .trim()
  .min(1, "Este campo es obligatorio.")
  .transform((value) => Number(value.replace(",", ".")))
  .pipe(z.number().finite().nonnegative("Debe ser un numero positivo."));

const entero = z
  .string()
  .trim()
  .min(1, "Este campo es obligatorio.")
  .transform(Number)
  .pipe(z.number().int().positive("La cantidad debe ser un entero mayor a cero."));

const nullableTexto = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null));

function esRutaImagenSegura(value: string | null) {
  if (value === null) return true;
  return value.startsWith("/productos/") && !value.includes("..") && !value.startsWith("//");
}

export const kitAdminSchema = z.object({
  sku: z.string().trim().min(2, "El SKU es obligatorio.").max(60),
  nombre: z.string().trim().min(2, "El nombre es obligatorio.").max(160),
  descripcion: z.string().trim().min(8, "Agrega una descripcion.").max(5000),
  precioVenta: monto.pipe(z.number().positive("El precio debe ser mayor a cero.")),
  costoCompra: monto,
  garantia: nullableTexto,
  imagen: z
    .string()
    .trim()
    .transform((value) => (value.length > 0 ? value : null))
    .pipe(
      z
        .string()
        .nullable()
        .refine(esRutaImagenSegura, "Usa una ruta local de /productos/."),
    ),
  estado: z.enum(["ACTIVO", "INACTIVO"]),
  categoriaId: z.string().min(1, "Selecciona una categoria."),
  marcaId: z.string().min(1, "Selecciona una marca."),
  proveedorId: nullableTexto,
});

export const kitComponenteSchema = z.object({
  varianteId: z.string().trim().min(20, "Variante invalida.").max(40, "Variante invalida."),
  cantidad: entero,
});

export const componentesKitSchema = z
  .array(kitComponenteSchema)
  .min(2, "Un kit necesita al menos dos componentes.")
  .refine(
    (componentes) =>
      new Set(componentes.map((componente) => componente.varianteId)).size ===
      componentes.length,
    "No se puede repetir la misma variante en el kit.",
  );

export type KitAdminInput = z.infer<typeof kitAdminSchema>;
export type KitComponenteInput = z.infer<typeof kitComponenteSchema>;
