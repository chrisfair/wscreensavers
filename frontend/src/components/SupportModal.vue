<template>
  <div class="support-overlay" @click.self="handleDismiss">
    <div class="support-dialog">
      <!-- Header -->
      <div class="support-header">
        <div class="support-title-row">
          <div class="heart-badge">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <div>
            <h2>Support WScreenSavers</h2>
            <p class="support-subtitle">Voluntary Author Support &bull; Non-Obligatory</p>
          </div>
        </div>
        <button
          data-testid="support-close-btn"
          class="close-btn"
          title="Dismiss (24h Cooldown)"
          @click="handleDismiss"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="support-body">
        <!-- Author or Active Supporter Banner -->
        <div v-if="status.isAuthor" data-testid="author-verified-banner" class="status-banner">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" class="banner-icon">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <polyline points="9 12 11 14 15 10" />
          </svg>
          <div>
            <div class="banner-title">Author Machine Verified — Startup Prompt Disabled</div>
            <p class="banner-desc">
              Authenticated via linked author ID
              <span class="mono-id">({{ status.authorId }})</span>.
            </p>
          </div>
        </div>

        <div v-else-if="status.supported" data-testid="supporter-active-banner" class="status-banner">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" class="banner-icon">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <div>
            <div class="banner-title">Thank You for Supporting WScreenSavers!</div>
            <p class="banner-desc">
              Supporter status active ({{ status.supporterTier || '$5+ Support' }}). Reminder cooldown is active on this computer.
            </p>
          </div>
        </div>

        <!-- Pitch / Explanation -->
        <div class="pitch-box">
          <p class="pitch-lead">
            Enjoying WScreenSavers? Consider supporting the author with a voluntary contribution (<span class="emerald-hl">$5 or higher</span> recommended).
          </p>
          <p class="pitch-sub">
            Your support directly funds continued open-source Wayland screensaver &amp; live wallpaper development, GPU shaders, and multi-monitor tools. Supporting is completely optional—dismissing hides this reminder for 24 hours with all features unlocked, or choose a tier below for a longer reminder-free pass!
          </p>
        </div>

        <!-- Amount Selector (5 classic chess piece tiers + custom in 3x2 grid) -->
        <div class="tiers-section">
          <label class="section-label">Choose Support Tier &amp; Reminder Cooldown</label>
          <div class="tiers-grid">
            <button
              v-for="preset in presetAmounts"
              :key="preset.amount"
              type="button"
              :data-testid="`tier-${preset.amount}`"
              class="tier-card"
              :class="{ active: !useCustomAmount && selectedAmount === preset.amount }"
              @click="selectPreset(preset.amount)"
            >
              <span class="tier-amt">{{ preset.label }}</span>
              <span class="tier-desc">{{ preset.desc }}</span>
            </button>

            <button
              type="button"
              data-testid="tier-custom"
              class="tier-card"
              :class="{ active: useCustomAmount }"
              @click="enableCustom"
            >
              <span class="tier-amt">Custom</span>
              <span class="tier-desc">$5 or more</span>
            </button>
          </div>

          <div v-if="useCustomAmount" class="custom-amt-row">
            <span class="usd-label">USD $</span>
            <input
              v-model.number="customAmount"
              data-testid="custom-amount-input"
              type="number"
              min="5"
              step="1"
              class="custom-amt-input"
            />
            <span class="min-note">(Minimum $5)</span>
          </div>
        </div>

        <!-- Primary Stripe Checkout Link Button -->
        <div class="stripe-action-wrap">
          <button
            type="button"
            data-testid="stripe-support-btn"
            class="stripe-btn"
            @click="handleOpenStripe"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span>Support via Stripe (${{ effectiveAmount }}+)</span>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" class="ext-icon">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </button>
        </div>

        <!-- Supporter / Author Verification to disable Nag Screen -->
        <div v-if="!status.supported" class="verify-box">
          <div class="verify-header">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fbbf24" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>Already Donated? Disable Startup Reminder</span>
          </div>
          <div class="verify-input-row">
            <input
              v-model="referenceInput"
              data-testid="support-reference-input"
              type="text"
              placeholder="Optional: Stripe receipt email or note (no account needed)"
              class="ref-input"
            />
            <button
              type="button"
              data-testid="confirm-support-btn"
              class="confirm-btn"
              @click="handleConfirmSupport"
            >
              I've Supported
            </button>
          </div>
        </div>

        <p v-if="confirmMessage" data-testid="confirm-support-msg" class="confirm-msg">
          {{ confirmMessage }}
        </p>

        <!-- Footer / Non-obligatory Dismiss -->
        <div class="support-footer">
          <span class="footer-note">100% non-obligatory &bull; All features unlocked</span>
          <button
            type="button"
            data-testid="dismiss-support-btn"
            class="maybe-later-btn"
            @click="handleDismiss"
          >
            {{ status.supported ? 'Close' : 'Maybe Later' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

const props = defineProps({
  apiBase: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['close', 'updated']);

const status = ref({
  supported: false,
  isAuthor: false,
  authorId: '',
  deviceSignature: '',
  supporterTier: '',
  supportedAt: 0,
  dismissCount: 0,
  lastDismissedAt: 0,
  stripeUrl: 'https://buy.stripe.com/cNidR2e262cEeiOdpCefC01',
  minAmountUsd: 5,
  shouldShowNag: true
});

const selectedAmount = ref(5);
const customAmount = ref(5);
const useCustomAmount = ref(false);
const referenceInput = ref('');
const confirmMessage = ref('');

const presetAmounts = [
  { amount: 1, label: '$1', desc: 'Pawn • 1 Year' },
  { amount: 5, label: '$5', desc: 'Knight • 1 Month' },
  { amount: 10, label: '$10', desc: 'Rook • God for Life' },
  { amount: 35, label: '$35', desc: 'Queen • Lifetime' },
  { amount: 350, label: '$350', desc: 'King • Lifetime' }
];

const effectiveAmount = computed(() => {
  if (useCustomAmount.value) {
    return Math.max(5, Number(customAmount.value) || 5);
  }
  return Math.max(status.value.minAmountUsd || 1, selectedAmount.value);
});

function selectPreset(amt) {
  useCustomAmount.value = false;
  selectedAmount.value = amt;
}

function enableCustom() {
  useCustomAmount.value = true;
  if (customAmount.value < 5) {
    customAmount.value = 5;
  }
}

async function loadSupportStatus() {
  try {
    if (window.go && window.go.main && window.go.main.App && window.go.main.App.GetSupportStatus) {
      const res = await window.go.main.App.GetSupportStatus();
      if (res) {
        status.value = res;
        return;
      }
    }
    const res = await fetch(`${props.apiBase}/api/support`);
    if (res.ok) {
      status.value = await res.json();
    }
  } catch (err) {
    console.warn('Failed to load support status:', err);
  }
}

onMounted(() => {
  loadSupportStatus();
});

async function handleOpenStripe() {
  try {
    if (window.go && window.go.main && window.go.main.App && window.go.main.App.OpenSupportLink) {
      await window.go.main.App.OpenSupportLink(effectiveAmount.value);
      await loadSupportStatus();
    } else {
      const res = await fetch(`${props.apiBase}/api/support/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountUsd: effectiveAmount.value })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status) status.value = data.status;
      }
    }
    confirmMessage.value = 'Thank you for supporting WScreenSavers! Your supporter cooldown is now active.';
    emit('updated', true);
  } catch {
    if (typeof window !== 'undefined' && status.value.stripeUrl) {
      window.open(status.value.stripeUrl, '_blank', 'noopener,noreferrer');
    }
  }
}

async function handleConfirmSupport() {
  try {
    const tierLabel = `$${effectiveAmount.value} Support`;
    if (window.go && window.go.main && window.go.main.App && window.go.main.App.RecordUserSupport) {
      const updated = await window.go.main.App.RecordUserSupport(tierLabel, referenceInput.value);
      if (updated) status.value = updated;
    } else {
      const res = await fetch(`${props.apiBase}/api/support/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: tierLabel,
          reference: referenceInput.value
        })
      });
      if (res.ok) {
        status.value = await res.json();
      }
    }
    confirmMessage.value = 'Thank you for supporting WScreenSavers! Your supporter cooldown is now active.';
    emit('updated', true);
  } catch (err) {
    console.warn('Failed to record support:', err);
  }
}

async function handleDismiss() {
  try {
    if (!status.value.supported && !status.value.isAuthor) {
      if (window.go && window.go.main && window.go.main.App && window.go.main.App.DismissSupportNag) {
        await window.go.main.App.DismissSupportNag();
      } else {
        await fetch(`${props.apiBase}/api/support/dismiss`, { method: 'POST' });
      }
    }
  } catch (err) {
    console.warn('Failed to dismiss support prompt:', err);
  } finally {
    emit('close');
  }
}
</script>

<style scoped>
.support-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 17, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9000;
  padding: 16px;
  user-select: none;
}

.support-dialog {
  background: #111827;
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 16px;
  width: 100%;
  max-width: 520px;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.support-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  background: #090d16;
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
}

.support-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.heart-badge {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: rgba(244, 63, 94, 0.15);
  border: 1px solid rgba(244, 63, 94, 0.35);
  color: #fb7185;
  display: flex;
  align-items: center;
  justify-content: center;
}

.support-title-row h2 {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #f8fafc;
}

.support-subtitle {
  margin: 2px 0 0;
  font-size: 11px;
  color: #94a3b8;
}

.close-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  padding: 5px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}
.close-btn:hover {
  color: #ffffff;
  background: rgba(30, 41, 59, 0.8);
}

.support-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  font-size: 12px;
  color: #cbd5e1;
}

.status-banner {
  padding: 14px;
  border-radius: 12px;
  background: rgba(6, 78, 59, 0.45);
  border: 1px solid rgba(16, 185, 129, 0.4);
  display: flex;
  align-items: flex-start;
  gap: 12px;
  color: #a7f3d0;
}
.banner-icon {
  color: #34d399;
  flex-shrink: 0;
  margin-top: 1px;
}
.banner-title {
  font-weight: 700;
  color: #6ee7b7;
  margin-bottom: 3px;
}
.banner-desc {
  margin: 0;
  font-size: 11px;
  color: rgba(167, 243, 208, 0.85);
}
.mono-id {
  font-family: monospace;
  color: #6ee7b7;
}

.pitch-box {
  background: #090d16;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 12px;
  padding: 14px;
  line-height: 1.5;
}
.pitch-lead {
  margin: 0 0 8px;
  color: #f1f5f9;
  font-weight: 500;
}
.emerald-hl {
  color: #34d399;
  font-weight: 700;
}
.pitch-sub {
  margin: 0;
  font-size: 11px;
  color: #94a3b8;
}

.tiers-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.section-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #94a3b8;
}
.tiers-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.tier-card {
  padding: 10px 8px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: #090d16;
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  transition: all 0.15s ease;
}
.tier-card:hover {
  border-color: rgba(148, 163, 184, 0.4);
  color: #f1f5f9;
}
.tier-card.active {
  background: rgba(16, 185, 129, 0.18);
  border-color: #10b981;
  color: #ffffff;
  box-shadow: 0 2px 10px rgba(16, 185, 129, 0.15);
}
.tier-amt {
  font-size: 14px;
  font-weight: 800;
  color: #f8fafc;
}
.tier-desc {
  font-size: 10px;
  color: #94a3b8;
}
.tier-card.active .tier-desc {
  color: #a7f3d0;
}

.custom-amt-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 4px;
}
.usd-label {
  font-size: 12px;
  font-weight: 700;
  color: #94a3b8;
}
.custom-amt-input {
  width: 120px;
  background: #090d16;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 12px;
  color: #f8fafc;
  outline: none;
}
.custom-amt-input:focus {
  border-color: #10b981;
}
.min-note {
  font-size: 11px;
  color: #64748b;
}

.stripe-btn {
  width: 100%;
  padding: 11px 16px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #059669, #10b981);
  color: #ffffff;
  font-weight: 700;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3);
  transition: filter 0.15s ease;
}
.stripe-btn:hover {
  filter: brightness(1.08);
}
.ext-icon {
  opacity: 0.85;
}

.verify-box {
  background: rgba(9, 13, 22, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.verify-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #e2e8f0;
}
.verify-input-row {
  display: flex;
  gap: 8px;
}
.ref-input {
  flex: 1;
  background: #111827;
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 12px;
  color: #f8fafc;
  outline: none;
}
.ref-input:focus {
  border-color: #10b981;
}
.confirm-btn {
  padding: 6px 14px;
  border-radius: 8px;
  background: #1e293b;
  border: 1px solid rgba(148, 163, 184, 0.25);
  color: #e2e8f0;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}
.confirm-btn:hover {
  background: #047857;
  border-color: #10b981;
  color: #ffffff;
}

.confirm-msg {
  margin: 0;
  color: #34d399;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
}

.support-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
  border-top: 1px solid rgba(148, 163, 184, 0.14);
}
.footer-note {
  font-size: 11px;
  color: #64748b;
}
.maybe-later-btn {
  padding: 6px 16px;
  border-radius: 8px;
  background: #1e293b;
  border: 1px solid rgba(148, 163, 184, 0.2);
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
.maybe-later-btn:hover {
  background: #334155;
  color: #ffffff;
}
</style>
