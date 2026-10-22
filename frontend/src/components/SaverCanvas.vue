<template>
  <div ref="containerRef" class="saver-canvas-wrap">
    <!-- External /usr/lib/xscreensaver/* Live MJPEG Bridge -->
    <template v-if="isExternalXSS">
      <img
        v-if="streamUrl"
        ref="imgRef"
        :src="streamUrl"
        class="saver-stream"
        alt="XScreenSaver Live Stream"
        @error="onStreamError"
      />
      <div class="xss-badge">XScreenSaver Binary &bull; Live Xvfb Bridge</div>
    </template>

    <!-- Native Built-In WebGL2 / Canvas2D Port (kept mounted with v-show so canvasRef is always ready) -->
    <canvas v-show="!isExternalXSS" ref="canvasRef" :key="props.saverId" class="saver-canvas"></canvas>
    <div v-if="!isExternalXSS && showFps" class="fps-badge">{{ currentFps }} FPS</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { createSaverInstance } from '../savers/index.js';

const props = defineProps({
  saverId: { type: String, default: 'glmatrix' },
  params: { type: Object, default: () => ({}) },
  telemetry: { type: Object, default: () => ({ blips: [], feed: [] }) },
  fpsCap: { type: Number, default: 60 },
  showFps: { type: Boolean, default: false },
  paused: { type: Boolean, default: false },
  apiBase: { type: String, default: '' }
});

const containerRef = ref(null);
const canvasRef = ref(null);
const imgRef = ref(null);
const currentFps = ref(60);
const streamVersion = ref(0);
const clientId = 'c_' + Math.random().toString(36).slice(2, 10);

const isExternalXSS = computed(() => (props.saverId || '').startsWith('xss_'));

// Fullscreen overlay pages carry ?monitor=<name>; each monitor gets its own stream
// session at its native resolution. The Control Center preview has no monitor.
const monitorName = new URLSearchParams(window.location.search).get('monitor') || '';

// Set once the container is measurable, so the stream is requested at the surface's
// real pixel size instead of the server default (which looks blurry when upscaled).
const mounted = ref(false);

function sizeQuery() {
  const dpr = window.devicePixelRatio || 1;
  let w = window.innerWidth;
  let h = window.innerHeight;
  if (!monitorName && containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
  }
  return `&w=${Math.round(w * dpr)}&h=${Math.round(h * dpr)}`;
}

function monitorQuery() {
  const mon = monitorName ? `&monitor=${encodeURIComponent(monitorName)}` : '';
  return mon + sizeQuery();
}

const streamUrl = computed(() => {
  if (!isExternalXSS.value || !mounted.value) return '';
  const base = props.apiBase || '';
  return `${base}/api/xss-stream?saver=${encodeURIComponent(props.saverId)}&client=${clientId}&v=${streamVersion.value}${monitorQuery()}&fps=${Math.min(props.fpsCap > 0 ? props.fpsCap : 30, 30)}`;
});

let animId = null;
let instance = null;
let resizeObserver = null;
let lastFrameTime = 0;
let fpsFrames = 0;
let fpsLastCheck = 0;
let paramDebounceTimer = null;
let lastSaverIdForParams = props.saverId;
let lastParamsJson = JSON.stringify(props.params || {});

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
    if (instance && typeof instance.resize === 'function') {
      instance.resize(w, h);
    }
  }
}

function initVisualizer() {
  if (instance && typeof instance.destroy === 'function') {
    try { instance.destroy(); } catch (e) { console.error('Error destroying saver instance:', e); }
    instance = null;
  }
  if (isExternalXSS.value) {
    return;
  }
  const cvs = canvasRef.value;
  if (!cvs) return;
  syncSize();
  instance = createSaverInstance(
    props.saverId,
    cvs,
    () => props.params || {},
    () => props.telemetry || { blips: [], feed: [] }
  );
}

function loop(timestamp) {
  if (props.paused) {
    animId = null;
    return;
  }
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
    try {
      instance.render(dt);
    } catch (e) {
      console.warn('Screensaver render exception:', e);
    }
  }
}

function stopRemoteStream() {
  const base = props.apiBase || '';
  fetch(`${base}/api/xss-stream?stop=1&client=${clientId}${monitorName ? `&monitor=${encodeURIComponent(monitorName)}` : ''}`).catch(() => {});
}

function onStreamError() {
  if (isExternalXSS.value) {
    setTimeout(() => {
      streamVersion.value++;
    }, 1000);
  }
}

function onContextLost(e) {
  e.preventDefault();
  if (animId) {
    cancelAnimationFrame(animId);
    animId = null;
  }
}

function onContextRestored() {
  initVisualizer();
  lastFrameTime = performance.now();
  if (!props.paused && !animId) {
    animId = requestAnimationFrame(loop);
  }
}

watch(() => props.paused, (isPaused) => {
  if (!isPaused && !animId && !isExternalXSS.value) {
    lastFrameTime = performance.now();
    animId = requestAnimationFrame(loop);
  }
});

watch(() => props.saverId, async (newId, oldId) => {
  lastSaverIdForParams = newId;
  lastParamsJson = JSON.stringify(props.params || {});
  if (paramDebounceTimer) {
    clearTimeout(paramDebounceTimer);
    paramDebounceTimer = null;
  }
  if ((oldId || '').startsWith('xss_') && !(newId || '').startsWith('xss_')) {
    if (imgRef.value) imgRef.value.src = '';
    stopRemoteStream();
  }
  await nextTick();
  initVisualizer();
});

watch(() => props.params, (newParams) => {
  const nextJson = JSON.stringify(newParams || {});
  if (props.saverId !== lastSaverIdForParams) {
    lastSaverIdForParams = props.saverId;
    lastParamsJson = nextJson;
    return;
  }
  if (nextJson === lastParamsJson) return;
  lastParamsJson = nextJson;

  if (!isExternalXSS.value) return;
  if (paramDebounceTimer) clearTimeout(paramDebounceTimer);
  paramDebounceTimer = setTimeout(() => {
    streamVersion.value++;
  }, 350);
}, { deep: true });

onMounted(() => {
  mounted.value = true;
  initVisualizer();
  if (canvasRef.value) {
    canvasRef.value.addEventListener('webglcontextlost', onContextLost, false);
    canvasRef.value.addEventListener('webglcontextrestored', onContextRestored, false);
  }
  resizeObserver = new ResizeObserver(() => syncSize());
  if (containerRef.value) {
    resizeObserver.observe(containerRef.value);
  }
  lastFrameTime = performance.now();
  fpsLastCheck = lastFrameTime;
  animId = requestAnimationFrame(loop);
});

onBeforeUnmount(() => {
  if (instance && typeof instance.destroy === 'function') {
    try { instance.destroy(); } catch (e) {}
    instance = null;
  }
  if (imgRef.value) {
    imgRef.value.src = '';
  }
  if (canvasRef.value) {
    canvasRef.value.removeEventListener('webglcontextlost', onContextLost);
    canvasRef.value.removeEventListener('webglcontextrestored', onContextRestored);
  }
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
