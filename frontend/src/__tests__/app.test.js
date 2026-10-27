import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';
import { callWailsApp } from '../wails.js';
import { createSaverInstance } from '../savers/index.js';
import ParameterPanel from '../components/ParameterPanel.vue';
import MonitorMap from '../components/MonitorMap.vue';
import SupportModal from '../components/SupportModal.vue';
import LockScreenOverlay from '../components/LockScreenOverlay.vue';
import SaverCanvas from '../components/SaverCanvas.vue';
import App from '../App.vue';

function createFake2DCanvas() {
  const cvs = document.createElement('canvas');
  cvs.width = 640;
  cvs.height = 360;
  const ctx2d = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    globalAlpha: 1,
    shadowColor: '',
    shadowBlur: 0,
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 40 })),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    createImageData: vi.fn((w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })),
    putImageData: vi.fn(),
    drawImage: vi.fn()
  };
  cvs.getContext = vi.fn(() => ctx2d);
  return cvs;
}

beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 20 })),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    createImageData: vi.fn((w = 10, h = 10) => ({ data: new Uint8ClampedArray(w * h * 4) })),
    putImageData: vi.fn()
  }));

  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterEach(() => {
  vi.restoreAllMocks();
  delete window.wails;
});

describe('wails.js bridge', () => {
  it('returns null when window.wails is unavailable and calls ByName when present', async () => {
    const res1 = await callWailsApp('GetServerBaseURL');
    expect(res1).toBeNull();

    window.wails = {
      Call: {
        ByName: vi.fn().mockResolvedValue('http://127.0.0.1:8642')
      }
    };
    const res2 = await callWailsApp('GetServerBaseURL', 'arg1');
    expect(res2).toBe('http://127.0.0.1:8642');
    expect(window.wails.Call.ByName).toHaveBeenCalledWith('main.App.GetServerBaseURL', 'arg1');
  });
});

describe('savers/index.js factory', () => {
  it('creates a saver instance and falls back to glmatrix for unknown IDs', () => {
    const cvs = createFake2DCanvas();
    const inst = createSaverInstance('xss_glmatrix', cvs, () => ({}), () => ({ blips: [], feed: [] }));
    expect(inst).toBeTruthy();
    expect(typeof inst.render).toBe('function');

    const fallback = createSaverInstance('unknown_saver_id', cvs, () => ({}), () => ({ blips: [], feed: [] }));
    expect(fallback).toBeTruthy();
  });
});

describe('ParameterPanel.vue', () => {
  it('renders empty state when saver has no parameters', () => {
    const wrapper = mount(ParameterPanel, {
      props: {
        saver: { id: 'simple', name: 'Simple', engine: 'native', params: [] },
        values: {}
      }
    });
    expect(wrapper.text()).toContain('no user-tunable parameters');
  });

  it('renders range, select, boolean, color, and text inputs and emits updates/reset', async () => {
    const saver = {
      id: 'glmatrix',
      name: 'GLMatrix',
      engine: 'xscreensaver',
      params: [
        { id: 'speed', label: 'Speed', type: 'range', min: 0.5, max: 5, step: 0.5, default: 1.5 },
        { id: 'count', label: 'Count', type: 'range', min: 1, max: 100, step: 1, default: 20 },
        { id: 'mode', label: 'Mode', type: 'select', default: 'matrix', options: [{ id: 'matrix', label: 'Matrix' }, { id: 'dna', label: 'DNA' }] },
        { id: 'fog', label: 'Fog', type: 'boolean', default: true },
        { id: 'tint', label: 'Tint', type: 'color', default: '#00ff00' },
        { id: 'title', label: 'Title', type: 'text', default: 'Wake up' }
      ]
    };

    const wrapper = mount(ParameterPanel, {
      props: { saver, values: { speed: 2.25, count: 30, fog: false } }
    });

    expect(wrapper.text()).toContain('XScreenSaver XML Bridge');
    expect(wrapper.text()).toContain('2.25');
    expect(wrapper.text()).toContain('30');

    await wrapper.find('.reset-btn').trigger('click');
    expect(wrapper.emitted('reset')).toBeTruthy();

    const rangeInput = wrapper.find('input[type="range"]');
    await rangeInput.setValue('3.5');
    expect(wrapper.emitted('update').at(-1)[0].speed).toBe(3.5);

    const selectInput = wrapper.find('select.param-select');
    await selectInput.setValue('dna');
    expect(wrapper.emitted('update').at(-1)[0].mode).toBe('dna');

    const checkbox = wrapper.find('input[type="checkbox"]');
    await checkbox.setValue(true);
    expect(wrapper.emitted('update').at(-1)[0].fog).toBe(true);

    const colorInput = wrapper.find('input[type="color"]');
    await colorInput.setValue('#ff00aa');
    expect(wrapper.emitted('update').at(-1)[0].tint).toBe('#ff00aa');

    const textInput = wrapper.find('input.param-text');
    await textInput.setValue('Neo');
    expect(wrapper.emitted('update').at(-1)[0].title).toBe('Neo');
  });
});

describe('MonitorMap.vue', () => {
  const monitors = [
    { name: 'DP-1', width: 2560, height: 1440, refreshRate: 144, description: 'Primary' },
    { name: 'HDMI-A-1', width: 1920, height: 1080, refreshRate: 60, model: 'Secondary' }
  ];
  const savers = [
    { id: 'glmatrix', name: 'GLMatrix', category: 'Matrix' },
    { id: 'flurry', name: 'Flurry', category: 'OpenGL' },
    { id: 'sonar', name: 'Sonar', category: 'Retro' }
  ];

  it('switches multi-monitor mode and enforces unique per-monitor wallpapers', async () => {
    const modelValue = {
      multiMonitorMode: 'per-monitor',
      selectedSaver: 'glmatrix',
      perMonitorSaver: { 'DP-1': 'glmatrix' },
      wallpaperMode: 'per-monitor',
      wallpaperSaver: 'flurry',
      wallpaperPerMonitor: { 'DP-1': 'glmatrix', 'HDMI-A-1': 'flurry' }
    };

    const wrapper = mount(MonitorMap, {
      props: { monitors, savers, modelValue }
    });

    const pills = wrapper.findAll('.mode-pill');
    await pills[1].trigger('click');
    expect(wrapper.emitted('save').at(-1)[0].multiMonitorMode).toBe('clone');

    const selects = wrapper.findAll('select');
    await selects[0].setValue('sonar');
    expect(wrapper.emitted('save').at(-1)[0].perMonitorSaver['DP-1']).toBe('sonar');

    // Reassigning HDMI-A-1 to glmatrix should evict glmatrix from DP-1
    await selects[3].setValue('glmatrix');
    const savedWp = wrapper.emitted('save').at(-1)[0].wallpaperPerMonitor;
    expect(savedWp['HDMI-A-1']).toBe('glmatrix');
    expect(savedWp['DP-1']).toBeUndefined();
  });
});

describe('SupportModal.vue', () => {
  it('loads support status, selects tiers, opens Stripe, records support, and dismisses', async () => {
    globalThis.fetch = vi.fn(async (url) => {
      if (String(url).endsWith('/api/support')) {
        return {
          ok: true,
          json: async () => ({
            supported: false,
            isAuthor: false,
            minAmountUsd: 1,
            shouldShowNag: true,
            stripeUrl: 'https://buy.stripe.com/test'
          })
        };
      }
      if (String(url).endsWith('/api/support/open')) {
        return {
          ok: true,
          json: async () => ({ status: { supported: true, supporterTier: '$10 Support' } })
        };
      }
      if (String(url).endsWith('/api/support/record')) {
        return {
          ok: true,
          json: async () => ({ supported: true, supporterTier: '$35 Support' })
        };
      }
      return { ok: true, json: async () => ({}) };
    });

    const wrapper = mount(SupportModal, {
      props: { apiBase: 'http://127.0.0.1:8642' }
    });
    await flushPromises();

    await wrapper.find('[data-testid="tier-10"]').trigger('click');
    expect(wrapper.find('[data-testid="stripe-support-btn"]').text()).toContain('$10+');

    await wrapper.find('[data-testid="tier-custom"]').trigger('click');
    const customInput = wrapper.find('[data-testid="custom-amount-input"]');
    await customInput.setValue('25');
    expect(wrapper.find('[data-testid="stripe-support-btn"]').text()).toContain('$25+');

    await wrapper.find('[data-testid="confirm-support-btn"]').trigger('click');
    await flushPromises();
    expect(wrapper.emitted('updated')).toBeTruthy();

    await wrapper.find('[data-testid="stripe-support-btn"]').trigger('click');
    await flushPromises();

    await wrapper.find('[data-testid="dismiss-support-btn"]').trigger('click');
    await flushPromises();
    expect(wrapper.emitted('close')).toBeTruthy();
  });
});

describe('LockScreenOverlay.vue', () => {
  it('handles keyboard password entry, PAM verification failure and success, and wake events', async () => {
    let unlockOk = false;
    globalThis.fetch = vi.fn(async (url) => {
      if (String(url).includes('/api/action/unlock')) {
        return {
          ok: unlockOk,
          json: async () => (unlockOk ? { ok: true } : { ok: false, error: 'Authentication failed' })
        };
      }
      return { ok: true, json: async () => ({ ok: true }) };
    });

    const wrapper = mount(LockScreenOverlay, {
      props: {
        locked: true,
        showClock: true,
        isWallpaper: false,
        username: 'christopher',
        apiBase: 'http://127.0.0.1:8642',
        dpmsMinutes: 15
      }
    });

    expect(wrapper.text()).toContain('christopher');
    expect(typeof window.__wssWake).toBe('function');
    window.__wssWake();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
    window.dispatchEvent(new KeyboardEvent('mousemove', { clientX: 20, clientY: 30 }));
    window.dispatchEvent(new KeyboardEvent('mousemove', { clientX: 60, clientY: 90 }));

    // Failed unlock attempt
    await wrapper.find('form.pam-form').trigger('submit.prevent');
    await flushPromises();
    expect(wrapper.text()).toContain('Authentication failed');

    // Successful unlock attempt
    unlockOk = true;
    const input = wrapper.find('input.pam-input');
    await input.setValue('correct-secret');
    await input.trigger('keydown', { key: 'Escape' });
    await input.setValue('correct-secret');
    await wrapper.find('form.pam-form').trigger('submit.prevent');
    await flushPromises();
    expect(wrapper.emitted('unlocked')).toBeTruthy();

    wrapper.unmount();
  });

  it('stops unlocked screensaver on click or key activity', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    const wrapper = mount(LockScreenOverlay, {
      props: {
        locked: false,
        showClock: true,
        isWallpaper: false,
        apiBase: 'http://127.0.0.1:8642'
      }
    });
    await wrapper.find('.lock-overlay').trigger('click');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8642/api/action/stop-saver',
      expect.objectContaining({ method: 'POST' })
    );
    wrapper.unmount();
  });
});

describe('SaverCanvas.vue', () => {
  it('renders native canvas and switches to external XScreenSaver stream and fallback on error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });
    const wrapper = mount(SaverCanvas, {
      props: {
        saverId: 'glmatrix',
        params: { speed: 1 },
        fpsCap: 30,
        showFps: true,
        paused: false,
        isWallpaper: false,
        apiBase: 'http://127.0.0.1:8642'
      }
    });

    expect(wrapper.find('.fps-badge').exists()).toBe(true);

    // Switch to external XScreenSaver stream
    await wrapper.setProps({ saverId: 'xss_boing' });
    await nextTick();
    const img = wrapper.find('img.saver-stream');
    expect(img.exists()).toBe(true);
    expect(img.attributes('src')).toContain('/api/xss-stream?saver=xss_boing');

    // Trigger stream errors to exercise fallback to native visualizer
    await img.trigger('error');
    await img.trigger('error');
    await nextTick();

    // Pause and resume
    await wrapper.setProps({ paused: true });
    await wrapper.setProps({ paused: false });
    wrapper.unmount();
  });
});

describe('App.vue Control Center', () => {
  let mockCfg;
  beforeEach(() => {
    mockCfg = {
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
      wallpaperMode: 'single',
      wallpaperSaver: 'flurry',
      wallpaperPerMonitor: {},
      wallpaperFpsCap: 30,
      xssMaxStreamDim: 1920,
      enabledSavers: ['glmatrix', 'flurry'],
      saverParams: {},
      dpmsOffMinutes: 30
    };
    globalThis.fetch = vi.fn(async (url, opts) => {
      const u = String(url);
      if (u.endsWith('/api/savers')) {
        return {
          ok: true,
          json: async () => [
            { id: 'glmatrix', name: 'GLMatrix', category: 'Matrix', engine: 'native', description: 'Matrix code', author: 'JWZ', year: '1999', params: [{ id: 'speed', label: 'Speed', type: 'range', min: 1, max: 5, default: 2 }] },
            { id: 'flurry', name: 'Flurry', category: 'OpenGL', engine: 'native', description: 'Particle star', author: 'Calum', year: '2002', params: [] },
            { id: 'sonar', name: 'Sonar', category: 'Retro', engine: 'native', description: 'Radar sweep', author: 'JWZ', year: '1998', params: [] }
          ]
        };
      }
      if (u.endsWith('/api/config')) {
        if (opts && opts.body) {
          mockCfg = { ...mockCfg, ...JSON.parse(opts.body) };
        }
        return {
          ok: true,
          json: async () => ({ ...mockCfg })
        };
      }
      if (u.endsWith('/api/action/toggle-wallpaper')) {
        if (opts && opts.body) {
          const b = JSON.parse(opts.body);
          mockCfg.wallpaperEnabled = b.enabled;
        }
        return {
          ok: true,
          json: async () => ({ ...mockCfg })
        };
      }
      if (u.endsWith('/reset')) {
        return {
          ok: true,
          json: async () => ({ config: { ...mockCfg } })
        };
      }
      if (u.endsWith('/api/monitors')) {
        return {
          ok: true,
          json: async () => [
            { name: 'DP-1', width: 2560, height: 1440, refreshRate: 144 },
            { name: 'HDMI-A-1', width: 1920, height: 1080, refreshRate: 60 }
          ]
        };
      }
      if (u.includes('/api/status')) {
        return {
          ok: true,
          json: async () => ({
            version: '1.1.9',
            username: 'christopher',
            otherWallpapers: ['hyprpaper'],
            lastWakeMs: 1000,
            daemon: {
              running: true,
              idleSeconds: 12,
              inhibited: false,
              inhibitReason: '',
              screensaverActive: false,
              wallpaperActive: false,
              locked: false
            }
          })
        };
      }
      if (u.endsWith('/api/support')) {
        return {
          ok: true,
          json: async () => ({
            supported: true,
            isAuthor: true,
            shouldShowNag: false
          })
        };
      }
      return { ok: true, json: async () => ({}) };
    });
  });

  it('loads catalog, filters savers, switches tabs, menus, themes, and wallpaper settings', async () => {
    const wrapper = mount(App);
    await flushPromises();

    expect(wrapper.text()).toContain('WScreenSavers');
    expect(wrapper.text()).toContain('GLMatrix');

    // Search filter and category selection
    const searchInput = wrapper.find('.search-box input');
    await searchInput.setValue('Sonar');
    expect(wrapper.findAll('.saver-item').length).toBe(1);
    await searchInput.setValue('');

    // Select a saver and toggle pool checkbox
    const saverItems = wrapper.findAll('.saver-item');
    await saverItems[1].trigger('click');
    await saverItems[2].find('input.pool-check').trigger('click');

    // Open menus and trigger actions
    const menuTriggers = wrapper.findAll('.menu-trigger');
    await menuTriggers[0].trigger('click'); // Actions
    await menuTriggers[1].trigger('mouseenter'); // Hover switches to Settings
    const settingEntries = wrapper.findAll('.menu-dropdown .menu-entry');
    await settingEntries[3].trigger('click'); // Toggle lockEnabled

    await menuTriggers[2].trigger('click'); // Appearance menu
    const appEntries = wrapper.findAll('.menu-dropdown .menu-entry');
    await appEntries[0].trigger('click'); // Toggle light/dark
    await menuTriggers[2].trigger('click');
    await wrapper.findAll('.menu-dropdown .menu-entry')[0].trigger('click'); // Toggle back

    await menuTriggers[3].trigger('click'); // Help menu
    await wrapper.findAll('.menu-dropdown .menu-entry')[1].trigger('click'); // About modal
    expect(wrapper.find('.about-modal-card').exists()).toBe(true);
    await wrapper.find('.about-actions button').trigger('click');

    // Switch bottom tabs: monitors & wallpaper
    const tabBtns = wrapper.findAll('.tab-btn');
    await tabBtns[1].trigger('click');
    expect(wrapper.text()).toContain('Wayland Multi-Monitor Topology');

    await tabBtns[2].trigger('click');
    expect(wrapper.text()).toContain('Background Layer Status');
    await wrapper.find('.btn-wallpaper').trigger('click');
    await flushPromises();

    const modePills = wrapper.findAll('.mode-pills-row .mode-pill');
    await modePills[1].trigger('click'); // Unique Per Screen
    await flushPromises();

    // Randomize unique wallpapers & assign monitor wallpaper
    await wrapper.find('.per-monitor-wallpaper-section button').trigger('click');
    await flushPromises();
    const monSelects = wrapper.findAll('.per-monitor-wallpaper-section select');
    if (monSelects.length > 0) {
      await monSelects[0].setValue('sonar');
      await flushPromises();
    }

    // ParameterPanel update and reset from App.vue
    await wrapper.find('.saver-item').trigger('click'); // select glmatrix (which has speed param)
    await flushPromises();
    const paramRange = wrapper.find('.params-sidebar input[type="range"]');
    if (paramRange.exists()) {
      await paramRange.setValue('4');
      await flushPromises();
    }
    await wrapper.find('.params-sidebar .reset-btn').trigger('click');
    await flushPromises();

    // Action buttons: Activate on Wayland, Lock Screen, Preview Fullscreen + ESC exit
    const actionBtns = wrapper.findAll('.action-buttons .btn');
    await actionBtns[1].trigger('click');
    await actionBtns[2].trigger('click');
    await actionBtns[0].trigger('click');
    expect(wrapper.find('.fullscreen-surface').exists()).toBe(true);
    await wrapper.find('.fullscreen-surface').trigger('keydown.esc');
    expect(wrapper.find('.fullscreen-surface').exists()).toBe(false);

    // Visibility and focus events
    window.dispatchEvent(new Event('blur'));
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));

    wrapper.unmount();
  });
});
