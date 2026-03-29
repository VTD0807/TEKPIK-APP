import { createSlice } from '@reduxjs/toolkit'

const wishlistSlice = createSlice({
    name: 'wishlist',
    initialState: { ids: [] },
    reducers: {
        setWishlist: (state, action) => { state.ids = action.payload },
        toggleWishlistItem: (state, action) => {
            const id = action.payload
            state.ids = state.ids.includes(id)
                ? state.ids.filter(i => i !== id)
                : [...state.ids, id]
        },
    },
})

export const { setWishlist, toggleWishlistItem } = wishlistSlice.actions
export default wishlistSlice.reducer
