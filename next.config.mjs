/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'm.media-amazon.com' },
            { protocol: 'https', hostname: 'images-na.ssl-images-amazon.com' },
            { protocol: 'https', hostname: 'images-eu.ssl-images-amazon.com' },
            { protocol: 'https', hostname: 'ooqens.web.app' },
            { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
        ],
    },
    // Reduce bundle size
    experimental: {
        optimizePackageImports: ['lucide-react', '@supabase/supabase-js'],
    },
    // Compress responses
    compress: true,
}

export default nextConfig
