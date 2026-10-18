<template>
  <div class="param-panel">
    <div class="param-header">
      <div>
        <h4>{{ saver.name }} Parameters</h4>
        <span class="engine-badge" :class="saver.engine">
          {{ saver.engine === 'native' ? 'Native Wayland WebGL2/Canvas' : 'XScreenSaver XML Bridge' }}
        </span>
      </div>
      <button class="reset-btn" @click="$emit('reset')">Reset Defaults</button>
    </div>

    <div v-if="!saver.params || saver.params.length === 0" class="empty-params">
      This screensaver runs automatically with no user-tunable parameters.
    </div>

    <div v-else class="param-list">
      <div v-for="p in saver.params" :key="p.id" class="param-item">
        <div class="param-label-row">
          <label>{{ p.label }}</label>
          <span v-if="p.type === 'range'" class="param-val">{{ formatVal(values[p.id] ?? p.default) }}</span>
        </div>

        <!-- Range Slider -->
        <input
          v-if="p.type === 'range'"
          type="range"
          class="param-range"
          :min="p.min"
          :max="p.max"
          :step="p.step || 1"
          :value="values[p.id] ?? p.default"
          @input="updateParam(p.id, Number($event.target.value))"
        />

        <!-- Select Dropdown -->
        <select
          v-else-if="p.type === 'select'"
          class="param-select"
          :value="values[p.id] ?? p.default"
          @change="updateParam(p.id, $event.target.value)"
        >
          <option v-for="opt in p.options" :key="opt.id" :value="opt.id">
            {{ opt.label }}
          </option>
        </select>

        <!-- Boolean Toggle -->
        <label v-else-if="p.type === 'boolean'" class="toggle-row">
          <input
            type="checkbox"
            :checked="Boolean(values[p.id] ?? p.default)"
            @change="updateParam(p.id, $event.target.checked)"
          />
          <span>{{ Boolean(values[p.id] ?? p.default) ? 'Enabled' : 'Disabled' }}</span>
        </label>

        <!-- Color Picker -->
        <div v-else-if="p.type === 'color'" class="color-row">
          <input
            type="color"
            :value="values[p.id] ?? p.default"
            @input="updateParam(p.id, $event.target.value)"
          />
          <span class="color-hex">{{ values[p.id] ?? p.default }}</span>
        </div>

        <!-- String Input -->
        <input
          v-else
          type="text"
          class="param-text"
          :value="values[p.id] ?? p.default"
          @input="updateParam(p.id, $event.target.value)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  saver: { type: Object, required: true },
  values: { type: Object, default: () => ({}) }
});

const emit = defineEmits(['update', 'reset']);

function updateParam(id, val) {
  emit('update', { ...props.values, [id]: val });
}

function formatVal(v) {
  if (typeof v === 'number') {
    return Number.isInteger(v) ? v : v.toFixed(2);
  }
  return v;
}
</script>

<style scoped>
.param-panel {
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 16px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.param-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}
.param-header h4 {
  margin: 0 0 6px;
  font-size: 15px;
  color: #f8fafc;
}
.engine-badge {
  display: inline-block;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 600;
}
.engine-badge.native {
  background: rgba(16, 185, 129, 0.16);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.35);
}
.engine-badge.xscreensaver {
  background: rgba(245, 158, 11, 0.16);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.35);
}
.reset-btn {
  padding: 6px 11px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(30, 41, 59, 0.65);
  color: #cbd5e1;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}
.reset-btn:hover {
  border-color: #38bdf8;
  color: #ffffff;
}
.param-list {
  display: flex;
  flex-direction: column;
  gap: 13px;
}
.param-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.param-label-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #cbd5e1;
  font-weight: 500;
}
.param-val {
  font-family: "JetBrains Mono", monospace;
  color: #38bdf8;
  font-weight: 700;
}
.param-range {
  width: 100%;
  accent-color: #0ea5e9;
  cursor: pointer;
}
.param-select, .param-text {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: #090d18;
  color: #f8fafc;
  font-size: 12px;
}
.toggle-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #e2e8f0;
  cursor: pointer;
}
.color-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.color-hex {
  font-family: "JetBrains Mono", monospace;
  font-size: 12px;
  color: #94a3b8;
}
.empty-params {
  font-size: 12px;
  color: #64748b;
  padding: 12px 0;
}
</style>
