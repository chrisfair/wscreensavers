<template>
  <div ref="containerRef" class="saver-canvas-wrap">
    <canvas ref="canvasRef" class="saver-canvas"></canvas>
    <div v-if="showFps" class="fps-badge">{{ currentFps }} FPS</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { createSaverInstance } from '../savers/index.js';

const props = defineProps({
  saverId: { type: String, default: 'glmatrix' },
  params: { type: Object, default: () => ({}) },
  telemetry: { type: Object, default: () => ({ blips: [], feed: [] }) },
  fpsCap: { type: Number, default: 60 },
  showFps: { type: Boolean, default: false }
});

const containerRef = ref(null);
const canvasRef = ref(null);
const currentFps = ref(60);

let animId = null;
let instance = null;
let resizeObserver = null;
let lastFrameTime = 0;
let fpsFrames = 0;
let fpsLastCheck = 0;

function syncSize() {
  const wrap = containerRef.value;
  const cvs = canvasRef.value;
  if (!wrap || !cvs) return;
  const rect = wrap.getBoundingClientRect();
  const w = Math.max(300, Math.floor(rect.width));
  const h = Math.max(200, Math.floor(rect.height));
  if (cvs.width !== w || cvs.height !== h) {
    cvs.width = w;
    cvs.height = h;
  }
}

function initVisualizer() {
  const cvs = canvasRef.value;
  if (!cvs) return;
  syncSize();
  const ctx = cvs.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, cvs.width, cvs.height);
  }
  instance = createSaverInstance(
    props.saverId,
    cvs,
    () => props.params || {},
    () => props.telemetry || { blips: [], feed: [] }
  );
}

function loop(timestamp) {
  animId = requestAnimationFrame(loop);

  const cap = props.fpsCap > 0 ? props.fpsCap : 60;
  const minInterval = 1000 / cap;
  const elapsedMs = timestamp - lastFrameTime;
  if (elapsedMs < minInterval * 0.9) return;

  const dt = Math.min(0.08, Math.max(0.004, elapsedMs / 1000));
  lastFrameTime = timestamp;

  fpsFrames++;
  if (timestamp - fpsLastCheck >= 1000) {
    currentFps.value = Math.round((fpsFrames * 1000) / (timestamp - fpsLastCheck));
    fpsFrames = 0;
    fpsLastCheck = timestamp;
  }

  if (instance && typeof instance.render === 'function') {
    instance.render(dt);
  }
}

watch(() => props.saverId, () => {
  initVisualizer();
});

onMounted(() => {
  initVisualizer();
  resizeObserver = new ResizeObserver(() => syncSize());
  if (containerRef.value) {
    resizeObserver.observe(containerRef.value);
  }
  lastFrameTime = performance.now();
  fpsLastCheck = lastFrameTime;
  animId = requestAnimationFrame(loop);
});

onBeforeUnmount(() => {
  if (animId) cancelAnimationFrame(animId);
  if (resizeObserver) resizeObserver.disconnect();
});
</script>

<style scoped>
.saver-canvas-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #03050a;
}
.saver-canvas {
  display: block;
  width: 100%;
  height: 100%;
}
.fps-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(9, 13, 24, 0.78);
  border: 1px solid rgba(56, 189, 248, 0.35);
  color: #38bdf8;
  font-family: "JetBrains Mono", monospace;
  font-size: 11px;
  font-weight: 700;
  pointer-events: none;
}
</style>
