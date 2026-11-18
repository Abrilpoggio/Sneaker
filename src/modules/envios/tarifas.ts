/**
 * Tarifas de envio (Sprint 3 - Tadeo Rochas. RF-45).
 *
 * "El sistema debera calcular o determinar el costo de envio de
 * acuerdo con una tarifa base en la ciudad y otra en base a la
 * provincia de destino."
 *
 * - Tarifa base (ciudad): si el destino es la misma ciudad de la
 *   tienda (Concepcion del Uruguay, datos del seed).
 * - Tarifa por provincia: si el destino es otra ciudad. La tabla tiene
 *   un valor por provincia conocida y un valor por defecto para el
 *   resto del pais.
 *
 * Las tarifas viven en codigo porque el cliente todavia no definio los
 * valores finales (decision pendiente en README). Cuando los defina,
 * moverlos a una tabla con ABM administrativo es un cambio local a
 * este archivo y al servicio de lectura.
 */

/** Ciudad donde vive la tienda: define la tarifa base. */
export const CIUDAD_TIENDA = "Concepcion del Uruguay";
export const PROVINCIA_TIENDA = "Entre Rios";

/** Tarifa base: entregas dentro de la misma ciudad de la tienda. */
export const TARIFA_CIUDAD = 5000;

/** Tarifa por provincia de destino. La clave es el nombre normalizado. */
export const TARIFAS_PROVINCIA: Record<string, number> = {
  "entre rios": 6500,
  "santa fe": 8000,
  "buenos aires": 10000,
  "ciudad autonoma de buenos aires": 10000,
  "capital federal": 10000,
  cordoba: 11000,
  mendoza: 11500,
  "tierra del fuego": 16000,
};

/** Valor por defecto para provincias sin tarifa cargada. */
export const TARIFA_PROVINCIA_DEFAULT = 13000;

function normalizar(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * RF-45: costo de envio para un destino. La tarifa es una sola: la
 * base si es la ciudad de la tienda, la de su provincia (o la
 * generica) si es otra ciudad.
 */
export function calcularCostoEnvio(ciudad: string, provincia: string): number {
  if (normalizar(ciudad) === normalizar(CIUDAD_TIENDA)) {
    return TARIFA_CIUDAD;
  }
  const provinciaNormalizada = normalizar(provincia);
  return TARIFAS_PROVINCIA[provinciaNormalizada] ?? TARIFA_PROVINCIA_DEFAULT;
}
