import { configureStore } from '@reduxjs/toolkit'
import productReducer from './features/product/productSlice'
import wishlistReducer from './features/wishlist/wishlistSlice'
import cartReducer from './features/cart/cartSlice'
import addressReducer from './features/address/addressSlice'
import ratingReducer from './features/rating/ratingSlice'

export const makeStore = () => {
    return configureStore({
        reducer: {
            product: productReducer,
            wishlist: wishlistReducer,
            // kept to prevent crashes from old pages still in the file tree
            cart: cartReducer,
            address: addressReducer,
            rating: ratingReducer,
        },
    })
}
