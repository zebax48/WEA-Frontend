/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['api.worldeventaccess.com'], // Dominio de las imágenes
  },
  env: {
    NEXT_PUBLIC_STRIPE_PUBLIC_KEY: 'pk_test_51OA3A2GYBZiIOdswP6pAknbiss95KtwOKtOCKThekJHmOaLiY1TepX7rGWriscIFK8ZYaDpO2VYrrSpXUw9pnAxh00keBG2XQI',
  },
};

export default nextConfig;