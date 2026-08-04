# QTIPS — Auditoría Técnica

_Fecha: 2026-08-04_

---

## 1. Stack

| Capa | Tecnología |
|------|-----------|
| Framework | **Expo 54** + **expo-router v6** |
| Render web | **React Native Web 0.21** — compila componentes RN a DOM |
| Auth | **Firebase Auth** (email/password) |
| Base de datos | **Cloud Firestore** (NoSQL) |
| Backend | **Firebase Cloud Functions** (Node 20, europe-west1) |
| Pagos | **Stripe Connect** (Express accounts) + **Stripe Checkout** (hosted) |
| Hosting | **Vercel** (SPA estática exportada con `expo export --platform web`) |
| Lenguaje | **TypeScript** strict |
| Estilos | `StyleSheet.create()` — design system en `constants/theme.ts` |
| Iconos | `@expo/vector-icons` (Ionicons) |

> **Nota**: Este proyecto usa Expo + React Native Web. La salida final es una SPA estática que funciona en cualquier navegador. No es una app nativa — es una web mobile-first compilada desde código React Native.

---

## 2. Estructura de carpetas

```
qtips-main/
├── app/
│   ├── _layout.tsx          # Root Stack (tabs + setup-restaurant + tip)
│   ├── (tabs)/
│   │   ├── _layout.tsx      # Tab bar (home, movements, qr, settings)
│   │   ├── index.tsx        # Auth guard → redirect
│   │   ├── login.tsx        # Login / Registro
│   │   ├── home.tsx         # Dashboard principal
│   │   ├── movements.tsx    # Historial de propinas (real-time)
│   │   ├── qr.tsx           # Código QR
│   │   ├── stats.tsx        # Estadísticas (OCULTA — no navegable)
│   │   ├── settings.tsx     # Ajustes
│   │   └── settings/
│   │       ├── bank.tsx     # Stripe Connect
│   │       └── employees.tsx # Gestión empleados
│   ├── setup-restaurant.tsx # Onboarding / edición restaurante
│   └── tip/
│       ├── [id].tsx         # Página pública de propinas
│       └── success.tsx      # Página de agradecimiento
├── constants/theme.ts       # Design system (C, SHADOW, RADIUS, FONT)
├── lib/firebase.ts          # Firebase client config
├── functions/src/index.ts   # Cloud Functions
├── firestore.rules          # Reglas de seguridad Firestore
├── app.json                 # Config Expo
└── vercel.json              # Config Vercel
```

---

## 3. Rutas

| Ruta | Acceso | Estado |
|------|--------|--------|
| `/` → redirect | Guard | OK |
| `/login` | Público | OK |
| `/setup-restaurant` | Autenticado | OK — sirve también como edición |
| `/home` | Autenticado | OK |
| `/movements` | Autenticado | OK |
| `/qr` | Autenticado | OK |
| `/stats` | Autenticado | **OCULTA — no navegable desde tabs** |
| `/settings` | Autenticado | OK |
| `/settings/bank` | Autenticado | OK |
| `/settings/employees` | Autenticado | OK |
| `/tip/[id]` | Público | OK |
| `/tip/success` | Público | OK |

---

## 4. Firestore Schema

### `restaurants/{uid}`
```
name, address, phone, website, category, ownerId, createdAt, updatedAt
stripe_account_id, stripe_account_status, stripe_charges_enabled,
stripe_payouts_enabled, stripe_details_submitted, stripe_onboarding_complete,
stripe_requirements_due, stripe_last_synced_at
```

### `restaurants/{uid}/employees/{id}`
```
name, role, createdAt
[FALTA]: status (active/inactive), is_tip_enabled, email, phone
```

### `tips/{id}`
```
restaurantId, employeeId, employeeName, amount, amountCents, feeCents,
currency, status, isTest, createdAt, paidAt
```

### `stripe_events/{id}`
```
stripe_event_id (unique), event_type, status, processed_at, error_message, created_at
```

---

## 5. Cloud Functions (europe-west1)

| Función | Acceso | Estado |
|---------|--------|--------|
| `getRestaurant` | Público (GET) | OK |
| `createConnectOnboardingLink` | Autenticado (Firebase token) | OK |
| `syncStripeAccount` | Autenticado | OK |
| `createCheckoutSession` | Público (POST) | OK |
| `stripeWebhook` | Stripe signature | OK |
| `registerTip` | Legacy | Deprecated |

---

## 6. Seguridad Firestore (RLS equivalente)

| Recurso | Lectura | Escritura | Estado |
|---------|---------|-----------|--------|
| `restaurants/{id}` | Solo propietario | Solo propietario | OK |
| `restaurants/{id}/employees` | Solo propietario | Solo propietario | OK — delete bloqueado |
| `tips/{id}` | Solo propietario del restaurante | Bloqueado (solo server) | OK |
| `stripe_events` | Bloqueado | Bloqueado | OK |

---

## 7. Problemas detectados

### Críticos
- **Employees `deleteDoc` falla silenciosamente**: Las reglas dicen `allow delete: if false` pero el código usa `deleteDoc()`. El usuario confirma el borrado pero nada ocurre. **Fix: usar `updateDoc({ status: "inactive" })`**.
- **FUNCTIONS_URL hardcodeada en 3 archivos**: `bank.tsx`, `tip/[id].tsx` y `stats.tsx` lo definen localmente. Debe centralizarse en `EXPO_PUBLIC_FUNCTIONS_URL`.
- **Stats completamente inaccesible**: Tab oculta sin enlace desde ningún lugar después de las modificaciones previas.

### Funcionales
- **No hay configuración de `tipDistributionMode`**: El campo existe en Firestore pero no hay UI para configurarlo (la página pública lo lee pero el restaurante no puede cambiarlo).
- **Employees no muestra estado**: El campo `status` se filtra en `getRestaurant` pero no se usa en la UI de gestión.
- **Home metrics pueden ser NaN**: Si `tips` está vacío, `stats.today/week/month` son 0 (OK), pero si hay propinas sin `createdAt`, `toDate()` falla.
- **`tip/[id].tsx` no bloquea pago con `employee_required`**: Si el modo es `employee_required` y no se selecciona empleado, el botón debería estar desactivado pero no lo está.

### UX/Mobile
- **Safe area inferior**: Tab bar no tiene `paddingBottom` dinámico para safe-area.
- **Stats no en tab bar**: El spec pide 5 secciones: Inicio, Movimientos, QR, Estadísticas, Ajustes.
- **Movements sin filtros ni exportación**: Solo muestra listado sin filtrar ni exportar CSV.
- **Settings sin "Configuración de propinas"**: Falta sección para configurar el modo de distribución.

### Seguridad
- **`Access-Control-Allow-Origin: *`** en Cloud Functions — aceptable para MVP público, pero CORS debería restringirse al dominio de producción para endpoints autenticados.
- **Firebase config en código**: Es intencional por diseño de Firebase (no es secreto), el acceso real está controlado por Firestore rules.

---

## 8. Dependencias notables

- No PostHog, no Sentry instalados
- No Playwright ni tests e2e
- `react-native-qrcode-svg` para QR
- No Stripe.js en frontend (usa Stripe Checkout hosted — correcto)

---

## 9. Variables de entorno necesarias

### Frontend (prefix `EXPO_PUBLIC_`)
```
EXPO_PUBLIC_FUNCTIONS_URL=https://europe-west1-qtips-edcc2.cloudfunctions.net
EXPO_PUBLIC_APP_URL=https://qtips-main.vercel.app
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Cloud Functions (server-side)
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
QTIPS_FEE_PERCENT=2.5
APP_URL=https://qtips-main.vercel.app
```

---

## 10. Plan de implementación

### Fase 1 — Base y móvil
1. `dev:mobile` script (expose 0.0.0.0)
2. Centralizar FUNCTIONS_URL
3. Fix employees soft delete
4. Añadir Stats a tab navigation
5. Añadir Configuración de propinas a settings
6. Safe areas
7. Guards NaN en home metrics
8. Bloquear Pay en `employee_required` sin selección

### Fase 2 — Operación mejorada
1. Filtros y exportación CSV en Movements
2. Empleados: mostrar activos/inactivos, reactivar
3. Stats: mejorar con más métricas

### Fase 3 — Pagos (no bloquea MVP — ya implementado)
1. Revisar webhook con credenciales reales
2. Configurar variables en Firebase console
3. Deploy functions

### Fase 4 — Calidad
1. PWA manifest
2. Playwright básico
3. Build final
