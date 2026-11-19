/**
 * Canal externo de atencion al cliente para cancelaciones,
 * reclamos y reembolsos (RF-52 / RN-10).
 */

export const SOPORTE_EMAIL = "soporte@sneakercalzados.com.ar";
export const SOPORTE_WHATSAPP_NUMERO = "5493447400000";
export const SOPORTE_INSTAGRAM_URL = "https://instagram.com/sneakercalzados";

export function enlaceWhatsappGeneral(mensaje?: string): string {
  const texto =
    mensaje ??
    "Hola Sneaker! Necesito ayuda con una consulta, cancelación o reclamo.";
  return `https://wa.me/${SOPORTE_WHATSAPP_NUMERO}?text=${encodeURIComponent(texto)}`;
}

export function enlaceCorreoGeneral(asunto?: string, cuerpo?: string): string {
  const params = new URLSearchParams();
  if (asunto) params.set("subject", asunto);
  if (cuerpo) params.set("body", cuerpo);
  const query = params.toString();
  return `mailto:${SOPORTE_EMAIL}${query ? `?${query}` : ""}`;
}

export function enlacesReclamoPedido(numeroOrden: string, montoTotal: string) {
  const mensaje = `Hola Sneaker! Me comunico por el pedido #${numeroOrden} (Total: ${montoTotal}) para solicitar asistencia / cancelación / reclamo.`;
  const asunto = `Pedido #${numeroOrden} - Cancelación, reclamo o reembolso`;
  return {
    whatsapp: enlaceWhatsappGeneral(mensaje),
    correo: enlaceCorreoGeneral(asunto, mensaje),
  };
}
