/**
 * Calculo de stock del inventario (Sprint 4 - Camila Viegas).
 *
 * RN-06: el stock de un kit NO se persiste. Se deriva del componente
 * que alcanza para menos unidades de kit:
 *
 *   unidadesKit = min(floor(stockVariante / cantidadPorKit))
 *
 * Para un producto normal el stock sigue siendo la suma del stock de
 * sus variantes. Este archivo concentra la formula para que el
 * catalogo, el panel de kits y el checkout usen exactamente la misma.
 */

export interface ComponenteStock {
  cantidad: number;
  variante: { stockActual: number };
}

/**
 * RN-06: unidades de kit disponibles segun sus componentes.
 * Sin componentes el kit no es vendible (0 unidades).
 */
export function calcularStockKit(
  componentes: readonly ComponenteStock[] | null | undefined,
): number {
  if (!componentes || componentes.length === 0) return 0;

  return Math.min(
    ...componentes.map((componente) =>
      Math.floor(componente.variante.stockActual / Math.max(componente.cantidad, 1)),
    ),
  );
}

/**
 * RF-09 / RN-06: stock publico de un producto. Si tiene registro de
 * kit se usa el minimo de sus componentes; si no, la suma de variantes.
 */
export function calcularStockProducto(
  variantes: readonly { stockActual: number }[],
  kit?: { componentes: readonly ComponenteStock[] } | null,
): number {
  if (kit) return calcularStockKit(kit.componentes);
  return variantes.reduce((total, variante) => total + variante.stockActual, 0);
}

/**
 * Convierte una cantidad de kits en la cantidad de unidades que hay
 * que descontar de cada variante componente. Se usa al vender un kit
 * para descontar el stock individual de cada componente (RF-38).
 */
export function requerimientosKit(
  componentes: readonly (ComponenteStock & { varianteId: string })[],
  cantidadKits: number,
): Map<string, number> {
  const requerimientos = new Map<string, number>();
  for (const componente of componentes) {
    const unidades = cantidadKits * Math.max(componente.cantidad, 1);
    requerimientos.set(
      componente.varianteId,
      (requerimientos.get(componente.varianteId) ?? 0) + unidades,
    );
  }
  return requerimientos;
}
