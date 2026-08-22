import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron'
import { builtinModules } from 'node:module'

function electronRendererPlugin() {
  const externals = [
    'electron',
    ...builtinModules,
    ...builtinModules.map((m) => `node:${m}`),
  ];
  return {
    name: 'electron-renderer-custom',
    enforce: 'pre' as const,
    resolveId(source) {
      if (externals.includes(source)) {
        return { id: source, external: true };
      }
      return null;
    },
    config(config) {
      config.base = './';
      config.build = config.build || {};
      config.build.commonjsOptions = config.build.commonjsOptions || {};
      
      if (config.build.commonjsOptions.ignore) {
        if (typeof config.build.commonjsOptions.ignore === 'function') {
          const userIgnore = config.build.commonjsOptions.ignore;
          config.build.commonjsOptions.ignore = (id) => {
            if (userIgnore(id) === true) return true;
            return externals.includes(id);
          };
        } else {
          config.build.commonjsOptions.ignore.push(...externals);
        }
      } else {
        config.build.commonjsOptions.ignore = externals;
      }
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  server: {
    maxHttpHeaderSize: 65536,
  },
  plugins: [
    react(),
    tailwindcss(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            rollupOptions: {
              external: ['discord-rpc']
            }
          }
        }
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            lib: {
              entry: 'electron/preload.ts',
              formats: ['cjs'],
            },
            rollupOptions: {
              output: {
                entryFileNames: '[name].cjs',
              },
            },
          },
        },
      },
    ]),
    electronRendererPlugin(),
  ],
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor-react';
            if (id.includes('framer-motion')) return 'vendor-motion';
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('maplibre-gl')) return 'vendor-map';
            if (id.includes('lucide-react')) return 'vendor-icons';
            return 'vendor';
          }
        }
      }
    }
  }
})


