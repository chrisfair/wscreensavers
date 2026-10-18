// Matrix, Retro CRT, Telemetry & Classic System Savers:
// 1. glmatrix (GLMatrix 3D green glyph rain)
// 2. starwars (3D perspective Star Wars opening crawl + live telemetry)
// 3. xanalogtv (XAnalogTV CRT phosphor, SMPTE color bars, RF static, sync roll)
// 4. bsod (Classic multi-OS crash screens: Windows NT, Linux Kernel Panic, Amiga Guru, Mac Sad Mac, TempleOS)
// 5. phosphor (Amber/Green P1/P3 CRT terminal with live Linux kernel/process output)
// 6. sonar (Radar sweep plotting real LAN ARP peers & top Linux processes)

const MATRIX_GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEFZ:・."=*+-<>¦｜';
const DNA_GLYPHS = 'ACGTacgt≡=-:';
const HEX_GLYPHS = '0123456789ABCDEF';
const BIN_GLYPHS = '01';

export function createGLMatrix(canvas, getParams) {
  const ctx = canvas.getContext('2d');
  let columns = [];
  let lastW = 0;
  let lastH = 0;
  let wavePhase = 0;

  function initColumns(w, h, density) {
    lastW = w;
    lastH = h;
    const count = Math.max(12, Math.floor((w / 18) * (density / 40)));
    columns = [];
    for (let i = 0; i < count; i++) {
      const z = 0.35 + Math.random() * 0.95; // 3D depth layer
      columns.push({
        x: (i / count) * w + (Math.random() - 0.5) * 14,
        y: Math.random() * h,
        z,
        speed: (1.8 + Math.random() * 3.4) * z,
        len: Math.floor(10 + Math.random() * 22),
        chars: Array.from({ length: 34 }, () => Math.floor(Math.random() * MATRIX_GLYPHS.length)),
        spinOffset: Math.random() * Math.PI * 2
      });
    }
    columns.sort((a, b) => a.z - b.z);
  }

  return {
    render(dt) {
      const p = getParams();
      const speed = Number(p.speed ?? 1.2);
      const density = Number(p.density ?? 45);
      const mode = p.mode || 'matrix';
      const fog = p.fog !== false;
      const waves = p.waves !== false;
      const rotate = p.rotate !== false;

      const w = canvas.width;
      const h = canvas.height;
      if (w !== lastW || h !== lastH || Math.abs(columns.length - Math.floor((w / 18) * (density / 40))) > 15) {
        initColumns(w, h, density);
      }

      const glyphSet =
        mode === 'dna' ? DNA_GLYPHS :
        mode === 'binary' ? BIN_GLYPHS :
        mode === 'hex' ? HEX_GLYPHS : MATRIX_GLYPHS;

      const palette =
        mode === 'amber' ? { head: '#fff3c4', bright: '#ffb703', dim: '#7a4900' } :
        mode === 'cyan'  ? { head: '#e0fbfc', bright: '#00f5d4', dim: '#005f73' } :
                           { head: '#e9ffe9', bright: '#22ff55', dim: '#065a1d' };

      ctx.fillStyle = 'rgba(0, 4, 2, 0.24)';
      ctx.fillRect(0, 0, w, h);

      wavePhase += dt * speed * 1.6;
      const camSway = rotate ? Math.sin(wavePhase * 0.45) * 28 : 0;

      for (const col of columns) {
        col.y += col.speed * speed * (dt * 60);
        if (col.y - col.len * 18 * col.z > h + 40) {
          col.y = -20;
          col.x = Math.random() * w;
        }
        if (Math.random() < 0.18) {
          const idx = Math.floor(Math.random() * col.chars.length);
          col.chars[idx] = Math.floor(Math.random() * glyphSet.length);
        }

        const fontSize = Math.max(10, Math.round(16 * col.z));
        ctx.font = `bold ${fontSize}px "JetBrains Mono", "Fira Code", monospace`;

        const waveOffset = waves ? Math.sin(wavePhase + col.x * 0.012) * 8 * col.z : 0;
        const drawX = col.x + camSway * (col.z - 0.5) + waveOffset;

        for (let j = 0; j < col.len; j++) {
          const charY = col.y - j * fontSize * 1.05;
          if (charY < -fontSize || charY > h + fontSize) continue;

          const ch = glyphSet[col.chars[j % col.chars.length] % glyphSet.length];
          let alpha = (1 - j / col.len);
          if (fog) alpha *= Math.min(1, col.z * 0.95);

          if (j === 0) {
            ctx.shadowBlur = 12 * col.z;
            ctx.shadowColor = palette.bright;
            ctx.fillStyle = palette.head;
          } else if (j < 3) {
            ctx.shadowBlur = 6 * col.z;
            ctx.shadowColor = palette.bright;
            ctx.fillStyle = palette.bright;
          } else {
            ctx.shadowBlur = 0;
            ctx.fillStyle = palette.dim;
          }
          ctx.globalAlpha = Math.max(0.06, Math.min(1, alpha));
          ctx.fillText(ch, drawX, charY);
        }
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }
  };
}

export function createStarWars(canvas, getParams, getTelemetry) {
  const ctx = canvas.getContext('2d');
  let scrollOffset = 0;
  const stars = Array.from({ length: 280 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: 0.5 + Math.random() * 1.6,
    twinkle: Math.random() * Math.PI * 2
  }));

  const defaultLore = [
    'EPISODE VII',
    'THE WAYLAND AWAKENING',
    '',
    'It is a period of compositor transition.',
    'Rebel hackers, striking from a hidden',
    'wlr-layer-shell surface, have won their',
    'first victory against the legacy X11',
    'Server.',
    '',
    'During the battle, WScreenSavers engineers',
    'managed to bridge Jamie Zawinski\'s iconic',
    'XScreenSaver collection directly onto',
    'Wayland outputs with hardware WebGL',
    'and PAM lock security.',
    '',
    'Across multi-monitor displays and desktop',
    'wallpaper layers, glowing phosphors and',
    '3D geometry once again guard the night...'
  ];

  return {
    render(dt) {
      const p = getParams();
      const speed = Number(p.speed ?? 1.0);
      const tilt = Number(p.tilt ?? 58);
      const starDensity = Number(p.stars ?? 260);
      const color = p.color || '#ffd52c';

      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = '#020308';
      ctx.fillRect(0, 0, w, h);

      // Stars
      const count = Math.min(stars.length, Math.max(40, Math.floor(starDensity)));
      for (let i = 0; i < count; i++) {
        const s = stars[i];
        s.twinkle += dt * 2.1;
        const a = 0.4 + 0.55 * Math.sin(s.twinkle);
        ctx.fillStyle = `rgba(225, 238, 255, ${a.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      const feed = getTelemetry?.()?.feed || [];
      const lines = [...defaultLore, '', '--- SYSTEM TELEMETRY ---', ...feed];

      scrollOffset += dt * 36 * speed;
      const totalCycle = lines.length * 42 + h * 0.9;
      if (scrollOffset > totalCycle) {
        scrollOffset = 0;
      }

      const horizonY = h * (0.14 + (75 - tilt) * 0.004);
      const bottomY = h * 1.02;

      ctx.save();
      ctx.textAlign = 'center';

      for (let i = 0; i < lines.length; i++) {
        const rawY = bottomY - scrollOffset + i * 42;
        if (rawY < horizonY || rawY > bottomY + 50) continue;

        // Perspective projection t in [0..1] from horizon to bottom
        const t = Math.max(0.02, (rawY - horizonY) / (bottomY - horizonY));
        const perspScale = Math.pow(t, 1.35);
        const screenY = horizonY + Math.pow(t, 1.65) * (bottomY - horizonY);
        const fontSize = Math.max(8, Math.round(34 * perspScale));
        const alpha = Math.min(1, Math.pow(t, 0.85) * 1.35) * (rawY > h * 0.92 ? (bottomY - rawY) / (h * 0.1) : 1);

        if (alpha <= 0.02) continue;
        ctx.font = `800 ${fontSize}px "Inter", "Liberation Sans", sans-serif`;
        ctx.fillStyle = color;
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.fillText(lines[i], w / 2, screenY);
      }

      ctx.restore();
    }
  };
}

export function createXAnalogTV(canvas, getParams) {
  const ctx = canvas.getContext('2d');
  let rollOffset = 0;
  let clock = 0;

  const smpteTop = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
  const smpteMid = ['#0000c0', '#131313', '#c000c0', '#131313', '#00c0c0', '#131313', '#c0c0c0'];

  return {
    render(dt) {
      const p = getParams();
      const channel = p.channel || 'bars';
      const noiseLevel = Number(p.noise ?? 0.22);
      const scanlines = Number(p.scanlines ?? 0.65);
      const roll = Boolean(p.roll);

      const w = canvas.width;
      const h = canvas.height;
      clock += dt;

      if (roll) {
        rollOffset = (rollOffset + dt * 160) % h;
      } else {
        rollOffset = 0;
      }

      ctx.save();
      ctx.fillStyle = '#08090c';
      ctx.fillRect(0, 0, w, h);

      const activeChannel = channel === 'cycle'
        ? (Math.floor(clock / 6) % 3 === 0 ? 'bars' : Math.floor(clock / 6) % 3 === 1 ? 'indianhead' : 'static')
        : channel;

      const drawY = (y) => (y + rollOffset) % h;

      if (activeChannel === 'bars') {
        const barW = w / 7;
        for (let i = 0; i < 7; i++) {
          ctx.fillStyle = smpteTop[i];
          ctx.fillRect(i * barW, drawY(0), barW + 1, h * 0.67);
          ctx.fillStyle = smpteMid[i];
          ctx.fillRect(i * barW, drawY(h * 0.67), barW + 1, h * 0.08);
        }
        ctx.fillStyle = '#0e1726';
        ctx.fillRect(0, drawY(h * 0.75), w, h * 0.25);

        // Station ID overlay
        ctx.fillStyle = 'rgba(0,0,0,0.72)';
        ctx.fillRect(w * 0.32, drawY(h * 0.42), w * 0.36, 54);
        ctx.font = 'bold 22px monospace';
        ctx.fillStyle = '#f8fafc';
        ctx.textAlign = 'center';
        ctx.fillText('CH 03 // WSCREENSAVERS UHF', w / 2, drawY(h * 0.42) + 34);
      } else if (activeChannel === 'indianhead') {
        ctx.fillStyle = '#181818';
        ctx.fillRect(0, 0, w, h);
        const cx = w / 2;
        const cy = drawY(h / 2);
        const r = Math.min(w, h) * 0.36;
        ctx.strokeStyle = '#d4d4d4';
        ctx.lineWidth = 3;
        for (let rad = r; rad > 20; rad -= r / 5) {
          ctx.beginPath();
          ctx.arc(cx, cy, rad, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(cx - r * 1.2, cy);
        ctx.lineTo(cx + r * 1.2, cy);
        ctx.moveTo(cx, cy - r * 1.2);
        ctx.lineTo(cx, cy + r * 1.2);
        ctx.stroke();
        ctx.font = 'bold 20px monospace';
        ctx.fillStyle = '#e5e5e5';
        ctx.textAlign = 'center';
        ctx.fillText('WAYLAND ANALOG TEST PATTERN', cx, cy - r - 18);
      }

      // RF Static snow
      const effectiveNoise = activeChannel === 'static' ? Math.max(0.75, noiseLevel) : noiseLevel;
      if (effectiveNoise > 0.02) {
        const bands = Math.floor(45 + effectiveNoise * 160);
        for (let i = 0; i < bands; i++) {
          const sy = Math.random() * h;
          const sx = Math.random() * w;
          const sw = 12 + Math.random() * 140;
          const lum = Math.floor(140 + Math.random() * 115);
          ctx.fillStyle = `rgba(${lum},${lum},${lum},${effectiveNoise * 0.55})`;
          ctx.fillRect(sx, sy, sw, 3);
        }
      }

      // Horizontal Scanlines & CRT Vignette
      if (scanlines > 0.05) {
        ctx.fillStyle = `rgba(0, 0, 0, ${scanlines * 0.5})`;
        for (let y = 0; y < h; y += 4) {
          ctx.fillRect(0, y, w, 2);
        }
      }

      const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.72);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.68)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  };
}

export function createBSOD(canvas, getParams) {
  const ctx = canvas.getContext('2d');
  let timer = 0;
  let systemIndex = 0;
  const systems = ['win98', 'nt4', 'linux', 'amiga', 'mac', 'temple'];

  return {
    render(dt) {
      const p = getParams();
      const osChoice = p.os || 'cycle';
      const cycleSec = Number(p.cycleSeconds ?? 15);
      const crtCurve = p.crtCurve !== false;

      timer += dt;
      if (osChoice === 'cycle') {
        systemIndex = Math.floor(timer / Math.max(4, cycleSec)) % systems.length;
      }
      const activeOS = osChoice === 'cycle' ? systems[systemIndex] : osChoice;

      const w = canvas.width;
      const h = canvas.height;
      ctx.save();

      if (activeOS === 'amiga') {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, w, h);
        const blink = Math.floor(timer * 2) % 2 === 0;
        ctx.strokeStyle = blink ? '#ff1e00' : '#330000';
        ctx.lineWidth = 10;
        ctx.strokeRect(w * 0.08, h * 0.12, w * 0.84, 150);
        ctx.fillStyle = '#ff1e00';
        ctx.font = 'bold 24px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Software Failure.   Press left mouse button to continue.', w / 2, h * 0.12 + 62);
        ctx.fillText('Guru Meditation #00000004.00004845 (WAYLAND_SURFACE_FAULT)', w / 2, h * 0.12 + 108);
      } else if (activeOS === 'linux') {
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '18px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        const lines = [
          '[ 4092.118402] BUG: unable to handle kernel NULL pointer dereference at 0000000000000018',
          '[ 4092.118415] IP: [<ffffffff8109a3c4>] x11_legacy_grab_server+0x44/0x110',
          '[ 4092.118429] PGD 800000041e92b067 PUD 429a10067 PMD 0',
          '[ 4092.118440] Oops: 0002 [#1] PREEMPT SMP NOPTI',
          '[ 4092.118452] CPU: 7 PID: 1337 Comm: xscreensaver Not tainted 6.19.0-wayland #1',
          '[ 4092.118466] RIP: 0010:wayland_layer_shell_takeover+0x88/0x120 [wscreensavers]',
          '[ 4092.118480] RSP: 0018:ffffc9000183be18 EFLAGS: 00010246',
          '[ 4092.118495] RAX: 00000000deadbeef RBX: ffff8881092a4000 RCX: 0000000000000000',
          '[ 4092.118510] Call Trace:',
          '[ 4092.118522]  <TASK>',
          '[ 4092.118535]  ? zwlr_layer_surface_v1_configure+0x2a/0x90',
          '[ 4092.118548]  ? entry_SYSCALL_64_after_hwframe+0x72/0xdc',
          '[ 4092.118560]  </TASK>',
          '[ 4092.118574] ---[ end trace 0000000000000000 ]---',
          '[ 4092.118590] Kernel panic - not syncing: Attempted to kill init! exitcode=0x00000009'
        ];
        lines.forEach((l, i) => ctx.fillText(l, w * 0.07, h * 0.14 + i * 32));
      } else if (activeOS === 'mac') {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, w, h);
        const cx = w / 2;
        const cy = h * 0.44;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.strokeRect(cx - 56, cy - 68, 112, 136);
        ctx.strokeRect(cx - 40, cy - 52, 80, 64);
        ctx.font = 'bold 26px monospace';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('X   X', cx, cy - 22);
        ctx.beginPath();
        ctx.arc(cx, cy + 4, 14, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
        ctx.fillText('0000000F', cx, cy + 106);
        ctx.fillText('00000003', cx, cy + 140);
      } else if (activeOS === 'temple') {
        ctx.fillStyle = '#00aaaa';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'left';
        const lines = [
          'TempleOS V5.03   Wayland Ring-0 Hypervisor Bridge',
          '--------------------------------------------------------',
          'HolyC Compiler Exception at 0x00007FF8A020:',
          'God says: "Thou shalt render in 640x480 16-color Mode"',
          'Task:0x0041C200  RIP:0x0040912E  RSP:0x007FF010',
          'Press [SPACE] to consult Oracle or move mouse to resume.'
        ];
        lines.forEach((l, i) => ctx.fillText(l, w * 0.12, h * 0.25 + i * 38));
      } else {
        // Classic Win98 / NT4 Blue Screen of Death
        ctx.fillStyle = '#0000aa';
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#aaaaaa';
        ctx.fillRect(w / 2 - 90, h * 0.22 - 26, 180, 32);
        ctx.fillStyle = '#0000aa';
        ctx.font = 'bold 22px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(activeOS === 'nt4' ? 'Windows NT 4.0' : 'Windows', w / 2, h * 0.22 - 2);

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        const lines = activeOS === 'nt4'
          ? [
              '*** STOP: 0x0000001E (0xC0000005, 0xFDE38AF9, 0x00000001, 0x7E8B0EB4)',
              'KMODE_EXCEPTION_NOT_HANDLED in WAYLAND_COMPOSITOR.SYS',
              '',
              'Address FDE38AF9 has base at FDE00000 - WIN32K.SYS',
              'CPUID:AuthenticAMD 6.19.1 irql:1f SYSVER 0xf0000565',
              '',
              'Beginning dump of physical memory...',
              `Physical memory dump complete: ${Math.min(100, Math.floor((timer * 9) % 110))}%`
            ]
          : [
              'A fatal exception 0E has occurred at 0028:C0011E36 in VXD VMM(01) +',
              '00010E36. The current application will be terminated.',
              '',
              '*  Press any key to terminate the current application.',
              '*  Press CTRL+ALT+DEL again to restart your computer. You will',
              '   lose any unsaved information in all applications.',
              '',
              '              Press any key to continue _'
            ];
        lines.forEach((l, i) => ctx.fillText(l, w * 0.14, h * 0.34 + i * 36));
      }

      if (crtCurve) {
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        for (let y = 0; y < h; y += 4) {
          ctx.fillRect(0, y, w, 1);
        }
      }
      ctx.restore();
    }
  };
}

export function createPhosphor(canvas, getParams, getTelemetry) {
  const ctx = canvas.getContext('2d');
  let charCursor = 0;
  let lineIndex = 0;
  let visibleLines = [];

  return {
    render(dt) {
      const p = getParams();
      const phosphorType = p.phosphor || 'p39';
      const cps = Number(p.cps ?? 120);
      const fontSize = Number(p.fontSize ?? 16);

      const colors =
        phosphorType === 'p3'  ? { fg: '#ffb000', glow: '#ff8800', dim: '#4d3200' } :
        phosphorType === 'p4'  ? { fg: '#e2e8f0', glow: '#94a3b8', dim: '#334155' } :
        phosphorType === 'p11' ? { fg: '#38bdf8', glow: '#0284c7', dim: '#0c4a6e' } :
                                 { fg: '#33ff66', glow: '#10b981', dim: '#064e3b' };

      const w = canvas.width;
      const h = canvas.height;
      const maxRows = Math.max(8, Math.floor((h - 80) / (fontSize * 1.45)));

      const feed = getTelemetry?.()?.feed || [
        'WSCREENSAVERS WAYLAND P39 PHOSPHOR TERMINAL READY',
        'PROTOCOL: zwlr_layer_shell_v1 / ext_idle_notify_v1 / PAM',
        'RENDERER: Hardware Accelerated WebGL2 & Canvas2D'
      ];

      const currentFullLine = feed[lineIndex % feed.length] || '';
      charCursor += dt * cps;
      if (charCursor >= currentFullLine.length + 8) {
        visibleLines.push(currentFullLine);
        if (visibleLines.length > maxRows) {
          visibleLines.shift();
        }
        lineIndex++;
        charCursor = 0;
      }

      ctx.fillStyle = 'rgba(2, 6, 4, 0.35)';
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.font = `bold ${fontSize}px "JetBrains Mono", "Fira Code", monospace`;
      ctx.shadowBlur = 10;
      ctx.shadowColor = colors.glow;
      ctx.fillStyle = colors.fg;

      const padX = 48;
      let y = 56;
      for (const line of visibleLines) {
        ctx.fillText(line, padX, y);
        y += fontSize * 1.45;
      }

      const activeSub = currentFullLine.slice(0, Math.floor(charCursor));
      ctx.fillText(activeSub + '█', padX, y);

      // Scanlines
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      for (let sy = 0; sy < h; sy += 3) {
        ctx.fillRect(0, sy, w, 1);
      }
      ctx.restore();
    }
  };
}

export function createSonar(canvas, getParams, getTelemetry) {
  const ctx = canvas.getContext('2d');
  let sweepAngle = 0;

  return {
    render(dt) {
      const p = getParams();
      const sweepSpeed = Number(p.sweepSpeed ?? 1.2);
      const decay = Number(p.phosphorDecay ?? 0.92);
      const mode = p.pingMode || 'both';
      const color = p.color || '#00ff66';

      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) * 0.42;

      ctx.fillStyle = 'rgba(1, 10, 6, 0.25)';
      ctx.fillRect(0, 0, w, h);

      sweepAngle = (sweepAngle + dt * sweepSpeed) % (Math.PI * 2);

      ctx.save();
      // Draw Radar Grid Rings
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.28;
      ctx.lineWidth = 1.4;
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, (radius * i) / 4, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Crosshairs
      ctx.beginPath();
      ctx.moveTo(cx - radius, cy);
      ctx.lineTo(cx + radius, cy);
      ctx.moveTo(cx, cy - radius);
      ctx.lineTo(cx, cy + radius);
      ctx.stroke();

      // Sweep Cone
      for (let s = 0; s < 28; s++) {
        const a1 = sweepAngle - s * 0.022;
        const a2 = sweepAngle - (s + 1) * 0.022;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, a1, a2, true);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.globalAlpha = Math.max(0, (1 - s / 28) * 0.22);
        ctx.fill();
      }

      // Sweep Leading Line
      ctx.globalAlpha = 0.95;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sweepAngle) * radius, cy + Math.sin(sweepAngle) * radius);
      ctx.stroke();

      // Plot real system/network blips
      const blips = getTelemetry?.()?.blips || [];
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      for (const b of blips) {
        if (mode === 'processes' && b.category !== 'proc') continue;
        if (mode === 'network' && b.category !== 'net') continue;

        let diff = sweepAngle - b.angle;
        while (diff < 0) diff += Math.PI * 2;
        const ageFactor = Math.pow(decay, diff * 2.2);
        const bx = cx + Math.cos(b.angle) * (b.distance * radius);
        const by = cy + Math.sin(b.angle) * (b.distance * radius);

        ctx.globalAlpha = Math.max(0.15, Math.min(1, ageFactor));
        ctx.fillStyle = b.category === 'net' ? '#38bdf8' : color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = ctx.fillStyle;
        ctx.beginPath();
        ctx.arc(bx, by, 4 + b.load * 3, 0, Math.PI * 2);
        ctx.fill();

        if (ageFactor > 0.32) {
          ctx.fillText(b.label, bx + 10, by - 4);
          ctx.globalAlpha *= 0.75;
          ctx.fillText(b.subLabel, bx + 10, by + 11);
        }
      }
      ctx.restore();
    }
  };
}
