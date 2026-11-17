import { NextResponse } from "next/server";

import { procesarWebhookPago } from "@/modules/checkout/services/pagos";

/**
 * Webhook de Mercado Pago (RF-24).
 *
 * MP envia `type=payment&data.id=<pago>` como query params y el
 * detalle en el cuerpo. La decision nunca se toma del cuerpo: se
 * consulta `GET /v1/payments/{id}` con el access token de la tienda
 * (ver `procesarWebhookPago`). Cualquier error se responde con 200
 * igual: MP reintenta ante fallos y ya no queda nada por confirmar.
 *
 * Nota de desarrollo: MP no alcanza un localhost; este endpoint es
 * alcanzable con un tunel (ngrok, etc.) o en produccion. La
 * demostracion local se cubre con el modo simulado.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  let pagoExternoId = url.searchParams.get("data.id") ?? url.searchParams.get("id");

  if (!pagoExternoId) {
    try {
      const cuerpo = (await request.json()) as { data?: { id?: string | number } };
      if (cuerpo.data?.id != null) {
        pagoExternoId = String(cuerpo.data.id);
      }
    } catch {
      // Cuerpo vacio o no-JSON: se cae en la respuesta generica.
    }
  }

  if (url.searchParams.get("type") && url.searchParams.get("type") !== "payment") {
    return NextResponse.json({ recibido: true });
  }

  if (!pagoExternoId) {
    return NextResponse.json({ recibido: true, aviso: "sin id de pago" });
  }

  try {
    const resultado = await procesarWebhookPago(pagoExternoId);
    return NextResponse.json({ recibido: true, ...resultado });
  } catch {
    // No se filtra el detalle del error a un endpoint externo.
    return NextResponse.json({ recibido: true });
  }
}
