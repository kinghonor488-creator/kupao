// 大厅、弹窗、输入、主循环
(function () {
  'use strict';
  const { W, H } = KP; const A = KP.art;
  const $ = s => document.querySelector(s);
  const stage = $('#stage'), cv = $('#game');
  const game = new KP.Game(cv);

  // ---------- 存档 ----------
  const DEF = { best: {}, coins: 0, sel: { char: 'afei', mount: 'unicorn', mode: 'classic' }, muted: false };
  let store;
  try { store = Object.assign({}, DEF, JSON.parse(localStorage.getItem('kp_save') || '{}')); } catch (e) { store = Object.assign({}, DEF); }
  store.sel = Object.assign({}, DEF.sel, store.sel); store.best = store.best || {};
  const save = () => { try { localStorage.setItem('kp_save', JSON.stringify(store)); } catch (e) { } };
  KP.audio.setMuted(!!store.muted);

  let state = 'lobby'; // lobby | play | pause | result

  // ---------- 适配屏幕 ----------
  let lastKey = '';
  function fit() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const s = Math.min(vw / W, vh / H), dpr = Math.min(2, window.devicePixelRatio || 1);
    const key = vw + 'x' + vh + 'x' + dpr;
    if (key === lastKey) return;
    lastKey = key;
    stage.style.transform = `translate(${(vw - W * s) / 2}px, ${(vh - H * s) / 2}px) scale(${s})`;
    cv.width = Math.round(W * s * dpr); cv.height = Math.round(H * s * dpr);
    game.k = s * dpr;
    const pv = $('#pv'); pv.width = Math.round(500 * s * dpr); pv.height = Math.round(380 * s * dpr); pvK = s * dpr;
  }
  let pvK = 1;

  // ---------- 大厅 ----------
  function card(row, html, onClick, sel) {
    const d = document.createElement('button'); d.className = 'card' + (sel ? ' sel' : ''); d.innerHTML = html;
    d.addEventListener('click', () => { KP.audio.init(); KP.audio.sfx('click'); onClick(); });
    row.appendChild(d); return d;
  }
  function mini(w, h, draw) {
    const c = document.createElement('canvas'); const k = 2;
    c.width = w * k; c.height = h * k; c.style.width = w + 'px'; c.style.height = h + 'px';
    const x = c.getContext('2d'); x.scale(k, k); draw(x); return c;
  }
  function buildLobby() {
    const cr = $('#charRow'), mr = $('#mountRow'), dr = $('#modeRow');
    cr.innerHTML = ''; mr.innerHTML = ''; dr.innerHTML = '';
    for (const ch of KP.CHARS) {
      const d = card(cr, `<div class="n">${ch.name.split('·')[1]}</div><div class="s">${ch.title}</div>`, () => { store.sel.char = ch.id; save(); buildLobby(); }, store.sel.char === ch.id);
      d.prepend(mini(140, 92, c => {
        c.fillStyle = A.rg(c, 70, 80, 5, 70, [ch.color + 'aa', ch.color + '00']); c.fillRect(0, 0, 140, 100);
        A.drawChar(c, ch.id, 66, 142, { pose: 'idle', time: 1, scale: 1.05 });
      }));
    }
    for (const m of KP.MOUNTS) {
      const d = card(mr, `<div class="n">${m.name}</div><div class="s">${m.desc.split(' · ')[1] || '无加成'}</div>`, () => { store.sel.mount = m.id; save(); buildLobby(); }, store.sel.mount === m.id);
      d.prepend(mini(140, 62, c => {
        if (m.id === 'none') {
          c.font = '40px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('🚶', 70, 32);
        } else {
          A.drawMount(c, m.id, m.id === 'wheel' ? 70 : 62, m.id === 'wheel' ? 46 : 64, { time: 1, t: 0.5, scale: m.id === 'wheel' ? 1.3 : 0.5 });
        }
      }));
    }
    for (const md of KP.MODES) {
      const b = store.best[md.id] || 0;
      const d = card(dr, `<div class="ic">${md.icon}</div><div class="n fun">${md.name}</div><div class="s">${md.desc}</div><div class="best">最佳 ${b}</div>`,
        () => { store.sel.mode = md.id; save(); buildLobby(); }, store.sel.mode === md.id);
      d.classList.add('mode');
    }
    const ch = KP.CHARS.find(c => c.id === store.sel.char), mt = KP.MOUNTS.find(m => m.id === store.sel.mount);
    $('#cName').innerHTML = `${ch.name} <span>${ch.title}</span>`;
    $('#cSkill').innerHTML = `<div><span class="t">技能 · ${ch.skill.name}</span>：${ch.skill.desc}</div>
      <div><span class="t">天赋</span>：${ch.passive}</div>
      <div><span class="m">坐骑 · ${mt.name}</span>：${mt.desc}</div>`;
    $('#totalCoins').textContent = store.coins;
    $('#btnMute').textContent = store.muted ? '🔇' : '🔊';
  }

  // 大厅预览动画
  let pvTime = 0;
  function drawPreview(dt) {
    pvTime += dt;
    const c = $('#pv').getContext('2d');
    c.setTransform(pvK, 0, 0, pvK, 0, 0);
    c.clearRect(0, 0, 500, 380);
    const ch = KP.CHARS.find(x => x.id === store.sel.char), mid = store.sel.mount;
    c.fillStyle = A.rg(c, 250, 240, 20, 260, [ch.color + '88', ch.color + '00']); c.fillRect(0, 0, 500, 380);
    c.save(); c.translate(250, 330); c.rotate(pvTime * 0.3);
    c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 10;
    for (let i = 0; i < 12; i++) { c.rotate(Math.PI / 6); c.beginPath(); c.moveTo(60, 0); c.lineTo(400, 0); c.stroke(); }
    c.restore();
    A.ell(c, 250, 330, 160, 30); c.fillStyle = 'rgba(0,0,0,.3)'; c.fill();
    A.ell(c, 250, 322, 150, 26); c.fillStyle = A.lg(c, 0, 296, 0, 348, ['#8a6cff', '#4a2a9a']); c.fill();
    c.lineWidth = 3; c.strokeStyle = A.OL; c.stroke();
    const t = pvTime * 13, s = 1.9;
    c.save(); c.translate(240, 326); c.scale(s, s);
    if (mid !== 'none') {
      const mo = { t, time: pvTime };
      A.drawMount(c, mid, 0, 0, mo);
      const sd = A.saddle(mid, mo);
      if (sd.stand) A.drawChar(c, ch.id, sd.x, sd.y, { pose: 'stand', t, time: pvTime });
      else A.drawChar(c, ch.id, sd.x, sd.y + 32, { pose: 'ride', t, time: pvTime });
    } else A.drawChar(c, ch.id, 0, 0, { pose: 'run', t, time: pvTime });
    c.restore();
    for (let i = 0; i < 14; i++) {
      const a = A.hash(i) * 6.28 + pvTime * (0.3 + A.hash(i + 9)), r = 150 + A.hash(i + 3) * 70;
      c.globalAlpha = 0.5 + 0.5 * Math.sin(pvTime * 3 + i);
      A.star(c, 250 + Math.cos(a) * r, 200 + Math.sin(a) * r * 0.5, 6, 2.6, 5, pvTime);
      c.fillStyle = i % 2 ? '#ffe14d' : '#fff'; c.fill();
    }
    c.globalAlpha = 1;
  }

  // 大厅背景：缓慢滚动的场景
  let bgCam = 0;
  function drawLobbyBG(dt) {
    bgCam += dt * 120;
    const c = cv.getContext('2d');
    c.setTransform(game.k, 0, 0, game.k, 0, 0);
    const theme = KP.MODES.find(m => m.id === store.sel.mode).theme;
    A.drawBG(c, theme, bgCam, pvTime);
    A.drawGround(c, theme, bgCam, [], pvTime);
  }

  // ---------- 流程 ----------
  function show(id, on) { $(id).classList.toggle('hidden', !on); }
  function startGame() {
    KP.audio.init();
    state = 'play';
    show('#lobby', false); show('#pauseM', false); show('#resultM', false); show('#hud', true);
    const ch = KP.CHARS.find(c => c.id === store.sel.char);
    $('#skName').textContent = ch.skill.name;
    $('#btnSkill .core').style.background = `radial-gradient(circle at 35% 30%, #fff8, ${ch.color} 60%)`;
    game.start({ mode: store.sel.mode, char: store.sel.char, mount: store.sel.mount });
  }
  function toLobby() {
    state = 'lobby'; game.running = false; KP.audio.stopMusic(); KP.audio.resume();
    show('#lobby', true); show('#pauseM', false); show('#resultM', false); show('#hud', false);
    buildLobby();
  }
  function pause(on) {
    if (on && state !== 'play') return;
    if (!on && state !== 'pause') return;
    state = on ? 'pause' : 'play'; game.paused = on;
    show('#pauseM', on);
    if (on) KP.audio.pause(); else KP.audio.resume();
  }
  game.onEnd = res => {
    state = 'result';
    const prev = store.best[res.mode] || 0, rec = res.score > prev;
    if (rec) store.best[res.mode] = res.score;
    store.coins += res.coins; save();
    const titles = { 1: '🏆 冠军！', 2: '🥈 第 2 名', 3: '🥉 第 3 名', 4: '第 4 名' };
    $('#rTitle').innerHTML = res.rank != null ? (res.rank ? titles[res.rank] : '比赛中断') : '游戏结束';
    $('#rScore').innerHTML = res.score + (rec ? '<span class="newrec">新纪录</span>' : '');
    $('#rDist').textContent = res.dist + ' 米';
    $('#rCoins').textContent = res.coins;
    $('#rSmash').textContent = res.smashed;
    $('#rBest').textContent = Math.max(prev, res.score);
    show('#hud', false); show('#resultM', true);
  };

  $('#startBtn').addEventListener('click', startGame);
  $('#btnMute').addEventListener('click', () => { KP.audio.init(); store.muted = !store.muted; KP.audio.setMuted(store.muted); save(); buildLobby(); });
  $('#btnPause').addEventListener('click', () => pause(true));
  $('#bResume').addEventListener('click', () => pause(false));
  $('#bRestart').addEventListener('click', () => { KP.audio.resume(); startGame(); });
  $('#bHome').addEventListener('click', toLobby);
  $('#bAgain').addEventListener('click', startGame);
  $('#bHome2').addEventListener('click', toLobby);
  $('#btnSkill').addEventListener('pointerdown', e => { e.stopPropagation(); game.useSkill(); });

  // ---------- 键盘 ----------
  const JUMP = ['Space', 'ArrowUp', 'KeyW', 'KeyK'], SLIDE = ['ArrowDown', 'KeyS', 'KeyJ'];
  window.addEventListener('keydown', e => {
    if (JUMP.includes(e.code) || SLIDE.includes(e.code)) e.preventDefault();
    if (state === 'lobby') { if (e.code === 'Enter' || e.code === 'Space') startGame(); return; }
    if (state === 'result') { if (e.repeat) return; if (e.code === 'Enter' || e.code === 'Space') startGame(); else if (e.code === 'Escape') toLobby(); return; }
    if (e.code === 'Escape' || e.code === 'KeyP') { pause(state === 'play'); return; }
    if (state !== 'play' || e.repeat) return;
    if (JUMP.includes(e.code)) game.jump(true);
    else if (SLIDE.includes(e.code)) game.slide(true);
    else if (e.code === 'KeyE' || e.code === 'KeyL') game.useSkill();
  });
  window.addEventListener('keyup', e => {
    if (JUMP.includes(e.code)) game.jump(false);
    else if (SLIDE.includes(e.code)) game.slide(false);
  });
  window.addEventListener('blur', () => { game.jump(false); game.slide(false); pause(true); });

  // ---------- 触屏/鼠标：左半屏下滑，右半屏跳跃 ----------
  const ptrs = new Map();
  stage.addEventListener('pointerdown', e => {
    if (state !== 'play' || e.target.closest('#btnPause,#btnSkill')) return;
    if (e.pointerType === 'touch') stage.classList.add('touch');
    const r = stage.getBoundingClientRect();
    const side = (e.clientX - r.left) / r.width < 0.5 ? 'slide' : 'jump';
    ptrs.set(e.pointerId, side);
    if (side === 'jump') game.jump(true); else game.slide(true);
  });
  const up = e => {
    const side = ptrs.get(e.pointerId); if (!side) return;
    ptrs.delete(e.pointerId);
    if (![...ptrs.values()].includes(side)) { if (side === 'jump') game.jump(false); else game.slide(false); }
  };
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
  if ('ontouchstart' in window) stage.classList.add('touch');

  // ---------- HUD 技能按钮 ----------
  let lastPct = -1;
  function updHud() {
    if (state !== 'play' || !game.p) return;
    const pct = Math.floor(game.p.energy);
    if (pct === lastPct) return;
    lastPct = pct;
    const ch = game.ch;
    $('#btnSkill .ring').style.background = `conic-gradient(${pct >= 100 ? '#ffe14d' : ch.color} ${pct * 3.6}deg, rgba(30,14,60,.6) 0)`;
    $('#skPct').textContent = pct >= 100 ? '就绪！' : pct + '%';
    $('#btnSkill').classList.toggle('ready', pct >= 100);
  }

  // ---------- 主循环 ----------
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    fit();
    if (state === 'lobby') { drawLobbyBG(dt); drawPreview(dt); }
    else {
      if (state === 'play') game.update(dt);
      game.render();
      updHud();
    }
    requestAnimationFrame(loop);
  }
  buildLobby();
  requestAnimationFrame(loop);
  KP.ui = { game, startGame, toLobby, store };
})();
