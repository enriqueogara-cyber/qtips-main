# QTips

Plataforma de propinas digitales para restaurantes. Los clientes escanean un QR y dejan propina en segundos, sin registrarse.

## Stack

- **Framework**: Expo 54 + expo-router v6 (React Native Web)
- **Auth / DB**: Firebase Auth + Cloud Firestore
- **Backend**: Firebase Cloud Functions (europe-west1)
- **Pagos**: Stripe Connect Express + Stripe Checkout
- **Hosting**: Vercel (SPA estática)

---

## Instalación

```bash
npm install
```

---

## Desarrollo

```bash
# Servidor local (localhost)
npm run dev

# Servidor local accesible desde móvil en la misma red WiFi
npm run dev:mobile
```

La URL de móvil aparece en la terminal: `http://192.168.X.X:8081`

---

## Build

```bash
npm run build
```

Genera la SPA estática en `dist/`. Vercel la sirve automáticamente.

---

## Verificación

```bash
# TypeScript
npm run typecheck

# ESLint
npm run lint
```

---

## Variables de entorno

Copia `.env.example` como `.env.local` y rellena los valores:

```env
EXPO_PUBLIC_FUNCTIONS_URL=https://europe-west1-qtips-edcc2.cloudfunctions.net
EXPO_PUBLIC_APP_URL=https://qtips-main.vercel.app
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Las variables del servidor (`STRIPE_SECRET_KEY`, etc.) se configuran directamente en Firebase Console.

---

## Stripe (test)

1. Usa la tarjeta `4242 4242 4242 4242` para simular pagos exitosos.
2. El CVC y fecha de caducidad pueden ser cualquier valor válido.
3. Los pagos de test aparecen marcados con la etiqueta **TEST** en movimientos.

---

## Firebase / Firestore

```bash
# Desplegar reglas de seguridad
firebase deploy --only firestore:rules

# Desplegar Cloud Functions
cd functions && npm run deploy
```

---

## Vercel

El proyecto se despliega automáticamente con cada push a `master`.

Para despliegue manual:
```bash
vercel --prod
```

---

## Documentación

- `docs/QTIPS_TECHNICAL_AUDIT.md` — Auditoría técnica completa
- `docs/QTIPS_PRODUCTION_IMPLEMENTATION.md` — Cambios realizados y configuración pendiente
- `.env.example` — Variables de entorno necesarias
