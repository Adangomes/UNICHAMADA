import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Como o GitHub Pages publica direto a partir da raiz do repositório UNICHAMADA:
  base: '/UNICHAMADA/meu-totem-ponto/'
});
