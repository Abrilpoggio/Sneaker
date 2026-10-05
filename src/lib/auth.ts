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

/**
 * Configuracion de autenticacion (Sprint 1 - RF-12, RF-13, RF-14, RNF-08).
 *
 * Estrategia JWT: el token viaja en una cookie httpOnly firmada y no se
 * guarda ninguna sesion en la base de datos. Es lo que pide el enunciado
 * del sprint ("autenticacion JWT y roles") y evita mantener una tabla de
 * sesiones que nunca se limpia.
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
    maxAge: 60 * 60 * 24 * 7,
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  trustHost: true,

  providers,

  callbacks: {
    /**
     * Copia los datos de autorizacion al token. Corre en cada peticion,
     * asi que tiene que ser barato.
     */
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.rol = (user as { rol?: RolUsuario }).rol ?? RolUsuario.CLIENTE;
        token.usuario = (user as { usuario?: string }).usuario;
      }
      return token;
    },

    /** Expone el rol al resto de la aplicacion. RNF-08 depende de esto. */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.rol = (token.rol as RolUsuario) ?? RolUsuario.CLIENTE;
        session.user.usuario = token.usuario as string | undefined;
      }
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
