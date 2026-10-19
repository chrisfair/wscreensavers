<template>
  <div ref="containerRef" class="saver-canvas-wrap">
    <!-- External /usr/lib/xscreensaver/* Live MJPEG Bridge -->
    <template v-if="isExternalXSS">
      <img
        v-if="streamUrl"
        :key="streamUrl"
        :src="streamUrl"
        class="saver-stream"
        alt="XScreenSaver Live Stream"
      />
      <div class="xss-badge">XScreenSaver Binary &bull; Live Xvfb Bridge</div>
    </template>

    <!-- Native Built-In WebGL2 / Canvas2D Port -->
    <template v-else>
      <canvas ref="canvasRef" class="saver-canvas"></canvas>
      <div v-if="showFps" class="fps-badge">{{ currentFps }} FPS</div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { createSaverInstance } from '../savers/index.js';

const props = defineProps({
  saverId: { type: String, default: 'glmatrix' },
  params: { type: Object, default: () => ({}) },
  telemetry: { type: Object, default: () => ({ blips: [], feed: [] }) },
  fpsCap: { type: Number, default: 60 },
  showFps: { type: Boolean, default: false },
  apiBase: { type: String, default: '' }
});

const containerRef = ref(null);
const canvasRef = ref(null);
const currentFps = ref(60);
const streamVersion = ref(0);

const isExternalXSS = computed(() => (props.saverId || '').startsWith('xss_'));

const streamUrl = computed(() => {
  if (!isExternalXSS.value) return '';
  const base = props.apiBase || '';
  return `${base}/api/xss-stream?saver=${encodeURIComponent(props.saverId)}&v=${streamVersion.value}`;
});

let animId = null;
let instance = null;
let resizeObserver = null;
let lastFrameTime = 0;
let fpsFrames = 0;
let fpsLastCheck = 0;
let paramDebounceTimer = null;

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
  if (isExternalXSS.value) {
    instance = null;
    streamVersion.value++;
    return;
  }
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
  if (isExternalXSS.value) return;

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
  setTimeout(initVisualizer, 10);
});

watch(() => props.params, () => {
  if (!isExternalXSS.value) return;
  if (paramDebounceTimer) clearTimeout(paramDebounceTimer);
  paramDebounceTimer = setTimeout(() => {
    streamVersion.value++;
  }, 350);
}, { deep: true });

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
  if (paramDebounceTimer) clearTimeout(paramDebounceTimer);
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
.saver-canvas,
.saver-stream {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.fps-badge,
.xss-badge {
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
.xss-badge {
  border-color: rgba(245, 158, 11, 0.45);
  color: #fbbf24;
}
</style>
