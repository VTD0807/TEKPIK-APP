/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        unoptimized: true,
        remotePatterns: [
            { protocol: 'https', hostname: 'm.media-amazon.com' },
            { protocol: 'https', hostname: 'images-na.ssl-images-amazon.com' },
            { protocol: 'https', hostname: 'images-eu.ssl-images-amazon.com' },
            { protocol: 'https', hostname: 'ooqens.web.app' },
        ],
    },
};

export default nextConfig;
