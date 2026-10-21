--!nonstrict
-- Noctalia bar widget for WScreenSavers.
-- Displays status in the bar and opens the floating WScreenSavers control panel.

local PANEL_ID = "christopher/wscreensavers:controls"
local CHANGED_KEY = "wscreensavers.changed"
local REFRESH_MS = 20000

local stateData = nil

-- Prefer a personal $HOME/bin copy when present, otherwise fall back to PATH
-- (the package installs /usr/bin/wscreensavers).
local CTL_SCRIPT = 'b="$HOME/bin/wscreensavers"; [ -x "$b" ] || b=wscreensavers; exec "$b" ctl "$@"'

local function shellQuote(value)
  return "'" .. tostring(value):gsub("'", "'\\''") .. "'"
end

local function ctlCommand(args)
  return "sh -c " .. shellQuote(CTL_SCRIPT) .. " sh " .. args
end

local function render()
  local glyph = noctalia.getConfig("glyph") or "device-tv"
  barWidget.setGlyph(glyph)

  local showName = noctalia.getConfig("show_name")
  if showName and stateData ~= nil and stateData.selectedName ~= nil then
    barWidget.setText(stateData.selectedName)
  else
    barWidget.setText("")
  end

  local tooltip = noctalia.tr("widget_tooltip")
  if stateData ~= nil and stateData.config ~= nil then
    local cfg = stateData.config
    tooltip = tooltip .. "\n" .. noctalia.tr("active_saver") .. ": " .. (stateData.selectedName or cfg.selectedSaver or "GLMatrix")
    tooltip = tooltip .. "\n" .. noctalia.tr("mode") .. ": " .. (cfg.mode or "random") .. " (" .. tostring(cfg.idleTimeoutMinutes or 10) .. "m)"
    tooltip = tooltip .. "\n" .. noctalia.tr("multi_monitor") .. ": " .. (cfg.multiMonitorMode or "independent")
    if stateData.wallpaperRunning then
      tooltip = tooltip .. "\nLive Wallpaper: " .. (stateData.wallpaperName or cfg.wallpaperSaver or "Active") .. " (" .. tostring(cfg.wallpaperFpsCap or 30) .. " FPS)"
    else
      tooltip = tooltip .. "\nLive Wallpaper: Off"
    end
  end
  barWidget.setTooltip(tooltip)
end

local function refresh()
  noctalia.runAsync(ctlCommand("status"), function(result)
    if result.timedOut or result.exitCode ~= 0 or (result.stdout or "") == "" then
      return
    end
    local decoded = noctalia.json.decode(result.stdout)
    if type(decoded) == "table" then
      stateData = decoded
      render()
    end
  end, 10000)
end

noctalia.setUpdateInterval(REFRESH_MS)

function update()
  refresh()
end

noctalia.state.watch(CHANGED_KEY, function(_value)
  refresh()
end)

function onClick()
  noctalia.togglePanel(PANEL_ID)
end

function onConfigChanged()
  render()
  refresh()
end

function onIpc(event, payload)
  if event == "toggle" then
    noctalia.togglePanel(PANEL_ID)
  elseif event == "launch" then
    noctalia.runAsync(ctlCommand("launch " .. shellQuote(payload or "")), function(_) refresh() end, 10000)
  elseif event == "lock" then
    noctalia.runAsync(ctlCommand("lock"), function(_) refresh() end, 10000)
  elseif event == "randomize" then
    noctalia.runAsync(ctlCommand("randomize launch"), function(_) refresh() end, 10000)
  elseif event == "wallpaper" then
    noctalia.runAsync(ctlCommand("wallpaper toggle"), function(_) refresh() end, 10000)
  end
end

render()
refresh()
