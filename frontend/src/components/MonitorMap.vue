<template>
  <div class="monitor-section">
    <div class="monitor-header">
      <div>
        <h4>Wayland Multi-Monitor Topology</h4>
        <p class="sub">Configure how screensavers & live wallpapers span your Wayland outputs</p>
      </div>
      <div class="mode-pills">
        <button
          v-for="m in modes"
          :key="m.id"
          class="mode-pill"
          :class="{ active: modelValue.multiMonitorMode === m.id }"
          @click="setMode(m.id)"
        >
          {{ m.label }}
        </button>
      </div>
    </div>

    <div class="monitors-grid">
      <div v-for="mon in monitors" :key="mon.name" class="monitor-card">
        <div class="monitor-screen">
          <div class="mon-badge">{{ mon.name }}</div>
          <div class="mon-res">{{ mon.width }}×{{ mon.height }} @ {{ Math.round(mon.refreshRate) }}Hz</div>
          <div class="mon-desc">{{ mon.description || mon.model || 'Wayland Output' }}</div>
        </div>

        <div v-if="modelValue.multiMonitorMode === 'per-monitor'" class="mon-select-row">
          <label>Assigned Hack:</label>
          <select
            :value="modelValue.perMonitorSaver?.[mon.name] || modelValue.selectedSaver"
            @change="assignMonitorSaver(mon.name, $event.target.value)"
          >
            <option v-for="s in savers" :key="s.id" :value="s.id">
              {{ s.name }}
            </option>
          </select>
        </div>

        <div v-if="modelValue.wallpaperMode === 'per-monitor'" class="mon-select-row">
          <label>Live Wallpaper (Unique):</label>
          <select
            :value="modelValue.wallpaperPerMonitor?.[mon.name] || modelValue.wallpaperSaver || 'flurry'"
            @change="assignWallpaper(mon.name, $event.target.value)"
          >
            <option
              v-for="s in savers"
              :key="s.id"
              :value="s.id"
              :disabled="isWallpaperUsedByOther(s.id, mon.name)"
            >
              {{ s.name }} ({{ s.category }}){{ isWallpaperUsedByOther(s.id, mon.name) ? ' 🔒 (In use on ' + getWallpaperOtherMon(s.id, mon.name) + ')' : '' }}
            </option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  monitors: { type: Array, default: () => [] },
  savers: { type: Array, default: () => [] },
  modelValue: { type: Object, required: true }
});

const emit = defineEmits(['update:modelValue', 'save']);

const modes = [
  { id: 'independent', label: 'Independent Random' },
  { id: 'clone', label: 'Synchronized Clone' },
  { id: 'per-monitor', label: 'Per-Monitor Hack' }
];

function setMode(modeId) {
  const next = { ...props.modelValue, multiMonitorMode: modeId };
  emit('update:modelValue', next);
  emit('save', next);
}

function assignMonitorSaver(monName, saverId) {
  const map = { ...(props.modelValue.perMonitorSaver || {}), [monName]: saverId };
  const next = { ...props.modelValue, perMonitorSaver: map };
  emit('update:modelValue', next);
  emit('save', next);
}

function getWallpaperOtherMon(saverId, currentMonName) {
  if (!props.modelValue.wallpaperPerMonitor) return null;
  for (const [mon, id] of Object.entries(props.modelValue.wallpaperPerMonitor)) {
    if (mon !== currentMonName && id === saverId) {
      return mon;
    }
  }
  return null;
}

function isWallpaperUsedByOther(saverId, currentMonName) {
  return getWallpaperOtherMon(saverId, currentMonName) !== null;
}

function assignWallpaper(monName, saverId) {
  const map = { ...(props.modelValue.wallpaperPerMonitor || {}) };
  // Enforce strict uniqueness: remove from other monitors if assigned
  for (const [m, id] of Object.entries(map)) {
    if (m !== monName && id === saverId) {
      delete map[m];
    }
  }
  map[monName] = saverId;
  const next = { ...props.modelValue, wallpaperPerMonitor: map, wallpaperMode: 'per-monitor' };
  emit('update:modelValue', next);
  emit('save', next);
}
</script>

<style scoped>
.monitor-section {
  background: var(--bg-card, rgba(15, 23, 42, 0.65));
  border: 1px solid var(--border-subtle, rgba(148, 163, 184, 0.14));
  border-radius: 16px;
  padding: 18px 20px;
}
.monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}
.monitor-header h4 {
  margin: 0;
  font-size: 15px;
  color: var(--text-main, #f8fafc);
}
.sub {
  margin: 3px 0 0;
  font-size: 12px;
  color: var(--text-muted, #94a3b8);
}
.mode-pills {
  display: flex;
  gap: 6px;
  background: var(--bg-card-subtle, rgba(2, 6, 23, 0.65));
  padding: 4px;
  border-radius: 10px;
}
.mode-pill {
  padding: 6px 12px;
  border-radius: 7px;
  border: none;
  background: transparent;
  color: var(--text-muted, #94a3b8);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.mode-pill.active {
  background: var(--accent, #0ea5e9);
  color: #ffffff;
}
.monitors-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 14px;
}
.monitor-card {
  background: var(--bg-card-subtle, rgba(2, 6, 23, 0.75));
  border: 1px solid var(--border-subtle, rgba(56, 189, 248, 0.24));
  border-radius: 12px;
  padding: 14px;
}
.monitor-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px 10px;
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.14), rgba(99, 102, 241, 0.14));
  border: 1px dashed rgba(56, 189, 248, 0.35);
  text-align: center;
}
.mon-badge {
  font-family: "JetBrains Mono", monospace;
  font-weight: 800;
  font-size: 15px;
  color: var(--accent, #38bdf8);
}
.mon-res {
  font-size: 12px;
  color: var(--text-main, #e2e8f0);
  margin-top: 4px;
}
.mon-desc {
  font-size: 11px;
  color: var(--text-dim, #64748b);
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
  color: var(--text-muted, #94a3b8);
}
.mon-select-row select {
  padding: 7px 30px 7px 10px !important;
  border-radius: 8px !important;
  background-color: var(--bg-input, #0f172a) !important;
  border: 1px solid var(--border-strong, rgba(148, 163, 184, 0.25)) !important;
  color: var(--text-main, #f8fafc) !important;
  font-size: 12px !important;
  -webkit-appearance: none !important;
  appearance: none !important;
  background-image: var(--select-arrow) !important;
  background-repeat: no-repeat !important;
  background-position: right 10px center !important;
  background-size: 11px !important;
  cursor: pointer !important;
  outline: none !important;
}
.mon-select-row select:focus {
  border-color: var(--border-focus, #38bdf8) !important;
}
.mon-select-row select option {
  background-color: var(--bg-dropdown-item, #0f172a) !important;
  color: var(--text-main, #f8fafc) !important;
}
</style>
