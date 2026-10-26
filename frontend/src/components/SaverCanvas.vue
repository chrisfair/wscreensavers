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
  isWallpaper: { type: Boolean, default: false },
  apiBase: { type: String, default: '' }
});

const containerRef = ref(null);
const canvasRef = ref(null);
const imgRef = ref(null);
const currentFps = ref(60);
const streamVersion = ref(0);
const streamErrorCount = ref(0);
const clientId = 'c_' + Math.random().toString(36).slice(2, 10);

const isExternalXSS = computed(() => (props.saverId || '').startsWith('xss_') && streamErrorCount.value < 2);

// Fullscreen overlay pages carry ?monitor=<name>; each monitor gets its own stream
// session at its native resolution. The Control Center preview has no monitor.
const monitorName = new URLSearchParams(window.location.search).get('monitor') || '';

// Set once the container is measurable, so the stream is requested at the surface's
// real pixel size instead of the server default (which looks blurry when upscaled).
const mounted = ref(false);

function sizeQuery() {
  let w = window.innerWidth;
  let h = window.innerHeight;
  if (!monitorName && containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
  }
  w = Math.round(w);
  h = Math.round(h);
  const maxLong = props.isWallpaper ? 960 : 1280;
  const longEdge = Math.max(w, h);
  if (longEdge > maxLong) {
    w = Math.round((w * maxLong) / longEdge);
    h = Math.round((h * maxLong) / longEdge);
  }
  return `&w=${w}&h=${h}`;
}

function monitorQuery() {
  const mon = monitorName ? `&monitor=${encodeURIComponent(monitorName)}` : '';
  return mon + sizeQuery();
}

const streamUrl = computed(() => {
  if (!isExternalXSS.value || !mounted.value || props.paused) return '';
  const base = props.apiBase || '';
  const maxStreamFps = props.isWallpaper ? 15 : 24;
  const fps = Math.min(props.fpsCap > 0 ? props.fpsCap : maxStreamFps, maxStreamFps);
  return `${base}/api/xss-stream?saver=${encodeURIComponent(props.saverId)}&client=${clientId}&v=${streamVersion.value}${monitorQuery()}&fps=${fps}`;
});

let animId = null;
let fpsTimerId = null;
let instance = null;
let resizeObserver = null;
let lastFrameTime = 0;
let fpsFrames = 0;
let fpsLastCheck = 0;
let paramDebounceTimer = null;
let lastSaverIdForParams = props.saverId;
let lastParamsJson = JSON.stringify(props.params || {});

function clearLoopHandles() {
  if (fpsTimerId) {
    clearTimeout(fpsTimerId);
    fpsTimerId = null;
  }
  if (animId) {
    cancelAnimationFrame(animId);
    animId = null;
  }
}

function startLoopIfNeeded() {
  if (props.paused || isExternalXSS.value || animId || fpsTimerId) return;
  lastFrameTime = performance.now();
  animId = requestAnimationFrame(loop);
}

function syncSize() {
  const wrap = containerRef.value;
  const cvs = canvasRef.value;
  if (!wrap || !cvs) return;
  const rect = wrap.getBoundingClientRect();
  let w = Math.max(300, Math.floor(rect.width));
  let h = Math.max(200, Math.floor(rect.height));
  // Cap internal canvas resolution so multi-monitor WebKit2GTK wl_shm transfers never saturate the Wayland compositor
  const maxLong = props.isWallpaper ? 960 : 1280;
  const longEdge = Math.max(w, h);
  if (longEdge > maxLong) {
    w = Math.max(300, Math.floor((w * maxLong) / longEdge));
    h = Math.max(200, Math.floor((h * maxLong) / longEdge));
  }
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
  animId = null;
  if (props.paused || isExternalXSS.value) {
    return;
  }

  const maxAllowed = props.isWallpaper ? 20 : 30;
  const cap = Math.min(props.fpsCap > 0 ? props.fpsCap : maxAllowed, maxAllowed);
  const minInterval = 1000 / cap;
  const elapsedMs = timestamp - lastFrameTime;

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

  const renderDur = performance.now() - timestamp;
  const delayMs = Math.max(8, Math.floor(minInterval - renderDur - 2));
  fpsTimerId = setTimeout(() => {
    fpsTimerId = null;
    if (!props.paused && !isExternalXSS.value) {
      animId = requestAnimationFrame(loop);
    }
  }, delayMs);
}

function stopRemoteStream() {
  const base = props.apiBase || '';
  fetch(`${base}/api/xss-stream?stop=1&client=${clientId}${monitorName ? `&monitor=${encodeURIComponent(monitorName)}` : ''}`).catch(() => {});
}

function onStreamError() {
  streamErrorCount.value++;
  if (streamErrorCount.value >= 2) {
    stopRemoteStream();
    nextTick(() => {
      initVisualizer();
      startLoopIfNeeded();
    });
    return;
  }
  if (isExternalXSS.value) {
    setTimeout(() => {
      streamVersion.value++;
    }, 800);
  }
}

function onContextLost(e) {
  e.preventDefault();
  clearLoopHandles();
}

function onContextRestored() {
  initVisualizer();
  startLoopIfNeeded();
}

watch(() => props.paused, (isPaused) => {
  if (isPaused) {
    clearLoopHandles();
    if (isExternalXSS.value) {
      if (imgRef.value) imgRef.value.src = '';
      stopRemoteStream();
    }
  } else {
    if (isExternalXSS.value) {
      streamVersion.value++;
    } else {
      startLoopIfNeeded();
    }
  }
});

watch(() => props.saverId, async (newId, oldId) => {
  streamErrorCount.value = 0;
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
  startLoopIfNeeded();
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
  startLoopIfNeeded();
});

onBeforeUnmount(() => {
  clearLoopHandles();
  if (instance && typeof instance.destroy === 'function') {
    try { instance.destroy(); } catch (e) {}
    instance = null;
  }
  if (imgRef.value) {
    imgRef.value.src = '';
  }
  if (isExternalXSS.value) {
    stopRemoteStream();
  }
  if (canvasRef.value) {
    canvasRef.value.removeEventListener('webglcontextlost', onContextLost);
    canvasRef.value.removeEventListener('webglcontextrestored', onContextRestored);
  }
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
