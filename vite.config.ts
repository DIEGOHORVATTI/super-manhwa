import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// O endpoint admin-ajax.php do WordPress NÃO manda headers de CORS,
// então um fetch direto do browser (origin localhost) seria bloqueado.
// Em DEV, usamos o proxy do Vite: /api/* -> https://mangasbrasuka.com.br/*
// Isso é o padrão correto pra consumir uma API sem CORS no desenvolvimento.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://mangasbrasuka.com.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
