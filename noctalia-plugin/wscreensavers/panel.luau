--!nonstrict
-- Noctalia floating panel for WScreenSavers.
-- Controls Wayland screensavers, XScreenSaver catalog, multi-monitor modes,
-- PAM screen locking, and live layer-shell desktop wallpapers.

local env = getfenv()
local dynamicCallbacks = {}
local callbackIndex = 0

local CHANGED_KEY = "wscreensavers.changed"
local stateData = nil
local statusMsg = nil
local busy = false
local panelOpen = false
local selectedCategory = "All"
local searchQuery = ""
local render

local MODES = {
  { "random", "mode_random" },
  { "single", "mode_single" },
  { "cycle", "mode_cycle" },
  { "disabled", "mode_disabled" },
}

local TIMEOUTS = {
  { 5, "5 min" },
  { 10, "10 min" },
  { 15, "15 min" },
  { 30, "30 min" },
  { 60, "60 min" },
}

local DPMS_TIMEOUTS = {
  { 0, "Off" },
  { 5, "5 min" },
  { 15, "15 min" },
  { 30, "30 min" },
  { 60, "60 min" },
}

local MONITOR_MODES = {
  { "independent", "mon_independent" },
  { "clone", "mon_clone" },
  { "per-monitor", "mon_per_monitor" },
}

local FPS_CAPS = {
  { 15, "15 FPS" },
  { 30, "30 FPS" },
  { 45, "45 FPS" },
  { 60, "60 FPS" },
}

local CATEGORIES = {
  "All",
  "Matrix & Cyber",
  "3D OpenGL Classics",
  "Retro & Whimsical",
  "Fractals & Shaders",
  "Math & Automata",
  "System & Telemetry",
  "XScreenSaver OpenGL",
  "XScreenSaver Classic",
}

local function tr(key)
  return noctalia.tr(key)
end

local function shellQuote(value)
  return "'" .. tostring(value):gsub("'", "'\\''") .. "'"
end

local function ctl(args)
  local home = noctalia.getenv("HOME") or "/home/christopher"
  local bin = home .. "/bin/wscreensavers"
  return shellQuote(bin) .. " ctl " .. args
end

local function resetCallbacks()
  for _, name in ipairs(dynamicCallbacks) do
    env[name] = nil
  end
  dynamicCallbacks = {}
  callbackIndex = 0
end

local function callback(prefix, fn)
  callbackIndex += 1
  local name = "wscreensavers_" .. prefix .. "_" .. callbackIndex
  env[name] = fn
  table.insert(dynamicCallbacks, name)
  return name
end

local function notifyWidgetChanged()
  noctalia.state.set(CHANGED_KEY, (tonumber(noctalia.state.get(CHANGED_KEY)) or 0) + 1)
end

local function refresh()
  noctalia.runAsync(ctl("status"), function(result)
    busy = false
    if result.timedOut or result.exitCode ~= 0 or (result.stdout or "") == "" then
      statusMsg = tr("failed")
    else
      local decoded = noctalia.json.decode(result.stdout)
      if type(decoded) == "table" then
        stateData = decoded
        notifyWidgetChanged()
      else
        statusMsg = tr("failed")
      end
    end
    if panelOpen then render() end
  end, 12000)
end

local function runCmd(args, msg)
  busy = true
  statusMsg = nil
  if panelOpen then render() end
  noctalia.runAsync(ctl(args), function(result)
    busy = false
    if result.timedOut or result.exitCode ~= 0 or (result.stdout or "") == "" then
      statusMsg = tr("failed")
      if panelOpen then render() end
      return
    end
    statusMsg = msg
    local decoded = noctalia.json.decode(result.stdout)
    if type(decoded) == "table" then
      stateData = decoded
      notifyWidgetChanged()
    end
    if panelOpen then render() end
  end, 15000)
end

local function setConfig(key, value)
  runCmd("set " .. key .. " " .. shellQuote(tostring(value)), tr("saved"))
end

local function chipRow(items, current, onPick, keyPrefix)
  local chips = {}
  for index, item in ipairs(items) do
    local value, label = item[1], item[2]
    local pick = callback(keyPrefix .. index, function() onPick(value) end)
    table.insert(chips, ui.button({
      key = keyPrefix .. tostring(value),
      text = label,
      controlSize = "sm",
      variant = current == value and "primary" or "ghost",
      selected = current == value,
      enabled = not busy,
      onClick = pick,
    }))
  end
  return ui.row({ gap = 4, align = "center" }, chips)
end

local function matchesFilter(saver)
  if selectedCategory ~= "All" and saver.category ~= selectedCategory then
    return false
  end
  if searchQuery ~= "" then
    local q = string.lower(searchQuery)
    local n = string.lower(saver.name or "")
    local c = string.lower(saver.category or "")
    local d = string.lower(saver.description or "")
    if not string.find(n, q, 1, true) and not string.find(c, q, 1, true) and not string.find(d, q, 1, true) then
      return false
    end
  end
  return true
end

local function renderSaverRow(saver, cfg)
  local isSelected = (cfg.selectedSaver == saver.id)
  local isWallpaper = (cfg.wallpaperSaver == saver.id and stateData.wallpaperRunning)

  local pickClick = callback("sel_" .. saver.id, function()
    setConfig("selectedSaver", saver.id)
  end)
  local launchClick = callback("launch_" .. saver.id, function()
    runCmd("launch " .. shellQuote(saver.id), tr("launched") .. ": " .. saver.name)
  end)
  local wpClick = callback("wp_" .. saver.id, function()
    runCmd("wallpaper on " .. shellQuote(saver.id), "Live Wallpaper: " .. saver.name)
  end)

  return ui.row({
    key = "saver-" .. saver.id,
    gap = 10,
    align = "center",
    padding = 10,
    radius = 8,
    fill = isSelected and "surface" or "surface_variant",
    border = isSelected and "primary" or "outline",
    borderWidth = isSelected and 1 or 0,
  }, {
    ui.box({
      width = 14,
      height = 36,
      radius = 4,
      fill = saver.accentColor or "#38bdf8",
    }),
    ui.column({ gap = 2, flexGrow = 1, align = "stretch" }, {
      ui.row({ gap = 6, align = "center" }, {
        ui.label({ text = saver.name, fontSize = 13, fontWeight = "bold", color = "on_surface" }),
        ui.label({ text = "• " .. (saver.category or ""), fontSize = 11, color = "primary" }),
      }),
      ui.label({ text = saver.description or "", fontSize = 11, color = "on_surface_variant" }),
    }),
    ui.button({
      text = isSelected and tr("selected") or tr("select"),
      controlSize = "sm",
      variant = isSelected and "primary" or "ghost",
      selected = isSelected,
      enabled = not busy,
      onClick = pickClick,
    }),
    ui.button({
      text = tr("launch"),
      glyph = "player-play",
      controlSize = "sm",
      variant = "ghost",
      enabled = not busy,
      onClick = launchClick,
    }),
    ui.button({
      text = tr("set_wallpaper"),
      glyph = "photo",
      controlSize = "sm",
      variant = isWallpaper and "primary" or "ghost",
      selected = isWallpaper,
      enabled = not busy,
      onClick = wpClick,
    }),
  })
end

render = function()
  if not panelOpen then return end
  resetCallbacks()

  local activateClick = callback("activate", function()
    runCmd("launch", tr("launched"))
  end)
  local lockClick = callback("lock", function()
    runCmd("lock", tr("locked"))
  end)
  local randomClick = callback("random", function()
    runCmd("randomize launch", tr("launched"))
  end)
  local guiClick = callback("gui", function()
    runCmd("gui", "Opened WScreenSavers Studio GUI")
  end)

  local children = {
    -- Top Header & Action Bar
    ui.row({ gap = 8, align = "center" }, {
      ui.glyph({ name = "device-tv", size = 18, color = "primary" }),
      ui.label({ text = tr("title"), fontSize = 15, fontWeight = "bold", color = "on_surface" }),
      ui.spacer({ flexGrow = 1 }),
      ui.button({ text = tr("activate_now"), glyph = "player-play", controlSize = "sm", variant = "primary", enabled = not busy, onClick = activateClick }),
      ui.button({ text = tr("lock_screen"), glyph = "lock", controlSize = "sm", enabled = not busy, onClick = lockClick }),
      ui.button({ text = tr("randomize_launch"), glyph = "dice", controlSize = "sm", enabled = not busy, onClick = randomClick }),
      ui.button({ text = tr("open_gui"), glyph = "settings", controlSize = "sm", variant = "ghost", enabled = not busy, onClick = guiClick }),
    }),
  }

  if stateData == nil or stateData.config == nil then
    table.insert(children, ui.label({ text = statusMsg or tr("loading"), color = "on_surface_variant" }))
  else
    local cfg = stateData.config

    -- 1. Daemon, Mode & Multi-Monitor Card
    local modeItems = {}
    for _, m in ipairs(MODES) do
      table.insert(modeItems, { m[1], tr(m[2]) })
    end
    local monItems = {}
    for _, m in ipairs(MONITOR_MODES) do
      table.insert(monItems, { m[1], tr(m[2]) })
    end

    local toggleLock = callback("tLock", function() setConfig("lockEnabled", not cfg.lockEnabled) end)
    local toggleAudio = callback("tAudio", function() setConfig("inhibitOnAudio", not cfg.inhibitOnAudio) end)
    local toggleFs = callback("tFs", function() setConfig("inhibitOnFullscreen", not cfg.inhibitOnFullscreen) end)
    local toggleClock = callback("tClock", function() setConfig("showClockOnSaver", not cfg.showClockOnSaver) end)

    table.insert(children, ui.column({ gap = 8, align = "stretch", padding = 12, radius = 8, fill = "surface_variant" }, {
      ui.row({ gap = 8, align = "center" }, {
        ui.label({ text = tr("daemon_section"), fontSize = 14, fontWeight = "bold", color = "primary" }),
        ui.spacer({ flexGrow = 1 }),
        ui.label({ text = tr("active_saver") .. ": " .. (stateData.selectedName or cfg.selectedSaver), fontSize = 12, fontWeight = "bold", color = "on_surface" }),
      }),
      ui.row({ gap = 8, align = "center" }, {
        ui.label({ text = tr("mode") .. ":", fontSize = 12, color = "on_surface_variant" }),
        chipRow(modeItems, cfg.mode or "random", function(val) setConfig("mode", val) end, "mode"),
      }),
      ui.row({ gap = 8, align = "center" }, {
        ui.label({ text = tr("idle_timeout") .. ":", fontSize = 12, color = "on_surface_variant" }),
        chipRow(TIMEOUTS, cfg.idleTimeoutMinutes or 10, function(val) setConfig("idleTimeoutMinutes", val) end, "timeout"),
      }),
      ui.row({ gap = 8, align = "center" }, {
        ui.label({ text = tr("dpms_timeout") .. ":", fontSize = 12, color = "on_surface_variant" }),
        chipRow(DPMS_TIMEOUTS, cfg.dpmsOffMinutes or 30, function(val) setConfig("dpmsOffMinutes", val) end, "dpms"),
      }),
      ui.row({ gap = 8, align = "center" }, {
        ui.label({ text = tr("multi_monitor") .. ":", fontSize = 12, color = "on_surface_variant" }),
        chipRow(monItems, cfg.multiMonitorMode or "independent", function(val) setConfig("multiMonitorMode", val) end, "mon"),
      }),
      ui.row({ gap = 6, align = "center" }, {
        ui.label({ text = tr("security_inhibitors") .. ":", fontSize = 12, color = "on_surface_variant" }),
        ui.button({ text = tr("pam_lock"), controlSize = "sm", variant = cfg.lockEnabled and "primary" or "ghost", selected = cfg.lockEnabled, onClick = toggleLock }),
        ui.button({ text = tr("audio_inhibit"), controlSize = "sm", variant = cfg.inhibitOnAudio and "primary" or "ghost", selected = cfg.inhibitOnAudio, onClick = toggleAudio }),
        ui.button({ text = tr("fullscreen_inhibit"), controlSize = "sm", variant = cfg.inhibitOnFullscreen and "primary" or "ghost", selected = cfg.inhibitOnFullscreen, onClick = toggleFs }),
        ui.button({ text = tr("hud_clock"), controlSize = "sm", variant = cfg.showClockOnSaver and "primary" or "ghost", selected = cfg.showClockOnSaver, onClick = toggleClock }),
      }),
    }))

    -- 2. Live Desktop Wallpaper Card
    local wpRunning = stateData.wallpaperRunning
    local wpToggleClick = callback("wpToggle", function()
      runCmd("wallpaper toggle", wpRunning and tr("wallpaper_stopped") or tr("wallpaper_running"))
    end)

    table.insert(children, ui.column({ gap = 8, align = "stretch", padding = 12, radius = 8, fill = "surface_variant" }, {
      ui.row({ gap = 8, align = "center" }, {
        ui.label({ text = tr("wallpaper_section"), fontSize = 14, fontWeight = "bold", color = "primary" }),
        ui.spacer({ flexGrow = 1 }),
        ui.label({
          text = wpRunning and (tr("wallpaper_running") .. " (" .. (stateData.wallpaperName or cfg.wallpaperSaver) .. ")") or tr("wallpaper_stopped"),
          fontSize = 12,
          color = wpRunning and "primary" or "on_surface_variant",
        }),
        ui.button({
          text = wpRunning and tr("wallpaper_stop") or tr("wallpaper_start"),
          glyph = "photo",
          controlSize = "sm",
          variant = wpRunning and "primary" or "ghost",
          selected = wpRunning,
          enabled = not busy,
          onClick = wpToggleClick,
        }),
      }),
      ui.row({ gap = 8, align = "center" }, {
        ui.label({ text = tr("wallpaper_fps") .. ":", fontSize = 12, color = "on_surface_variant" }),
        chipRow(FPS_CAPS, cfg.wallpaperFpsCap or 30, function(val) setConfig("wallpaperFpsCap", val) end, "fps"),
      }),
    }))

    -- 3. Screensaver Catalog & Category Picker
    local catItems = {}
    for _, c in ipairs(CATEGORIES) do
      table.insert(catItems, { c, c })
    end

    local onSearchChange = callback("searchChange", function(val)
      searchQuery = val or ""
      render()
    end)

    local saverRows = {}
    for _, s in ipairs(stateData.savers or {}) do
      if matchesFilter(s) then
        table.insert(saverRows, renderSaverRow(s, cfg))
      end
    end

    table.insert(children, ui.column({ gap = 8, align = "stretch", padding = 12, radius = 8, fill = "surface_variant" }, {
      ui.row({ gap = 8, align = "center" }, {
        ui.label({ text = tr("catalog_section") .. " (" .. tostring(#saverRows) .. ")", fontSize = 14, fontWeight = "bold", color = "primary" }),
        ui.spacer({ flexGrow = 1 }),
        ui.input({
          key = "catalog-search",
          value = searchQuery,
          placeholder = tr("search_placeholder"),
          controlSize = "sm",
          flexGrow = 1,
          onChange = onSearchChange,
        }),
      }),
      chipRow(catItems, selectedCategory, function(val)
        selectedCategory = val
        render()
      end, "cat"),
      ui.column({ gap = 6, align = "stretch" }, saverRows),
    }))

    if statusMsg ~= nil then
      table.insert(children, ui.label({ text = statusMsg, color = "on_surface_variant", fontSize = 12 }))
    end
  end

  panel.render(ui.scroll({ flexGrow = 1, gap = 0 }, {
    ui.column({ key = "wscreensavers-panel", gap = 12, align = "stretch" }, children),
  }))
end

function onOpen(_context)
  panelOpen = true
  statusMsg = nil
  render()
  refresh()
end

function onClose()
  panelOpen = false
  resetCallbacks()
end

function onExit(_signal)
  panelOpen = false
  resetCallbacks()
end

function onIpc(event, _payload)
  if event == "toggle" then
    if panelOpen then
      panel.close()
    else
      noctalia.togglePanel("christopher/wscreensavers:controls")
    end
  end
end
