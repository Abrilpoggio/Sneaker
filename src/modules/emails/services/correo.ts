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
      kitProductoId: true,
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
      const variante = item.varianteProducto
        ? [item.varianteProducto.talle, item.varianteProducto.color, item.varianteProducto.material]
            .filter(Boolean)
            .join(" · ")
        : item.kitProductoId
          ? "Kit (componentes descontados individualmente)"
          : "Variante unica";
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

const INFO_PASO_CORREO: Record<
  string,
  { asunto: string; titulo: string; mensaje: string; color: string; pasoIndice: number }
> = {
  CONFIRMADO: {
    asunto: "Pago confirmado y comprobante de compra",
    titulo: "¡Tu pago fue confirmado!",
    mensaje:
      "Registramos correctamente tu pago a través de Mercado Pago. Adjuntamos el comprobante de tu orden y ya comenzamos a gestionar el despacho.",
    color: "#15803d",
    pasoIndice: 0,
  },
  PREPARANDO: {
    asunto: "Estamos preparando tu pedido",
    titulo: "Tu pedido está en preparación",
    mensaje:
      "Nuestro equipo de depósito ya está separando, verificando el control de calidad y embalando tus productos para despacharlos.",
    color: "#1d4ed8",
    pasoIndice: 1,
  },
  EN_CAMINO: {
    asunto: "¡Tu pedido ya está en camino!",
    titulo: "¡Tu pedido salió a reparto!",
    mensaje:
      "El paquete ya fue despachado y se encuentra en tránsito hacia la dirección de entrega indicada en tu compra.",
    color: "#4338ca",
    pasoIndice: 2,
  },
  RECIBIDO: {
    asunto: "¡Pedido entregado! Gracias por comprar en Sneaker",
    titulo: "¡Tu pedido fue entregado!",
    mensaje:
      "Confirmamos la recepción del pedido en el domicilio de destino. ¡Que disfrutes tus Sneaker!",
    color: "#166534",
    pasoIndice: 3,
  },
  CANCELADO: {
    asunto: "Aviso de cancelación de pedido",
    titulo: "Tu pedido fue cancelado",
    mensaje:
      "El pedido fue cancelado y las unidades fueron restituidas al stock. Si tenés consultas sobre el reembolso, comunicate con soporte.",
    color: "#7c0300",
    pasoIndice: -1,
  },
  RECHAZADO: {
    asunto: "Pago rechazado en tu pedido",
    titulo: "No pudimos procesar el pago",
    mensaje:
      "La transacción fue rechazada por el medio de pago. Tus productos siguen en tu carrito para que puedas reintentar cuando quieras.",
    color: "#cf1a1f",
    pasoIndice: -1,
  },
};

/**
 * RF-28 / RF-30 / RF-32: construye el HTML del correo de seguimiento +
 * comprobante de pago en cada etapa del pedido (Confirmado, Preparando,
 * En camino, Recibido o Cancelado).
 */
export function construirCorreoActualizacionEstado(pedido: PedidoParaCorreo): {
  asunto: string;
  html: string;
} {
  const info = INFO_PASO_CORREO[pedido.estado] ?? {
    asunto: `Actualización de tu pedido ${pedido.numeroOrden}`,
    titulo: `Estado del pedido: ${pedido.estado}`,
    mensaje: "Se actualizó el estado de seguimiento de tu compra.",
    color: "#2c2c2c",
    pasoIndice: 0,
  };

  const pasos = ["1. Confirmado", "2. Preparando", "3. En camino", "4. Recibido"];
  const barraPasosHtml =
    info.pasoIndice >= 0
      ? `<table style="width:100%;border-collapse:collapse;margin:18px 0;">
          <tr>
            ${pasos
              .map((etiqueta, idx) => {
                const activo = idx <= info.pasoIndice;
                const actual = idx === info.pasoIndice;
                return `<td style="width:25%;padding:4px;text-align:center;">
                  <div style="height:6px;border-radius:999px;background:${activo ? "#CF1A1F" : "#E0E0E0"};margin-bottom:6px;"></div>
                  <span style="font-size:11px;font-weight:${actual ? "700" : "500"};color:${actual ? "#CF1A1F" : activo ? "#2C2C2C" : "#9E9E9E"};">${etiqueta}</span>
                </td>`;
              })
              .join("")}
          </tr>
        </table>`
      : "";

  const envio = (pedido.datosEnvio ?? {}) as {
    destinatario?: string;
    calle?: string;
    numero?: string | number;
    ciudad?: string;
    provincia?: string;
    codigoPostal?: string;
  };

  const cuerpoConfirmacion = construirCorreoConfirmacion(pedido);
  // Insertamos el encabezado de seguimiento y el comprobante completo
  const html = `<!DOCTYPE html>
<html lang="es-AR">
<body style="font-family:Montserrat,Arial,sans-serif;color:#2c2c2c;max-width:600px;margin:0 auto;padding:24px;background:#ffffff;">
  <div style="background:#2C2C2C;color:#ffffff;padding:16px 20px;border-radius:10px 10px 0 0;display:flex;justify-content:space-between;align-items:center;">
    <strong style="font-size:18px;letter-spacing:1px;">SNEAKER · TIENDA OFICIAL</strong>
    <span style="font-size:12px;color:#e0e0e0;">Orden ${pedido.numeroOrden}</span>
  </div>
  <div style="border:1px solid #e5e5e5;border-top:none;border-radius:0 0 10px 10px;padding:22px;">
    <p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:${info.color};font-weight:700;">
      Seguimiento de compra · ${pedido.estado}
    </p>
    <h1 style="margin:6px 0 8px 0;font-size:21px;color:#1e1e1e;">${info.titulo}</h1>
    <p style="margin:0 0 12px 0;font-size:14px;line-height:1.5;color:#4e4e4e;">
      Hola <strong>${pedido.cliente.nombre} ${pedido.cliente.apellido}</strong>: ${info.mensaje}
    </p>
    ${barraPasosHtml}
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin:16px 0;font-size:13px;">
      <strong>Comprobante de pago y envío</strong><br>
      <span>N.º de orden: <strong>${pedido.numeroOrden}</strong></span> · 
      <span>Fecha: ${new Date(pedido.fechaCreacion).toLocaleDateString("es-AR")}</span> · 
      <span>Medio de pago: <strong>${pedido.metodoPago ?? "Mercado Pago"}</strong></span><br>
      <span>Destino: ${envio.destinatario ?? `${pedido.cliente.nombre} ${pedido.cliente.apellido}`} — ${envio.calle ?? ""} ${envio.numero ?? ""}, ${envio.ciudad ?? ""} (${envio.provincia ?? ""})</span>
    </div>
    ${cuerpoConfirmacion
      .replace(/^[\s\S]*?<table style="width:100%;border-collapse:collapse;margin-top:16px;">/, '<table style="width:100%;border-collapse:collapse;margin-top:12px;">')
      .replace(/<\/body>[\s\S]*$/, "")}
  </div>
</body>
</html>`;

  return {
    asunto: `[Sneaker] ${info.asunto} (${pedido.numeroOrden})`,
    html,
  };
}

/**
 * Envia por correo (o registra en consola si no hay RESEND_API_KEY) la
 * actualizacion de estado de seguimiento del pedido junto con su comprobante.
 */
export async function enviarCorreoActualizacionEstado(
  numeroOrden: string,
): Promise<{ resultado: "ENVIADO" | "SIMULADO"; para: string; asunto: string } | null> {
  const pedido = await obtenerPedidoParaCorreo(numeroOrden);
  if (!pedido) {
    return null;
  }

  const { asunto, html } = construirCorreoActualizacionEstado(pedido);
  const para = pedido.cliente.usuario.correo;
  const resultado = await enviarCorreo({ para, asunto, html });
  return { resultado, para, asunto };
}

