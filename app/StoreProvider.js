'use client'
import { useEffect, useRef } from 'react'
import { Provider } from 'react-redux'
import { makeStore } from '../lib/store'
import { setWishlist } from '@/lib/features/wishlist/wishlistSlice'
import { setProduct } from '@/lib/features/product/productSlice'

export default function StoreProvider({ children }) {
  const storeRef = useRef(undefined)
  const persistTimerRef = useRef(null)
  const lastWishlistRef = useRef('[]')
  if (!storeRef.current) {
    // Create the store instance the first time this renders
    storeRef.current = makeStore()
  }

  useEffect(() => {
    const store = storeRef.current
    let idleHandle = null

    // Hydrate persisted client state.
    try {
      const wishlistRaw = localStorage.getItem('tekpik_wishlist_ids')

      if (wishlistRaw) {
        const parsedWishlist = JSON.parse(wishlistRaw)
        if (Array.isArray(parsedWishlist)) {
          store.dispatch(setWishlist(parsedWishlist))
          lastWishlistRef.current = wishlistRaw
        }
      }
    } catch {
      // Ignore malformed local cache and continue.
    }

    const refreshProducts = () => {
      fetch('/api/products?limit=160&page=1')
        .then(r => r.json())
        .then(d => {
          const products = Array.isArray(d?.products) ? d.products : []
          if (products.length > 0) {
            store.dispatch(setProduct(products))
          }
        })
        .catch(() => {})
    }

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleHandle = window.requestIdleCallback(refreshProducts, { timeout: 2000 })
    } else {
      idleHandle = window.setTimeout(refreshProducts, 250)
    }

    const unsubscribe = store.subscribe(() => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current)

      persistTimerRef.current = setTimeout(() => {
        const state = store.getState()
        try {
          const wishlistJson = JSON.stringify(state.wishlist?.ids || [])
          if (wishlistJson !== lastWishlistRef.current) {
            localStorage.setItem('tekpik_wishlist_ids', wishlistJson)
            lastWishlistRef.current = wishlistJson
          }
        } catch {
          // Ignore storage write errors.
        }
      }, 250)
    })

    return () => {
      unsubscribe()
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
      if (idleHandle !== null) {
        if (typeof window !== 'undefined' && 'cancelIdleCallback' in window && typeof window.cancelIdleCallback === 'function') {
          window.cancelIdleCallback(idleHandle)
        } else {
          clearTimeout(idleHandle)
        }
      }
    }
  }, [])

  return <Provider store={storeRef.current}>{children}</Provider>
}