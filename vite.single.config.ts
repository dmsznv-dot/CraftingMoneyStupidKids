import {defineConfig} from 'vite';
export default defineConfig({base:'./',build:{outDir:'preview',rollupOptions:{output:{inlineDynamicImports:true}},chunkSizeWarningLimit:1300}});
