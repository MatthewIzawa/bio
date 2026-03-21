// astro.config.mjs
// Source: https://docs.astro.build/en/guides/deploy/github/ + https://tailwindcss.com/docs/installation/framework-guides/astro
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://matthewizawa.github.io',
  base: '/bio',
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
