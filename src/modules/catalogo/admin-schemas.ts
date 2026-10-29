import { z } from "zod";

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
  .pipe(z.number().int().nonnegative("Debe ser un entero igual o mayor a cero."));

const nullableTexto = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null));

function esRutaImagenSegura(value: string | null) {
  if (value === null) return true;
  return value.startsWith("/productos/") && !value.includes("..") && !value.startsWith("//");
}

export const productoAdminSchema = z.object({
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
        .refine(esRutaImagenSegura, "Usa una ruta local de /productos/ o sube un archivo."),
    ),
  estado: z.enum(["ACTIVO", "INACTIVO"]),
  categoriaId: z.string().min(1, "Selecciona una categoria."),
  marcaId: z.string().min(1, "Selecciona una marca."),
  proveedorId: nullableTexto,
  etiquetaIds: z.array(z.string()),
});

export const productoCreateSchema = productoAdminSchema.extend({
  talleInicial: z.string().trim().min(1, "La primera variante necesita un talle."),
  colorInicial: nullableTexto,
  materialInicial: nullableTexto,
  stockInicial: entero,
});

export const varianteAdminSchema = z.object({
  productoId: z.string().min(1),
  talle: z.string().trim().min(1, "El talle es obligatorio.").max(32),
  color: nullableTexto,
  material: nullableTexto,
  stockActual: entero,
  justificacion: z.string().trim().max(300).optional().default(""),
});

export const etiquetaAdminSchema = z.object({
  id: z.string().optional(),
  nombre: z.string().trim().min(2, "El nombre es obligatorio.").max(80),
});

export type ProductoAdminInput = z.infer<typeof productoAdminSchema>;
export type ProductoCreateInput = z.infer<typeof productoCreateSchema>;
export type VarianteAdminInput = z.infer<typeof varianteAdminSchema>;
