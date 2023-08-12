import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vitejs.dev/config/
export default defineConfig({
    define: {
        __BASEURL__: `"${process.env.BASEURL}"`,
        __PICOVOICE_ACCESS_KEY__: `"${process.env.PICOVOICE_ACCESS_KEY}"`
    },
    build: {
        target: 'esnext',
        outDir: '../public',
        emptyOutDir: true
    },
    server: {
        port: 5174
    },
    plugins: [
        svelte()
    ]
});
