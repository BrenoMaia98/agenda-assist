import { defineConfig } from 'cypress'

export default defineConfig({
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
    specPattern: 'src/**/*.cy.tsx',
    supportFile: 'cypress/support/component.ts',
    viewportWidth: 1400,
    viewportHeight: 1200,
  },
})

