import { Outfit } from "next/font/google";
import { Toaster } from "react-hot-toast";
import StoreProvider from "@/app/StoreProvider";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata = {
    title: "TEKPIK - Shop smarter",
    description: "TEKPIK - Shop smarter",
};

export default function RootLayout({ children }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${outfit.className} antialiased`} suppressHydrationWarning>
                <StoreProvider>
                    <AuthProvider>
                        <Toaster />
                        {children}
                    </AuthProvider>
                </StoreProvider>
            </body>
        </html>
    );
}
