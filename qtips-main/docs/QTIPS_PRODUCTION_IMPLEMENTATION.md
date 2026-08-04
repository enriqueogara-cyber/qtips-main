# QTIPS — Implementación de producción

_Última actualización: 2026-08-04_

---

## 1. Arquitectura

```
Cliente (móvil/escritorio)
  └── Expo 54 + expo-router v6 → React Native Web → SPA estática
        ├── Firebase Auth (email/password)
        ├── Cloud Firestore (real-time)
        └── Cloud Functions (europe-west1)
              ├── Stripe Connect Express
              └── Stripe Checkout (hosted)

Hosting: Vercel (SPA estática de dist/)
```

---

## 2. Cambios realizados en esta sesión

### Fase 1 — Base y móvil

| Cambio | Archivo | Descripción |
|--------|---------|-------------|
| Scripts | `package.json` | `dev:mobile`, `dev`, `build`, `typecheck` |
| FUNCTIONS_URL | `lib/functions.ts` | Centralizada desde `EXPO_PUBLIC_FUNCTIONS_URL` |
| Viewport | `app.json` | `viewport-fit=cover` para iOS notch |
| TypeScript | `tsconfig.json` | Añadido `DOM` a la lib (window, document disponibles) |
| Safe area | `app/(tabs)/_layout.tsx` | `useSafeAreaInsets` en altura del tab bar |

### Fase 2 — Operación

| Cambio | Archivo | Descripción |
|--------|---------|-------------|
| Employees soft delete | `settings/employees.tsx` | `deleteDoc` reemplazado por `updateDoc({ status: "inactive" })` · botón Reactivar |
| Stats tab | `(tabs)/_layout.tsx` | Stats visible como 5ª pestaña (antes: oculta e inaccesible) |
| Stats mejorada | `(tabs)/stats.tsx` | Métricas: total, propinas, media, mejor día, por empleado · gráfico táctil |
| Configuración propinas | `settings/tip-config.tsx` | Nueva pantalla: restaurant / employee_optional / employee_required |
| Settings | `(tabs)/settings.tsx` | Nueva opción "Configuración de propinas" |
| Home métricas | `(tabs)/home.tsx` | Guardia NaN/Infinity · stats.count · stats.avg · formato `.toFixed(2)` |
| Tip page | `tip/[id].tsx` | Bloqueo pago con employee_required sin empleado seleccionado |
| Movements | `(tabs)/movements.tsx` | Filtros por estado · buscador · paginación · exportación CSV · mostrar tests |

### Correcciones de TypeScript

| Archivo | Error | Fix |
|---------|-------|-----|
| `settings/bank.tsx` | `data: unknown` | Cast `as { url?: string; error?: string }` |
| `tip/[id].tsx` | `data: unknown`, `window` | Cast correcto + `DOM` en lib |
| `(tabs)/qr.tsx` | `ref` implicit any | `(ref: unknown)` |
| `tsconfig.json` | DOM no incluido | `"DOM"` añadido a lib |

---

## 3. Archivos modificados

```
app/(tabs)/_layout.tsx          — 5 tabs + safe area
app/(tabs)/home.tsx             — métricas mejoradas + guards
app/(tabs)/movements.tsx        — filtros + CSV + paginación
app/(tabs)/settings.tsx         — nueva opción pagos
app/(tabs)/settings/employees.tsx — soft delete + reactivar
app/(tabs)/settings/bank.tsx    — FUNCTIONS_URL centralizado
app/(tabs)/stats.tsx            — pantalla completa con métricas
app/(tabs)/qr.tsx               — fix TypeScript ref
app/tip/[id].tsx                — employee_required + tipo fetch
package.json                    — scripts
tsconfig.json                   — lib DOM
app.json                        — viewport-fit=cover
```

## 4. Archivos creados

```
lib/functions.ts                       — FUNCTIONS_URL centralizado
app/(tabs)/settings/tip-config.tsx     — Configuración de propinas
docs/QTIPS_TECHNICAL_AUDIT.md          — Auditoría técnica
docs/QTIPS_PRODUCTION_IMPLEMENTATION.md — Este archivo
```

---

## 5. Variables de entorno

### Frontend (`EXPO_PUBLIC_*` — se incrustan en el bundle)

```env
EXPO_PUBLIC_FUNCTIONS_URL=https://europe-west1-qtips-edcc2.cloudfunctions.net
EXPO_PUBLIC_APP_URL=https://qtips-main.vercel.app
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Cloud Functions (solo servidor)

Configura en Firebase Console → Functions → Environment variables, o via CLI:
```
firebase functions:config:set stripe.secret_key="sk_live_..."
firebase functions:config:set stripe.webhook_secret="whsec_..."
firebase functions:config:set qtips.fee_percent="2.5"
firebase functions:config:set app.url="https://qtips-main.vercel.app"
```

---

## 6. Scripts disponibles

```bash
npm run dev           # Servidor local (solo localhost)
npm run dev:mobile    # Servidor local expuesto en red (acceso desde móvil)
npm run build         # Exportar SPA estática a dist/
npm run typecheck     # TypeScript sin emitir
npm run lint          # ESLint
```

---

## 7. Flujo de pago (Stripe Checkout)

```
1. Cliente escanea QR → /tip/{restaurantId}
2. Frontend llama getRestaurant (público) → nombre, empleados, modo
3. Cliente elige importe y empleado (si aplica)
4. Frontend POST createCheckoutSession → {url, sessionId}
5. Redirect a Stripe Checkout (hosted)
6. Cliente paga → Stripe envía webhook
7. stripeWebhook verifica firma → guarda tip en Firestore
8. Dashboard refleja propina en tiempo real
```

---

## 8. Configuración pendiente (manual)

### Stripe
- [ ] Crear cuenta Stripe en modo producción
- [ ] Activar Stripe Connect Express en el Dashboard
- [ ] Configurar webhook endpoint: `{FUNCTIONS_URL}/stripeWebhook`
- [ ] Eventos a escuchar: `checkout.session.completed`, `account.updated`, `charge.refunded`
- [ ] Copiar `STRIPE_WEBHOOK_SECRET` y configurar en Firebase

### Firebase
- [ ] Desplegar Firestore rules: `firebase deploy --only firestore:rules`
- [ ] Desplegar Cloud Functions: `cd functions && npm run deploy`
- [ ] Configurar variables de entorno en Cloud Functions (ver sección 5)
- [ ] Crear índice Firestore: `tips` → `restaurantId ASC, createdAt DESC`

### Vercel
- [ ] Configurar variables de entorno en Vercel Dashboard
- [ ] Trigger un nuevo deploy después de configurar env vars
- [ ] Verificar que `vercel.json` tenga el rewrites correcto para SPA

---

## 9. Riesgos y funcionalidades pendientes

| Riesgo | Prioridad | Estado |
|--------|-----------|--------|
| Stripe sin credenciales reales | Alta | Pendiente configuración |
| Firestore rules no desplegadas | Alta | Código OK, falta deploy |
| Cloud Functions no desplegadas | Alta | Código OK, falta deploy |
| Sin tests automatizados (Playwright) | Media | No implementado |
| Sin PWA manifest | Baja | No implementado |
| Sin PostHog / Sentry | Baja | No implementado |
| `Access-Control-Allow-Origin: *` en Functions | Media | Aceptable para MVP |
| Índice Firestore restaurantId+createdAt | Alta | Crear manualmente |

---

## 10. Cómo probar el flujo completo

### Requisito previo
Stripe configurado en modo test con las variables de entorno activas en Firebase.

### Pasos

1. **Registro**: `npm run dev` → `/login` → "Crear cuenta"
2. **Onboarding**: Completar datos del restaurante
3. **Empleados**: Ajustes → Empleados → Añadir empleado de prueba
4. **Configuración propinas**: Ajustes → Configuración de propinas → "Empleado opcional"
5. **Stripe Connect**: Ajustes → Cuenta de cobros → Conectar (usa cuenta de test de Stripe)
6. **QR**: Pestaña QR → copiar enlace
7. **Pago cliente**: Abrir `/tip/{id}` en modo incógnito → elegir importe → pagar con tarjeta de test `4242 4242 4242 4242`
8. **Verificar**: Pestaña Movimientos debe mostrar la propina en unos segundos
9. **Estadísticas**: Pestaña Estadísticas debe reflejar el total

### Tarjetas de test Stripe
- Pago OK: `4242 4242 4242 4242`
- Pago fallido: `4000 0000 0000 0002`
- Requiere autenticación: `4000 0027 6000 3184`
