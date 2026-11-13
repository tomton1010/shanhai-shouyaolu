import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  // 生产构建挂到 GitHub Pages 的仓库子路径。dev server 仍从 / 提供，localhost 不用改。
  base: command === 'build' ? '/shanhai-shouyaolu/' : '/',
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: true,
    port: 4173,
    strictPort: true,
  },
}));
