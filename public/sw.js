const CACHE_NAME = 'equal-v1'

const PRECACHE_ASSETS = [
  '/manifest.webmanifest',
  '/icons/icon.svg',
]

const BYPASS_ORIGINS = ['supabase.co', 'bluelytics.com.ar']

const BYPASS_PATHS = ['/login', '/register', '/forgot-password']

// Never serve stale cached HTML for authenticated financial routes
const AUTHENTICATED_ROUTES = [
  '/dashboard', '/transactions', '/wallets', '/goals', '/budgets',
  '/categories', '/scheduled', '/calendar', '/estadisticas', '/achievements',
  '/dollar', '/health', '/plazo-fijo', '/reservas', '/quick-transactions',
  '/pending', '/import',
]

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(PRECACHE_ASSETS).catch(() => {
        // Silently ignore precache failures (e.g. icon not yet built)
      })
    )
  )
  self.skipWaiting()
})

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
  )
  self.clients.claim()
})

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)

  // Skip cross-origin requests (Supabase, external APIs)
  if (url.origin !== self.location.origin) {
    if (BYPASS_ORIGINS.some((o) => url.hostname.includes(o))) return
    return
  }

  // Skip auth routes — always fresh
  if (BYPASS_PATHS.some((p) => url.pathname.startsWith(p))) return

  // Skip internal API routes
  if (url.pathname.startsWith('/api/')) return

  // Skip Next.js internal routes
  if (url.pathname.startsWith('/_next/webpack-hmr')) return

  // Cache-first for immutable static assets and icons
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/apple-icon.png'
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200) return response
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          return response
        })
      })
    )
    return
  }

  // Never cache authenticated financial routes — always network, no offline fallback
  if (event.request.mode === 'navigate' && AUTHENTICATED_ROUTES.some((p) => url.pathname.startsWith(p))) {
    event.respondWith(fetch(event.request))
    return
  }

  // Network-first for HTML navigation — fallback to cache when offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200) return response
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          return response
        })
        .catch(() => caches.match(event.request))
    )
    return
  }
})
