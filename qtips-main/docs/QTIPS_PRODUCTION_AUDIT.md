# QTIPS — Auditoría de Producción

**Fecha:** 2026-08-04  
**Auditor:** Claude Sonnet 4.6

---

## 1. Arquitectura actual

| Capa | Tecnología |
|---|---|
| Frontend | React Native 0.81 + Expo 54 (expo-router v6) |
| Routing | File-based routing (expo-router) |
| Auth | Firebase Auth (email/password) |
| Base de datos | Cloud Firestore (NoSQL) |
| Backend | Firebase Cloud Functions (Node 20, europe-west1) |
| Deploy | Vercel (static web export via `npx expo export --platform web`) |
| Lenguaje | TypeScript 5.9 estricto |
| Diseño | StyleSheet nativo + design system en `constants/theme.ts` |

El proyecto es una Single Page Application (SPA) exportada de forma estática a Vercel. El backend vive en Firebase Cloud Functions. No hay servidor Next.js ni Supabase — todo es Firebase.

---

## 2. Rutas existentes

| Ruta | Descripción | Auth |
|---|---|---|
| `/` → `(tabs)/index` | Redirect automático según sesión | — |
| `/login` | Login / Registro | No |
| `/home` | Dashboard principal | Sí |
| `/qr` | Pantalla de QR | Sí |
| `/settings` | Ajustes | Sí |
| `/settings/bank` | Cuenta bancaria (IBAN) | Sí |
| `/settings/employees` | Gestión de empleados | Sí |
| `/stats` | Estadísticas | Sí |
| `/setup-restaurant` | Onboarding restaurante | Sí |

---

## 3. Firestore — Colecciones actuales

### `restaurants/{uid}`
Keyed por el UID del propietario (Firebase Auth).

| Campo | Tipo | Descripción |
|---|---|---|
| `name` | string | Nombre del restaurante |
| `address` | string | Dirección |
| `phone` | string | Teléfono |
| `website` | string | Web / Instagram |
| `category` | string | Tipo de local |
| `ownerId` | string | UID del propietario |
| `bankHolder` | string | ⚠️ Titular IBAN (a eliminar) |
| `bankIban` | string | ⚠️ IBAN almacenado (a eliminar) |
| `createdAt` | timestamp | Fecha de creación |
| `updatedAt` | timestamp | Última actualización |

**Nuevos campos añadidos (Stripe Connect):**

| Campo | Tipo | Descripción |
|---|---|---|
| `stripe_account_id` | string | ID cuenta Express de Stripe |
| `stripe_onboarding_complete` | boolean | Onboarding terminado |
| `stripe_charges_enabled` | boolean | Puede recibir pagos |
| `stripe_payouts_enabled` | boolean | Puede recibir transferencias |
| `stripe_details_submitted` | boolean | Datos enviados a Stripe |
| `stripe_account_status` | string | Estado derivado |
| `stripe_requirements_due` | string[] | Requisitos pendientes |
| `stripe_last_synced_at` | timestamp | Última sincronización |
| `tip_distribution_mode` | string | `restaurant` / `employee_optional` / `employee_required` |

### `restaurants/{uid}/employees/{empId}`

| Campo | Tipo | Descripción |
|---|---|---|
| `name` | string | Nombre |
| `role` | string | Puesto |
| `status` | string | `active` / `inactive` (nuevo) |
| `createdAt` | timestamp | Fecha de creación |

### `tips/{tipId}`

| Campo | Tipo | Descripción |
|---|---|---|
| `restaurantId` | string | UID del restaurante |
| `employeeId` | string\|null | Empleado atribuido |
| `employeeName` | string | Nombre del empleado |
| `amount` | number | Importe en euros |
| `amountCents` | number | Importe en céntimos |
| `feeCents` | number | Comisión QTIPS en céntimos |
| `currency` | string | `"eur"` |
| `stripeCheckoutSessionId` | string | ID de la sesión de Checkout |
| `stripePaymentIntentId` | string | ID del PaymentIntent |
| `status` | string | `pending` / `paid` / `failed` / `refunded` |
| `isTest` | boolean | Pago de prueba |
| `createdAt` | timestamp | Fecha |
| `paidAt` | timestamp\|null | Fecha de pago confirmada |

### `stripe_events/{eventId}` (nueva)

| Campo | Tipo | Descripción |
|---|---|---|
| `stripe_event_id` | string | ID único del evento |
| `event_type` | string | Tipo de evento |
| `status` | string | `processing` / `processed` / `error` |
| `error_message` | string\|null | Error si falló |
| `processed_at` | timestamp\|null | Fecha de procesamiento |
| `created_at` | timestamp | Fecha de recepción |

---

## 4. Cloud Functions

| Función | Acceso | Descripción |
|---|---|---|
| `getRestaurant` | Público | Devuelve nombre, empleados activos, si puede recibir pagos |
| `registerTip` | Secreto compartido | **Deprecated** — crear propinas vía endpoint legacy |
| `createConnectOnboardingLink` | Auth Firebase | Crea/recupera cuenta Express y genera link de onboarding |
| `syncStripeAccount` | Auth Firebase | Sincroniza estado de la cuenta Stripe |
| `createCheckoutSession` | Público | Crea sesión de Stripe Checkout para una propina |
| `stripeWebhook` | Firma Stripe | Procesa eventos de Stripe con idempotencia |

---

## 5. Arquitectura de pagos

```
Cliente escanea QR
       │
       ▼
/tip/{restaurantId}  (página pública Expo Web)
       │
       ├─ GET getRestaurant → nombre, empleados, canReceiveTips
       │
       ├─ Usuario selecciona importe + empleado (opcional)
       │
       ▼
POST createCheckoutSession
       │  Valida: restaurantId, amount (0.50–500€), stripe_charges_enabled
       │  Calcula: fee = amount × QTIPS_FEE_PERCENT
       │  Crea: Stripe Checkout Session con transfer_data → stripeAccountId
       ▼
Redirige a Stripe Checkout (alojado por Stripe)
       │  Apple Pay / Google Pay / Tarjeta disponibles
       ▼
Stripe → stripeWebhook (checkout.session.completed)
       │  Verifica firma
       │  Idempotencia via stripe_events
       │  Guarda tip en Firestore con status:"paid"
       ▼
Redirige a /tip/success
```

---

## 6. Flujo de autenticación

1. Usuario va a `/` → `index.tsx` comprueba `onAuthStateChanged`
2. Sin sesión → `/login`
3. Con sesión sin restaurante → `/setup-restaurant`
4. Con sesión y restaurante → `/home`
5. Login/Registro con Firebase email/password
6. Recuperación de contraseña vía `sendPasswordResetEmail`

---

## 7. Problemas detectados y corregidos

### Críticos (seguridad)
| # | Problema | Estado |
|---|---|---|
| 1 | Sin Firestore Security Rules | ✅ Creadas en `firestore.rules` |
| 2 | IBAN almacenado en Firestore | ✅ Pantalla sustituida por Stripe Connect |
| 3 | `registerTip` acepta `amount` del cliente sin verificar Stripe | ✅ Deprecado — `stripeWebhook` es la fuente de verdad |
| 4 | Sin webhook de Stripe — pagos no se confirman server-side | ✅ Implementado `stripeWebhook` |
| 5 | Secret key de Stripe ausente | ⏳ Configurar via Firebase env vars |

### Altos
| # | Problema | Estado |
|---|---|---|
| 6 | Sin pantalla de movimientos | ✅ Implementada |
| 7 | Sin página pública de pago | ✅ Implementada en `/tip/[id]` |
| 8 | QR apunta a dominio inexistente (`pay.qtips.me`) | ✅ Actualizado a URL real |
| 9 | Sin idempotencia en registro de propinas | ✅ Implementada via `stripe_events` |

### Medios
| # | Problema | Estado |
|---|---|---|
| 10 | Saludo repetitivo en home | ✅ Saludo basado en hora del día |
| 11 | Stats no muestran importe neto | ⏳ Pendiente mejora futura |
| 12 | Sin soft-delete de empleados | ✅ Añadido campo `status` |
| 13 | Sin exportación CSV | ⏳ Pendiente Fase 2 |
| 14 | Sin PostHog / Sentry | ⏳ Pendiente Fase 5 |

---

## 8. Riesgos de seguridad residuales

1. **Firebase config pública**: `apiKey`, `projectId`, etc. están en `lib/firebase.ts`. Esto es normal en Firebase Web SDK — no son secrets. El acceso real está controlado por Firestore Security Rules y Firebase Auth.
2. **CORS `*` en Cloud Functions**: Las funciones públicas (`getRestaurant`, `createCheckoutSession`) usan `*` en CORS. Aceptable para el MVP pero se puede restringir a la URL del app en producción.
3. **Sin rate limiting**: Las funciones públicas no tienen rate limiting. Considerar Cloud Armor o un WAF en producción.
4. **bankHolder / bankIban**: Campos antiguos siguen en Firestore para datos existentes. Migrar/limpiar en producción.

---

## 9. Plan de implementación por fases

### Fase 1 — Seguridad y pagos ✅ (implementada)
- [x] Firestore Security Rules
- [x] Stripe Connect (createConnectOnboardingLink, syncStripeAccount)
- [x] Stripe Checkout + webhook
- [x] Pantalla banco → Stripe Connect
- [x] Idempotencia en eventos

### Fase 2 — Operación del restaurante ✅ (implementada)
- [x] Pantalla de movimientos
- [x] Página pública de propina `/tip/[id]`
- [x] Página de agradecimiento `/tip/success`
- [x] Navegación mejorada (4 tabs)

### Fase 3 — Dashboard ✅ (implementada)
- [x] Home: saludo por hora, métricas mejoradas
- [x] QR: URL actualizada a dominio real

### Fase 4 — Calidad (pendiente)
- [ ] PostHog analytics
- [ ] Sentry error tracking
- [ ] Tests E2E con Playwright
- [ ] Exportación CSV de movimientos
- [ ] Mejora de estadísticas (filtros, periodos)

---

## 10. Variables de entorno necesarias

Ver `.env.example` en la raíz del proyecto.

Para las Cloud Functions, configurar en Firebase:
```bash
firebase functions:config:set \
  stripe.secret_key="sk_live_..." \
  stripe.webhook_secret="whsec_..." \
  app.url="https://qtips-main.vercel.app" \
  qtips.fee_percent="2.5"
```

O como variables de entorno en Google Cloud Run (recomendado para Node 20+):
En Firebase Console → Functions → [función] → Edit → Environment variables.

---

## 11. Configuración de Stripe necesaria

1. Crear cuenta Stripe y activar Stripe Connect
2. En Dashboard Stripe > Connect > Settings:
   - Activar Express accounts
   - País: España (ES)
3. En Dashboard Stripe > Developers > Webhooks:
   - Endpoint URL: `https://europe-west1-qtips-edcc2.cloudfunctions.net/stripeWebhook`
   - Eventos a escuchar:
     - `checkout.session.completed`
     - `payment_intent.payment_failed`
     - `charge.refunded`
     - `account.updated`
   - Copiar el signing secret → `STRIPE_WEBHOOK_SECRET`
4. Copiar secret key → `STRIPE_SECRET_KEY`
5. Copiar publishable key → `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`

---

## 12. Cómo hacer un pago de prueba

1. Configurar variables de entorno (al menos `STRIPE_SECRET_KEY` en modo test)
2. Desplegar Cloud Functions: `cd functions && npm run deploy`
3. Crear un restaurante y conectar Stripe (modo test)
4. Abrir `https://qtips-main.vercel.app/tip/{restaurantId}`
5. Seleccionar importe → Pagar
6. En Stripe Checkout usar tarjeta de prueba: `4242 4242 4242 4242`
7. Verificar que aparece en `/movements`

---

## 13. Decisiones de negocio pendientes

1. **Porcentaje de comisión QTIPS**: Actualmente configurable via env var. Confirmar el % final.
2. **Plan de suscripción**: ¿Cobra QTIPS una cuota mensual además de la comisión por propina?
3. **Mínimo de propina**: Actualmente 0,50€. ¿Es el mínimo correcto?
4. **Gestión de IBANs existentes**: Los restaurantes que ya guardaron el IBAN necesitan migrar a Stripe Connect. ¿Se migran automáticamente o deben reconectarse?
5. **Países soportados**: Actualmente se crean cuentas Express en ES. ¿Se va a internacionalizar?
6. **Reparto a empleados**: El MVP registra la atribución pero el dinero siempre va al restaurante. ¿Cuándo se implementa el pago directo a empleados?
