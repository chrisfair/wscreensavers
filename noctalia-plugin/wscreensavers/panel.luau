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
local CATALOG_INITIAL_LIMIT = 40
local catalogLimit = CATALOG_INITIAL_LIMIT
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

local CYCLE_TIMEOUTS = {
  { 1, "1 min" },
  { 5, "5 min" },
  { 10, "10 min" },
  { 15, "15 min" },
  { 30, "30 min" },
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

local XSS_DIMS = {
  { 1280, "1280 px" },
  { 1920, "1920 px" },
  { 2560, "2560 px" },
  { 3840, "3840 px" },
}

local LOCK_PROVIDERS = {
  { "native", "lock_native" },
  { "hyprlock", "hyprlock" },
  { "swaylock", "swaylock" },
}

local CATALOG_CHUNK_ROWS = 100
local CATALOG_HEIGHT = 440

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

local FALLBACK_TEXTS = {
  wallpaper_stop_short = "Stop Wallpaper",
  wallpaper_badge = "Live Wallpaper",
  wallpaper_set_selected = "Use Selected as Wallpaper",
  catalog_show_more = "Show More",
  catalog_show_all = "Show All",
}

local function tr(key)
  local val = noctalia.tr(key)
  if val == nil or val == "" then
    return FALLBACK_TEXTS[key] or key
  end
  return val
end

-- Prefer a personal $HOME/bin copy when present, otherwise fall back to PATH
-- (the package installs /usr/bin/wscreensavers).
local function shellQuote(value)
  return "'" .. tostring(value):gsub("'", "'\\''") .. "'"
end

local function ctl(args)
  local home = noctalia.getenv("HOME") or "/home/christopher"
  return home .. "/bin/wscreensavers ctl " .. args
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

local function chipGrid(items, current, onPick, keyPrefix, itemsPerRow)
  local perRow = itemsPerRow or 4
  local rows = {}
  local curRow = {}
  for index, item in ipairs(items) do
    local value, label = item[1], item[2]
    local pick = callback(keyPrefix .. index, function() onPick(value) end)
    table.insert(curRow, ui.button({
      key = keyPrefix .. tostring(value),
      text = label,
      controlSize = "sm",
      variant = current == value and "primary" or "ghost",
      selected = current == value,
      enabled = not busy,
      onClick = pick,
    }))
    if #curRow >= perRow then
      table.insert(rows, ui.row({ gap = 4, align = "center" }, curRow))
      curRow = {}
    end
  end
  if #curRow > 0 then
    table.insert(rows, ui.row({ gap = 4, align = "center" }, curRow))
  end
  return ui.column({ gap = 4, align = "stretch" }, rows)
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

-- Set of saver ids in the rotation pool, built once per render (the CPU budget
-- for one callback is small and the catalog has hundreds of rows).
local function poolSetOf(cfg)
  local set = {}
  for _, id in ipairs(cfg.enabledSavers or {}) do
    set[id] = true
  end
  return set
end

local function renderSaverRow(saver, cfg, poolSet)
  local pooled = poolSet[saver.id] == true
  local poolClick = callback("pool_" .. saver.id, function()
    runCmd("pool toggle " .. shellQuote(saver.id), tr("saved"))
  end)
  local isSelected = (cfg.selectedSaver == saver.id)
  local isWallpaper = (cfg.wallpaperSaver == saver.id and stateData.wallpaperRunning)
  local isHighlighted = isSelected or isWallpaper

  local pickClick = callback("sel_" .. saver.id, function()
    setConfig("selectedSaver", saver.id)
  end)
  local launchClick = callback("launch_" .. saver.id, function()
    runCmd("launch " .. shellQuote(saver.id), tr("launched") .. ": " .. saver.name)
  end)
  local wpClick = callback("wp_" .. saver.id, function()
    if isWallpaper then
      runCmd("wallpaper off", tr("wallpaper_stopped"))
    else
      runCmd("wallpaper on " .. shellQuote(saver.id), "Live Wallpaper: " .. saver.name)
    end
  end)

  return ui.column({
    key = "saver-" .. saver.id,
    gap = 6,
    align = "stretch",
    padding = 10,
    radius = 8,
    fill = isHighlighted and "surface" or "surface_variant",
    border = isWallpaper and "primary" or (isSelected and "secondary" or "outline"),
    borderWidth = isHighlighted and 1 or 0,
  }, {
    ui.row({ gap = 8, align = "center" }, {
      ui.box({
        width = 8,
        height = 22,
        radius = 3,
        fill = saver.accentColor or "#38bdf8",
      }),
      ui.label({ text = saver.name, fontSize = 13, fontWeight = "bold", color = "on_surface" }),
      ui.label({ text = "• " .. (saver.category or ""), fontSize = 11, color = "primary" }),
      isWallpaper and ui.label({ text = "• " .. tr("wallpaper_badge"), fontSize = 11, fontWeight = "bold", color = "primary" }) or ui.spacer({ width = 0 }),
      ui.spacer({ flexGrow = 1 }),
      ui.button({
        text = pooled and tr("in_pool") or "+ Pool",
        glyph = pooled and "check" or "plus",
        controlSize = "sm",
        variant = pooled and "primary" or "ghost",
        selected = pooled,
        enabled = not busy,
        onClick = poolClick,
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
        text = isWallpaper and tr("wallpaper_stop_short") or tr("set_wallpaper"),
        glyph = isWallpaper and "x" or "photo",
        controlSize = "sm",
        variant = isWallpaper and "primary" or "ghost",
        selected = isWallpaper,
        enabled = not busy,
        onClick = wpClick,
      }),
    }),
    ui.label({ text = saver.description or "", fontSize = 11, color = "on_surface_variant" }),
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
      ui.glyph({ name = "device-tv", size = 20, color = "primary" }),
      ui.label({ text = "WScreenSavers", fontSize = 15, fontWeight = "bold", color = "on_surface" }),
      ui.label({ text = "• Wayland Suite", fontSize = 12, color = "on_surface_variant" }),
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

    local lockItems = {}
    for _, m in ipairs(LOCK_PROVIDERS) do
      local label = m[1] == "native" and tr("lock_native") or m[2]
      table.insert(lockItems, { m[1], label })
    end
    local poolAllClick = callback("poolAll", function() runCmd("pool all", tr("saved")) end)
    local poolCount = #(cfg.enabledSavers or {})

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
      cfg.mode == "cycle" and ui.row({ gap = 8, align = "center" }, {
        ui.label({ text = tr("cycle_timeout") .. ":", fontSize = 12, color = "on_surface_variant" }),
        chipRow(CYCLE_TIMEOUTS, cfg.cycleTimeoutMinutes or 5, function(val) setConfig("cycleTimeoutMinutes", val) end, "cycle"),
      }) or ui.spacer({ height = 0 }),
      ui.row({ gap = 8, align = "center" }, {
        ui.label({ text = tr("idle_timeout") .. ":", fontSize = 12, color = "on_surface_variant" }),
        chipRow(TIMEOUTS, cfg.idleTimeoutMinutes or 10, function(val) setConfig("idleTimeoutMinutes", val) end, "timeout"),
      }),
      ui.row({ gap = 8, align = "center" }, {
        ui.label({ text = tr("dpms_timeout") .. ":", fontSize = 12, color = "on_surface_variant" }),
        chipRow(DPMS_TIMEOUTS, cfg.dpmsOffMinutes or 30, function(val) setConfig("dpmsOffMinutes", val) end, "dpms"),
      }),
      ui.row({ gap = 8, align = "center" }, {
        ui.label({ text = tr("xss_dim") .. ":", fontSize = 12, color = "on_surface_variant" }),
        chipRow(XSS_DIMS, cfg.xssMaxStreamDim or 1920, function(val) setConfig("xssMaxStreamDim", val) end, "xssdim"),
      }),
      ui.row({ gap = 8, align = "center" }, {
        ui.label({ text = tr("lock_provider") .. ":", fontSize = 12, color = "on_surface_variant" }),
        chipRow(lockItems, cfg.lockProvider or "native", function(val) setConfig("lockProvider", val) end, "lockprov"),
      }),
      ui.row({ gap = 8, align = "center" }, {
        ui.label({ text = tr("pool_size") .. ": " .. tostring(poolCount) .. " / " .. tostring(#(stateData.savers or {})), fontSize = 12, color = "on_surface_variant" }),
        ui.button({ text = tr("pool_all"), controlSize = "sm", variant = "ghost", enabled = not busy, onClick = poolAllClick }),
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
    local wpUseSelectedClick = callback("wpUseSelected", function()
      runCmd("wallpaper on " .. shellQuote(cfg.selectedSaver), "Live Wallpaper: " .. (stateData.selectedName or cfg.selectedSaver))
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
          glyph = wpRunning and "x" or "photo",
          controlSize = "sm",
          variant = wpRunning and "primary" or "ghost",
          selected = wpRunning,
          enabled = not busy,
          onClick = wpToggleClick,
        }),
        (not wpRunning or cfg.wallpaperSaver ~= cfg.selectedSaver) and ui.button({
          text = tr("wallpaper_set_selected") .. " (" .. (stateData.selectedName or cfg.selectedSaver) .. ")",
          controlSize = "sm",
          variant = "ghost",
          enabled = not busy,
          onClick = wpUseSelectedClick,
        }) or ui.spacer({ width = 0 }),
      }),
      ui.row({ gap = 8, align = "center" }, {
        ui.label({ text = tr("wallpaper_fps") .. ":", fontSize = 12, color = "on_surface_variant" }),
        chipRow(FPS_CAPS, cfg.wallpaperFpsCap or 30, function(val) setConfig("wallpaperFpsCap", val) end, "fps"),
      }),
      ui.label({ text = tr("wallpaper_covers_note"), fontSize = 11, color = "on_surface_variant" }),
      ((stateData.otherWallpapers or {})[1] ~= nil) and ui.label({
        text = tr("wallpaper_others_detected") .. ": " .. table.concat(stateData.otherWallpapers, ", "),
        fontSize = 11,
        fontWeight = "bold",
        color = "primary",
      }) or ui.spacer({ height = 0 }),
    }))

    -- 3. Screensaver Catalog & Category Picker
    local catItems = {}
    for _, c in ipairs(CATEGORIES) do
      table.insert(catItems, { c, c })
    end

    local onSearchChange = callback("searchChange", function(val)
      searchQuery = val or ""
      catalogLimit = CATALOG_INITIAL_LIMIT
      render()
    end)

    -- Noctalia drops children past 256 in one node, so rows go into chunked
    -- columns inside a catalog-only scroll area. Limit initial display to prevent
    -- exceeding Luau callback CPU budget with 300+ items.
    local poolSet = poolSetOf(cfg)
    local saverChunks = {}
    local chunk = nil
    local matched = 0
    local renderedCount = 0
    for _, s in ipairs(stateData.savers or {}) do
      if matchesFilter(s) then
        matched += 1
        if renderedCount < catalogLimit then
          renderedCount += 1
          if chunk == nil or #chunk >= CATALOG_CHUNK_ROWS then
            chunk = {}
            table.insert(saverChunks, chunk)
          end
          table.insert(chunk, renderSaverRow(s, cfg, poolSet))
        end
      end
    end

    if matched > renderedCount then
      local showMoreClick = callback("catShowMore", function()
        catalogLimit += 40
        render()
      end)
      local showAllClick = callback("catShowAll", function()
        catalogLimit = matched
        render()
      end)
      local moreRow = ui.row({ key = "cat-more-row", gap = 8, align = "center", padding = 8 }, {
        ui.button({
          text = tr("catalog_show_more") .. " (+" .. tostring(math.min(40, matched - renderedCount)) .. ")",
          controlSize = "sm",
          variant = "primary",
          onClick = showMoreClick,
        }),
        ui.button({
          text = tr("catalog_show_all") .. " (" .. tostring(matched) .. ")",
          controlSize = "sm",
          variant = "ghost",
          onClick = showAllClick,
        }),
        ui.label({
          text = tostring(renderedCount) .. " / " .. tostring(matched),
          fontSize = 12,
          color = "on_surface_variant",
        }),
      })
      if chunk == nil then
        chunk = {}
        table.insert(saverChunks, chunk)
      end
      table.insert(chunk, moreRow)
    end

    local chunkColumns = {}
    for index, rows in ipairs(saverChunks) do
      table.insert(chunkColumns, ui.column({ key = "catalog-chunk-" .. index, gap = 6, align = "stretch" }, rows))
    end
    table.insert(children, ui.column({ gap = 8, align = "stretch", padding = 12, radius = 8, fill = "surface_variant" }, {
      ui.row({ gap = 8, align = "center" }, {
        ui.label({ text = tr("catalog_section") .. " (" .. tostring(matched) .. ")", fontSize = 14, fontWeight = "bold", color = "primary" }),
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
      chipGrid(catItems, selectedCategory, function(val)
        selectedCategory = val
        catalogLimit = CATALOG_INITIAL_LIMIT
        render()
      end, "cat", 4),
      ui.scroll({ key = "catalog-scroll", height = CATALOG_HEIGHT, gap = 6 }, chunkColumns),
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
  catalogLimit = CATALOG_INITIAL_LIMIT
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
