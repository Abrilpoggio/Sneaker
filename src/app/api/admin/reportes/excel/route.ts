import { NextRequest, NextResponse } from "next/server";
import { EstadoPedido, RolUsuario } from "@/generated/prisma/enums";
import { autorizarApiRol } from "@/lib/permissions";
import { generarLibroExcelReportes } from "@/modules/reportes/services/generador-excel";

export const dynamic = "force-dynamic";

/**
 * Endpoint de exportacion a Excel (.xlsx) de reportes y estadisticas (RF-48).
 *
 * Restringido a rol ADMIN (RNF-08 / RF-49).
 * Acepta filtros opcionales por query string:
 * - `desde`: Fecha de inicio (YYYY-MM-DD o ISO)
 * - `hasta`: Fecha de fin (YYYY-MM-DD o ISO)
 * - `estado`: Estado de pedido (CONFIRMADO, PREPARANDO, EN_CAMINO, RECIBIDO, etc.)
 */
export async function GET(request: NextRequest) {
  const autorizacion = await autorizarApiRol([RolUsuario.ADMIN]);
  if (autorizacion.respuestaError) {
    return autorizacion.respuestaError;
  }

  try {
    const { searchParams } = new URL(request.url);
    const desdeParam = searchParams.get("desde");
    const hastaParam = searchParams.get("hasta");
    const estadoParam = searchParams.get("estado");

    let desde: Date | undefined = undefined;
    let hasta: Date | undefined = undefined;
    let estado: EstadoPedido | "TODOS" | undefined = undefined;

    if (desdeParam) {
      const d = new Date(`${desdeParam}T00:00:00.000Z`);
      if (!isNaN(d.getTime())) {
        desde = d;
      }
    }

    if (hastaParam) {
      const h = new Date(`${hastaParam}T23:59:59.999Z`);
      if (!isNaN(h.getTime())) {
        hasta = h;
      }
    }

    if (estadoParam && estadoParam !== "TODOS" && Object.values(EstadoPedido).includes(estadoParam as EstadoPedido)) {
      estado = estadoParam as EstadoPedido;
    }

    const buffer = await generarLibroExcelReportes({ desde, hasta, estado });

    const fechaHoy = new Date().toISOString().slice(0, 10);
    const nombreArchivo = `reporte-sneaker-${fechaHoy}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error al exportar reporte Excel:", error);
    return NextResponse.json(
      { error: "Ocurrio un error al generar el archivo Excel." },
      { status: 500 },
    );
  }
}

