import { correoHabilitado, remitenteCorreo } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { formatoPrecio } from "@/modules/catalogo/productos";

/**
 * Servicio de correo transaccional (Sprint 3 - Tadeo Rochas).
 *
 * RF-28: correo de confirmacion de compra con el detalle de los
 * productos, los descuentos aplicados y un mensaje de agradecimiento.
 *
 * Transporte: Resend via HTTP API. Sin `RESEND_API_KEY` el modo
 * simulado escribe el correo completo en la consola del servidor: el
 * contenido que se mandaria queda demostrable sin cuenta de SMTP. El
 * envio NUNCA debe romper la compra: los llamadores lo invocan luego
 * de confirmar el pedido y el fallo del proveedor solo se loguea.
 */

const API_RESEND = "https://api.resend.com/emails";

export interface CorreoSaliente {
  para: string;
  asunto: string;
  html: string;
}

/** Envia un correo (o lo imprime en modo simulado). Devuelve como salio. */
export async function enviarCorreo(correo: CorreoSaliente): Promise<"ENVIADO" | "SIMULADO"> {
  if (!correoHabilitado()) {
    console.log(
      `\n[correo simulado] de: ${remitenteCorreo()} | para: ${correo.para}\nasunto: ${correo.asunto}\n${correo.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}\n`,
    );
    return "SIMULADO";
  }

  const respuesta = await fetch(API_RESEND, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: remitenteCorreo(),
      to: [correo.para],
      subject: correo.asunto,
      html: correo.html,
    }),
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => "");
    throw new Error(`Resend rechazo el envio (${respuesta.status}): ${detalle.slice(0, 200)}`);
  }
  return "ENVIADO";
}

/** Campos que necesita el correo de confirmacion (RF-28). */
const SELECCION_PEDIDO_CORREO = {
  numeroOrden: true,
  fechaCreacion: true,
  montoSubtotal: true,
  descuentoTotal: true,
  costoEnvio: true,
  montoTotal: true,
  estado: true,
  metodoPago: true,
  datosEnvio: true,
  cliente: {
    select: {
      nombre: true,
      apellido: true,
      // RN-03: el correo vive en Usuario, no en Cliente.
      usuario: { select: { correo: true } },
    },
  },
  cupon: { select: { codigo: true, porcentajeDescuento: true } },
  promociones: { select: { montoDescontado: true, promocion: { select: { nombre: true } } } },
  items: {
    select: {
      cantidad: true,
      precioUnitario: true,
      subtotal: true,
      nombreProductoSnapshot: true,
      skuSnapshot: true,
      varianteProducto: { select: { talle: true, color: true, material: true } },
    },
  },
} satisfies Prisma.PedidoSelect;

export type PedidoParaCorreo = Prisma.PedidoGetPayload<{
  select: typeof SELECCION_PEDIDO_CORREO;
}>;

/** Lee el pedido confirmado para armar el correo (sin control de sesion). */
export async function obtenerPedidoParaCorreo(
  numeroOrden: string,
): Promise<PedidoParaCorreo | null> {
  return prisma.pedido.findUnique({
    where: { numeroOrden },
    select: SELECCION_PEDIDO_CORREO,
  });
}

/**
 * RF-28: HTML del correo de confirmacion. Detalle de productos,
 * descuentos aplicados (promociones, cupon, envio) y agradecimiento.
 */
export function construirCorreoConfirmacion(pedido: PedidoParaCorreo): string {
  const filas = pedido.items
    .map((item) => {
      const variante = [
        item.varianteProducto.talle,
        item.varianteProducto.color,
        item.varianteProducto.material,
      ]
        .filter(Boolean)
        .join(" · ");
      return `<tr>
  <td style="padding:8px 0;border-bottom:1px solid #eee;">
    ${item.nombreProductoSnapshot}<br>
    <small style="color:#6b6b6b;">${variante || "Variante unica"} · x${item.cantidad}</small>
  </td>
  <td align="right" style="padding:8px 0;border-bottom:1px solid #eee;">${formatoPrecio(Number(item.subtotal))}</td>
</tr>`;
    })
    .join("\n");

  const descuentos = [];
  const montoPromos = pedido.promociones.reduce((total, p) => total + Number(p.montoDescontado), 0);
  if (montoPromos > 0) {
    const nombres = [...new Set(pedido.promociones.map((p) => p.promocion.nombre))].join(", ");
    descuentos.push(`<tr><td style="padding:4px 0;color:#15803d;">Promociones (${nombres})</td><td align="right" style="padding:4px 0;color:#15803d;">- ${formatoPrecio(montoPromos)}</td></tr>`);
  }
  if (pedido.cupon) {
    const montoCupon = Number(pedido.descuentoTotal) - montoPromos;
    if (montoCupon > 0) {
      descuentos.push(`<tr><td style="padding:4px 0;color:#15803d;">Cupón ${pedido.cupon.codigo}</td><td align="right" style="padding:4px 0;color:#15803d;">- ${formatoPrecio(montoCupon)}</td></tr>`);
    }
  }
  if (Number(pedido.costoEnvio) > 0) {
    descuentos.push(`<tr><td style="padding:4px 0;">Costo de envío</td><td align="right" style="padding:4px 0;">${formatoPrecio(Number(pedido.costoEnvio))}</td></tr>`);
  }

  return `<!DOCTYPE html>
<html lang="es-AR">
<body style="font-family:Arial,sans-serif;color:#2c2c2c;max-width:560px;margin:0 auto;padding:24px;">
  <h1 style="font-size:22px;">¡Gracias por tu compra, ${pedido.cliente.nombre}!</h1>
  <p>Tu pedido <strong>${pedido.numeroOrden}</strong> quedó confirmado y ya estamos preparándolo.</p>
  <table style="width:100%;border-collapse:collapse;margin-top:16px;">${filas}</table>
  <table style="width:100%;margin-top:12px;">
    <tr><td style="padding:4px 0;">Subtotal</td><td align="right" style="padding:4px 0;">${formatoPrecio(Number(pedido.montoSubtotal))}</td></tr>
    ${descuentos.join("\n")}
    <tr><td style="padding:10px 0;border-top:2px solid #2c2c2c;font-weight:bold;font-size:18px;">Total</td><td align="right" style="padding:10px 0;border-top:2px solid #2c2c2c;font-weight:bold;font-size:18px;">${formatoPrecio(Number(pedido.montoTotal))}</td></tr>
  </table>
  <p style="margin-top:24px;">Puedes seguir el estado de tu pedido desde tu cuenta. ¡Vuelva pronto!</p>
  <p style="color:#9e9e9e;font-size:12px;">Sneaker · Envios a todo el país</p>
</body>
</html>`;
}

/**
 * RF-28: arma y envia el correo de confirmacion del pedido. Devuelve
 * "ENVIADO" | "SIMULADO" | null (si el pedido no existe o no esta
 * confirmado). Los errores se propagan: el llamador decide que hacer
 * (en el flujo de pago se loguean sin romper la compra).
 */
export async function enviarCorreoConfirmacionPedido(
  numeroOrden: string,
): Promise<"ENVIADO" | "SIMULADO" | null> {
  const pedido = await obtenerPedidoParaCorreo(numeroOrden);
  if (!pedido || pedido.estado !== "CONFIRMADO") {
    return null;
  }

  return enviarCorreo({
    para: pedido.cliente.usuario.correo,
    asunto: `¡Gracias por tu compra! Pedido ${pedido.numeroOrden}`,
    html: construirCorreoConfirmacion(pedido),
  });
}
