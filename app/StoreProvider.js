'use client'
import { useEffect, useRef } from 'react'
import { Provider } from 'react-redux'
import { makeStore } from '../lib/store'
import { setWishlist } from '@/lib/features/wishlist/wishlistSlice'
import { setProduct } from '@/lib/features/product/productSlice'

export default function StoreProvider({ children }) {
  const storeRef = useRef(undefined)
  if (!storeRef.current) {
    // Create the store instance the first time this renders
    storeRef.current = makeStore()
  }

  useEffect(() => {
    const store = storeRef.current

    // Hydrate persisted client state.
    try {
      const wishlistRaw = localStorage.getItem('tekpik_wishlist_ids')
      const productsRaw = localStorage.getItem('tekpik_products')

      if (wishlistRaw) {
        const parsedWishlist = JSON.parse(wishlistRaw)
        if (Array.isArray(parsedWishlist)) {
          store.dispatch(setWishlist(parsedWishlist))
        }
      }

      if (productsRaw) {
        const parsedProducts = JSON.parse(productsRaw)
        if (Array.isArray(parsedProducts) && parsedProducts.length > 0) {
          store.dispatch(setProduct(parsedProducts))
        }
      }
    } catch {
      // Ignore malformed local cache and continue.
    }

    // Always refresh products in background so pages survive refresh and data stays current.
    fetch('/api/products')
      .then(r => r.json())
      .then(d => {
        const products = Array.isArray(d?.products) ? d.products : []
        if (products.length > 0) {
          store.dispatch(setProduct(products))
        }
      })
      .catch(() => {})

    const unsubscribe = store.subscribe(() => {
      const state = store.getState()
      try {
        localStorage.setItem('tekpik_wishlist_ids', JSON.stringify(state.wishlist?.ids || []))
        localStorage.setItem('tekpik_products', JSON.stringify(state.product?.list || []))
      } catch {
        // Ignore storage write errors.
      }
    })

    return () => unsubscribe()
  }, [])

  return <Provider store={storeRef.current}>{children}</Provider>
}