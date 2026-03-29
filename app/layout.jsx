import { Outfit } from "next/font/google";
import { Toaster } from "react-hot-toast";
import StoreProvider from "@/app/StoreProvider";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata = {
    title: "TEKPIK - Shop smarter",
    description: "Discover the best products on Amazon with AI-powered analysis and honest community reviews.",
    keywords: "amazon affiliate, product reviews, AI analysis, best deals",
    openGraph: {
        title: "TEKPIK - Shop smarter",
        description: "AI-powered product discovery. Honest reviews. Best Amazon deals.",
        type: "website",
    },
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
