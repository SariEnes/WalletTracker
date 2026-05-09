/** @type {import('next').NextConfig} */
const nextConfig = {
    // TypeScript hatalarını build sırasında görmezden gelir
    typescript: {
        ignoreBuildErrors: true,
    },
    // ESLint (yazım kuralları) hatalarını build sırasında görmezden gelir
    eslint: {
        ignoreDuringBuilds: true,
    },
};

export default nextConfig;