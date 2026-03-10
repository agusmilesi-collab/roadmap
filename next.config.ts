import type { NextConfig } from "next";

const csp = [
    "default-src 'self'",
    // Next.js dev HMR + Supabase SSR client require eval; unsafe-inline covers injected styles/scripts
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' accounts.google.com",
    "style-src 'self' 'unsafe-inline'",
    // Google OAuth flow lives in a redirect/popup; fonts.googleapis serves type faces
    "frame-src accounts.google.com",
    // Supabase API, Google OAuth token endpoint, dolarapi
    "connect-src 'self' *.supabase.co wss://*.supabase.co accounts.google.com https://oauth2.googleapis.com https://dolarapi.com",
    // Google profile pictures after login
    "img-src 'self' data: blob: *.googleusercontent.com",
    "font-src 'self' data:",
].join("; ");

const nextConfig: NextConfig = {
    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    {
                        key: "Content-Security-Policy",
                        value: csp,
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
