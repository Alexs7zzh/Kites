import {defineConfig} from 'astro/config'
import react from '@astrojs/react'
import sanity from '@sanity/astro'

export default defineConfig({
  integrations: [
    react(),
    sanity({
      projectId: 'wmjirbvx',
      dataset: 'production',
      useCdn: false,
    }),
  ],
})
