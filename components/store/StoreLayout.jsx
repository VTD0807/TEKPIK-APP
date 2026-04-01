'use client'
import { useAuth } from "@/lib/auth-context"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import Loading from "../Loading"
import Link from "next/link"
import { ArrowRight } from 'react-bootstrap-icons'
import SellerNavbar from "./StoreNavbar"
import SellerSidebar from "./StoreSidebar"
import { useState, useEffect } from "react"

const StoreLayout = ({ children }) => {
    const { user, loading: authLoading } = useAuth()
    const [isSeller, setIsSeller] = useState(false)
    const [loading, setLoading] = useState(true)
    const [storeInfo, setStoreInfo] = useState(null)

    useEffect(() => {
        const fetchStore = async () => {
            if (authLoading) return
            if (!user) {
                setLoading(false)
                return
            }

            try {
                const docSnap = await getDoc(doc(db, 'stores', user.uid))
                if (docSnap.exists()) {
                    setIsSeller(true)
                    setStoreInfo({ id: docSnap.id, ...docSnap.data() })
                }
            } catch (err) {
                console.error('Error fetching store:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchStore()
    }, [user, authLoading])

    if (authLoading || loading) return <Loading />

    return isSeller ? (
        <div className="flex flex-col h-screen">
            <SellerNavbar />
            <div className="flex flex-1 items-start h-full overflow-y-scroll no-scrollbar">
                <SellerSidebar storeInfo={storeInfo} />
                <div className="flex-1 h-full p-5 lg:pl-12 lg:pt-12 overflow-y-scroll">
                    {children}
                </div>
            </div>
        </div>
    ) : (
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
            <h1 className="text-2xl sm:text-4xl font-semibold text-slate-400">You are not authorized to access this page</h1>
            <Link href="/" className="bg-slate-700 text-white flex items-center gap-2 mt-8 p-2 px-6 max-sm:text-sm rounded-full">
                Go to home <ArrowRight size={18} />
            </Link>
        </div>
    )
}

export default StoreLayout