import { configureStore } from '@reduxjs/toolkit'
import productReducer from './features/product/productSlice'
import wishlistReducer from './features/wishlist/wishlistSlice'

export const makeStore = () => {
    return configureStore({
        reducer: {
            product: productReducer,
            wishlist: wishlistReducer,
        },
    })
}
