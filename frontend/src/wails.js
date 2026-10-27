// Wails v3 service caller helper with fallback to null when running in standalone HTTP/layer-shell mode.
let runtimeLoadPromise = null;

async function ensureWailsRuntime() {
  if (typeof window === 'undefined') return null;
  if (window.wails && window.wails.Call && typeof window.wails.Call.ByName === 'function') {
    return window.wails;
  }
  if (!runtimeLoadPromise) {
    const runtimeUrl = '/wails/runtime.js';
    runtimeLoadPromise = import(/* @vite-ignore */ runtimeUrl).catch(() => null);
  }
  await runtimeLoadPromise;
  if (window.wails && window.wails.Call && typeof window.wails.Call.ByName === 'function') {
    return window.wails;
  }
  return null;
}

export async function callWailsApp(methodName, ...args) {
  try {
    const wailsRuntime = await ensureWailsRuntime();
    if (wailsRuntime && wailsRuntime.Call && typeof wailsRuntime.Call.ByName === 'function') {
      return await wailsRuntime.Call.ByName(`main.App.${methodName}`, ...args);
    }
  } catch (_) {}
  return null;
}
