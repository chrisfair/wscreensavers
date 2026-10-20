<template>
  <!-- Mode A: Fullscreen Wayland Layer-Shell Surface (Screensaver, Lock Screen, or Live Wallpaper) -->
  <div v-if="isFullscreenSurface || inWindowFullscreen" class="fullscreen-surface" @keydown.esc="exitInWindowFullscreen" tabindex="0">
    <SaverCanvas
      :saver-id="activeSaverId"
      :params="activeSaverParams"
      :telemetry="telemetry"
      :fps-cap="isWallpaperSurface ? (config.wallpaperFpsCap || 30) : 60"
      :show-fps="false"
      :api-base="apiBase"
    />
    <LockScreenOverlay
      v-if="!isWallpaperSurface"
      :locked="isLockedSurface"
      :show-clock="config.showClockOnSaver !== false"
      :is-wallpaper="isWallpaperSurface"
      :username="username"
      :api-base="apiBase"
      @unlocked="handleUnlocked"
    />
    <button
      v-if="inWindowFullscreen && !isLockedSurface"
      class="exit-preview-btn"
      @click="inWindowFullscreen = false"
    >
      Exit Fullscreen Preview (ESC)
    </button>
  </div>

  <!-- Mode B: WScreenSavers Desktop Control Center -->
  <div v-else class="app-shell">
    <!-- Top Header Bar -->
    <header class="top-bar">
      <div class="brand">
        <div class="brand-logo">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        </div>
        <div>
          <h1>WScreenSavers</h1>
          <span class="subtitle">Native Wayland XScreenSaver Suite &bull; Layer-Shell &bull; PAM Lock</span>
        </div>
      </div>

      <!-- Live Daemon Telemetry Pill -->
      <div class="daemon-pill" :class="{ inhibited: daemonStatus.inhibited }">
        <span class="dot"></span>
        <span v-if="daemonStatus.inhibited">Inhibited: {{ daemonStatus.inhibitReason }}</span>
        <span v-else>Wayland Idle Daemon Active &bull; Idle {{ daemonStatus.idleSeconds }}s / {{ config.idleTimeoutMinutes * 60 }}s</span>
      </div>

      <!-- Primary Actions -->
      <div class="action-buttons">
        <button
          class="btn btn-wallpaper"
          :class="{ active: config.wallpaperEnabled }"
          @click="toggleWallpaperMode"
          title="Render selected screensaver on the Wayland desktop background layer"
        >
          {{ config.wallpaperEnabled ? 'Stop Live Wallpaper' : 'Set as Live Wallpaper' }}
        </button>
        <button class="btn btn-secondary" @click="inWindowFullscreen = true">
          Preview Fullscreen
        </button>
        <button class="btn btn-primary" @click="launchWaylandOverlay(false)">
          Activate on Wayland
        </button>
        <button class="btn btn-lock" @click="launchWaylandOverlay(true)">
          Lock Screen
        </button>
        <button
          class="btn btn-support"
          :class="{ supported: isSupporter }"
          @click="showSupportModal = true"
          title="Voluntary Author Support"
        >
          <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" stroke="currentColor" stroke-width="2" style="margin-right: 4px; vertical-align: -2px;">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          {{ isSupporter ? 'Supporter' : 'Support' }}
        </button>
      </div>
    </header>

    <!-- Main 3-Column Workspace -->
    <div class="workspace">
      <!-- Left Column: Screensaver Catalog -->
      <aside class="catalog-sidebar">
        <div class="search-box">
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="`Search ${savers.length} screensavers...`"
          />
        </div>

        <div class="category-chips">
          <button
            v-for="cat in categories"
            :key="cat"
            class="cat-chip"
            :class="{ active: selectedCategory === cat }"
            @click="selectedCategory = cat"
          >
            {{ cat }}
          </button>
        </div>

        <div class="saver-list">
          <div
            v-for="s in filteredSavers"
            :key="s.id"
            class="saver-item"
            :class="{ selected: selectedSaver.id === s.id }"
            @click="selectSaver(s)"
          >
            <input
              type="checkbox"
              class="pool-check"
              :checked="isSaverEnabled(s.id)"
              @click.stop="toggleSaverInPool(s.id)"
              title="Include in Random / Cycle rotation pool"
            />
            <div class="saver-swatch" :style="{ background: s.previewGrad }"></div>
            <div class="saver-meta">
              <div class="saver-name">{{ s.name }}</div>
              <div class="saver-cat">{{ s.category }}</div>
            </div>
          </div>
        </div>
      </aside>

      <!-- Center Column: Live Preview Canvas + Settings & Multi-Monitor Tabs -->
      <main class="center-stage">
        <div class="preview-card">
          <div class="preview-canvas-container">
            <SaverCanvas
              :saver-id="selectedSaver.id"
              :params="currentSaverParams"
              :telemetry="telemetry"
              :fps-cap="60"
              :show-fps="true"
              :api-base="apiBase"
            />
            <div class="preview-overlay-bar">
              <div>
                <h2>{{ selectedSaver.name }}</h2>
                <p>{{ selectedSaver.description }}</p>
              </div>
              <div class="author-tag">{{ selectedSaver.author }} ({{ selectedSaver.year }})</div>
            </div>
          </div>
        </div>

        <!-- Bottom Configuration Tabs -->
        <div class="config-tabs-card">
          <div class="tab-bar">
            <button
              class="tab-btn"
              :class="{ active: activeTab === 'daemon' }"
              @click="activeTab = 'daemon'"
            >
              Idle Daemon &amp; Lock Security
            </button>
            <button
              class="tab-btn"
              :class="{ active: activeTab === 'monitors' }"
              @click="activeTab = 'monitors'"
            >
              Multi-Monitor Topology ({{ monitors.length }})
            </button>
            <button
              class="tab-btn"
              :class="{ active: activeTab === 'wallpaper' }"
              @click="activeTab = 'wallpaper'"
            >
              Live Desktop Wallpaper
            </button>
          </div>

          <!-- Tab 1: Daemon & Security Settings -->
          <div v-if="activeTab === 'daemon'" class="settings-grid">
            <div class="setting-box">
              <label>Activation Mode</label>
              <select v-model="config.mode" @change="persistConfig">
                <option value="random">Random Screensaver from Pool</option>
                <option value="single">Single Selected Screensaver</option>
                <option value="cycle">Cycle Through Pool</option>
                <option value="disabled">Disabled (Manual Only)</option>
              </select>
            </div>

            <div class="setting-box">
              <label>Blank / Activate After ({{ config.idleTimeoutMinutes }} min)</label>
              <input
                type="range"
                min="1"
                max="120"
                v-model.number="config.idleTimeoutMinutes"
                @change="persistConfig"
              />
            </div>

            <div class="setting-box">
              <label>Cycle Next Hack Every ({{ config.cycleTimeoutMinutes }} min)</label>
              <input
                type="range"
                min="1"
                max="60"
                v-model.number="config.cycleTimeoutMinutes"
                @change="persistConfig"
              />
            </div>

            <div class="setting-box">
              <label>Screen Lock Provider</label>
              <select v-model="config.lockProvider" @change="persistConfig">
                <option value="native">Native PAM Overlay (Glassmorphic Unlock)</option>
                <option value="hyprlock">Delegate to hyprlock</option>
                <option value="swaylock">Delegate to swaylock</option>
              </select>
            </div>

            <div class="setting-box checkboxes">
              <label class="chk">
                <input type="checkbox" v-model="config.lockEnabled" @change="persistConfig" />
                <span>Require Password (PAM) after {{ config.lockGraceSeconds }}s grace</span>
              </label>
              <label class="chk">
                <input type="checkbox" v-model="config.showClockOnSaver" @change="persistConfig" />
                <span>Show Floating Clock HUD on Screensaver</span>
              </label>
            </div>

            <div class="setting-box checkboxes">
              <label class="chk">
                <input type="checkbox" v-model="config.inhibitOnAudio" @change="persistConfig" />
                <span>Inhibit when PipeWire / PulseAudio Media is Playing</span>
              </label>
              <label class="chk">
                <input type="checkbox" v-model="config.inhibitOnFullscreen" @change="persistConfig" />
                <span>Inhibit when Fullscreen Game or Video is Active</span>
              </label>
            </div>
          </div>

          <!-- Tab 2: Multi-Monitor Topology -->
          <MonitorMap
            v-else-if="activeTab === 'monitors'"
            v-model="config"
            :monitors="monitors"
            :savers="savers"
            @save="persistConfig"
          />

          <!-- Tab 3: Live Desktop Wallpaper -->
          <div v-else-if="activeTab === 'wallpaper'" class="settings-grid">
            <div class="setting-box">
              <label>Background Layer Status (zwlr_layer_shell_v1)</label>
              <button
                class="btn btn-wallpaper"
                :class="{ active: config.wallpaperEnabled }"
                @click="toggleWallpaperMode"
              >
                {{ config.wallpaperEnabled ? 'Disable Live Desktop Wallpaper' : 'Enable Live Desktop Wallpaper' }}
              </button>
            </div>

            <div class="setting-box">
              <label>Wallpaper Screensaver</label>
              <select v-model="config.wallpaperSaver" @change="updateWallpaperSaver">
                <option v-for="s in savers" :key="s.id" :value="s.id">
                  {{ s.name }} ({{ s.category }})
                </option>
              </select>
            </div>

            <div class="setting-box">
              <label>Wallpaper Frame Rate Cap ({{ config.wallpaperFpsCap }} FPS)</label>
              <input
                type="range"
                min="15"
                max="60"
                step="5"
                v-model.number="config.wallpaperFpsCap"
                @change="persistConfig"
              />
            </div>
          </div>
        </div>
      </main>

      <!-- Right Column: Per-Screensaver Real-Time Parameter Controls -->
      <aside class="params-sidebar">
        <ParameterPanel
          :saver="selectedSaver"
          :values="currentSaverParams"
          @update="updateSaverParams"
          @reset="resetSaverParams"
        />
      </aside>
    </div>

    <SupportModal
      v-if="showSupportModal"
      :api-base="apiBase"
      @close="showSupportModal = false"
      @updated="isSupporter = true"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import SaverCanvas from './components/SaverCanvas.vue';
import LockScreenOverlay from './components/LockScreenOverlay.vue';
import MonitorMap from './components/MonitorMap.vue';
import ParameterPanel from './components/ParameterPanel.vue';
import SupportModal from './components/SupportModal.vue';

const urlParams = new URLSearchParams(window.location.search);
const isFullscreenSurface = ref(urlParams.get('mode') === 'fullscreen');
const isWallpaperSurface = ref(urlParams.get('wallpaper') === '1');
const isLockedSurface = ref(urlParams.get('locked') === '1');
const surfaceSaverParam = ref(urlParams.get('saver') || '');
const apiBase = ref(urlParams.get('api') || '');

const inWindowFullscreen = ref(false);
const savers = ref([]);
const monitors = ref([]);
const searchQuery = ref('');
const selectedCategory = ref('All');
const activeTab = ref('daemon');
const username = ref('user');
const showSupportModal = ref(false);
const isSupporter = ref(false);

const config = ref({
  mode: 'random',
  selectedSaver: 'glmatrix',
  idleTimeoutMinutes: 10,
  cycleTimeoutMinutes: 5,
  lockEnabled: true,
  lockGraceSeconds: 5,
  lockProvider: 'native',
  showClockOnSaver: true,
  inhibitOnAudio: true,
  inhibitOnFullscreen: true,
  multiMonitorMode: 'independent',
  perMonitorSaver: {},
  wallpaperEnabled: false,
  wallpaperSaver: 'flurry',
  wallpaperPerMonitor: {},
  wallpaperFpsCap: 30,
  enabledSavers: [],
  saverParams: {}
});

const daemonStatus = ref({
  running: true,
  idleSeconds: 0,
  inhibited: false,
  inhibitReason: '',
  screensaverActive: false,
  wallpaperActive: false,
  locked: false
});

const telemetry = ref({
  blips: [],
  feed: []
});

const selectedSaver = computed(() => {
  const found = savers.value.find(s => s.id === config.value.selectedSaver);
  return found || savers.value[0] || { id: 'glmatrix', name: 'GLMatrix', params: [] };
});

const activeSaverId = computed(() => {
  if (isFullscreenSurface.value && surfaceSaverParam.value) {
    return surfaceSaverParam.value;
  }
  return selectedSaver.value.id;
});

const currentSaverParams = computed(() => {
  const id = selectedSaver.value.id;
  return config.value.saverParams?.[id] || {};
});

const activeSaverParams = computed(() => {
  const id = activeSaverId.value;
  return config.value.saverParams?.[id] || {};
});

const categories = computed(() => {
  const set = new Set(['All']);
  for (const s of savers.value) {
    if (s.category) set.add(s.category);
  }
  return Array.from(set);
});

const filteredSavers = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return savers.value.filter(s => {
    const matchCat = selectedCategory.value === 'All' || s.category === selectedCategory.value;
    const matchQuery = !q ||
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      (s.tags && s.tags.some(t => t.toLowerCase().includes(q)));
    return matchCat && matchQuery;
  });
});

async function resolveApiBase() {
  if (apiBase.value) return;
  if (window.go && window.go.main && window.go.main.App) {
    try {
      const url = await window.go.main.App.GetServerBaseURL();
      if (url) apiBase.value = url;
    } catch (_) {}
  }
}

async function fetchInitialData() {
  await resolveApiBase();
  try {
    const [saversRes, cfgRes, monRes, stRes] = await Promise.all([
      fetch(`${apiBase.value}/api/savers`),
      fetch(`${apiBase.value}/api/config`),
      fetch(`${apiBase.value}/api/monitors`),
      fetch(`${apiBase.value}/api/status`)
    ]);
    if (saversRes.ok) savers.value = await saversRes.json();
    if (cfgRes.ok) config.value = await cfgRes.json();
    if (monRes.ok) monitors.value = await monRes.json();
    if (stRes.ok) {
      const st = await stRes.json();
      daemonStatus.value = st.daemon || daemonStatus.value;
      username.value = st.username || username.value;
    }
    if (!isFullscreenSurface.value) {
      let supp = null;
      if (window.go && window.go.main && window.go.main.App && window.go.main.App.GetSupportStatus) {
        try {
          supp = await window.go.main.App.GetSupportStatus();
        } catch (_) {}
      }
      if (!supp) {
        const suppRes = await fetch(`${apiBase.value}/api/support`);
        if (suppRes.ok) supp = await suppRes.json();
      }
      if (supp) {
        isSupporter.value = Boolean(supp.supported || supp.isAuthor);
        if (supp.shouldShowNag) {
          showSupportModal.value = true;
        }
      }
    }
  } catch (e) {
    console.warn('API fetch warning:', e);
  }
  await refreshTelemetry();
}

async function refreshTelemetry() {
  try {
    const [blipsRes, feedRes, stRes] = await Promise.all([
      fetch(`${apiBase.value}/api/telemetry/blips`),
      fetch(`${apiBase.value}/api/telemetry/feed`),
      fetch(`${apiBase.value}/api/status`)
    ]);
    if (blipsRes.ok) telemetry.value.blips = await blipsRes.json();
    if (feedRes.ok) telemetry.value.feed = await feedRes.json();
    if (stRes.ok) {
      const st = await stRes.json();
      daemonStatus.value = st.daemon || daemonStatus.value;
    }
    if (isFullscreenSurface.value) {
      const cfgRes = await fetch(`${apiBase.value}/api/config`);
      if (cfgRes.ok) config.value = await cfgRes.json();
    }
  } catch (_) {}
}

function selectSaver(s) {
  config.value.selectedSaver = s.id;
  persistConfig();
}

function isSaverEnabled(id) {
  return (config.value.enabledSavers || []).includes(id);
}

function toggleSaverInPool(id) {
  const list = new Set(config.value.enabledSavers || []);
  if (list.has(id)) {
    if (list.size > 1) list.delete(id);
  } else {
    list.add(id);
  }
  config.value.enabledSavers = Array.from(list);
  persistConfig();
}

async function persistConfig() {
  try {
    const res = await fetch(`${apiBase.value}/api/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config.value)
    });
    if (res.ok) {
      config.value = await res.json();
    }
  } catch (_) {}
}

async function updateSaverParams(nextParams) {
  const id = selectedSaver.value.id;
  config.value.saverParams = {
    ...(config.value.saverParams || {}),
    [id]: nextParams
  };
  try {
    await fetch(`${apiBase.value}/api/savers/${id}/params`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nextParams)
    });
  } catch (_) {}
}

async function resetSaverParams() {
  const id = selectedSaver.value.id;
  try {
    const res = await fetch(`${apiBase.value}/api/savers/${id}/reset`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      if (data.config) config.value = data.config;
    }
  } catch (_) {}
}

async function launchWaylandOverlay(locked) {
  try {
    await fetch(`${apiBase.value}/api/action/launch-saver`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        saverId: config.value.selectedSaver,
        locked
      })
    });
  } catch (_) {}
}

async function toggleWallpaperMode() {
  const nextState = !config.value.wallpaperEnabled;
  const saverId = config.value.selectedSaver || config.value.wallpaperSaver || 'flurry';
  try {
    const res = await fetch(`${apiBase.value}/api/action/toggle-wallpaper`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabled: nextState,
        saverId
      })
    });
    if (res.ok) {
      config.value = await res.json();
    }
  } catch (_) {}
}

async function updateWallpaperSaver() {
  await persistConfig();
  if (config.value.wallpaperEnabled) {
    await fetch(`${apiBase.value}/api/action/toggle-wallpaper`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabled: true,
        saverId: config.value.wallpaperSaver
      })
    });
  }
}

function handleUnlocked() {
  isLockedSurface.value = false;
  inWindowFullscreen.value = false;
}

function exitInWindowFullscreen() {
  if (!isLockedSurface.value) {
    inWindowFullscreen.value = false;
  }
}

let pollTimer = null;
onMounted(() => {
  fetchInitialData();
  pollTimer = setInterval(refreshTelemetry, 3000);
});

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer);
});
</script>

<style>
* {
  box-sizing: border-box;
}
html, body, #app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  background: #070a12;
  color: #f8fafc;
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  overflow: hidden;
  user-select: none;
}

.fullscreen-surface {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  background: #000;
  z-index: 9999;
}
.exit-preview-btn {
  position: absolute;
  top: 20px;
  left: 24px;
  z-index: 30;
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(9, 13, 26, 0.72);
  color: #f8fafc;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: radial-gradient(circle at top right, #0f172a 0%, #070a12 65%);
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 22px;
  background: rgba(11, 15, 27, 0.88);
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
  gap: 16px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}
.brand-logo {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  background: linear-gradient(135deg, #0ea5e9, #6366f1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 4px 16px rgba(14, 165, 233, 0.35);
}
.brand h1 {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.subtitle {
  font-size: 11px;
  color: #94a3b8;
}

.daemon-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #34d399;
  font-size: 12px;
  font-weight: 600;
}
.daemon-pill.inhibited {
  background: rgba(245, 158, 11, 0.14);
  border-color: rgba(245, 158, 11, 0.35);
  color: #fbbf24;
}
.daemon-pill .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.action-buttons {
  display: flex;
  gap: 8px;
}
.btn {
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-secondary {
  background: rgba(30, 41, 59, 0.75);
  border-color: rgba(148, 163, 184, 0.25);
  color: #e2e8f0;
}
.btn-secondary:hover {
  border-color: #38bdf8;
}
.btn-primary {
  background: linear-gradient(135deg, #0ea5e9, #3b82f6);
  color: #ffffff;
}
.btn-lock {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #ffffff;
}
.btn-support {
  background: rgba(244, 63, 94, 0.14);
  border-color: rgba(244, 63, 94, 0.35);
  color: #fb7185;
}
.btn-support:hover {
  background: rgba(244, 63, 94, 0.25);
  border-color: #fb7185;
  color: #ffffff;
}
.btn-support.supported {
  background: rgba(16, 185, 129, 0.14);
  border-color: rgba(16, 185, 129, 0.35);
  color: #34d399;
}
.btn-wallpaper {
  background: rgba(15, 23, 42, 0.85);
  border-color: rgba(56, 189, 248, 0.35);
  color: #38bdf8;
}
.btn-wallpaper.active {
  background: linear-gradient(135deg, #059669, #10b981);
  border-color: transparent;
  color: #ffffff;
}

.workspace {
  flex: 1;
  display: grid;
  grid-template-columns: 300px 1fr 320px;
  gap: 16px;
  padding: 16px 20px;
  min-height: 0;
}

.catalog-sidebar {
  display: flex;
  flex-direction: column;
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 16px;
  padding: 14px;
  min-height: 0;
}
.search-box input {
  width: 100%;
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(2, 6, 23, 0.75);
  color: #f8fafc;
  font-size: 12px;
  outline: none;
}
.search-box input:focus {
  border-color: #38bdf8;
}
.category-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin: 10px 0;
}
.cat-chip {
  padding: 4px 9px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(15, 23, 42, 0.6);
  color: #94a3b8;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}
.cat-chip.active {
  background: #0ea5e9;
  border-color: #0ea5e9;
  color: #fff;
}
.saver-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-right: 4px;
}
.saver-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 11px;
  border: 1px solid transparent;
  background: rgba(2, 6, 23, 0.45);
  cursor: pointer;
  transition: all 0.12s ease;
}
.saver-item:hover {
  background: rgba(30, 41, 59, 0.55);
}
.saver-item.selected {
  background: rgba(14, 165, 233, 0.16);
  border-color: rgba(56, 189, 248, 0.5);
}
.saver-swatch {
  width: 34px;
  height: 26px;
  border-radius: 6px;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.15);
}
.saver-meta {
  min-width: 0;
  flex: 1;
}
.saver-name {
  font-size: 13px;
  font-weight: 700;
  color: #f8fafc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.saver-cat {
  font-size: 10px;
  color: #94a3b8;
}

.center-stage {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
}
.preview-card {
  flex: 1;
  min-height: 280px;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(56, 189, 248, 0.25);
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.5);
  position: relative;
}
.preview-canvas-container {
  width: 100%;
  height: 100%;
  position: relative;
}
.preview-overlay-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px 22px;
  background: linear-gradient(to top, rgba(4, 7, 15, 0.92), rgba(4, 7, 15, 0.0));
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  pointer-events: none;
}
.preview-overlay-bar h2 {
  margin: 0 0 4px;
  font-size: 19px;
  font-weight: 800;
}
.preview-overlay-bar p {
  margin: 0;
  font-size: 12px;
  color: #cbd5e1;
  max-width: 650px;
}
.author-tag {
  font-size: 11px;
  color: #38bdf8;
  font-family: "JetBrains Mono", monospace;
  white-space: nowrap;
}

.config-tabs-card {
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 16px;
  padding: 14px 18px;
}
.tab-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
  padding-bottom: 10px;
}
.tab-btn {
  padding: 6px 14px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.tab-btn.active {
  background: rgba(14, 165, 233, 0.18);
  color: #38bdf8;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}
.setting-box {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: rgba(2, 6, 23, 0.55);
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.12);
}
.setting-box label {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
}
.setting-box select {
  padding: 7px 10px;
  border-radius: 8px;
  background: #0f172a;
  border: 1px solid rgba(148, 163, 184, 0.25);
  color: #f8fafc;
  font-size: 12px;
}
.setting-box input[type="range"] {
  accent-color: #0ea5e9;
}
.setting-box.checkboxes {
  justify-content: center;
  gap: 8px;
}
.chk {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px !important;
  color: #e2e8f0 !important;
  cursor: pointer;
}

.params-sidebar {
  overflow-y: auto;
  min-height: 0;
}
</style>
