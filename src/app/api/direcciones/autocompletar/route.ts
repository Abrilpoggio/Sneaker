import { NextRequest, NextResponse } from "next/server";

import { RolUsuario } from "@/generated/prisma/enums";
import { autorizarApiRol } from "@/lib/permissions";
import { PROVINCIAS_ARGENTINA } from "@/modules/clients/schemas";

export interface SugerenciaCiudad {
  id: string;
  ciudad: string;
  provincia: string;
  etiqueta: string;
}

interface GeorefLocalidad {
  id?: string;
  nombre?: string;
  municipio?: { nombre?: string | null } | null;
  departamento?: { nombre?: string | null } | null;
  provincia?: { nombre?: string | null } | null;
}

interface GeorefLocalidadesResponse {
  localidades?: GeorefLocalidad[];
}

function normalizarTexto(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function capitalizarNombre(texto: string): string {
  const minusculas = new Set(["de", "del", "la", "las", "los", "y", "el", "en"]);
  return texto
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((palabra, idx) =>
      idx > 0 && minusculas.has(palabra)
        ? palabra
        : palabra.charAt(0).toUpperCase() + palabra.slice(1),
    )
    .join(" ");
}

function normalizarProvincia(valor: string | null | undefined): string {
  if (!valor) return "";
  const limpio = normalizarTexto(valor);
  if (
    limpio.includes("ciudad autonoma") ||
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

async function buscarCiudadesGeoref(q: string): Promise<SugerenciaCiudad[]> {
  const params = new URLSearchParams({
    nombre: q,
    max: "10",
    orden: "nombre",
  });

  const res = await fetch(
    `https://apis.datos.gob.ar/georef/api/localidades?${params.toString()}`,
    {
      signal: AbortSignal.timeout(3500),
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    },
  );
  if (!res.ok) return [];

  const data = (await res.json()) as GeorefLocalidadesResponse;
  const lista = Array.isArray(data.localidades) ? data.localidades : [];

  const resultados: SugerenciaCiudad[] = [];
  for (const item of lista) {
    const nombreRaw = item.nombre?.trim();
    if (!nombreRaw) continue;
    const ciudad = capitalizarNombre(nombreRaw);
    const provincia = normalizarProvincia(item.provincia?.nombre);
    if (!provincia) continue;

    resultados.push({
      id: item.id ?? `${ciudad}-${provincia}`,
      ciudad,
      provincia,
      etiqueta: `${ciudad}, ${provincia}`,
    });
  }

  return resultados;
}

/**
 * GET /api/direcciones/autocompletar?q=<ciudad>
 *
 * Autocompletado de ciudades y localidades argentinas usando Georef AR
 * (API oficial de datos.gob.ar). Devuelve ciudad y provincia normalizada.
 */
export async function GET(request: NextRequest) {
  const auth = await autorizarApiRol([RolUsuario.CLIENTE, RolUsuario.ADMIN]);
  if (auth.respuestaError) return auth.respuestaError;

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2 || q.length > 80) {
    return NextResponse.json(
      { sugerencias: [] },
      { status: 200, headers: { "Cache-Control": "private, max-age=120" } },
    );
  }

  try {
    const lista = await buscarCiudadesGeoref(q);

    // Deduplicar por (ciudad + provincia) y priorizar las que empiezan con q
    const qNorm = normalizarTexto(q);
    const mapa = new Map<string, SugerenciaCiudad>();
    for (const item of lista) {
      const clave = `${normalizarTexto(item.ciudad)}|${normalizarTexto(item.provincia)}`;
      if (!mapa.has(clave)) {
        mapa.set(clave, item);
      }
    }

    const ordenadas = Array.from(mapa.values())
      .sort((a, b) => {
        const aEmpieza = normalizarTexto(a.ciudad).startsWith(qNorm) ? 0 : 1;
        const bEmpieza = normalizarTexto(b.ciudad).startsWith(qNorm) ? 0 : 1;
        if (aEmpieza !== bEmpieza) return aEmpieza - bEmpieza;
        return a.ciudad.localeCompare(b.ciudad, "es");
      })
      .slice(0, 8);

    return NextResponse.json(
      { sugerencias: ordenadas },
      { status: 200, headers: { "Cache-Control": "private, max-age=300" } },
    );
  } catch {
    return NextResponse.json({ sugerencias: [] }, { status: 200 });
  }
}
