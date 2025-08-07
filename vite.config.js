import { defineConfig } from 'vite'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:8000',
        ws: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // V2: Better CSS optimization
    cssCodeSplit: false, // Bundle all CSS into single file for better caching
    rollupOptions: {
      output: {
        // V2: Manual chunk splitting for better performance
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['framer-motion'],
          charts: ['recharts'],
          utils: ['lodash']
        },
        // V2: Optimize asset naming
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const ext = info[info.length - 1]
          if (/\.(css)$/.test(assetInfo.name)) {
            return `assets/css/[name]-[hash].${ext}`
          }
          return `assets/[name]-[hash].${ext}`
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js'
      }
    },
    // V2: Better minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  // V2: CSS optimization
  css: {
    postcss: {
      plugins: [
        tailwindcss,
        autoprefixer
      ]
    }
  },
  // V2: Better development experience
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'framer-motion']
  }
})