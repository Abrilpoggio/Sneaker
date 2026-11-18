# Sneaker E-commerce

Plataforma web responsive para Sneaker (calzado deportivo y urbano,
accesorios y kits). Envios a todo Argentina.

**Taller de Integracion · UADER / FCyT**
Rochas Tadeo · Poggio Abril · Vineg Camila

Estado: **Sprint 4 — Catálogo, carrito, checkout, pedidos, kits y extracciones.**

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
| Cuenta del proveedor de correo transaccional | Sprint 3 (RF-28, RF-44) | Resend / SendGrid / Brevo. Opcional en dev: sin clave el correo se simula en consola |
| Dominio y hosting | Sprint 4 | — |

---

## 10. Pendiente por sprint

| Sprint | Modulo | Estado |
|---|---|---|
| 1 | Infra, base de datos, auth y roles | **Hecho** |
| 2 | Catalogo, busqueda, filtros, stock visible, perfil y direcciones | **Hecho:** ABM administrativo (Abril), busqueda/filtros/stock visible (Camila) y perfil/direcciones (Tadeo) implementados localmente. Falta revision/integracion del equipo. |
| 3 | Carrito, reserva temporal, Mercado Pago, cupones, correos | **Hecho:** carrito con reserva temporal de stock (Abril), checkout con Mercado Pago + motor de cupones/promociones (Camila) y correos + newsletter + tarifas de envio (Tadeo) implementados localmente. Falta revision/integracion del equipo. |
| 4 | Panel de pedidos, kits, extracciones, reportes Excel, datos de prueba (RNF-05) | **Parcial:** kits, stock dinamico y extracciones (Camila) implementados localmente. Panel de pedidos (Abril) y reportes/seed masivo (Tadeo) pendientes. |

### Lo que falta decidir (bloquea al que siga)

| Decision | Quien la toma | Afecta |
|---|---|---|
| Politica exacta de "un unico cupon por usuario" (RN-08 dice "pendiente de precision") | Cliente (Nicolas / Agustin) | Sprint 3 |
| Tarifas de envio por ciudad y por provincia (RF-45): el codigo usa valores de ejemplo documentados en la seccion 10 | Cliente | Sprint 3 |
| Definicion de los permisos del rol SOPORTE (RF-51) | Cliente | Fuera de alcance |
| Canal de contacto para cancelaciones y reclamos (RF-52 / RN-10) | Cliente | Sprint 2 |
| Paleta y logo definitivos de Figma (RNF-03) | Equipo de diseno | Antes de la entrega |

### Alcance de Abril en Sprint 2

En `src/app/admin/productos`, `src/app/admin/variantes` y
`src/app/admin/etiquetas` se implementa el ABM asignado a Abril:

- Alta y edicion de productos con SKU, nombre, descripcion, categoria, marca,
  proveedor, precios, garantia, imagen y etiquetas.
- Baja logica/reactivacion con `EstadoProducto`; los productos historicos no
  se borran fisicamente.
- Alta, edicion y baja protegida de variantes. El stock inicial y cada ajuste
  escriben un `MovimientoStock` con responsable y justificacion.
- CRUD de etiquetas; no se permite borrar una etiqueta aun asignada.

Las imagenes subidas desde el panel se guardan en `public/productos`. Esto es
adecuado para el entorno local de la cursada; antes de desplegar se debera
reemplazar por almacenamiento persistente (por ejemplo S3 o Cloudinary), ya
que el filesystem de un hosting serverless no es almacenamiento permanente.

### Alcance de Camila en Sprint 2

En `src/modules/catalogo/catalogo.ts`, `src/app/catalogo` y
`src/app/producto/[slug]` se implementa la busqueda y el stock visible
asignado a Camila:

- Catalogo publico alimentado por la base: solo productos `ACTIVO`
  (los inactivos del ABM no se publican).
- Buscador por nombre, descripcion, SKU, marca y etiqueta de uso, con
  filtros combinables por categoria, marca, uso/deporte, talle, color,
  material y disponibilidad (RF-07). Los filtros viven en la URL
  (formularios GET), asi que un resultado filtrado es compartible.
- Ordenamiento por disponibles primero, menor/mayor precio y nombre.
  Los productos sin stock quedan al final con su indicacion y no se
  eliminan del catalogo (RF-09).
- Etiqueta "¡Ultimas N unidades!" en la tarjeta cuando el stock total
  del producto es 10 o menos, y en el detalle por cada variante
  (RF-11 / RN-09). Las tarjetas sin stock se atenúan y muestran
  "Sin stock".
- Detalle de producto con datos reales: cada variante declara su
  stock (RF-10); el stock de un kit se deriva del componente con
  menor disponibilidad (RN-06) y la vista lista sus componentes.
- RF-08 (asistente guiado de busqueda) es *Should* y queda para mas
  adelante.

Los productos de muestra del Sprint 1 (Figma) siguen resolviendo en
el detalle mientras no existan en la base.

### Alcance de Abril en Sprint 3

En `src/modules/carrito`, `src/app/carrito` y `src/app/carrito/checkout`
se implementa el carrito con reserva temporal asignado a Abril:

- Una linea por variante (`ItemCarrito`): alta, cambio de cantidad y
  baja, con el precio congelado al agregar (decision 8 del modelado).
- El tope de cantidad es el stock fisico menos lo reservado por otros
  carritos con reserva vigente (RF-21 / RN-05). Los mensajes indican
  cuantas unidades quedan.
- `iniciarReserva` ejecuta una transaccion que re-valida todas las
  lineas y fija `Carrito.reservaExpiracion` en 90 segundos (RN-04:
  ventana de 1 a 2 minutos). Si otro cliente reservo antes, la compra
  no avanza y se informa por linea.
- Mientras la reserva esta vigente el carrito queda congelado; se
  libera con "Cancelar reserva" o automaticamente al vencer. La
  liberacion no requiere procesos externos: el stock reservado se
  calcula sumando items de carritos con `reservaExpiracion` en el
  futuro, asi que al vencer deja de computar solo.
- `/carrito/checkout` muestra el resumen con temporizador visible.
  Los pasos siguientes (direccion RF-18, cupones RF-22, pago RF-24)
  se integran sobre esta reserva en las tareas de Camila y Tadeo.
- Sin sesion no hay carrito: `requireCliente()` redirige a login
  (RN-01) y las server actions re-verifican contra la base.

Limitacion resuelta en Sprint 4: los kits ya se agregan al carrito como
una linea propia y, al venderse, descuentan individualmente el stock de
sus componentes (ver "Alcance de Camila en Sprint 4").

Los tokens de `src/app/globals.css` ya no son provisionales: salieron del
mockup de Figma (ver seccion 7). Cambiar la identidad visual es editar
ese archivo, no 40 componentes.

### Alcance de Camila en Sprint 3

En `src/modules/checkout`, `src/app/carrito/checkout`,
`src/app/pedido/[numeroOrden]` y `src/app/api/pagos/webhook` se
implementa el checkout asignado a Camila (RF-22 a RF-27, RN-05, RN-08):

- El pedido se crea en dos fases: `crearPedidoPendiente` congela
  montos, items, cupon, promociones y envio sin tocar stock; la
  aprobacion del pago (`aprobarPedidoPendiente`) descuenta stock con
  guardas atomicas (`updateMany` + `stockActual >= cantidad`, RN-05),
  escribe `MovimientoStock` tipo VENTA con responsable y pedido
  (RF-26/RN-07) y vacia el carrito. El estado PENDIENTE se agrego al
  enum `EstadoPedido` para representar el pago en curso.
- Mercado Pago (RF-24): con `MERCADO_PAGO_ACCESS_TOKEN` definido el
  checkout crea una preferencia de Checkout Pro
  (`external_reference` = numero de orden) y redirige al comprador.
  El webhook consulta `GET /v1/payments/{id}` antes de confirmar: nunca
  se confia en el cuerpo del POST. La aprobacion es idempotente
  (webhooks repetidos no re-descuentan stock).
- Sin credenciales, el pago simulado recorre exactamente el mismo
  camino de dos fases: la demo no depende de MP y activar el modo real
  es solo definir la variable. El webhook no llega a localhost en dev
  (hace falta tunel); el modo simulado es el camino probado.
- Promociones (RF-41 en lectura): una promocion vigente con lista de
  productos vacia es global; si varias cubren el mismo producto se
  aplica la de mayor porcentaje (no acumulativas, RN-08) y el descuento
  queda auditado por pedido en `PedidoPromocion`.
- Cupon (RF-22): se valida contra la base (activo y dentro de su
  ventana) y se aplica sobre el subtotal con promociones ya
  descontadas. RN-08: un cupon por compra; el alcance exacto de "por
  usuario" sigue pendiente de precision del cliente, hoy se limita a
  uno por pedido conservado en la cookie `sneaker_cupon`.
- Pago rechazado (RF-25): el pedido queda RECHAZADO, el stock no se
  descuenta y el carrito se conserva para reintentar; si el stock se
  agoto durante el cobro, el rechazo tambien queda registrado.
- Confirmacion (RF-27): `/pedido/SNK-...` muestra items, promociones,
  cupon, envio y estado, visible solo para su comprador (control de
  propiedad en el servicio).

Alcance pendiente de este modulo: la direccion se toma de la
predeterminada (seleccion durante la compra = RF-18, tarea separada) y
el ABM administrativo de cupones/promociones (RF-41/42) no tiene
responsable asignado; el seed ya trae el cupon `BIENVENIDO10` y la
promocion "Temporada Basketball" para probar. El costo de envio (RF-45)
ya esta integrado al checkout por Tadeo (ver seccion siguiente).

Verificacion: `npx tsx scripts/prueba-checkout.ts` corre un arnes de
verificaciones contra la base (cupones, combinacion promo+cupon,
pedido pendiente, aprobacion idempotente, rechazo RF-25, carrera por
stock RN-05, mas las pruebas de Tadeo en la seccion siguiente). Cada
corrida descuenta stock real y crea pedidos de prueba: correr el seed
para restaurar.

### Alcance de Tadeo en Sprint 3

En `src/modules/envios`, `src/modules/emails`, `src/modules/newsletter`,
`src/app/newsletter` y `src/app/admin/newsletter` se implementan los
requerimientos asignados a Tadeo:

- **Tarifas de envio (RF-45)** en `src/modules/envios/tarifas.ts`: la
  tarifa es una sola por pedido. Si el destino es la ciudad de la
  tienda (Concepcion del Uruguay) se cobra la tarifa base; si es otra
  ciudad se cobra la tarifa de su provincia, con un valor por defecto
  para provincias sin tarifa cargada. La comparacion normaliza
  mayusculas y acentos. La tarifa se calcula desde la direccion
  congelada en el snapshot del pedido, se muestra en el desglose del
  checkout y `montoTotal` = productos con descuentos + envio (asi el
  pago cobra el total con envio incluido).
- **Correo de confirmacion (RF-28)** en `src/modules/emails`: despues
  de que el pago queda aprobado (simulado o webhook de MP) se envia un
  correo con el detalle de los productos, los descuentos aplicados
  (promociones, cupon y envio) y el agradecimiento. Un fallo del
  proveedor NUNCA rompe la compra ya confirmada: se loguea y el pedido
  sigue confirmado. Sin `RESEND_API_KEY` el modo simulado escribe el
  correo completo en la consola del servidor, asi el flujo queda
  demostrable sin cuenta de Resend.
- **Suscripcion al newsletter (RF-43)**: pagina publica `/newsletter`
  que pide unicamente el correo, sin cuenta. El alta es idempotente
  (nuevo / ya suscripto / reactivado tras una baja) y si el visitante
  ya tiene sesion la fila se enlaza a su usuario, tal como pide el
  comentario del modelo `SuscripcionNewsletter` en el schema.
- **Envio de novedades (RF-44)**: pagina de administracion
  `/admin/newsletter` (exclusiva de ADMIN, RNF-08) con un formulario
  asunto/mensaje que envia la campana a todas las suscripciones
  activas. Un fallo individual no corta la campana. El boton
  "Suscribete a NewsLetter" del home apunta a `/newsletter`.

Los valores de las tarifas (base 5000, por provincia) son **de
ejemplo**: el cliente todavia no definio los definitivos (decision
pendiente en la seccion 10). Estan concentrados en un archivo, asi que
cambiarlos es editar constantes. Los correos salen por Resend con
`RESEND_API_KEY`; el remitente se configura en `CORREO_REMITENTE`
(ver `.env.example`).

Verificacion: el mismo arnes agrega verificaciones de Tadeo: tarifas
por ciudad/provincia/normalizacion (RF-45), contenido del correo de
confirmacion y modo simulado (RF-28), ciclo de vida de la suscripcion
y campana de novedades (RF-43/44).

### Alcance de Abril en Sprint 4

En `src/modules/pedidos`, `src/app/admin/pedidos`, `src/app/cuenta/pedidos` y
`prisma/seed.ts` se implementa el panel administrativo de pedidos, el
seguimiento de estados de despacho, el historial de compras del cliente y la
poblacion integral del catalogo asignados a Abril:

- **Panel administrativo de pedidos (`/admin/pedidos` — RF-30 / RF-31 / RF-46 / CU12)**:
  vista exclusiva para rol `ADMIN` (`requireAdmin()`) con tarjetas de conteo
  por estado (`CONFIRMADO`, `PREPARANDO`, `EN_CAMINO`, `RECIBIDO`, `PENDIENTE`,
  `CANCELADO`, `RECHAZADO`), filtro por estado y buscador por numero de orden
  (`SNK-...`), nombre, apellido o correo del comprador. Incluye boton para
  generar un pedido de ejemplo si la base aun no registra ventas.
- **Maquina de estados de despacho y restauracion de stock (RF-30 / RF-31 / RF-37)**:
  `actualizarEstadoPedidoAdmin` valida las transiciones permitidas
  (`CONFIRMADO` → `PREPARANDO` → `EN_CAMINO` → `RECIBIDO`, o paso a
  `CANCELADO` antes de entregarse). Si un pedido con stock ya descontado se
  cancela (`RF-37`), dentro de una unica transaccion de Prisma se restituyen
  las unidades a cada variante (incluyendo los componentes congelados en
  `componentesKit` cuando la linea corresponde a un kit) y se registra el
  `MovimientoStock` de tipo `INGRESO` con justificacion, stock resultante y el
  administrador responsable.
- **Historial de compras y seguimiento del cliente (`/cuenta/pedidos` y `/pedido/[numeroOrden]` — RF-32 / CU11)**:
  cada comprador autenticado consulta todas sus ordenes con su barra visual de
  progreso de despacho (`BarraProgresoPedido`: Confirmado → Preparando → En
  camino → Recibido), detalle de articulos, descuentos y direccion congelada en
  el snapshot del pedido.
- **Repetir compra anterior (`RF-33` / `CU10`)**: desde `/cuenta/pedidos` y
  `/pedido/[numeroOrden]`, el boton *Repetir compra* vuelca al carrito actual
  las variantes del pedido historico verificando el stock disponible al momento
  de la accion e informando si algun articulo se encuentra agotado.
- **Poblacion y curaduria del catalogo (`RNF-05`)**: ampliacion de
  `prisma/seed.ts` a 42 productos unicos (29 modelos de calzado, 3 packs de
  medias, 6 accesorios/cordones/cuidado y 4 kits/combos con stock dinamico)
  distribuidos en las 8 categorias y 14 marcas, con fotografia de estudio
  normalizada sobre fondo `#2C2C2C`, orientacion uniforme y variantes por
  talle, color y material (incluyendo casos con stock 0 para `RF-09` y ≤ 10
  unidades para el aviso `RN-09`).

### Alcance de Camila en Sprint 4

En `src/modules/kits`, `src/modules/inventory`, `src/app/admin/kits` y
`src/app/admin/extracciones` se implementa la gestion de kits y
extracciones asignada a Camila:

- **ABM de kits (RF-38 / RF-39)**: `/admin/kits` lista los kits con su
  composicion y stock calculado. El alta crea el producto compuesto y
  sus componentes en una sola transaccion; la edicion sincroniza la
  composicion y la baja es logica (ACTIVO/INACTIVO) para conservar el
  historial. La eliminacion fisica solo se permite si el kit nunca se
  vendio ni esta en un carrito.
- **Stock dinamico (RN-06)**: el stock de un kit no se persiste. Se
  calcula como `min(floor(stockComponente / cantidadPorKit))` en
  `src/modules/inventory/services/stock.ts`, formula compartida por el
  catalogo, el panel y el checkout. Cambiar el stock de una variante
  actualiza automaticamente el stock del kit.
- **Descuento individual al venderse (RF-38 / RN-07)**: el kit se agrega
  al carrito como una linea propia (`ItemCarrito.kitProductoId`) y al
  aprobarse el pago se descuenta cada variante componente por
  `cantidadKits * cantidadComponente`, con un `MovimientoStock` tipo
  VENTA por variante. La reserva temporal (RN-04) y la disponibilidad
  del carrito tambien cuentan los componentes de los kits, incluso si
  comparten variantes con otras lineas. La composicion se congela en
  `ItemPedido.componentesKit`, asi una edicion posterior del kit no
  cambia el stock que se descuenta al aprobar el pago.
- **Extracciones (RF-36)**: `/admin/extracciones` registra una
  extraccion con variante, cantidad, motivo obligatorio y responsable
  (usuario de la sesion). El descuento es atomico (`stockActual >=
  cantidad`) y crea un `MovimientoStock` tipo EXTRACCION con motivo,
  fecha y stock resultante; nunca computa como venta (RN-07). El
  historial muestra responsable, motivo y trazabilidad por producto.

Migracion: `prisma/migrations/20261117120000_kits_carrito_extracciones`
agrega `kitProductoId` a `items_carrito`/`items_pedido`, el snapshot
`componentesKit` al pedido y vuelve opcional `varianteProductoId` (una
linea apunta a una variante o a un kit, nunca a ambos).

Verificacion: `npx tsx scripts/prueba-kits.ts` comprueba el stock
calculado, la reserva de un kit, la venta con descuento individual de
componentes y el registro de extracciones. Como el resto de los
arneses, modifica stock real: correr `npm run db:seed` para restaurar.

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
