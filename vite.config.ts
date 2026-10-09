import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { fileURLToPath } from 'node:url';

const directory = (path: string) => fileURLToPath(new URL(path, import.meta.url));
const speechDetection = ['@ricky0123/vad-web/dist/vad.worklet.bundle.min.js', '@ricky0123/vad-web/dist/silero_vad_v5.onnx',
  'onnxruntime-web/dist/ort-wasm-simd-threaded.wasm', 'onnxruntime-web/dist/ort-wasm-simd-threaded.mjs'];

export default defineConfig({
  root: directory('./frontend'),
  plugins: [react(), viteStaticCopy({ targets: [{ src: speechDetection.map(file => directory(`./node_modules/${file}`)), dest: 'vad', rename: { stripBase: true } }] })],
  server: {
    port: 5188,
    strictPort: true,
    proxy: Object.fromEntries(['/api', '/story-assets'].map(path => [path, process.env.GAME_API_ORIGIN ?? 'http://127.0.0.1:3188'])),
    fs: { allow: [directory('./frontend'), directory('./shared'), directory('./node_modules')] }
  },
  build: { target: 'es2022', outDir: directory('./dist'), emptyOutDir: true }
});
