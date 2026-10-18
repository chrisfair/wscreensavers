<template>
  <div class="lock-overlay" @click="focusInput">
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
        <input
          ref="passInput"
          v-model="password"
          type="password"
          class="pam-input"
          placeholder="Enter system password..."
          :disabled="verifying"
          autofocus
        />
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
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
  locked: { type: Boolean, default: false },
  showClock: { type: Boolean, default: true },
  isWallpaper: { type: Boolean, default: false },
  username: { type: String, default: 'user' },
  apiBase: { type: String, default: '' }
});

const emit = defineEmits(['unlocked']);

const timeStr = ref('');
const dateStr = ref('');
const password = ref('');
const verifying = ref(false);
const authError = ref(false);
const errorMsg = ref('');
const passInput = ref(null);
let clockTimer = null;

function updateClock() {
  const now = new Date();
  timeStr.value = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  dateStr.value = now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

function focusInput() {
  if (props.locked && passInput.value) {
    passInput.value.focus();
  }
}

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
      setTimeout(() => { authError.value = false; }, 500);
    }
  } catch (e) {
    errorMsg.value = 'Failed to reach PAM authentication service';
    authError.value = true;
  } finally {
    verifying.value = false;
    focusInput();
  }
}

onMounted(() => {
  updateClock();
  clockTimer = setInterval(updateClock, 1000);
  setTimeout(focusInput, 150);
});

onBeforeUnmount(() => {
  if (clockTimer) clearInterval(clockTimer);
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
.pam-input {
  flex: 1;
  padding: 11px 14px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(2, 6, 17, 0.8);
  color: #f8fafc;
  font-size: 14px;
  outline: none;
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
