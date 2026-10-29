import NextAuth, { type NextAuthConfig } from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { RolUsuario } from "@/generated/prisma/enums";
import { loginSchema } from "@/modules/auth/schemas";
import { googleOAuthHabilitado } from "@/lib/env";
import { vincularCuentaGoogle } from "@/modules/auth/services/google-oauth";
import {
  DURACION_ACCESS_TOKEN_MS,
  DURACION_REFRESH_TOKEN_SEG,
  emitirRefreshToken,
  obtenerDatosUsuarioParaToken,
  verificarFirmaRefreshToken,
} from "@/modules/auth/services/token";

/**
 * Configuracion de autenticacion (Sprint 1 - RF-12, RF-13, RF-14, RF-49, RF-50, RNF-08).
 *
 * Estrategia JWT con rotacion de Refresh Token:
 * - El token viaja en una cookie httpOnly firmada con `AUTH_SECRET`.
 * - El Access Token tiene una ventana corta (`DURACION_ACCESS_TOKEN_MS`), y al
 *   vencer se ejecuta la rotacion mediante `refreshToken`, verificando en
 *   PostgreSQL que el usuario siga activo (`RN-01`) y sincronizando su rol
 *   (`ADMIN`, `CLIENTE`, `VENDEDOR`).
 */

/** RF-13: acceso con correo y contrasena. */
const proveedorCredenciales = Credentials({
  name: "Correo y contrasena",
  credentials: {
    correo: { label: "Correo", type: "email" },
    password: { label: "Contrasena", type: "password" },
  },
  async authorize(credentials) {
    // Validar siempre en el servidor: este es el punto donde se decide si
    // alguien entra, y un cliente puede mandar cualquier cosa por POST.
    const parsed = loginSchema.safeParse(credentials);

    if (!parsed.success) return null;

    const { correo, password } = parsed.data;

    const usuario = await prisma.usuario.findUnique({
      where: { correo: correo.toLowerCase() },
      include: { cliente: true },
    });

    // Mismo resultado para usuario inexistente y password incorrecto:
    // distinguirlos permite enumerar las cuentas registradas.
    if (!usuario || !usuario.passwordHash) return null;
    if (!usuario.activo) return null;

    const passwordValido = await bcrypt.compare(password, usuario.passwordHash);

    if (!passwordValido) return null;

    return {
      id: usuario.id,
      email: usuario.correo,
      name: usuario.cliente
        ? `${usuario.cliente.nombre} ${usuario.cliente.apellido}`
        : usuario.usuario,
      usuario: usuario.usuario,
      rol: usuario.rol,
    };
  },
});

// Google se agrega solo si hay credenciales cargadas, para que la app
// funcione en desarrollo antes de crear el proyecto en Google Cloud.
// Declararlo sin credenciales hace fallar el arranque de Auth.js.
const providers: Provider[] = [proveedorCredenciales];

if (googleOAuthHabilitado()) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  );
}

export const authConfig = {
  session: {
    strategy: "jwt",
    maxAge: DURACION_REFRESH_TOKEN_SEG,
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  trustHost: true,

  providers,

  callbacks: {
    /**
     * Gestiona la emision inicial del JWT (Credenciales y Google OAuth) y
     * la rotacion automatica por Refresh Token cuando expira el Access Token.
     */
    async jwt({ token, user, account }) {
      const ahora = Date.now();

      // 1. Inicio de sesion inicial
      if (user) {
        // Si entra por Google OAuth, `user.id` es el ID de Google y no el cuid()
        // de PostgreSQL. Consultamos la fila real en `usuarios` por correo.
        if (account?.provider === "google" && user.email) {
          const datosBd = await obtenerDatosUsuarioParaToken({
            correo: user.email,
          });

          if (!datosBd) {
            return { ...token, error: "UserInactive" as const };
          }

          return {
            ...token,
            sub: datosBd.id,
            email: datosBd.correo,
            name: datosBd.nombre,
            rol: datosBd.rol,
            usuario: datosBd.usuario,
            accessTokenExpires: ahora + DURACION_ACCESS_TOKEN_MS,
            refreshToken: emitirRefreshToken(datosBd.id, ahora),
            error: undefined,
          };
        }

        const userId = user.id ?? token.sub ?? "";
        const rol = (user as { rol?: RolUsuario }).rol ?? RolUsuario.CLIENTE;
        const nombreUsuario = (user as { usuario?: string }).usuario;

        return {
          ...token,
          sub: userId,
          rol,
          usuario: nombreUsuario,
          accessTokenExpires: ahora + DURACION_ACCESS_TOKEN_MS,
          refreshToken: emitirRefreshToken(userId, ahora),
          error: undefined,
        };
      }

      // 2. Peticiones subsiguientes dentro de la ventana de validez del Access Token
      if (
        typeof token.accessTokenExpires === "number" &&
        ahora < token.accessTokenExpires &&
        !token.error
      ) {
        return token;
      }

      // 3. El Access Token expiro: rotacion mediante Refresh Token
      if (
        !token.sub ||
        typeof token.refreshToken !== "string" ||
        !verificarFirmaRefreshToken(token.refreshToken, token.sub)
      ) {
        return { ...token, error: "RefreshTokenExpired" as const };
      }

      const datosActualizados = await obtenerDatosUsuarioParaToken({
        id: token.sub,
      });

      // RN-01: si el usuario fue desactivado, se invalida la sesion.
      if (!datosActualizados) {
        return { ...token, error: "UserInactive" as const };
      }

      return {
        ...token,
        sub: datosActualizados.id,
        email: datosActualizados.correo,
        name: datosActualizados.nombre,
        rol: datosActualizados.rol,
        usuario: datosActualizados.usuario,
        accessTokenExpires: ahora + DURACION_ACCESS_TOKEN_MS,
        refreshToken: emitirRefreshToken(datosActualizados.id, ahora),
        error: undefined,
      };
    },

    /** Expone el rol y el estado del token al resto de la aplicacion (RNF-08). */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.rol = (token.rol as RolUsuario) ?? RolUsuario.CLIENTE;
        session.user.usuario = token.usuario as string | undefined;
      }
      session.accessTokenExpires =
        typeof token.accessTokenExpires === "number"
          ? token.accessTokenExpires
          : undefined;
      session.error =
        token.error === "RefreshTokenExpired" || token.error === "UserInactive"
          ? token.error
          : undefined;
      return session;
    },

    /**
     * RF-13: alta o vinculacion de cuenta con Google.
     * Si el correo ya esta registrado (RF-12) se vincula el googleSub a esa
     * cuenta en lugar de crear un usuario duplicado.
     */
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      if (!profile?.email) return false;

      return await vincularCuentaGoogle({
        correo: profile.email,
        googleSub: account.providerAccountId,
        nombre: typeof profile.name === "string" ? profile.name : profile.email,
      });
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
