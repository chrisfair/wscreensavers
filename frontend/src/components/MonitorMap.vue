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
</script>

<style scoped>
.monitor-section {
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(148, 163, 184, 0.14);
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
  color: #f8fafc;
}
.sub {
  margin: 3px 0 0;
  font-size: 12px;
  color: #94a3b8;
}
.mode-pills {
  display: flex;
  gap: 6px;
  background: rgba(2, 6, 23, 0.65);
  padding: 4px;
  border-radius: 10px;
}
.mode-pill {
  padding: 6px 12px;
  border-radius: 7px;
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.mode-pill.active {
  background: #0ea5e9;
  color: #ffffff;
}
.monitors-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 14px;
}
.monitor-card {
  background: rgba(2, 6, 23, 0.75);
  border: 1px solid rgba(56, 189, 248, 0.24);
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
  color: #38bdf8;
}
.mon-res {
  font-size: 12px;
  color: #e2e8f0;
  margin-top: 4px;
}
.mon-desc {
  font-size: 11px;
  color: #64748b;
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
  color: #94a3b8;
}
.mon-select-row select {
  padding: 7px 10px;
  border-radius: 8px;
  background: #0f172a;
  border: 1px solid rgba(148, 163, 184, 0.25);
  color: #f8fafc;
  font-size: 12px;
}
</style>
