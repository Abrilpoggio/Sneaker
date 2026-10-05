import { NextResponse, type NextRequest } from "next/server";

/**
 * Redireccion temprana de usuarios no autenticados.
 *
 * OJO CON EL ALCANCE DE ESTE ARCHIVO: aca solo se verifica que exista la
 * cookie de sesion, porque descifrar el JWT en el proxy agrega latencia a
 * cada navegacion. El control de ROL real no va aca sino en
 * `src/lib/permissions.ts`, que corre en el servidor y se aplica igual
 * aunque el usuario invente la URL. Esta capa es Convenience, no seguridad.
 *
 * En Next.js 16 este archivo se llama `proxy.ts` (antes `middleware.ts`).
 */

// Nombres de la cookie de sesion de Auth.js v5. El prefijo __Secure- se
// usa cuando la app corre sobre HTTPS.
const COOKIES_SESION = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

/** Rutas que exigen sesion de cliente (RN-01). */
const RUTAS_CLIENTE = ["/cuenta", "/carrito", "/checkout", "/favoritos", "/pedidos"];

/** Rutas exclusivas de administrador (RNF-08). */
const RUTAS_ADMIN = ["/admin"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const esAdmin = RUTAS_ADMIN.some(
    (ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`),
  );
  const esCliente = RUTAS_CLIENTE.some(
    (ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`),
  );

  if (!esAdmin && !esCliente) {
    return NextResponse.next();
  }

  const tieneSesion = COOKIES_SESION.some((nombre) =>
    request.cookies.has(nombre),
  );

  if (tieneSesion) {
    return NextResponse.next();
  }

  // Se conserva la URL destino para volver a ella despues del login.
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", pathname);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Solo se interceptan las rutas protegidas: así el catálogo público y los
  // assets estáticos no pagan el costo de este chequeo.
  matcher: [
    "/cuenta/:path*",
    "/carrito/:path*",
    "/checkout/:path*",
    "/favoritos/:path*",
    "/pedidos/:path*",
    "/admin/:path*",
  ],
};
