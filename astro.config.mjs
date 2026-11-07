// @ts-check
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'
import typography from '@tailwindcss/typography'
import cloudflare from '@astrojs/cloudflare'

// 构建前由 backend/scripts/export-d1-posts.mjs 从 D1 导出已保存的文案覆盖。
let publishedText = {}
try {
  publishedText = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'data/runtime/published-text.json'), 'utf-8'))
} catch {
  publishedText = {}
}

export default defineConfig({
  site: 'https://example.com',
  srcDir: './frontend',
  publicDir: './cloudflare/public',
  outDir: './dist',
  adapter: cloudflare({
    configPath: './cloudflare/wrangler.jsonc',
    persistState: { path: './cloudflare/.wrangler/state' },
  }),
  vite: {
    plugins: [tailwindcss()],
    define: {
      __PUBLISHED_TEXT__: JSON.stringify(publishedText),
    },
  },
  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      defaultColor: false,
    },
  },
})
