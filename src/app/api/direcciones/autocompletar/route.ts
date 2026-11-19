import { NextRequest, NextResponse } from "next/server";

import { RolUsuario } from "@/generated/prisma/enums";
import { autorizarApiRol } from "@/lib/permissions";
import { PROVINCIAS_ARGENTINA } from "@/modules/clients/schemas";

export interface SugerenciaDireccion {
  id: string;
  etiqueta: string;
  subtitulo: string;
  calle: string;
  numero: string;
  ciudad: string;
  provincia: string;
  codigoPostal: string;
}

interface GeorefDireccion {
  nomenclatura?: string;
  calle?: { nombre?: string | null } | null;
  altura?: { valor?: number | string | null } | null;
  localidad_censal?: { nombre?: string | null } | null;
  departamento?: { nombre?: string | null } | null;
  provincia?: { nombre?: string | null } | null;
}

interface GeorefResponse {
  direcciones?: GeorefDireccion[];
}

interface NominatimItem {
  place_id?: number | string;
  display_name?: string;
  address?: {
    road?: string;
    pedestrian?: string;
    residential?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    suburb?: string;
    state?: string;
    postcode?: string;
  };
}

function normalizarTexto(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizarProvincia(valor: string | null | undefined): string {
  if (!valor) return "";
  const limpio = normalizarTexto(valor);
  if (
    limpio.includes("ciudad autonoma") ||
    limpio.includes("autonomous city of buenos aires") ||
    limpio === "caba" ||
    limpio === "capital federal"
  ) {
    return "Ciudad Autónoma de Buenos Aires";
  }
  if (limpio.includes("tierra del fuego")) {
    return "Tierra del Fuego";
  }

  for (const prov of PROVINCIAS_ARGENTINA) {
    const provNorm = normalizarTexto(prov);
    if (limpio === provNorm || limpio === `provincia de ${provNorm}`) {
      return prov;
    }
  }

  for (const prov of PROVINCIAS_ARGENTINA) {
    const provNorm = normalizarTexto(prov);
    if (limpio.includes(provNorm) || provNorm.includes(limpio)) {
      return prov;
    }
  }

  return valor.trim();
}

function limpiarCodigoPostal(cp: string | null | undefined): string {
  if (!cp) return "";
  // En Argentina el CPA puede venir como "C1043AAZ" o "3260"; conservar digitos o formato corto limpio
  const soloDigitos = cp.match(/\d{4}/)?.[0];
  return soloDigitos ?? cp.trim().slice(0, 10);
}

async function buscarEnGeoref(
  q: string,
  provincia?: string,
): Promise<SugerenciaDireccion[]> {
  const params = new URLSearchParams({
    direccion: q,
    max: "6",
    aplanar: "false",
  });
  if (provincia && provincia.trim().length > 0) {
    params.set("provincia", provincia.trim());
  }

  const res = await fetch(
    `https://apis.datos.gob.ar/georef/api/direcciones?${params.toString()}`,
    {
      signal: AbortSignal.timeout(3500),
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
    },
  );
  if (!res.ok) return [];

  const data = (await res.json()) as GeorefResponse;
  const lista = Array.isArray(data.direcciones) ? data.direcciones : [];

  const resultados: SugerenciaDireccion[] = [];
  for (let i = 0; i < lista.length; i++) {
    const item = lista[i];
    const calle = item.calle?.nombre?.trim() ?? "";
    if (!calle) continue;

    const numero =
      item.altura?.valor !== null && item.altura?.valor !== undefined
        ? String(item.altura.valor).trim()
        : "";
    const ciudad =
      item.localidad_censal?.nombre?.trim() ||
      item.departamento?.nombre?.trim() ||
      "";
    const prov = normalizarProvincia(item.provincia?.nombre);

    const etiqueta = numero ? `${calle} ${numero}` : calle;
    const subtitulo = [ciudad, prov].filter(Boolean).join(", ");

    resultados.push({
      id: `georef-${i}-${calle}-${numero}-${ciudad}`,
      etiqueta,
      subtitulo,
      calle,
      numero,
      ciudad,
      provincia: prov,
      codigoPostal: "",
    });
  }

  return resultados;
}

async function buscarEnNominatim(
  q: string,
  provincia?: string,
): Promise<SugerenciaDireccion[]> {
  const consulta = provincia && !normalizarTexto(q).includes(normalizarTexto(provincia))
    ? `${q}, ${provincia}`
    : q;

  const params = new URLSearchParams({
    q: consulta,
    format: "jsonv2",
    addressdetails: "1",
    countrycodes: "ar",
    limit: "6",
    "accept-language": "es",
  });

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    {
      signal: AbortSignal.timeout(3500),
      headers: {
        Accept: "application/json",
        "User-Agent": "SneakerEcommerce/1.0 (https://github.com/Abrilpoggio/Sneaker)",
      },
      next: { revalidate: 300 },
    },
  );
  if (!res.ok) return [];

  const data = (await res.json()) as NominatimItem[];
  if (!Array.isArray(data)) return [];

  const resultados: SugerenciaDireccion[] = [];
  for (const item of data) {
    const addr = item.address;
    if (!addr) continue;

    const calle = (addr.road || addr.pedestrian || addr.residential || "").trim();
    if (!calle) continue;

    const numero = (addr.house_number || "").trim();
    const ciudad = (
      addr.city ||
      addr.town ||
      addr.village ||
      addr.municipality ||
      addr.suburb ||
      ""
    ).trim();
    const prov = normalizarProvincia(addr.state);
    const codigoPostal = limpiarCodigoPostal(addr.postcode);

    const etiqueta = numero ? `${calle} ${numero}` : calle;
    const subtitulo = [ciudad, prov, codigoPostal ? `CP ${codigoPostal}` : ""]
      .filter(Boolean)
      .join(", ");

    resultados.push({
      id: `osm-${item.place_id ?? `${calle}-${numero}-${ciudad}`}`,
      etiqueta,
      subtitulo,
      calle,
      numero,
      ciudad,
      provincia: prov,
      codigoPostal,
    });
  }

  return resultados;
}

/**
 * GET /api/direcciones/autocompletar?q=<texto>&provincia=<opcional>
 *
 * Autocompletado de direcciones argentinas combinando Nominatim (OpenStreetMap,
 * que aporta codigo postal) y Georef AR (API oficial de datos.gob.ar).
 */
export async function GET(request: NextRequest) {
  const auth = await autorizarApiRol([RolUsuario.CLIENTE, RolUsuario.ADMIN]);
  if (auth.respuestaError) return auth.respuestaError;

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  const provincia = (request.nextUrl.searchParams.get("provincia") ?? "").trim();

  if (q.length < 3 || q.length > 120) {
    return NextResponse.json(
      { sugerencias: [] },
      { status: 200, headers: { "Cache-Control": "private, max-age=60" } },
    );
  }

  const [resNominatim, resGeoref] = await Promise.allSettled([
    buscarEnNominatim(q, provincia || undefined),
    buscarEnGeoref(q, provincia || undefined),
  ]);

  const listaNominatim =
    resNominatim.status === "fulfilled" ? resNominatim.value : [];
  const listaGeoref = resGeoref.status === "fulfilled" ? resGeoref.value : [];

  // Fusionar y deduplicar priorizando entradas con codigo postal y ciudad completos
  const mapa = new Map<string, SugerenciaDireccion>();
  for (const item of [...listaNominatim, ...listaGeoref]) {
    const clave = [
      normalizarTexto(item.calle),
      normalizarTexto(item.numero),
      normalizarTexto(item.ciudad),
      normalizarTexto(item.provincia),
    ].join("|");

    const existente = mapa.get(clave);
    if (!existente) {
      mapa.set(clave, item);
    } else if (!existente.codigoPostal && item.codigoPostal) {
      mapa.set(clave, {
        ...existente,
        codigoPostal: item.codigoPostal,
        subtitulo: item.subtitulo || existente.subtitulo,
      });
    }
  }

  const sugerencias = Array.from(mapa.values()).slice(0, 6);

  return NextResponse.json(
    { sugerencias },
    {
      status: 200,
      headers: { "Cache-Control": "private, max-age=60" },
    },
  );
}
