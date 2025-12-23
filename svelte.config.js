import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html', // SPA fallback for client-side routing
      precompress: true,
      strict: true,
    }),
    csp: {
      mode: 'auto',
      directives: {
        'default-src': ['self'],
        'script-src': ['self'],
        'style-src': ['self', 'unsafe-inline'], // Required for Svelte
        'img-src': ['self', 'data:', 'blob:'],
        'font-src': ['self'],
        'connect-src': ['self'],
        'frame-ancestors': ['none'],
        'form-action': ['self'],
        'base-uri': ['self'],
        'object-src': ['none'],
      },
    },
    alias: {
      $lib: './src/lib',
      $components: './src/lib/components',
      $crypto: './src/lib/crypto',
      $webauthn: './src/lib/webauthn',
      $storage: './src/lib/storage',
      $services: './src/lib/services',
      $stores: './src/lib/stores',
    },
  },
};

export default config;
