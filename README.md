# Sneaker E-commerce

Plataforma web responsive para Sneaker (calzado deportivo y urbano,
accesorios y kits). Envios a todo Argentina.

**Taller de Integracion · UADER / FCyT**
Rochas Tadeo · Poggio Abril · Vineg Camila

Estado: **Sprint 1 — Infraestructura, base de datos y autenticacion.**

---

## 1. Stack tecnologico

| Capa | Tecnologia | Version | Motivo |
|---|---|---|---|
| Framework | Next.js (App Router) + React | 16.3.8 / 19.2 | Un solo proyecto para interfaz y API. Con 12 h/semana entre 3 personas, mantener dos repos es inviable. |
| Lenguaje | TypeScript | 5 | El modelo de datos son 17 clases con muchas relaciones: los tipos pagan solos. |
| Estilos | Tailwind CSS | 4 | Implementar el diseno de Figma en horas y no en dias. |
| Base de datos | PostgreSQL | 17 (Docker) | Imagen del UML: modelado relacional con N:M. |
| ORM | Prisma | 7.10 | El diagrama de clases se traduce casi 1:1 y genera las tablas puente solo. |
| Autenticacion | Auth.js (NextAuth) | 5 beta | JWT con cookie httpOnly, credenciales + Google OAuth (RF-13). |
| Validacion | Zod | 4 | Mismo schema en el formulario y en el servidor. |
| Hash de contrasenas | bcryptjs | 3 | JS puro: no necesita compilar nada en Windows. |

> **Nota sobre versiones.** Next.js 16 renombro `middleware.ts` a `proxy.ts`
> (ver seccion 8). Prisma 8 esta en release candidate, por eso se fijo la
> linea estable **7**. `next-auth` publica su v5 bajo la etiqueta `beta`;
> es la version estable de facto para App Router y es la que exige el
> enunciado del sprint ("autenticacion JWT").

---

## 2. Puesta en marcha

### Requisitos

- Node.js 20 o superior
- Docker Desktop (para PostgreSQL local)

### Pasos

```bash
# 1. Instalar dependencias (el postinstall genera el cliente de Prisma)
npm install

# 2. Crear el archivo de variables de entorno
cp .env.example .env
#    En Windows: copy .env.example .env

# 3. Generar el secreto de autenticacion y pegarlo en AUTH_SECRET
npx auth secret

# 4. Levantar PostgreSQL
npm run db:up

# 5. Crear las tablas y cargar los datos de prueba
npm run db:migrate
npm run db:seed

# 6. Arrancar
npm run dev
```

Abrir <http://localhost:3000>.

### Cuentas de prueba

| Correo | Contrasena | Rol |
|---|---|---|
| `admin@sneaker.test` | `sneaker1234` | ADMIN |
| `cliente@sneaker.test` | `sneaker1234` | CLIENTE |
| `cliente2@sneaker.test` | `sneaker1234` | CLIENTE |

### Puerto de PostgreSQL

`docker-compose.yml` publica el contenedor en el **puerto 5433 del host**
porque en la maquina de desarrollo el 5432 ya estaba ocupado por otro
proyecto. Si en la tuya esta libre:

1. Cambiar `"5433:5432"` por `"5432:5432"` en `docker-compose.yml`.
2. Actualizar `DATABASE_URL` en `.env`.

El puerto 5433 es interno del contenedor; la base siempre escucha en 5432
adentro.

---

## 3. Comandos

| Comando | Que hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de produccion |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:up` / `db:down` | Levantar / bajar PostgreSQL |
| `npm run db:migrate` | Crear y aplicar una migracion |
| `npm run db:deploy` | Aplicar migraciones existentes (CI, produccion) |
| `npm run db:generate` | Regenerar el cliente de Prisma |
| `npm run db:seed` | Cargar datos de prueba (idempotente) |
| `npm run db:reset` | **Destructivo**: borra la base y la recarga |
| `npm run db:studio` | Prisma Studio: ver y editar datos en el navegador |
| `npm run db:sql` | Imprimir el DDL del schema sin tocar la base |

> `npm run db:seed` se puede ejecutar las veces que haga falta: usa
> `upsert`, no duplica nada.

---

## 4. Estructura del proyecto

```
prisma/
  schema.prisma          <- El modelo de datos. Fuente de verdad.
  migrations/            <- Migraciones versionadas
  seed.ts                <- Datos de prueba
  schema.sql             <- DDL generado (documentacion)
prisma7.config.ts        <- Config de Prisma 7 (schema, seed, datasource)

src/
  proxy.ts               <- Redireccion temprana de usuarios anonimos (Next 16)
  app/                   <- Rutas de la aplicacion
    layout.tsx           <- Layout raiz: header, footer, providers
    page.tsx             <- Inicio
    catalogo/            <- RF-01, RF-07 (Sprint 2)
    login/ registro/     <- RF-12, RF-13
    cuenta/              <- RF-15, RF-16, RF-17 (Sprint 2)
    admin/               <- RF-02, RF-31, RF-35 (Sprints 2 y 4)
    api/auth/[...nextauth]/  <- Rutas de Auth.js
  components/            <- Componentes de interfaz
    layout/              header, nav, footer, session-buttons
  lib/
    prisma.ts            <- Instancia unica de Prisma
    auth.ts              <- Configuracion de Auth.js
    auth-client.ts       <- Hooks para el navegador
    permissions.ts       <- Guardas de rol (RNF-08)
    env.ts               <- Validacion de variables de entorno
  modules/               <- Logica de negocio, agrupada por dominio
    auth/                schemas, actions, services
  generated/prisma/      <- Cliente generado (esta en .gitignore)
docs/
  diagrama-clases.md     <- Diagrama UML en Mermaid
  diagrama-mer.md        <- Modelo relacional implementado
```

**Convencion:** `lib/` es infraestructura transversal; `modules/` es
regla de negocio. Una funcion que decide si un descuento es valido va en
`modules/`, no en `lib/`.

---

## 5. Autenticacion y roles

### Estrategia

JWT en cookie `httpOnly` firmada, con estrategia `jwt` (sin tabla de
sesiones). Datos que viajan en el token: `id`, `rol`, `usuario`.

### Flujo de credenciales

1. El formulario hace POST a la server action `accionIniciarSesion`.
2. La accion valida con Zod.
3. `signIn("credentials")` invoca `authorize()` en `src/lib/auth.ts`.
4. `authorize()` busca el usuario, compara el hash con bcrypt y devuelve
   `{ id, rol, ... }` o `null`.
5. El callback `jwt` copia el rol al token.
6. El callback `session` lo expone como `session.user.rol`.

### Control de acceso (RNF-08) — dos capas

| Capa | Archivo | Que hace | Alcanzable por el usuario |
|---|---|---|---|
| Redireccion temprana | `src/proxy.ts` | Si no hay cookie de sesion, manda a `/login` | Si: es solo UX |
| Permisos reales | `src/lib/permissions.ts` | `requireAdmin()` corta el render | No: corre en el servidor |

Ocultar el enlace "Panel" del menu **no es seguridad**. Si el control
estuviera solo en el menu, alcanza con escribir `/admin` en la barra de
direcciones. Por eso `requireAdmin()` se llama dentro de la pagina.

### Google OAuth (RF-13)

Implementado y condicional. Si `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`
estan vacios, el proveedor no se registra y la app funciona igual con
credenciales locales. Ver "Bloqueos externos".

**Como habilitarlo:**

1. <https://console.cloud.google.com/> → proyecto nuevo.
2. Habilitar la API **Google Identity Platform**.
3. Pantalla de consentimiento OAuth, tipo *External*.
4. Cliente OAuth 2.0 tipo *Web application*.
5. URI de redireccion autorizado: `http://localhost:3000/api/auth/callback/google`
6. Completar `AUTH_GOOGLE_ID` y `AUTH_GOOGLE_SECRET` en `.env`.
7. Reiniciar `npm run dev`.

Si el correo de Google ya esta registrado con contrasena, se vincula la
cuenta existente en lugar de crear un duplicado
(`src/modules/auth/services/google-oauth.ts`).

### Verificacion del Sprint 1

Probado de punta a punta sobre la app corriendo:

| Prueba | Resultado |
|---|---|
| `GET /` anonimo | 200 (RN-01: se navega sin sesion) |
| `GET /admin` anonimo | 307 → `/login?callbackUrl=%2Fadmin` |
| Login con password incorrecta | 302 → `/login?error=CredentialsSignin`, sesion `null` |
| Login como admin | sesion `{ rol: "ADMIN" }` |
| `GET /admin` como ADMIN | 200, con conteos reales de la base |
| `GET /admin` como CLIENTE | 307 → `/` (RNF-08) |
| `GET /cuenta` como CLIENTE | 200, datos leidos de la base |

---

## 6. Decisiones de modelado

El diagrama de clases es un modelo conceptual. Estas son las desviaciones
respecto de ese modelo, con su motivo. **Estan justificadas para el
informe.**

| # | Decision | Por que |
|---|---|---|
| 1 | `Categoria` y `Marca` son tablas, no strings | El UML define `marca: String`, pero RF-07 pide filtrar por marca y la planificacion pide ABM de marcas. Un string no se puede administrar. |
| 2 | `Kit` es una tabla 1:1 con `Producto` | Prisma no tiene herencia de clases. Se materializa la generalizacion con `Kit.productoId` como PK. Sin esto habria que duplicar los 11 atributos de Producto. |
| 3 | `stockCalculado` **no** es una columna | El UML lo marca como atributo derivado, y RN-06 obliga a calcularlo del componente con menor stock. Persistirlo agrega una fuente de desincronizacion sin beneficio. Se calcula en el servicio de stock. |
| 4 | `enum` en lugar de `String` para estado, rol y tipo de movimiento | `estado: String` admite `"activo"`, `"Activo"`, `"ACTIVO"` y `""` indistintamente. Un enum hace que el valor invalido no compile. `EstadoPedido` suma `CANCELADO` y `RECHAZADO` para representar RF-25 (pago rechazado) y la restauracion de stock de RF-37. |
| 5 | `MovimientoStock.responsableId` es FK a `Usuario`, no `String` | RF-36 exige conservar la identificacion del responsable. Un string puede quedar desincronizado o permitir borrados fantasma. FK no. |
| 6 | `Pedido.datosEnvio` es un snapshot JSON de la direccion | El UML lo modela como FK a `Direccion`. Si el cliente edita o borra su direccion despues de comprar, el pedido historico deja de reflejar donde se envio. RNF-09 pide conservar la informacion para consultas historicas. |
| 7 | `ItemPedido` copia `nombre` y `sku` ademas del precio | El UML solo congela el precio. Si el producto se renombra, el pedido deja de ser legible y RF-33 (repetir compra) no puede ofrecerlo tal como se compro. |
| 8 | `ItemCarrito.precioUnitario` congela el precio al agregar | Sin esto, editar el precio de un producto cambia el subtotal de un carrito que el cliente ya esta por pagar. |
| 9 | `Pedido` tiene `numeroOrden` unico ademas de `id` | El UML pide que el `id` sea "numero de orden", que es algo legible para el cliente. Un `cuid()` no lo es. |
| 10 | `Producto.imagen` | El UML no lo lista, pero sin el el catalogo no se puede mostrar (RF-01). |
| 11 | `Producto.imagen` es una sola, no una tabla de imagenes | RF-02 no pide galeria. Multiples imagenes son un `Could`; agregar una tabla de imagenes ahora es trabajo que quizas no se use. |
| 12 | `Cupon` tiene `fechaVigenciaFin` | El UML solo define `fechaVigencia` (de arranque). Sin fecha de cierre un cupon nunca expira y no se puede "dar de baja cupones viejos". |
| 13 | El rol `SOPORTE` **no** existe en el enum | RF-51 esta clasificado como *Won't be* ("deben definirse antes de su implementacion"). |
| 14 | Sin tabla `ReservaStock` | RN-04 necesita reservas con vida propia por variante y expiracion de 1 a 2 minutos. Es logica del Sprint 3, no del Sprint 1. El UML solo prevee `Carrito.reservaExpiracion`, que se dejo como campo. |
| 15 | `Pedido.direccionId` quedo sin relacion en el schema | La informacion de entrega vive en `datosEnvio` (decision 6). Referenciar ademas la fila de Direccion seria una segunda fuente de verdad. |

### Constraints que existen en el schema

- `(productoId, talle, color, material)` unico en variantes → no se puede crear dos veces la misma combinacion.
- `(carritoId, varianteProductoId)` unico en items del carrito → un producto no ocupa dos lineas.
- `carritos.clienteId` unico → exactamente un carrito por cliente (UML).
- `correo`, `usuario`, `dni`, `sku`, `codigo`, `numeroOrden`, `cuit` unicos.

---

## 7. Identidad visual (RNF-03)

Los tokens de `src/app/globals.css` **no son inventados**: se extrajeron del
archivo de Figma con `npm run figma`. El comando escribe:

| Salida | Que es |
|---|---|
| `docs/design-tokens.json` | Colores con su frecuencia de uso, estilos de texto, pantallas y componentes |
| `.figma-cache/*.json` | Detalle por pantalla: geometria, auto-layout, radios y sombras de cada nodo |

El script es reproducible: si el mockup cambia, se corre `npm run figma` y se
lee el diff. Requiere `FIGMA_ACCESS_TOKEN` en `.env`
([generar aqui](https://www.figma.com/settings/personal-access-tokens),
scope minimo `file_content:read`).

### Paleta

| Token | Hex | Origen en Figma |
|---|---|---|
| Marca | `#CF1A1F` | 463 usos, el rojo principal |
| Marca hover | `#7C0300` | 156 usos, tono oscuro |
| Marca suave | `#FFCDD2` | tinte rosado |
| Fondo / suave | `#FFFFFF` / `#F5F5F5` | 3549 / 2054 usos |
| Texto / medio / suave / tenue | `#000000` / `#2C2C2C` / `#4E4E4E` / `#9E9E9E` | 973 / 706 / 28 / 159 usos |
| Borde | `#D9D9D9` | 88 usos |

Radios observados: 5, 10, 16, 20, 25 y 30 px (`--radius-card` = 30 px).
Escala tipografica observada: 12 a 56 px, con 14/16/18/20/24 como tamanos
frecuentes.

### Decisiones tomadas sobre el archivo de Figma

El mockup tiene tres rojos y cinco familias tipograficas. Se resolvio
así:

| En Figma | Decision | Motivo |
|---|---|---|
| `#CF1A1F`, `#E53935`, `#7C0300` | **`#CF1A1F` es el color de marca.** `#7C0300` queda como hover. `#E53935` se reasigna al rojo de marca. | Con tres valores para el mismo concepto, el codigo termina con dos clases de boton casi identicas. Un solo rojo hace el sitio consistente. |
| Montserrat, Inter, Work Sans, Lexend, Boldonse | **Solo Montserrat.** | Montserrat aparece en 48 de los 68 estilos de texto. Las otras cuatro familias tienen entre 1 y 13 usos: son restos de otra plantilla. Cada familia extra es una descarga web y una fuente de inconsistencia. |

### Limitacion conocida

La extraccion es numerica: colores, tipografias, medidas, radios, sombras y
auto-layout. **La revision visual final del mockup no es automatica.** Hay que
comparar la pantalla contra el diseno a ojo.

### Deuda tecnica del archivo de Figma

Estos puntos son del archivo, no del codigo, y conviene cerrarlos:

| # | Problema | Como se corrige |
|---|---|---|
| 1 | Los componentes se llaman `Property 1=Default`, `Propiedad 1=Loading anim 1` | Figma genera esos nombres cuando el componente no fue nombrado. Renombrarlos convierte el archivo en un entregable presentable. |
| 2 | 68 estilos de texto para una escala de 11 tamanos | Agrupar por rol (titulo, cuerpo, auxiliar) y quedarse con los que se usan. |
| 3 | Rectangle de 457x411 con relleno `#E53935` en "Reutilizables" | Confirmar si es una tarjeta de producto real o un bloque de relleno del layout. Si es relleno, aplicarle un color neutro. |

---

## 8. Breaking changes que afectaron al proyecto

Next.js 16 cambio varias convenciones respecto de lo que se conoce de
Next.js 15. Las aplicadas aca:

| Antes (Next 15) | Ahora (Next 16) | Donde |
|---|---|---|
| `src/middleware.ts`, `export function middleware()` | `src/proxy.ts`, `export function proxy()` | `src/proxy.ts` |
| `middleware` corre en runtime edge | `proxy` corre en **nodejs** y no se puede configurar | — |
| `next lint` | CLI de ESLint directo | `package.json` scripts |
| `params` / `searchParams` sincronos | Son `Promise` y hay que hacer `await` | `src/app/login/page.tsx` |
| `next lint` con config en `.eslintrc` | ESLint flat config | `eslint.config.mjs` |

Los docs versionados de Next viven en `node_modules/next/dist/docs/`.
**Leerlos antes de asumir cualquier cosa.**

---

## 9. Bloqueos externos

Dos cosas dependen de terceros y **no dependen del equipo**. Si se piden
tarde, se caen sprints enteros. Pedirlas **hoy**:

| Que | Para cuando lo necesitan | Consola |
|---|---|---|
| Proyecto en Google Cloud + credenciales OAuth | Sprint 1 (RF-13) | <https://console.cloud.google.com/> |
| Credenciales de prueba de Mercado Pago | Sprint 3 (RF-24) | <https://www.mercadopago.com.ar/developers> |
| Cuenta del proveedor de correo transaccional | Sprint 3 (RF-28, RF-44) | Resend / SendGrid / Brevo |
| Dominio y hosting | Sprint 4 | — |

---

## 10. Pendiente por sprint

| Sprint | Modulo | Estado |
|---|---|---|
| 1 | Infra, base de datos, auth y roles | **Hecho** |
| 2 | Catalogo, busqueda, filtros, stock visible, perfil y direcciones | Pendiente |
| 3 | Carrito, reserva temporal, Mercado Pago, cupones, correos | Pendiente |
| 4 | Panel de pedidos, kits, extracciones, reportes Excel, datos de prueba (RNF-05) | Pendiente |

### Lo que falta decidir (bloquea al que siga)

| Decision | Quien la toma | Afecta |
|---|---|---|
| Politica exacta de "un unico cupon por usuario" (RN-08 dice "pendiente de precision") | Cliente (Nicolas / Agustin) | Sprint 3 |
| Tarifas de envio por ciudad y por provincia (RF-45) | Cliente | Sprint 3 |
| Definicion de los permisos del rol SOPORTE (RF-51) | Cliente | Fuera de alcance |
| Canal de contacto para cancelaciones y reclamos (RF-52 / RN-10) | Cliente | Sprint 2 |
| Paleta y logo definitivos de Figma (RNF-03) | Equipo de diseno | Antes de la entrega |

Los tokens de `src/app/globals.css` ya no son provisionales: salieron del
mockup de Figma (ver seccion 7). Cambiar la identidad visual es editar
ese archivo, no 40 componentes.

---

## 11. Git

Rama principal: `main`. El trabajo entra por PR a `develop` (Scrumban, ver
planificacion de sprints).

```bash
git switch -c develop          # rama de integracion
git push -u origin develop

# para cada tarea
git switch -c feature/nombre-de-la-tarea
# ... trabajo ...
git push -u origin feature/nombre-de-la-tarea
# abrir Pull Request hacia develop
```

---

## 12. Definition of Done (checklist)

Antes de dar por terminada cualquier tarea:

- [ ] `npm run typecheck` sin errores
- [ ] `npm run lint` sin errores
- [ ] Probado en mobile (375 px) y desktop
- [ ] Las funciones de administracion no son accesibles sin rol ADMIN (probar escribiendo la URL, no solo mirando el menu)
- [ ] Pull Request abierto y aprobado por un companero
- [ ] Integrado en `develop` sin conflictos
