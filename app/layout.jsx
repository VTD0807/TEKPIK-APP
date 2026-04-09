import { Outfit } from "next/font/google";
import { Toaster } from "react-hot-toast";
import StoreProvider from "@/app/StoreProvider";
import { AuthProvider } from "@/lib/auth-context";
import { PostHogProvider } from "./PostHogProvider";
import { Analytics } from '@vercel/analytics/next';
import PageViewTracker from "@/components/analytics/PageViewTracker.jsx";
import OneSignalPushManager from "@/components/OneSignalPushManager.jsx";
import { absoluteUrl, getSiteUrl } from "@/lib/seo";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600"] });
const siteUrl = getSiteUrl();
const logoPath = '/logo-tekpik.png'
const logoUrl = absoluteUrl(logoPath)

export const metadata = {
    metadataBase: new URL(siteUrl),
    title: "TEKPIK - Shop smarter",
    description: "Discover the best products on Amazon with AI-powered analysis and honest community reviews.",
    keywords: "amazon affiliate, product reviews, AI analysis, best deals",
    icons: {
        icon: [{ url: '/favicon.ico', type: 'image/x-icon' }],
        apple: [{ url: logoPath, type: 'image/png' }],
        shortcut: [{ url: '/favicon.ico', type: 'image/x-icon' }],
    },
    alternates: {
        canonical: "/",
    },
    openGraph: {
        title: "TEKPIK - Shop smarter",
        description: "AI-powered product discovery. Honest reviews. Best Amazon deals.",
        url: siteUrl,
        siteName: 'TEKPIK',
        type: "website",
        images: [
            {
                url: logoPath,
                width: 1200,
                height: 630,
                alt: 'TEKPIK logo',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'TEKPIK - Shop smarter',
        description: 'AI-powered product discovery. Honest reviews. Best Amazon deals.',
        images: [logoPath],
        creator: '@tekpik',
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
        },
    },
};

export const viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
};

export default function RootLayout({ children }) {
    const organizationLd = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'TEKPIK',
        url: siteUrl,
        logo: logoUrl,
        image: [logoUrl],
    }

    const websiteLd = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'TEKPIK',
        url: siteUrl,
        potentialAction: {
            '@type': 'SearchAction',
            target: `${siteUrl}/search?q={search_term_string}`,
            'query-input': 'required name=search_term_string',
        },
    }

    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${outfit.className} antialiased overflow-x-hidden`} suppressHydrationWarning>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
                />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
                />
                <PostHogProvider>
                    <StoreProvider>
                        <AuthProvider>
                            <OneSignalPushManager />
                            <Toaster />
                            <PageViewTracker />
                            <Analytics />
                            {children}
                        </AuthProvider>
                    </StoreProvider>
                </PostHogProvider>
            </body>
        </html>
    );
}
