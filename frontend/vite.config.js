import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'fs'
import path from 'path'

// Self-signed certs for HTTPS on LAN (needed for PWA install on phone)
const httpsConfig = (() => {
    try {
        return {
            key: fs.readFileSync(path.resolve(__dirname, 'key.pem')),
            cert: fs.readFileSync(path.resolve(__dirname, 'cert.pem')),
        }
    } catch {
        return false  // Falls back to HTTP if certs don't exist
    }
})()

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'pwa-192x192.png', 'pwa-512x512.png'],
            manifest: {
                name: 'PLIS - Personal Life Intelligence',
                short_name: 'PLIS',
                description: 'A private, AI-powered personal intelligence platform',
                theme_color: '#6366f1',
                background_color: '#0f172a',
                display: 'standalone',
                orientation: 'portrait',
                scope: '/',
                start_url: '/',
                icons: [
                    {
                        src: 'pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable',
                    },
                ],
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'google-fonts-cache',
                            expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                    {
                        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'gstatic-fonts-cache',
                            expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                    {
                        urlPattern: /\/api\/.*/i,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'api-cache',
                            expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
                            cacheableResponse: { statuses: [0, 200] },
                            networkTimeoutSeconds: 10,
                        },
                    },
                ],
            },
        }),
    ],
    server: {
        host: '0.0.0.0',  // Expose to LAN (phone access)
        port: 5173,
        https: httpsConfig,
        proxy: {
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            },
            '/uploads': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            }
        }
    }
})
