# Teach Pro — Plataforma SaaS para Clases Online

Plataforma multi-tenant para profesores de idiomas. Reservas, pagos (Wompi), Google Calendar/Meet, recordatorios automáticos, webchat bot. Optimizada para Colombia.

## Stack

| Componente | Tecnología |
|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| API | Express + BullMQ |
| Worker | BullMQ processors + node-cron |
| DB | PostgreSQL + Prisma |
| Cache/Queue | Redis |
| Pagos | Wompi (Colombia) |
| Meetings | Google Calendar API + Meet |
| Email | Resend |

## Estructura del Monorepo

```
teach-pro/
├── apps/
│   ├── api/         → Express API + BullMQ queues
│   ├── web/         → Next.js frontend
│   └── worker/      → BullMQ processors + cron scheduler
├── packages/
│   ├── db/          → Prisma schema + seed
│   └── shared/      → Zod schemas + TypeScript types
├── docker-compose.yml
├── openapi.yaml
└── .env.example
```

## Setup Local

### 1. Prerrequisitos

- Node.js 18+
- Docker y Docker Compose (para Postgres y Redis)
- Cuenta Google Cloud (para Calendar API)
- Cuenta Wompi Sandbox (para pagos)

### 2. Clonar y configurar

```bash
# Clonar
git clone <repo> && cd teach-pro

# Crear .env desde el ejemplo
cp .env.example .env
# Editar .env con tus credenciales
```

### 3. Levantar con Docker (recomendado)

```bash
# Levantar Postgres + Redis
docker-compose up -d postgres redis

# Instalar dependencias
npm install

# Generar Prisma client
npm run db:generate

# Ejecutar migraciones
npx prisma migrate dev --schema packages/db/prisma/schema.prisma

# Seed (datos demo)
npm run db:seed

# Levantar servicios
npm run dev:api     # http://localhost:4000
npm run dev:web     # http://localhost:3000
npm run dev:worker  # Workers + scheduler
```

### 4. O levantar TODO con Docker

```bash
docker-compose up --build
```

## Cuentas Demo (después del seed)

| Rol | Email | Contraseña |
|---|---|---|
| Super Admin | admin@teachpro.app | Admin123! |
| Profesora (tenant_admin) | profe@profefrances.co | Profe123! |
| Alumno 1 | carlos@example.com | Student123! |
| Alumno 2 | lucia@example.com | Student123! |

**Tenant demo:** `profe-frances-co` → http://localhost:3000/t/profe-frances-co

## Configurar Google Calendar/Meet

1. Ir a [Google Cloud Console](https://console.cloud.google.com/)
2. Crear proyecto → Habilitar Google Calendar API
3. Crear credenciales OAuth 2.0
4. Redirect URI: `http://localhost:4000/auth/google/callback`
5. Copiar `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` al `.env`
6. Obtener refresh token usando el flujo OAuth
7. Agregar `GOOGLE_REFRESH_TOKEN` al `.env`

## Configurar Wompi

1. Crear cuenta en [Wompi Sandbox](https://comercios.wompi.co/login)
2. Obtener keys de sandbox
3. Copiar al `.env`:
   - `WOMPI_PUBLIC_KEY`
   - `WOMPI_PRIVATE_KEY`
   - `WOMPI_EVENTS_SECRET`
4. Configurar webhook URL en Wompi:
   - URL: `https://tu-dominio.com/t/profe-frances-co/payments/webhook/wompi`
   - Eventos: `transaction.updated`

## Workers y Scheduler

El worker ejecuta:

| Job | Frecuencia | Acción |
|---|---|---|
| Reminder 24h | Cada 15 min | Email recordatorio |
| Reminder 1h | Cada 15 min | Email recordatorio |
| Payment Chase | Diario 9AM COL | 3 intentos → cancelar |
| Follow Up | Diario 8PM COL | Email + CTA renovar |
| Calendar | On-demand | Crear/actualizar/eliminar evento |
| Email | On-demand | Enviar emails con Resend |
| Welcome | On-demand | Mensaje de bienvenida |

## API Endpoints

Ver [`openapi.yaml`](./openapi.yaml) para la especificación completa.

### Principales:

```
POST /auth/login                            → Login
GET  /auth/me                               → Usuario actual
POST /t/{slug}/public/leads                 → Crear lead
GET  /t/{slug}/public/slots                 → Slots disponibles
POST /t/{slug}/bookings                     → Reservar clase
GET  /t/{slug}/me/lessons                   → Mis clases
POST /t/{slug}/lessons/{id}/reschedule      → Reprogramar
POST /t/{slug}/lessons/{id}/cancel          → Cancelar
POST /t/{slug}/payments/checkout            → Checkout Wompi
POST /t/{slug}/payments/webhook/wompi       → Webhook Wompi
POST /t/{slug}/bot/incoming                 → Bot webchat
GET  /t/{slug}/admin/lessons                → Clases (admin)
GET  /t/{slug}/admin/students               → Alumnos (admin)
GET  /t/{slug}/admin/payments               → Pagos (admin)
GET  /t/{slug}/admin/reports/summary        → Reportes
```

## Flujo end-to-end

```
1. Lead llena formulario → se loguea en message_log → job: welcome
2. Alumno reserva clase → lesson status=reserved
3. Si tiene pack → confirma, descuenta crédito, crea calendar+meet
4. Si no → genera checkout Wompi → alumno paga
5. Webhook Wompi APPROVED → lesson confirmed → calendar+meet → email confirmación
6. Cron 24h → email recordatorio
7. Cron 1h → email recordatorio
8. Post-clase → cron marca completed → email follow-up
```

## Checklist Producción

- [ ] Cambiar JWT_SECRET y JWT_REFRESH_SECRET (32+ chars)
- [ ] Configurar HTTPS / SSL
- [ ] Configurar dominio y DNS
- [ ] Wompi: pasar a producción (keys reales)
- [ ] Google Calendar: verificar app OAuth
- [ ] Resend: configurar dominio verificado
- [ ] Postgres: backups automáticos (pg_dump o servicio managed)
- [ ] Redis: persistencia RDB/AOF
- [ ] Rate limiting en producción (más estricto)
- [ ] Logs centralizados (Datadog, Loki, etc.)
- [ ] Monitoreo alertas: jobs fallidos, webhooks rechazados
- [ ] Health checks en load balancer
- [ ] CORS: restringir orígenes en producción
- [ ] Variables de entorno en secrets manager
- [ ] CI/CD pipeline (GitHub Actions / GitLab CI)
- [ ] Tests e2e automatizados
