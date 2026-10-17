import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // IMPORTANTE: Substitua 'meu-totem-ponto' pelo nome EXATO do seu repositório no GitHub. 
  // Se o seu repositório se chamar diferente, mude apenas essa string entre as barras.
  base: '/meu-totem-ponto/',
});