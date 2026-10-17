import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Como o repositório é UNICHAMADA e a pasta é meu-totem-ponto:
  base: '/UNICHAMADA/meu-totem-ponto/',
}); 
