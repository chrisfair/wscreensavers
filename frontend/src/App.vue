<template>
  <!-- Mode A: Fullscreen Wayland Layer-Shell Surface (Screensaver, Lock Screen, or Live Wallpaper) -->
  <div v-if="isFullscreenSurface || inWindowFullscreen" class="fullscreen-surface" @keydown.esc="exitInWindowFullscreen" tabindex="0">
    <SaverCanvas
      :saver-id="activeSaverId"
      :params="activeSaverParams"
      :telemetry="telemetry"
      :fps-cap="isWallpaperSurface ? Math.min(config.wallpaperFpsCap || 15, 20) : 30"
      :show-fps="false"
      :paused="isScreenDark"
      :is-wallpaper="isWallpaperSurface"
      :api-base="apiBase"
    />
    <LockScreenOverlay
      v-if="!isWallpaperSurface"
      :locked="isLockedSurface"
      :show-clock="config.showClockOnSaver !== false"
      :is-wallpaper="isWallpaperSurface"
      :username="username"
      :api-base="apiBase"
      :dpms-minutes="config.dpmsOffMinutes ?? dpmsMinutesParam"
      @dark-change="isScreenDark = $event"
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
  <div v-else class="app-shell" @click="closeMenus">
    <!-- Standard Application Menu Header Bar -->
    <nav class="app-menubar" @click.stop>
      <div class="menubar-left">
        <!-- Actions Menu -->
        <div class="menu-item" :class="{ open: openMenu === 'actions' }">
          <button
            class="menu-trigger"
            type="button"
            @click="toggleMenu('actions')"
            @mouseenter="hoverMenu('actions')"
          >
            Actions
          </button>
          <div v-if="openMenu === 'actions'" class="menu-dropdown">
            <button class="menu-entry" type="button" @click="runMenuAction(() => { inWindowFullscreen = true })">
              <span>Preview Fullscreen</span>
              <span class="menu-kbd">ESC to exit</span>
            </button>
            <button class="menu-entry" type="button" @click="runMenuAction(() => launchWaylandOverlay(false))">
              <span>Activate Screensaver on Wayland</span>
            </button>
            <button class="menu-entry" type="button" @click="runMenuAction(() => launchWaylandOverlay(true))">
              <span>Lock Screen Now</span>
            </button>
            <div class="menu-divider"></div>
            <button class="menu-entry" type="button" @click="runMenuAction(toggleWallpaperMode)">
              <span class="menu-check">{{ config.wallpaperEnabled ? '✓' : '' }}</span>
              <span>{{ config.wallpaperEnabled ? 'Disable Live Desktop Wallpaper' : 'Enable Live Desktop Wallpaper' }}</span>
            </button>
            <button class="menu-entry" type="button" @click="runMenuAction(randomizeUniqueWallpapers)">
              <span class="menu-check"></span>
              <span>Randomize Per-Monitor Wallpapers</span>
            </button>
            <div class="menu-divider"></div>
            <button class="menu-entry" type="button" @click="runMenuAction(fetchInitialData)">
              <span class="menu-check"></span>
              <span>Refresh Telemetry &amp; Catalog</span>
            </button>
          </div>
        </div>

        <!-- Settings Menu -->
        <div class="menu-item" :class="{ open: openMenu === 'settings' }">
          <button
            class="menu-trigger"
            type="button"
            @click="toggleMenu('settings')"
            @mouseenter="hoverMenu('settings')"
          >
            Settings
          </button>
          <div v-if="openMenu === 'settings'" class="menu-dropdown menu-dropdown-wide">
            <div class="menu-section-label">Configuration Panels</div>
            <button class="menu-entry" type="button" @click="runMenuAction(() => { activeTab = 'daemon' })">
              <span class="menu-check">{{ activeTab === 'daemon' ? '•' : '' }}</span>
              <span>Idle Daemon &amp; Lock Security</span>
            </button>
            <button class="menu-entry" type="button" @click="runMenuAction(() => { activeTab = 'monitors' })">
              <span class="menu-check">{{ activeTab === 'monitors' ? '•' : '' }}</span>
              <span>Multi-Monitor Topology ({{ monitors.length }})</span>
            </button>
            <button class="menu-entry" type="button" @click="runMenuAction(() => { activeTab = 'wallpaper' })">
              <span class="menu-check">{{ activeTab === 'wallpaper' ? '•' : '' }}</span>
              <span>Live Desktop Wallpaper</span>
            </button>
            <div class="menu-divider"></div>
            <div class="menu-section-label">Quick Preferences</div>
            <button class="menu-entry" type="button" @click="toggleBoolConfig('lockEnabled')">
              <span class="menu-check">{{ config.lockEnabled ? '✓' : '' }}</span>
              <span>Require PAM Password on Lock</span>
            </button>
            <button class="menu-entry" type="button" @click="toggleBoolConfig('showClockOnSaver')">
              <span class="menu-check">{{ config.showClockOnSaver ? '✓' : '' }}</span>
              <span>Show Floating Clock HUD</span>
            </button>
            <button class="menu-entry" type="button" @click="toggleBoolConfig('inhibitOnAudio')">
              <span class="menu-check">{{ config.inhibitOnAudio ? '✓' : '' }}</span>
              <span>Inhibit When Audio is Playing</span>
            </button>
            <button class="menu-entry" type="button" @click="toggleBoolConfig('inhibitOnFullscreen')">
              <span class="menu-check">{{ config.inhibitOnFullscreen ? '✓' : '' }}</span>
              <span>Inhibit When Fullscreen App Active</span>
            </button>
            <div class="menu-divider"></div>
            <div class="menu-section-label">Activation Mode</div>
            <button
              v-for="m in activationModes"
              :key="m.id"
              class="menu-entry"
              type="button"
              @click="setActivationMode(m.id)"
            >
              <span class="menu-check">{{ config.mode === m.id ? '•' : '' }}</span>
              <span>{{ m.label }}</span>
            </button>
          </div>
        </div>

        <!-- Appearance Menu -->
        <div class="menu-item" :class="{ open: openMenu === 'appearance' }">
          <button
            class="menu-trigger"
            type="button"
            @click="toggleMenu('appearance')"
            @mouseenter="hoverMenu('appearance')"
          >
            Appearance
          </button>
          <div v-if="openMenu === 'appearance'" class="menu-dropdown">
            <button class="menu-entry" type="button" @click="runMenuAction(toggleLightDark)">
              <span class="menu-check">{{ isCurrentThemeLight ? '🌙' : '☀️' }}</span>
              <span>{{ isCurrentThemeLight ? 'Switch to Dark Mode' : 'Switch to Light Mode' }}</span>
            </button>
            <div class="menu-divider"></div>
            <div class="menu-section-label">Dark Themes</div>
            <button
              v-for="t in themeOptions.dark"
              :key="t.id"
              class="menu-entry"
              type="button"
              @click="runMenuAction(() => applyTheme(t.id))"
            >
              <span class="menu-check">{{ currentTheme === t.id ? '✓' : '' }}</span>
              <span>{{ t.label }}</span>
            </button>
            <div class="menu-divider"></div>
            <div class="menu-section-label">Light Themes</div>
            <button
              v-for="t in themeOptions.light"
              :key="t.id"
              class="menu-entry"
              type="button"
              @click="runMenuAction(() => applyTheme(t.id))"
            >
              <span class="menu-check">{{ currentTheme === t.id ? '✓' : '' }}</span>
              <span>{{ t.label }}</span>
            </button>
          </div>
        </div>

        <!-- Help Menu -->
        <div class="menu-item" :class="{ open: openMenu === 'help' }">
          <button
            class="menu-trigger"
            type="button"
            @click="toggleMenu('help')"
            @mouseenter="hoverMenu('help')"
          >
            Help
          </button>
          <div v-if="openMenu === 'help'" class="menu-dropdown">
            <button class="menu-entry" type="button" @click="runMenuAction(() => { showSupportModal = true })">
              <span class="menu-check">{{ isSupporter ? '♥' : '' }}</span>
              <span>{{ isSupporter ? 'Supporter Status' : 'Voluntary Author Support...' }}</span>
            </button>
            <div class="menu-divider"></div>
            <button class="menu-entry" type="button" @click="runMenuAction(() => { showAboutModal = true })">
              <span class="menu-check"></span>
              <span>About WScreenSavers (v{{ appVersion }})</span>
            </button>
          </div>
        </div>
      </div>

      <div class="menubar-right">
        <button
          v-if="config.wallpaperEnabled"
          class="menubar-status-chip wallpaper-active"
          type="button"
          @click="activeTab = 'wallpaper'"
          title="Live Desktop Wallpaper is running — click to configure"
        >
          Live Wallpaper Active
        </button>
        <button
          class="menubar-version"
          type="button"
          @click="showAboutModal = true"
          title="About WScreenSavers"
        >
          v{{ appVersion }}
        </button>
      </div>
    </nav>

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
          <div class="brand-title-row">
            <h1>WScreenSavers</h1>
            <button class="version-badge" type="button" @click="showAboutModal = true" title="View version &amp; build info">
              v{{ appVersion }}
            </button>
          </div>
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
        <button class="btn btn-secondary" @click="inWindowFullscreen = true">
          Preview Fullscreen
        </button>
        <button class="btn btn-primary" @click="launchWaylandOverlay(false)">
          Activate on Wayland
        </button>
        <button class="btn btn-lock" @click="launchWaylandOverlay(true)">
          Lock Screen
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
              :fps-cap="config.wallpaperEnabled ? 15 : 24"
              :show-fps="true"
              :paused="isPreviewPaused"
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
              <label>Turn Off Screens / Go Dark ({{ config.dpmsOffMinutes > 0 ? config.dpmsOffMinutes + ' min' : 'Disabled' }})</label>
              <input
                type="range"
                min="0"
                max="120"
                step="5"
                v-model.number="config.dpmsOffMinutes"
                @change="persistConfig"
              />
            </div>

            <div class="setting-box">
              <label>OpenGL Saver Max Resolution ({{ config.xssMaxStreamDim }} px)</label>
              <select v-model.number="config.xssMaxStreamDim" @change="persistConfig">
                <option :value="1280">1280 px &mdash; lightest on CPU</option>
                <option :value="1920">1920 px &mdash; balanced (default)</option>
                <option :value="2560">2560 px &mdash; sharper, heavier</option>
                <option :value="3840">3840 px &mdash; full 4K, heaviest</option>
              </select>
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
          <div v-else-if="activeTab === 'wallpaper'" class="wallpaper-tab-container">
            <div class="settings-grid">
              <div class="setting-box wallpaper-note" :class="{ warn: otherWallpapers.length }">
                <label>Other wallpapers</label>
                <p>
                  The live wallpaper is drawn on top of every other wallpaper, including
                  Noctalia's own, hyprpaper, swww and swaybg. They keep running underneath it,
                  so turn them off if you do not want them running behind this one.
                </p>
                <p v-if="otherWallpapers.length">
                  Detected running now: <strong>{{ otherWallpapers.join(', ') }}</strong>
                </p>
              </div>

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
                <label>Wallpaper Layout Mode</label>
                <div class="mode-pills-row">
                  <button
                    class="mode-pill"
                    :class="{ active: (config.wallpaperMode || 'single') === 'single' }"
                    @click="setWallpaperMode('single')"
                  >
                    Same on All Screens
                  </button>
                  <button
                    class="mode-pill"
                    :class="{ active: config.wallpaperMode === 'per-monitor' }"
                    @click="setWallpaperMode('per-monitor')"
                  >
                    Unique Per Screen ({{ monitors.length || 1 }})
                  </button>
                </div>
              </div>

              <div v-if="(config.wallpaperMode || 'single') === 'single'" class="setting-box">
                <label>Wallpaper Screensaver</label>
                <select v-model="config.wallpaperSaver" @change="updateWallpaperSaver">
                  <option value="random">🎲 Random (Shuffle All)</option>
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

            <!-- Per-Monitor Unique Live Wallpaper Configuration Section -->
            <div v-if="config.wallpaperMode === 'per-monitor'" class="per-monitor-wallpaper-section">
              <div class="section-subbar">
                <div>
                  <h4 class="subbar-title">Per-Screen Unique Live Wallpapers</h4>
                  <p class="subbar-desc">Each screen must run a distinct live wallpaper. Duplicate screensavers are locked out to ensure strict visual uniqueness.</p>
                </div>
                <button class="btn btn-secondary btn-sm" @click="randomizeUniqueWallpapers">
                  🎲 Randomize Unique Set
                </button>
              </div>

              <div class="monitors-grid">
                <div
                  v-for="mon in (monitors.length ? monitors : [{ name: 'default', width: 1920, height: 1080, refreshRate: 60 }])"
                  :key="mon.name"
                  class="monitor-card"
                >
                  <div class="monitor-screen">
                    <div class="mon-badge">{{ mon.name }}</div>
                    <div class="mon-res">{{ mon.width }}×{{ mon.height }} @ {{ Math.round(mon.refreshRate) }}Hz</div>
                    <div class="mon-desc">{{ mon.description || mon.model || 'Wayland Output' }}</div>
                  </div>

                  <div class="mon-select-row">
                    <label>Assigned Unique Live Wallpaper:</label>
                    <select
                      :value="getMonitorWallpaper(mon.name)"
                      @change="setMonitorWallpaper(mon.name, $event.target.value)"
                    >
                      <option
                        v-for="s in savers"
                        :key="s.id"
                        :value="s.id"
                        :disabled="isSaverAssignedToOther(s.id, mon.name)"
                      >
                        {{ s.name }} ({{ s.category }}){{ isSaverAssignedToOther(s.id, mon.name) ? ' 🔒 (In use on ' + getMonitorUsingSaver(s.id, mon.name) + ')' : '' }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>
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

    <!-- About WScreenSavers Modal -->
    <div v-if="showAboutModal" class="about-modal-backdrop" @click.self="showAboutModal = false">
      <div class="about-modal-card">
        <div class="about-header">
          <div class="brand-logo">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <div>
            <h3>WScreenSavers</h3>
            <span class="about-version-pill">Version v{{ appVersion }}</span>
          </div>
        </div>

        <p class="about-desc">
          Native Wayland screensaver, PAM lock screen, and live desktop wallpaper suite built on
          <code>zwlr_layer_shell_v1</code>, WebGL/GLSL shaders, and authentic XScreenSaver OpenGL hacks.
        </p>

        <div class="about-meta-grid">
          <div class="about-meta-row">
            <span class="about-meta-label">Release Version</span>
            <span class="about-meta-val">v{{ appVersion }}</span>
          </div>
          <div class="about-meta-row">
            <span class="about-meta-label">Screensaver Catalog</span>
            <span class="about-meta-val">{{ savers.length }} modules loaded</span>
          </div>
          <div class="about-meta-row">
            <span class="about-meta-label">Wayland Outputs</span>
            <span class="about-meta-val">{{ monitors.length || 1 }} detected</span>
          </div>
          <div class="about-meta-row">
            <span class="about-meta-label">CLI Version Check</span>
            <code class="about-code">wscreensavers --version</code>
          </div>
          <div class="about-meta-row">
            <span class="about-meta-label">Daemon Status Check</span>
            <code class="about-code">wscreensavers ctl status</code>
          </div>
        </div>

        <div class="about-actions">
          <button class="btn btn-secondary" type="button" @click="showAboutModal = false">
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import SaverCanvas from './components/SaverCanvas.vue';
import LockScreenOverlay from './components/LockScreenOverlay.vue';
import MonitorMap from './components/MonitorMap.vue';
import ParameterPanel from './components/ParameterPanel.vue';
import SupportModal from './components/SupportModal.vue';
import { callWailsApp } from './wails.js';

const urlParams = new URLSearchParams(window.location.search);
const isFullscreenSurface = ref(urlParams.get('mode') === 'fullscreen');
const isWallpaperSurface = ref(urlParams.get('wallpaper') === '1');
const isLockedSurface = ref(urlParams.get('locked') === '1');
const surfaceSaverParam = ref(urlParams.get('saver') || '');
const apiBase = ref(urlParams.get('api') || '');
const dpmsMinutesParam = ref(parseInt(urlParams.get('dpms') || '30', 10));
const isScreenDark = ref(false);

const inWindowFullscreen = ref(false);
const savers = ref([]);
const monitors = ref([]);
const searchQuery = ref('');
const selectedCategory = ref('All');
const activeTab = ref('daemon');
const username = ref('user');
const showSupportModal = ref(false);
const showAboutModal = ref(false);
const isSupporter = ref(false);
const appVersion = ref('1.1.11');
const openMenu = ref(null);

const themeOptions = {
  dark: [
    { id: 'midnight', label: 'Noctalia Midnight' },
    { id: 'catppuccin-mocha', label: 'Catppuccin Mocha' },
    { id: 'tokyo-night', label: 'Tokyo Night' },
    { id: 'nord', label: 'Nord' },
    { id: 'solarized-dark', label: 'Solarized Dark' }
  ],
  light: [
    { id: 'studio-light', label: 'Studio Light' },
    { id: 'catppuccin-latte', label: 'Catppuccin Latte' },
    { id: 'solarized-light', label: 'Solarized Light' }
  ]
};

const activationModes = [
  { id: 'random', label: 'Random Screensaver from Pool' },
  { id: 'single', label: 'Single Selected Screensaver' },
  { id: 'cycle', label: 'Cycle Through Pool' },
  { id: 'disabled', label: 'Disabled (Manual Only)' }
];

function toggleMenu(name) {
  openMenu.value = openMenu.value === name ? null : name;
}

function hoverMenu(name) {
  if (openMenu.value !== null) {
    openMenu.value = name;
  }
}

function closeMenus() {
  openMenu.value = null;
}

function runMenuAction(fn) {
  openMenu.value = null;
  if (typeof fn === 'function') fn();
}

function toggleBoolConfig(key) {
  config.value[key] = !config.value[key];
  persistConfig();
}

function setActivationMode(mode) {
  config.value.mode = mode;
  openMenu.value = null;
  persistConfig();
}

const darkThemes = ['midnight', 'catppuccin-mocha', 'tokyo-night', 'nord', 'solarized-dark'];
const lightThemes = ['studio-light', 'catppuccin-latte', 'solarized-light'];
const urlTheme = urlParams.get('theme');
const currentTheme = ref(urlTheme || localStorage.getItem('wscreensavers_theme') || 'midnight');
const isCurrentThemeLight = computed(() => lightThemes.includes(currentTheme.value));

function applyTheme(themeId) {
  if (!themeId) themeId = 'midnight';
  currentTheme.value = themeId;
  try {
    localStorage.setItem('wscreensavers_theme', themeId);
    if (lightThemes.includes(themeId)) {
      localStorage.setItem('wscreensavers_last_light', themeId);
    } else {
      localStorage.setItem('wscreensavers_last_dark', themeId);
    }
  } catch (e) {}
  document.documentElement.setAttribute('data-theme', themeId);
}

function toggleLightDark() {
  if (isCurrentThemeLight.value) {
    const targetDark = localStorage.getItem('wscreensavers_last_dark') || 'midnight';
    applyTheme(targetDark);
  } else {
    const targetLight = localStorage.getItem('wscreensavers_last_light') || 'studio-light';
    applyTheme(targetLight);
  }
}

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
  xssMaxStreamDim: 1920,
  enabledSavers: [],
  saverParams: {},
  dpmsOffMinutes: 30
});

const otherWallpapers = ref([]);
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
  const url = await callWailsApp('GetServerBaseURL');
  if (url) apiBase.value = url;
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
      otherWallpapers.value = st.otherWallpapers || [];
      username.value = st.username || username.value;
      if (st.version) appVersion.value = st.version;
    }
    if (!isFullscreenSurface.value) {
      let supp = await callWailsApp('GetSupportStatus');
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

let lastSeenWakeMs = 0;
let pollTickCount = 0;
const isDocumentHidden = ref(typeof document !== 'undefined' ? document.hidden : false);
const isWindowFocused = ref(typeof document !== 'undefined' && typeof document.hasFocus === 'function' ? document.hasFocus() : true);

const isPreviewPaused = computed(() => {
  return Boolean(!isWindowFocused.value || isDocumentHidden.value || daemonStatus.value.screensaverActive || daemonStatus.value.locked);
});

const needsLiveTelemetry = computed(() => {
  const id = isFullscreenSurface.value ? activeSaverId.value : selectedSaver.value.id;
  return id === 'sonar' || id === 'phosphor' || id === 'starwars';
});

function onVisibilityChange() {
  isDocumentHidden.value = Boolean(document.hidden);
}

function onWindowFocus() {
  isWindowFocused.value = true;
}

function onWindowBlur() {
  isWindowFocused.value = false;
}

async function refreshTelemetry() {
  pollTickCount++;
  try {
    if (isScreenDark.value) {
      if (!isWallpaperSurface.value) {
        const stRes = await fetch(`${apiBase.value}/api/status?light=1`);
        if (stRes.ok) {
          const st = await stRes.json();
          if (st.lastWakeMs) {
            if (lastSeenWakeMs > 0 && st.lastWakeMs > lastSeenWakeMs && window.__wssWake) {
              window.__wssWake();
            }
            lastSeenWakeMs = st.lastWakeMs;
          }
        }
      }
      return;
    }

    if (needsLiveTelemetry.value && (!isDocumentHidden.value || isFullscreenSurface.value)) {
      const [blipsRes, feedRes] = await Promise.all([
        fetch(`${apiBase.value}/api/telemetry/blips`),
        fetch(`${apiBase.value}/api/telemetry/feed`)
      ]);
      if (blipsRes.ok) telemetry.value.blips = await blipsRes.json();
      if (feedRes.ok) telemetry.value.feed = await feedRes.json();
    }

    if (!isWallpaperSurface.value) {
      const statusUrl = isFullscreenSurface.value
        ? `${apiBase.value}/api/status?light=1`
        : `${apiBase.value}/api/status`;
      const stRes = await fetch(statusUrl);
      if (stRes.ok) {
        const st = await stRes.json();
        daemonStatus.value = st.daemon || daemonStatus.value;
        if (st.otherWallpapers) otherWallpapers.value = st.otherWallpapers;
        if (st.version) appVersion.value = st.version;
        if (st.lastWakeMs) {
          if (lastSeenWakeMs > 0 && st.lastWakeMs > lastSeenWakeMs && window.__wssWake) {
            window.__wssWake();
          }
          lastSeenWakeMs = st.lastWakeMs;
        }
      }
    }

    if (isFullscreenSurface.value && pollTickCount % 5 === 0) {
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
  config.value.wallpaperEnabled = nextState;
  if (nextState && monitors.value.length > 1 && config.value.wallpaperMode !== 'single') {
    config.value.wallpaperMode = 'per-monitor';
    ensureUniqueMonitorWallpapers();
    await persistConfig();
  }
  const saverId = config.value.wallpaperMode !== 'single'
    ? 'per-monitor'
    : (config.value.wallpaperSaver || 'flurry');
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
    const saverId = config.value.wallpaperMode === 'per-monitor' ? 'per-monitor' : config.value.wallpaperSaver;
    await fetch(`${apiBase.value}/api/action/toggle-wallpaper`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabled: true,
        saverId
      })
    });
  }
}

function setWallpaperMode(mode) {
  config.value.wallpaperMode = mode;
  if (mode === 'per-monitor') {
    ensureUniqueMonitorWallpapers();
  }
  updateWallpaperSaver();
}

function getMonitorWallpaper(monName) {
  if (!config.value.wallpaperPerMonitor) {
    config.value.wallpaperPerMonitor = {};
  }
  return config.value.wallpaperPerMonitor[monName] || config.value.wallpaperSaver || 'flurry';
}

function getMonitorUsingSaver(saverId, currentMonName) {
  if (!config.value.wallpaperPerMonitor) return null;
  for (const [mon, id] of Object.entries(config.value.wallpaperPerMonitor)) {
    if (mon !== currentMonName && id === saverId) {
      return mon;
    }
  }
  return null;
}

function isSaverAssignedToOther(saverId, currentMonName) {
  return getMonitorUsingSaver(saverId, currentMonName) !== null;
}

async function setMonitorWallpaper(monName, saverId) {
  if (!config.value.wallpaperPerMonitor) {
    config.value.wallpaperPerMonitor = {};
  }
  // Clear any existing assignment on another monitor to guarantee strict uniqueness
  for (const [m, id] of Object.entries(config.value.wallpaperPerMonitor)) {
    if (m !== monName && id === saverId) {
      delete config.value.wallpaperPerMonitor[m];
    }
  }
  config.value.wallpaperPerMonitor[monName] = saverId;
  config.value.wallpaperMode = 'per-monitor';
  await updateWallpaperSaver();
}

async function randomizeUniqueWallpapers() {
  if (!config.value.wallpaperPerMonitor) {
    config.value.wallpaperPerMonitor = {};
  }
  const available = savers.value.slice();
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  const monList = monitors.value.length > 0 ? monitors.value : [{ name: 'default' }];
  const newMap = {};
  monList.forEach((mon, idx) => {
    newMap[mon.name] = available[idx % available.length]?.id || 'flurry';
  });
  config.value.wallpaperPerMonitor = newMap;
  config.value.wallpaperMode = 'per-monitor';
  await updateWallpaperSaver();
}

function ensureUniqueMonitorWallpapers() {
  if (!config.value.wallpaperPerMonitor) {
    config.value.wallpaperPerMonitor = {};
  }
  const monList = monitors.value.length > 0 ? monitors.value : [{ name: 'default' }];
  const used = new Set();
  for (const mon of monList) {
    const assigned = config.value.wallpaperPerMonitor[mon.name];
    if (assigned && !used.has(assigned)) {
      used.add(assigned);
    } else {
      delete config.value.wallpaperPerMonitor[mon.name];
    }
  }
  for (const mon of monList) {
    if (!config.value.wallpaperPerMonitor[mon.name]) {
      const candidate = savers.value.find(s => !used.has(s.id));
      if (candidate) {
        config.value.wallpaperPerMonitor[mon.name] = candidate.id;
        used.add(candidate.id);
      } else {
        config.value.wallpaperPerMonitor[mon.name] = 'flurry';
      }
    }
  }
}

function handleUnlocked() {
  isLockedSurface.value = false;
  inWindowFullscreen.value = false;
  if (apiBase.value) {
    fetch(`${apiBase.value}/api/action/stop-saver`, { method: 'POST' }).catch(() => {});
  }
}

function exitInWindowFullscreen() {
  if (!isLockedSurface.value) {
    inWindowFullscreen.value = false;
  }
}

let pollTimer = null;
onMounted(() => {
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('focus', onWindowFocus);
  window.addEventListener('blur', onWindowBlur);
  applyTheme(currentTheme.value);
  fetchInitialData();
  pollTimer = setInterval(refreshTelemetry, 3000);
});

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange);
  window.removeEventListener('focus', onWindowFocus);
  window.removeEventListener('blur', onWindowBlur);
  if (pollTimer) clearInterval(pollTimer);
});
</script>

<style>
* {
  box-sizing: border-box;
}

:root, [data-theme="midnight"] {
  --bg-app: #070a12;
  --bg-radial: radial-gradient(circle at top right, #0f172a 0%, #070a12 65%);
  --bg-topbar: rgba(11, 15, 27, 0.92);
  --bg-sidebar: rgba(15, 23, 42, 0.65);
  --bg-card: rgba(15, 23, 42, 0.65);
  --bg-card-subtle: rgba(2, 6, 23, 0.55);
  --bg-card-hover: rgba(30, 41, 59, 0.55);
  --bg-input: #0f172a;
  --bg-dropdown-item: #0f172a;
  --border-subtle: rgba(148, 163, 184, 0.14);
  --border-strong: rgba(148, 163, 184, 0.28);
  --border-focus: #38bdf8;
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
  --text-dim: #64748b;
  --accent: #0ea5e9;
  --accent-gradient: linear-gradient(135deg, #0ea5e9, #6366f1);
  --accent-hover: #0284c7;
  --select-arrow: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2338bdf8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  --pill-daemon-bg: rgba(16, 185, 129, 0.12);
  --pill-daemon-border: rgba(16, 185, 129, 0.3);
  --pill-daemon-text: #34d399;
  --scrollbar-thumb: rgba(148, 163, 184, 0.25);
  --scrollbar-thumb-hover: rgba(148, 163, 184, 0.45);
}

[data-theme="catppuccin-mocha"] {
  --bg-app: #11111b;
  --bg-radial: radial-gradient(circle at top right, #1e1e2e 0%, #11111b 70%);
  --bg-topbar: rgba(24, 24, 37, 0.95);
  --bg-sidebar: rgba(30, 30, 46, 0.75);
  --bg-card: rgba(30, 30, 46, 0.75);
  --bg-card-subtle: rgba(24, 24, 37, 0.7);
  --bg-card-hover: rgba(49, 50, 68, 0.6);
  --bg-input: #1e1e2e;
  --bg-dropdown-item: #181825;
  --border-subtle: rgba(147, 153, 178, 0.18);
  --border-strong: rgba(147, 153, 178, 0.32);
  --border-focus: #cba6f7;
  --text-main: #cdd6f4;
  --text-muted: #a6adc8;
  --text-dim: #6c7086;
  --accent: #cba6f7;
  --accent-gradient: linear-gradient(135deg, #cba6f7, #89b4fa);
  --accent-hover: #b4befe;
  --select-arrow: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23cba6f7' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  --pill-daemon-bg: rgba(166, 227, 161, 0.15);
  --pill-daemon-border: rgba(166, 227, 161, 0.35);
  --pill-daemon-text: #a6e3a1;
  --scrollbar-thumb: rgba(147, 153, 178, 0.28);
  --scrollbar-thumb-hover: rgba(147, 153, 178, 0.48);
}

[data-theme="tokyo-night"] {
  --bg-app: #16161e;
  --bg-radial: radial-gradient(circle at top right, #24283b 0%, #16161e 70%);
  --bg-topbar: rgba(26, 27, 38, 0.95);
  --bg-sidebar: rgba(36, 40, 59, 0.75);
  --bg-card: rgba(36, 40, 59, 0.75);
  --bg-card-subtle: rgba(26, 27, 38, 0.75);
  --bg-card-hover: rgba(47, 53, 78, 0.65);
  --bg-input: #1f2335;
  --bg-dropdown-item: #1a1b26;
  --border-subtle: rgba(115, 122, 162, 0.2);
  --border-strong: rgba(115, 122, 162, 0.35);
  --border-focus: #7aa2f7;
  --text-main: #c0caf5;
  --text-muted: #9aa5ce;
  --text-dim: #565f89;
  --accent: #7aa2f7;
  --accent-gradient: linear-gradient(135deg, #7aa2f7, #bb9af7);
  --accent-hover: #7dcfff;
  --select-arrow: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237aa2f7' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  --pill-daemon-bg: rgba(158, 206, 106, 0.15);
  --pill-daemon-border: rgba(158, 206, 106, 0.35);
  --pill-daemon-text: #9ece6a;
  --scrollbar-thumb: rgba(115, 122, 162, 0.28);
  --scrollbar-thumb-hover: rgba(115, 122, 162, 0.48);
}

[data-theme="nord"] {
  --bg-app: #242933;
  --bg-radial: radial-gradient(circle at top right, #3b4252 0%, #242933 70%);
  --bg-topbar: rgba(46, 52, 64, 0.95);
  --bg-sidebar: rgba(59, 66, 82, 0.65);
  --bg-card: rgba(59, 66, 82, 0.65);
  --bg-card-subtle: rgba(46, 52, 64, 0.7);
  --bg-card-hover: rgba(67, 76, 94, 0.65);
  --bg-input: #2e3440;
  --bg-dropdown-item: #2e3440;
  --border-subtle: rgba(129, 161, 193, 0.2);
  --border-strong: rgba(129, 161, 193, 0.35);
  --border-focus: #88c0d0;
  --text-main: #eceff4;
  --text-muted: #d8dee9;
  --text-dim: #4c566a;
  --accent: #88c0d0;
  --accent-gradient: linear-gradient(135deg, #88c0d0, #81a1c1);
  --accent-hover: #8fbcbb;
  --select-arrow: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2388c0d0' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  --pill-daemon-bg: rgba(163, 190, 140, 0.15);
  --pill-daemon-border: rgba(163, 190, 140, 0.35);
  --pill-daemon-text: #a3be8c;
  --scrollbar-thumb: rgba(129, 161, 193, 0.28);
  --scrollbar-thumb-hover: rgba(129, 161, 193, 0.48);
}

[data-theme="solarized-dark"] {
  --bg-app: #00212b;
  --bg-radial: radial-gradient(circle at top right, #073642 0%, #00212b 70%);
  --bg-topbar: rgba(7, 54, 66, 0.95);
  --bg-sidebar: rgba(7, 54, 66, 0.7);
  --bg-card: rgba(7, 54, 66, 0.7);
  --bg-card-subtle: rgba(0, 43, 54, 0.8);
  --bg-card-hover: rgba(10, 68, 82, 0.7);
  --bg-input: #073642;
  --bg-dropdown-item: #002b36;
  --border-subtle: rgba(147, 161, 161, 0.2);
  --border-strong: rgba(147, 161, 161, 0.35);
  --border-focus: #268bd2;
  --text-main: #93a1a1;
  --text-muted: #839496;
  --text-dim: #586e75;
  --accent: #268bd2;
  --accent-gradient: linear-gradient(135deg, #268bd2, #2aa198);
  --accent-hover: #2aa198;
  --select-arrow: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23268bd2' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  --pill-daemon-bg: rgba(133, 153, 0, 0.15);
  --pill-daemon-border: rgba(133, 153, 0, 0.35);
  --pill-daemon-text: #859900;
  --scrollbar-thumb: rgba(147, 161, 161, 0.25);
  --scrollbar-thumb-hover: rgba(147, 161, 161, 0.45);
}

[data-theme="studio-light"] {
  --bg-app: #f1f5f9;
  --bg-radial: radial-gradient(circle at top right, #ffffff 0%, #f1f5f9 70%);
  --bg-topbar: rgba(255, 255, 255, 0.95);
  --bg-sidebar: rgba(255, 255, 255, 0.92);
  --bg-card: rgba(255, 255, 255, 0.92);
  --bg-card-subtle: rgba(241, 245, 249, 0.92);
  --bg-card-hover: rgba(226, 232, 240, 0.85);
  --bg-input: #ffffff;
  --bg-dropdown-item: #ffffff;
  --border-subtle: rgba(100, 116, 139, 0.2);
  --border-strong: rgba(100, 116, 139, 0.35);
  --border-focus: #0284c7;
  --text-main: #0f172a;
  --text-muted: #475569;
  --text-dim: #94a3b8;
  --accent: #0284c7;
  --accent-gradient: linear-gradient(135deg, #0284c7, #4f46e5);
  --accent-hover: #0369a1;
  --select-arrow: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%230284c7' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  --pill-daemon-bg: rgba(16, 185, 129, 0.12);
  --pill-daemon-border: rgba(16, 185, 129, 0.35);
  --pill-daemon-text: #059669;
  --scrollbar-thumb: rgba(100, 116, 139, 0.25);
  --scrollbar-thumb-hover: rgba(100, 116, 139, 0.45);
}

[data-theme="catppuccin-latte"] {
  --bg-app: #dce0e8;
  --bg-radial: radial-gradient(circle at top right, #eff1f5 0%, #dce0e8 70%);
  --bg-topbar: rgba(230, 233, 239, 0.95);
  --bg-sidebar: rgba(239, 241, 245, 0.95);
  --bg-card: rgba(239, 241, 245, 0.95);
  --bg-card-subtle: rgba(230, 233, 239, 0.92);
  --bg-card-hover: rgba(204, 208, 218, 0.75);
  --bg-input: #ffffff;
  --bg-dropdown-item: #ffffff;
  --border-subtle: rgba(140, 143, 161, 0.25);
  --border-strong: rgba(140, 143, 161, 0.45);
  --border-focus: #1e66f5;
  --text-main: #4c4f69;
  --text-muted: #6c6f85;
  --text-dim: #8c8fa1;
  --accent: #1e66f5;
  --accent-gradient: linear-gradient(135deg, #1e66f5, #8839ef);
  --accent-hover: #04a5e5;
  --select-arrow: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%231e66f5' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  --pill-daemon-bg: rgba(64, 160, 43, 0.12);
  --pill-daemon-border: rgba(64, 160, 43, 0.35);
  --pill-daemon-text: #40a02b;
  --scrollbar-thumb: rgba(140, 143, 161, 0.3);
  --scrollbar-thumb-hover: rgba(140, 143, 161, 0.5);
}

[data-theme="solarized-light"] {
  --bg-app: #eee8d5;
  --bg-radial: radial-gradient(circle at top right, #fdf6e3 0%, #eee8d5 70%);
  --bg-topbar: rgba(238, 232, 213, 0.95);
  --bg-sidebar: rgba(253, 246, 227, 0.95);
  --bg-card: rgba(253, 246, 227, 0.95);
  --bg-card-subtle: rgba(238, 232, 213, 0.92);
  --bg-card-hover: rgba(218, 212, 193, 0.8);
  --bg-input: #ffffff;
  --bg-dropdown-item: #fdf6e3;
  --border-subtle: rgba(101, 123, 131, 0.25);
  --border-strong: rgba(101, 123, 131, 0.45);
  --border-focus: #268bd2;
  --text-main: #586e75;
  --text-muted: #657b83;
  --text-dim: #93a1a1;
  --accent: #268bd2;
  --accent-gradient: linear-gradient(135deg, #268bd2, #2aa198);
  --accent-hover: #2aa198;
  --select-arrow: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23268bd2' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  --pill-daemon-bg: rgba(133, 153, 0, 0.12);
  --pill-daemon-border: rgba(133, 153, 0, 0.35);
  --pill-daemon-text: #859900;
  --scrollbar-thumb: rgba(101, 123, 131, 0.3);
  --scrollbar-thumb-hover: rgba(101, 123, 131, 0.5);
}

html, body, #app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  background: var(--bg-app);
  color: var(--text-main);
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  overflow: hidden;
  user-select: none;
  transition: background 0.2s ease, color 0.2s ease;
}

::-webkit-scrollbar {
  width: 7px;
  height: 7px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover);
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
  background: var(--bg-radial);
  color: var(--text-main);
}

/* Standard Desktop Application Menu Header Bar */
.app-menubar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 30px;
  padding: 0 14px;
  background: var(--bg-card-subtle);
  border-bottom: 1px solid var(--border-subtle);
  font-size: 12px;
  z-index: 60;
  flex-shrink: 0;
}
.menubar-left {
  display: flex;
  align-items: center;
  gap: 2px;
}
.menubar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.menu-item {
  position: relative;
}
.menu-trigger {
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 5px;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.12s ease, color 0.12s ease;
}
.menu-trigger:hover,
.menu-item.open .menu-trigger {
  background: var(--bg-card-hover);
  color: var(--text-main);
}
.menu-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 245px;
  background: var(--bg-dropdown-item);
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  padding: 5px;
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.45);
  z-index: 120;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.menu-dropdown-wide {
  min-width: 280px;
}
.menu-section-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-dim);
  padding: 5px 10px 3px;
}
.menu-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  color: var(--text-main);
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
}
.menu-entry:hover {
  background: var(--bg-card-hover);
  color: var(--accent);
}
.menu-check {
  width: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: var(--accent);
  flex-shrink: 0;
}
.menu-kbd {
  margin-left: auto;
  font-size: 10px;
  color: var(--text-dim);
  font-family: "JetBrains Mono", monospace;
}
.menu-divider {
  height: 1px;
  background: var(--border-subtle);
  margin: 4px 6px;
}
.menubar-status-chip {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 9px;
  border-radius: 999px;
  border: 1px solid rgba(16, 185, 129, 0.35);
  background: rgba(16, 185, 129, 0.14);
  color: #34d399;
  cursor: pointer;
}
.menubar-version {
  background: transparent;
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
  font-family: "JetBrains Mono", monospace;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
  cursor: pointer;
}
.menubar-version:hover {
  border-color: var(--border-focus);
  color: var(--text-main);
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 22px;
  background: var(--bg-topbar);
  border-bottom: 1px solid var(--border-subtle);
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
  background: var(--accent-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 4px 16px rgba(14, 165, 233, 0.35);
}
.brand-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.brand h1 {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text-main);
}
.version-badge {
  font-family: "JetBrains Mono", monospace;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 6px;
  border: 1px solid var(--border-strong);
  background: var(--bg-card-subtle);
  color: var(--accent);
  cursor: pointer;
  transition: all 0.15s ease;
}
.version-badge:hover {
  border-color: var(--border-focus);
  background: var(--bg-card-hover);
}
.subtitle {
  font-size: 11px;
  color: var(--text-muted);
}

/* About Modal */
.about-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(3, 7, 18, 0.72);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 250;
}
.about-modal-card {
  width: 440px;
  max-width: 92vw;
  background: var(--bg-dropdown-item);
  border: 1px solid var(--border-strong);
  border-radius: 16px;
  padding: 22px 24px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
  color: var(--text-main);
}
.about-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 14px;
}
.about-header h3 {
  margin: 0 0 3px;
  font-size: 18px;
  font-weight: 800;
}
.about-version-pill {
  font-family: "JetBrains Mono", monospace;
  font-size: 11px;
  font-weight: 700;
  color: var(--accent);
}
.about-desc {
  margin: 0 0 16px;
  font-size: 12px;
  line-height: 1.55;
  color: var(--text-muted);
}
.about-meta-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--bg-card-subtle);
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 18px;
}
.about-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
}
.about-meta-label {
  color: var(--text-muted);
  font-weight: 600;
}
.about-meta-val {
  color: var(--text-main);
  font-weight: 700;
  font-family: "JetBrains Mono", monospace;
}
.about-code {
  font-family: "JetBrains Mono", monospace;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 5px;
  background: var(--bg-input);
  border: 1px solid var(--border-subtle);
  color: var(--accent);
}
.about-actions {
  display: flex;
  justify-content: flex-end;
}

.daemon-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 999px;
  background: var(--pill-daemon-bg);
  border: 1px solid var(--pill-daemon-border);
  color: var(--pill-daemon-text);
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
  align-items: center;
  gap: 8px;
}

.theme-switcher {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-card-subtle);
  padding: 4px 8px;
  border-radius: 10px;
  border: 1px solid var(--border-subtle);
  flex-shrink: 0;
}
.btn-theme-toggle {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  border: 1px solid var(--border-strong);
  background: var(--bg-input);
  color: var(--text-main);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.15s ease;
  padding: 0;
  flex-shrink: 0;
}
.btn-theme-toggle:hover {
  border-color: var(--border-focus);
  transform: scale(1.08);
}
.theme-select {
  min-width: 175px;
  height: 30px !important;
  padding: 4px 28px 4px 12px !important;
  font-size: 12px !important;
  border-radius: 7px !important;
  font-weight: 600 !important;
  line-height: normal !important;
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
  background: var(--bg-card-subtle);
  border-color: var(--border-strong);
  color: var(--text-main);
}
.btn-secondary:hover {
  border-color: var(--border-focus);
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
  background: var(--bg-card-subtle);
  border-color: var(--accent);
  color: var(--accent);
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
  background: var(--bg-sidebar);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  padding: 14px;
  min-height: 0;
}
.search-box input {
  width: 100%;
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px solid var(--border-strong);
  background: var(--bg-input);
  color: var(--text-main);
  font-size: 12px;
  outline: none;
}
.search-box input:focus {
  border-color: var(--border-focus);
}
.search-box input::placeholder {
  color: var(--text-dim);
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
  border: 1px solid var(--border-subtle);
  background: var(--bg-card-subtle);
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}
.cat-chip.active {
  background: var(--accent);
  border-color: var(--accent);
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
  background: var(--bg-card-subtle);
  cursor: pointer;
  transition: all 0.12s ease;
}
.saver-item:hover {
  background: var(--bg-card-hover);
}
.saver-item.selected {
  background: rgba(14, 165, 233, 0.16);
  border-color: var(--accent);
}
.saver-swatch {
  width: 34px;
  height: 26px;
  border-radius: 6px;
  flex-shrink: 0;
  border: 1px solid var(--border-subtle);
}
.saver-meta {
  min-width: 0;
  flex: 1;
}
.saver-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.saver-cat {
  font-size: 10px;
  color: var(--text-muted);
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
  border: 1px solid var(--border-strong);
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.35);
  position: relative;
  background: #000;
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
  color: #f8fafc;
}
.preview-overlay-bar p {
  margin: 0;
  font-size: 12px;
  color: #cbd5e1;
  max-width: 650px;
}
.author-tag {
  font-size: 11px;
  color: var(--accent);
  font-family: "JetBrains Mono", monospace;
  white-space: nowrap;
}

.config-tabs-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  padding: 14px 18px;
}
.tab-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
  border-bottom: 1px solid var(--border-subtle);
  padding-bottom: 10px;
}
.tab-btn {
  padding: 6px 14px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.tab-btn.active {
  background: rgba(14, 165, 233, 0.18);
  color: var(--accent);
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
  background: var(--bg-card-subtle);
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border-subtle);
}
.wallpaper-note {
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid var(--border-subtle);
  background: var(--bg-card-subtle);
}
.wallpaper-note p {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-muted);
}
.wallpaper-note.warn {
  border-color: rgba(250, 204, 21, 0.45);
}
.wallpaper-note.warn strong {
  color: #facc15;
}
.setting-box label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
}

/* Bulletproof WebKitGTK High-Contrast Dropdowns Across All Themes */
select,
.setting-box select,
.mon-select-row select {
  -webkit-appearance: none !important;
  -moz-appearance: none !important;
  appearance: none !important;
  background-color: var(--bg-input) !important;
  color: var(--text-main) !important;
  border: 1px solid var(--border-strong) !important;
  border-radius: 8px !important;
  padding: 7px 32px 7px 12px !important;
  background-image: var(--select-arrow) !important;
  background-repeat: no-repeat !important;
  background-position: right 10px center !important;
  background-size: 11px !important;
  font-size: 12px !important;
  font-family: inherit !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  outline: none !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15) !important;
  transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
}

select:focus,
.setting-box select:focus,
.mon-select-row select:focus,
.theme-select:focus {
  border-color: var(--border-focus) !important;
  box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.25) !important;
}

select option,
.setting-box select option,
.mon-select-row select option,
.theme-select option {
  background-color: var(--bg-dropdown-item) !important;
  color: var(--text-main) !important;
  padding: 6px 10px !important;
}

optgroup {
  background-color: var(--bg-dropdown-item) !important;
  color: var(--text-muted) !important;
  font-weight: 700 !important;
  font-size: 11px !important;
}

.setting-box input[type="range"] {
  accent-color: var(--accent);
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
  color: var(--text-main) !important;
  cursor: pointer;
}
.chk input[type="checkbox"] {
  accent-color: var(--accent);
}

.params-sidebar {
  overflow-y: auto;
  min-height: 0;
}

.wallpaper-tab-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.mode-pills-row {
  display: flex;
  background: var(--bg-card-subtle);
  padding: 3px;
  border-radius: 9px;
  border: 1px solid var(--border-subtle);
  gap: 4px;
}
.mode-pill {
  flex: 1;
  padding: 6px 10px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}
.mode-pill.active {
  background: var(--accent);
  color: #ffffff;
}

.per-monitor-wallpaper-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--bg-card-subtle);
  border: 1px solid var(--border-subtle);
}
.section-subbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
.subbar-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-main);
}
.subbar-desc {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--text-muted);
}
.btn-sm {
  padding: 5px 10px;
  font-size: 11px;
}

.monitors-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}
.monitor-card {
  background: var(--bg-card-subtle);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 12px;
}
.monitor-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 14px 10px;
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.14), rgba(99, 102, 241, 0.14));
  border: 1px dashed rgba(56, 189, 248, 0.35);
  text-align: center;
}
.mon-badge {
  font-family: "JetBrains Mono", monospace;
  font-weight: 800;
  font-size: 14px;
  color: var(--accent);
}
.mon-res {
  font-size: 11px;
  color: var(--text-main);
  margin-top: 4px;
}
.mon-desc {
  font-size: 10px;
  color: var(--text-dim);
  margin-top: 2px;
}
.mon-select-row {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.mon-select-row label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
}
.mon-select-row select {
  width: 100%;
}
.mon-select-row select option:disabled {
  color: var(--text-dim);
  background: var(--bg-dropdown-item);
}
</style>
