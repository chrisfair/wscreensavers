import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'esnext'
  },
  test: {
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'lcov'],
      reportsDirectory: '../coverage/frontend',
      include: [
        'src/App.vue',
        'src/wails.js',
        'src/components/**/*.vue',
        'src/savers/index.js',
        'src/savers/functionPlotter3d.js'
      ]
    }
  }
})
