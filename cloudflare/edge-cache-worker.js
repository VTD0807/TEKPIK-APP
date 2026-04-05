export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const method = request.method

    // Never cache non-GET requests.
    if (method !== 'GET') {
      return fetch(request)
    }

    // Skip caching for authenticated/admin areas.
    const path = url.pathname
    const hasSession = request.headers.get('cookie')?.includes('fb-token=')
    const isProtected = path.startsWith('/admin') || path.startsWith('/cms') || path.startsWith('/store') || path.startsWith('/e')

    if (hasSession || isProtected) {
      return fetch(request, {
        cf: {
          cacheEverything: false,
        },
      })
    }

    // Static assets: long edge cache.
    if (path.startsWith('/_next/static/') || path.startsWith('/assets/') || path.startsWith('/public/')) {
      return fetch(request, {
        cf: {
          cacheEverything: true,
          cacheTtl: 31536000,
        },
      })
    }

    // Public product/listing APIs: short aggressive cache.
    if (path.startsWith('/api/products') || path.startsWith('/api/recommendations/feed')) {
      return fetch(request, {
        cf: {
          cacheEverything: true,
          cacheTtl: 120,
          cacheKey: `${url.origin}${url.pathname}?${url.searchParams.toString()}`,
        },
      })
    }

    // Public pages: cache for anonymous traffic, fast TTFB globally.
    if (!path.startsWith('/api/')) {
      return fetch(request, {
        cf: {
          cacheEverything: true,
          cacheTtl: 180,
          // Respect locale/device-like variants if needed later.
          cacheKey: `${url.origin}${url.pathname}?${url.searchParams.toString()}`,
        },
      })
    }

    // Default API behavior: pass-through.
    return fetch(request, {
      cf: {
        cacheEverything: false,
      },
    })
  },
}
