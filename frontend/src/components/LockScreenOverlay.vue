<template>
  <div class="lock-overlay" @click="onOverlayClick">
    <!-- Pitch black screen blanking curtain when inactive for dpmsMinutes -->
    <div v-if="isDark" class="dark-curtain"></div>

    <!-- Extras wrap: Fades out quickly so only the screensaver stays on screen -->
    <div class="extras-wrap" :class="{ dimmed: isDimmed }">
      <!-- Floating HUD Clock when unlocked or locked -->
      <div v-if="showClock" class="hud-clock" :class="{ 'hud-clock-top': locked }">
        <div class="clock-time">{{ timeStr }}</div>
        <div class="clock-date">{{ dateStr }}</div>
      </div>

      <!-- PAM Authentication Card when locked -->
      <div v-if="locked" class="pam-card" :class="{ shake: authError }">
        <div class="pam-avatar">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <div class="pam-user">{{ username }}</div>
        <div class="pam-subtitle">Wayland Session Locked via PAM</div>

        <form class="pam-form" @submit.prevent="submitUnlock">
          <div class="pam-input-wrap">
            <input
              ref="passInput"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              class="pam-input"
              placeholder="Enter system password..."
              :disabled="verifying"
              autofocus
              @input="onPasswordInput"
              @keydown.stop="onInputKeyDown"
            />
            <button
              v-if="password"
              type="button"
              class="pam-eye-btn"
              :title="showPassword ? 'Hide password' : 'Show password'"
              @click.stop="showPassword = !showPassword"
            >
              {{ showPassword ? 'Hide' : 'Show' }}
            </button>
          </div>
          <button type="submit" class="pam-btn" :disabled="verifying || !password">
            {{ verifying ? 'Verifying...' : 'Unlock' }}
          </button>
        </form>

        <div v-if="errorMsg" class="pam-error">{{ errorMsg }}</div>
      </div>

      <!-- Subtle hint in unlocked preview/fullscreen mode -->
      <div v-else-if="!isWallpaper" class="dismiss-pill">
        Move mouse or press any key to resume Wayland session
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';

const props = defineProps({
  locked: { type: Boolean, default: false },
  showClock: { type: Boolean, default: true },
  isWallpaper: { type: Boolean, default: false },
  username: { type: String, default: 'user' },
  apiBase: { type: String, default: '' },
  dpmsMinutes: { type: Number, default: 30 }
});

const emit = defineEmits(['unlocked', 'dark-change']);

const timeStr = ref('');
const dateStr = ref('');
const password = ref('');
const showPassword = ref(false);
const verifying = ref(false);
const authError = ref(false);
const errorMsg = ref('');
const passInput = ref(null);

const isDimmed = ref(false);
const isDark = ref(false);

let clockTimer = null;
let dimTimer = null;
let darkTimer = null;
let wakeChannel = null;
let lastWakeNotifyMs = 0;
let lastMouseX = -1;
let lastMouseY = -1;

function updateClock() {
  const now = new Date();
  timeStr.value = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  dateStr.value = now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

function focusInput() {
  if (props.locked && passInput.value && document.activeElement !== passInput.value) {
    passInput.value.focus();
  }
}

function onOverlayClick() {
  handleUserActivity(false, null, true);
}

function dimLockCard() {
  password.value = '';
  showPassword.value = false;
  isDimmed.value = true;
  if (passInput.value && document.activeElement === passInput.value) {
    passInput.value.blur();
  }
}

function resetDimTimer(delayMs = 5000) {
  if (dimTimer) clearTimeout(dimTimer);
  dimTimer = setTimeout(() => {
    if (!verifying.value && !authError.value) {
      if (password.value !== '') {
        // If password has partial text, allow up to 15s before clearing & dimming
        dimTimer = setTimeout(() => {
          if (!verifying.value && !authError.value) {
            dimLockCard();
          }
        }, 15000);
      } else {
        dimLockCard();
      }
    }
  }, delayMs);
}

function resetDarkTimer() {
  if (darkTimer) clearTimeout(darkTimer);
  const minutes = props.dpmsMinutes;
  if (!minutes || minutes <= 0) return;

  const ms = minutes * 60 * 1000;
  darkTimer = setTimeout(() => {
    turnScreenDark();
  }, ms);
}

function turnScreenDark() {
  if (isDark.value) return;
  isDark.value = true;
  emit('dark-change', true);
  if (props.apiBase) {
    fetch(`${props.apiBase}/api/action/dpms-off`, { method: 'POST' }).catch(() => {});
  }
}

function wakeLocalOnly() {
  if (isDark.value) {
    isDark.value = false;
    emit('dark-change', false);
  }
  isDimmed.value = false;
  resetDimTimer(props.locked && password.value ? 15000 : 5000);
  resetDarkTimer();
  if (props.locked) {
    focusInput();
  }
}

function wakeFromDark() {
  if (!isDark.value) return;
  isDark.value = false;
  emit('dark-change', false);
  if (props.apiBase) {
    fetch(`${props.apiBase}/api/action/dpms-on`, { method: 'POST' }).catch(() => {});
  }
}

function broadcastWake(wasDark) {
  try {
    if (wakeChannel) {
      wakeChannel.postMessage({ type: 'wake' });
    }
    localStorage.setItem('wscreensavers_wake_ts', String(Date.now()));
  } catch (_) {}

  const now = Date.now();
  if (props.apiBase && (wasDark || now - lastWakeNotifyMs > 2000)) {
    lastWakeNotifyMs = now;
    const endpoint = wasDark ? '/api/action/dpms-on' : '/api/action/wake';
    fetch(`${props.apiBase}${endpoint}`, { method: 'POST' }).catch(() => {});
  }
}

function handleUserActivity(isKey = false, keyEvent = null, isClick = false) {
  const wasDark = isDark.value;
  const wasDimmed = isDimmed.value;
  const wasFocused = Boolean(passInput.value && document.activeElement === passInput.value);
  wakeLocalOnly();
  broadcastWake(wasDark);

  if (!props.locked && !props.isWallpaper && (isKey || isClick)) {
    if (props.apiBase) {
      fetch(`${props.apiBase}/api/action/stop-saver`, { method: 'POST' }).catch(() => {});
    }
    return;
  }

  if (props.locked) {
    focusInput();
    if (isKey && keyEvent && !wasFocused) {
      if ((wasDimmed || wasDark) && (keyEvent.key === ' ' || keyEvent.key === 'Enter' || keyEvent.key === 'Escape')) {
        keyEvent.preventDefault();
        return;
      }
      if (keyEvent.key.length === 1 && !keyEvent.ctrlKey && !keyEvent.altKey && !keyEvent.metaKey) {
        keyEvent.preventDefault();
        password.value += keyEvent.key;
        broadcastPasswordToPassiveMonitors();
      } else if (keyEvent.key === 'Backspace') {
        keyEvent.preventDefault();
        password.value = password.value.slice(0, -1);
        broadcastPasswordToPassiveMonitors();
      } else if (keyEvent.key === 'Escape') {
        keyEvent.preventDefault();
        password.value = '';
        broadcastPasswordToPassiveMonitors();
      } else if (keyEvent.key === 'Enter') {
        keyEvent.preventDefault();
        submitUnlock();
      }
    }
  }
}

function broadcastPasswordToPassiveMonitors() {
  try {
    if (wakeChannel) {
      wakeChannel.postMessage({ type: 'pwd', value: password.value });
    }
  } catch (_) {}
}

function onPasswordInput() {
  broadcastPasswordToPassiveMonitors();
}

function onInputKeyDown(e) {
  const wasDark = isDark.value;
  const wasDimmed = isDimmed.value;
  if (e.key === 'Escape') {
    e.preventDefault();
    password.value = '';
    broadcastPasswordToPassiveMonitors();
  } else if ((wasDimmed || wasDark) && e.key === ' ') {
    e.preventDefault();
  }
  wakeLocalOnly();
  broadcastWake(wasDark);
}

function onWindowKeyDown(e) {
  if (passInput.value && e.target === passInput.value) {
    return;
  }
  if (e.key === 'Tab') {
    e.preventDefault();
    focusInput();
    return;
  }
  handleUserActivity(true, e);
}

function onWindowMouseMove(e) {
  if (lastMouseX === -1) {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    if (isDimmed.value || isDark.value) {
      handleUserActivity(false);
    }
    return;
  }
  const dx = Math.abs(e.clientX - lastMouseX);
  const dy = Math.abs(e.clientY - lastMouseY);
  if (dx > 2 || dy > 2) {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    handleUserActivity(false);
  }
}

function onWindowMouseDown(e) {
  handleUserActivity(false, null, true);
}

function onStorageEvent(e) {
  if (e.key === 'wscreensavers_wake_ts') {
    wakeLocalOnly();
  }
}

watch(() => props.dpmsMinutes, () => {
  resetDarkTimer();
});

async function submitUnlock() {
  if (!password.value || verifying.value) return;
  verifying.value = true;
  errorMsg.value = '';
  authError.value = false;

  try {
    const res = await fetch(`${props.apiBase}/api/action/unlock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password.value })
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      password.value = '';
      emit('unlocked');
    } else {
      errorMsg.value = data.error || 'Invalid password';
      authError.value = true;
      password.value = '';
      isDimmed.value = false;
      resetDimTimer(5000);
      setTimeout(() => { authError.value = false; }, 500);
    }
  } catch (e) {
    errorMsg.value = 'Failed to reach PAM authentication service';
    authError.value = true;
    isDimmed.value = false;
    resetDimTimer(5000);
  } finally {
    verifying.value = false;
    focusInput();
  }
}

onMounted(() => {
  updateClock();
  clockTimer = setInterval(updateClock, 1000);
  setTimeout(focusInput, 150);

  // Smoothly dim extras after 5s so screensaver stays visible when idle
  resetDimTimer(5000);
  resetDarkTimer();

  window.__wssWake = wakeLocalOnly;
  try {
    localStorage.removeItem('wscreensavers_pwd_sync');
    if (typeof BroadcastChannel !== 'undefined') {
      wakeChannel = new BroadcastChannel('wscreensavers_wake');
      wakeChannel.onmessage = (ev) => {
        if (ev && ev.data && ev.data.type === 'pwd' && typeof ev.data.value === 'string') {
          if (!passInput.value || document.activeElement !== passInput.value) {
            password.value = ev.data.value;
          }
        }
        wakeLocalOnly();
      };
    }
  } catch (_) {}

  window.addEventListener('storage', onStorageEvent);
  window.addEventListener('keydown', onWindowKeyDown);
  window.addEventListener('mousemove', onWindowMouseMove, { passive: true });
  window.addEventListener('mousedown', onWindowMouseDown, true);
});

onBeforeUnmount(() => {
  if (clockTimer) clearInterval(clockTimer);
  if (dimTimer) clearTimeout(dimTimer);
  if (darkTimer) clearTimeout(darkTimer);
  if (wakeChannel) {
    try { wakeChannel.close(); } catch (_) {}
    wakeChannel = null;
  }
  if (window.__wssWake === wakeLocalOnly) {
    delete window.__wssWake;
  }

  window.removeEventListener('storage', onStorageEvent);
  window.removeEventListener('keydown', onWindowKeyDown);
  window.removeEventListener('mousemove', onWindowMouseMove);
  window.removeEventListener('mousedown', onWindowMouseDown, true);

  if (isDark.value) {
    wakeFromDark();
  }
});
</script>

<style scoped>
.lock-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 20;
}

.dark-curtain {
  position: fixed;
  inset: 0;
  background: #000000;
  z-index: 99999;
  pointer-events: all;
}

.extras-wrap {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 1;
  pointer-events: auto;
  transform: scale(1);
  transition: opacity 0.15s ease-out, transform 0.15s ease-out;
}

.extras-wrap.dimmed {
  opacity: 0;
  pointer-events: none;
  transform: scale(0.98);
  transition: opacity 1.5s ease-in, transform 1.5s ease-in;
}

.hud-clock {
  position: absolute;
  bottom: 48px;
  left: 56px;
  padding: 18px 28px;
  border-radius: 18px;
  background: rgba(8, 12, 22, 0.62);
  backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #f8fafc;
  pointer-events: none;
}

.hud-clock-top {
  position: static;
  margin-bottom: 28px;
  text-align: center;
}

.clock-time {
  font-size: 46px;
  font-weight: 800;
  font-family: "JetBrains Mono", monospace;
  letter-spacing: -0.03em;
  line-height: 1.05;
}

.clock-date {
  margin-top: 6px;
  font-size: 15px;
  color: #94a3b8;
  font-weight: 500;
}

.pam-card {
  width: 380px;
  padding: 32px 28px;
  border-radius: 22px;
  background: rgba(11, 16, 30, 0.78);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(56, 189, 248, 0.28);
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.65);
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #f8fafc;
}

.pam-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0284c7, #6366f1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
  box-shadow: 0 8px 24px rgba(2, 132, 199, 0.4);
}

.pam-user {
  font-size: 20px;
  font-weight: 700;
}

.pam-subtitle {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 2px;
  margin-bottom: 22px;
}

.pam-form {
  width: 100%;
  display: flex;
  gap: 8px;
}

.pam-input-wrap {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
}

.pam-input {
  width: 100%;
  padding: 11px 52px 11px 14px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(2, 6, 17, 0.8);
  color: #f8fafc;
  font-size: 14px;
  outline: none;
}

.pam-eye-btn {
  position: absolute;
  right: 8px;
  padding: 4px 8px;
  border-radius: 6px;
  border: none;
  background: rgba(56, 189, 248, 0.14);
  color: #38bdf8;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.pam-input:focus {
  border-color: #38bdf8;
}

.pam-btn {
  padding: 11px 18px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #0ea5e9, #6366f1);
  color: #ffffff;
  font-weight: 700;
  cursor: pointer;
}

.pam-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.pam-error {
  margin-top: 12px;
  color: #f87171;
  font-size: 13px;
  font-weight: 600;
}

.dismiss-pill {
  position: absolute;
  bottom: 22px;
  right: 28px;
  padding: 8px 16px;
  border-radius: 999px;
  background: rgba(8, 12, 22, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(226, 232, 240, 0.72);
  font-size: 12px;
  pointer-events: none;
}

@keyframes shakeAnim {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-10px); }
  40%, 80% { transform: translateX(10px); }
}

.shake {
  animation: shakeAnim 0.4s ease;
}
</style>
