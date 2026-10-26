// 大厅、面板、抽奖、签到、结算、输入、主循环
(function () {
  'use strict';
  const { W, H } = KP; const A = KP.art; const S = KP.save;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const stage = $('#stage'), cv = $('#game');
  const game = new KP.Game(cv);
  const P = () => S.p;
  KP.audio.setMuted(!!P().muted);

  // 装备的东西必须已拥有
  (function fixEquip() {
    const e = P().equip;
    if (!P().chars[e.char]) e.char = 'afei';
    if (!P().mounts[e.mount]) e.mount = 'none';
    if (!P().pets[e.pet]) e.pet = 'none';
    e.treasures = (e.treasures || [null, null, null]).map(id => id && P().treasures[id] ? id : null);
    S.write();
  })();

  let state = 'hall'; // hall | play | pause | result
  let view = null;    // null | chars | mounts | pets | treasures | gacha
  let selId = null, uiTime = 0;

  const LIST = { chars: KP.CHARS, mounts: KP.MOUNTS, pets: KP.PETS, treasures: KP.TREASURES };
  const TITLE = { chars: '角色', mounts: '坐骑', pets: '宠物', treasures: '宝物' };
  const equipped = kind => ({ chars: P().equip.char, mounts: P().equip.mount, pets: P().equip.pet }[kind]);
  const fmt = n => n >= 100000 ? (n / 10000).toFixed(1) + '万' : String(n);
  const priceTxt = c => c.coin ? '🪙 ' + c.coin : '💎 ' + c.dia;
  const rarHtml = r => `<span class="rar ${r}">${r}</span>`;
  const skillText = ch => { const s = KP.SKILLS[ch.skill.type]; return (ch.skill.type === 'shock' ? '' : s.dur) + s.desc; };

  // ---------- 屏幕适配 ----------
  let lastKey = '', K = 1;
  const subCanvases = [['#pv', 430, 250], ['#gcv', 720, 612]];
  function fit() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const s = Math.min(vw / W, vh / H), dpr = Math.min(2, window.devicePixelRatio || 1);
    const key = vw + 'x' + vh + 'x' + dpr;
    if (key === lastKey) return;
    lastKey = key;
    stage.style.width = W + 'px';
    stage.style.transform = `translate(${(vw - W * s) / 2}px, ${(vh - H * s) / 2}px) scale(${s})`;
    cv.width = Math.round(W * s * dpr); cv.height = Math.round(H * s * dpr);
    game.k = K = s * dpr;
    for (const [id, w, h] of subCanvases) { const c = $(id); c.width = Math.round(w * K); c.height = Math.round(h * K); }
  }

  // ---------- 通用 ----------
  function refreshCurrency() {
    $$('.vCoin').forEach(e => e.textContent = fmt(P().coins));
    $$('.vDia').forEach(e => e.textContent = fmt(P().diamonds));
  }
  let toastT = null;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 1600);
  }
  function click() { KP.audio.init(); KP.audio.sfx('click'); }
  function mini(w, h, draw) {
    const c = document.createElement('canvas'); const k = 2;
    c.width = w * k; c.height = h * k; c.style.width = w + 'px'; c.style.height = h + 'px';
    const x = c.getContext('2d'); x.scale(k, k); draw(x); return c;
  }
  function drawThumb(c, kind, item, w, h, time) {
    const col = KP.RARITY[item.rarity].color;
    c.fillStyle = A.rg(c, w / 2, h * 0.65, 4, w * 0.7, [col + 'aa', col + '00']); c.fillRect(0, 0, w, h);
    if (kind === 'chars') { const s = h / 88; A.drawChar(c, item.id, w / 2 - 4 * s, h + 50 * s, { pose: 'idle', time, scale: s }); }
    else if (kind === 'mounts') {
      if (item.id === 'none') { c.font = `${h * 0.5}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('🚶', w / 2, h / 2); return; }
      const st = A.saddle(item.id, { time }).stand;
      if (st) { const s = Math.min(w / 125, h / 62); A.drawMount(c, item.id, w / 2, h / 2 + 20 * s, { time, t: 0.5, scale: s }); }
      else { const s = Math.min(w / 175, h / 150); A.drawMount(c, item.id, w / 2 - 8 * s, h / 2 + 64 * s, { time, t: 0.5, scale: s }); }
    } else if (kind === 'pets') {
      if (item.id === 'none') { c.font = `${h * 0.45}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('✖', w / 2, h / 2); return; }
      A.drawPet(c, item.id, w / 2, h / 2, time, h / 42);
    }
  }

  // ---------- 大厅 ----------
  function buildHall() {
    refreshCurrency();
    const e = P().equip, ch = KP.charOf(e.char), mt = KP.mountOf(e.mount), pt = KP.petOf(e.pet);
    const lvC = S.level('chars', e.char), lvM = S.level('mounts', e.mount), lvP = S.level('pets', e.pet);
    $('#iChar').innerHTML = `<h4 class="fun">${rarHtml(ch.rarity)} ${ch.name} <span class="hl">Lv${lvC}</span></h4>
      <div>技能：<span class="hl">${ch.skill.name}</span></div><div>跳跃 <span class="hl">${ch.jumps}</span> 段 · 滑翔 <span class="hl">${ch.glides}</span> 段</div><div>道具持续 <span class="hl">+${KP.levelItemPct(lvC)}%</span> · ${ch.passive}</div>`;
    $('#iMount').innerHTML = `<h4 class="fun">${rarHtml(mt.rarity)} ${mt.name}${mt.id === 'none' ? '' : ` <span class="hl">Lv${lvM}</span>`}</h4>
      <div>分数 <span class="hl">+${Math.round(mt.bonus * 100)}%</span>${mt.id === 'none' ? '' : ` · 道具持续 <span class="hl">+${KP.levelItemPct(lvM)}%</span>`}</div><div>${KP.MOUNT_ABIL[mt.ability]}</div>`;
    $('#iPet').innerHTML = `<h4 class="fun">${rarHtml(pt.rarity)} ${pt.name}${pt.id === 'none' ? '' : ` <span class="hl">Lv${lvP}</span>`}</h4><div>${KP.petDesc(pt, lvP)}</div>`;
    $('#iTre').innerHTML = `<h4 class="fun">宝物</h4><div class="tslots">${e.treasures.map(id => {
      if (!id) return '<div class="tslot"></div>';
      const t = KP.treasureOf(id); return `<div class="tslot on">${t.icon}<small>Lv${P().treasures[id]}</small></div>`;
    }).join('')}</div>`;
    $('#modes').innerHTML = KP.MODES.map(m => `<button class="mode fun ${P().mode === m.id ? 'sel' : ''}" data-mode="${m.id}"><span class="i">${m.icon}</span>${m.name}</button>`).join('');
    const md = KP.MODES.find(m => m.id === P().mode);
    $('#mDesc').textContent = md.desc;
    $('#mBest').textContent = '最佳 ' + (P().best[md.id] || 0);
    $('#btnMute').textContent = P().muted ? '🔇' : '🔊';
    $('#openSign').classList.toggle('dot', S.canSign());
    $('#openGacha').classList.toggle('dot', S.freeDrawReady());
  }
  $('#modes').addEventListener('click', e => {
    const b = e.target.closest('[data-mode]'); if (!b) return;
    click(); P().mode = b.dataset.mode; S.write(); buildHall();
  });

  function drawShowcase(c, x, y, s, time, pose) {
    const e = P().equip;
    c.save(); c.translate(x, y); c.scale(s, s);
    const t = time * 13;
    if (e.mount !== 'none') {
      const mo = { t, time };
      A.drawMount(c, e.mount, 0, 0, mo);
      const sd = A.saddle(e.mount, mo);
      if (sd.stand) A.drawChar(c, e.char, sd.x, sd.y, { pose: 'stand', t, time });
      else A.drawChar(c, e.char, sd.x, sd.y + 32, { pose: 'ride', t, time });
    } else A.drawChar(c, e.char, 0, 0, { pose: pose || 'run', t, time });
    c.restore();
  }
  let bgCam = 0;
  function drawHall(dt) {
    bgCam += dt * 90;
    const c = cv.getContext('2d');
    c.setTransform(K, 0, 0, K, 0, 0);
    const theme = KP.MODES.find(m => m.id === P().mode).theme;
    A.drawBG(c, theme, bgCam, uiTime);
    A.drawGround(c, theme, bgCam, [], uiTime);
    c.fillStyle = 'rgba(20,8,48,.25)'; c.fillRect(0, 0, W, H);
    // 聚光灯 + 旋转光束
    const ch = KP.charOf(P().equip.char);
    c.save(); c.translate((W - 1280) / 2, 0);
    c.fillStyle = A.rg(c, 600, 430, 20, 330, [ch.color + '88', ch.color + '00']); c.fillRect(200, 80, 800, 600);
    c.save(); c.translate(600, 520); c.rotate(uiTime * 0.25);
    c.strokeStyle = 'rgba(255,255,255,.08)'; c.lineWidth = 16;
    for (let i = 0; i < 12; i++) { c.rotate(Math.PI / 6); c.beginPath(); c.moveTo(80, 0); c.lineTo(520, 0); c.stroke(); }
    c.restore();
    A.ell(c, 600, 540, 200, 36); c.fillStyle = 'rgba(0,0,0,.35)'; c.fill();
    A.ell(c, 600, 530, 186, 32); c.fillStyle = A.lg(c, 0, 498, 0, 562, ['#9a7cff', '#4a2a9a']); c.fill();
    c.lineWidth = 4; c.strokeStyle = A.OL; c.stroke();
    A.ell(c, 600, 524, 150, 22); c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 3; c.stroke();
    drawShowcase(c, 590, 532, 2.0, uiTime);
    if (P().equip.pet !== 'none') A.drawPet(c, P().equip.pet, 420, 330, uiTime, 2.2);
    for (let i = 0; i < 16; i++) {
      const a = A.hash(i) * 6.28 + uiTime * (0.2 + A.hash(i + 9) * 0.3), r = 230 + A.hash(i + 3) * 90;
      c.globalAlpha = 0.4 + 0.5 * Math.sin(uiTime * 3 + i);
      A.star(c, 600 + Math.cos(a) * r, 360 + Math.sin(a) * r * 0.45, 7, 3, 5, uiTime);
      c.fillStyle = i % 2 ? '#ffe14d' : '#fff'; c.fill();
    }
    c.globalAlpha = 1;
    c.restore();
  }

  // ---------- 角色/坐骑/宠物/宝物 面板 ----------
  function openPanel(kind) {
    click();
    view = kind;
    selId = kind === 'treasures' ? (P().equip.treasures.find(Boolean) || KP.TREASURES[0].id) : equipped(kind);
    $('#pTitle').textContent = TITLE[kind];
    $('#hall').classList.add('hidden'); $('#gacha').classList.add('hidden'); $('#panel').classList.remove('hidden');
    buildGrid(); showDetail();
    $('.gridwrap').scrollTop = 0;
  }
  function closeView() {
    click(); view = null;
    $('#panel').classList.add('hidden'); $('#gacha').classList.add('hidden'); $('#hall').classList.remove('hidden');
    buildHall();
  }
  function buildGrid() {
    const kind = view, grid = $('#grid');
    refreshCurrency();
    grid.innerHTML = '';
    const tRow = $('#tRow');
    if (kind === 'treasures') {
      tRow.classList.remove('hidden');
      tRow.innerHTML = '<span>装备栏</span>' + P().equip.treasures.map((id, i) => {
        if (!id) return '<div class="tslot" title="空"></div>';
        const t = KP.treasureOf(id); return `<div class="tslot on" data-tid="${id}">${t.icon}<small>Lv${P().treasures[id]}</small></div>`;
      }).join('') + '<span style="margin-left:8px">最多装备 3 件宝物，点击装备栏可卸下</span>';
    } else tRow.classList.add('hidden');
    for (const item of LIST[kind]) {
      const owned = S.owns(kind, item.id);
      const d = document.createElement('button');
      d.className = `card ${item.rarity} ${owned ? '' : 'lock'} ${item.id === selId ? 'sel' : ''}`;
      d.dataset.id = item.id;
      let status;
      const isEq = kind === 'treasures' ? P().equip.treasures.includes(item.id) : equipped(kind) === item.id;
      if (isEq) status = `<span class="tag">${kind === 'chars' ? '出战' : '装备中'}</span>`;
      else status = '';
      const price = owned ? '<div class="price" style="color:#9fe6b0">已拥有</div>'
        : `<div class="price ${S.priceOf(kind, item).dia ? 'd' : ''}">${priceTxt(S.priceOf(kind, item))}</div>`;
      d.innerHTML = `${rarHtml(item.rarity)}${status}<div class="n">${item.name.split('·').pop()}</div>${price}`;
      if (kind === 'treasures') {
        const ic = document.createElement('div'); ic.className = 'ticon'; ic.textContent = item.icon; d.prepend(ic);
        if (owned) d.insertAdjacentHTML('beforeend', `<span class="lv">Lv${P().treasures[item.id]}</span>`);
      } else {
        d.prepend(mini(132, 92, c => drawThumb(c, kind, item, 132, 92, 1)));
        if (owned && item.id !== 'none') d.insertAdjacentHTML('beforeend', `<span class="lv">Lv${S.level(kind, item.id)}</span>`);
      }
      grid.appendChild(d);
    }
  }
  $('#grid').addEventListener('click', e => {
    const b = e.target.closest('.card'); if (!b) return;
    click(); selId = b.dataset.id;
    $$('#grid .card').forEach(x => x.classList.toggle('sel', x === b));
    showDetail();
  });
  $('#tRow').addEventListener('click', e => {
    const s = e.target.closest('[data-tid]'); if (!s) return;
    click(); S.toggleTreasure(s.dataset.tid); selId = s.dataset.tid; buildGrid(); showDetail();
  });

  function showDetail() {
    const kind = view, item = LIST[kind].find(x => x.id === selId) || LIST[kind][0];
    selId = item.id;
    const owned = S.owns(kind, item.id);
    $('#dName').innerHTML = `${item.name} ${rarHtml(item.rarity)}`;
    const stats = [], acts = [];
    let sub = '', desc = '';
    if (kind === 'chars') {
      sub = item.title;
      const lv = S.level('chars', item.id);
      stats.push(['跳跃', item.jumps + ' 段'], ['滑翔', item.glides + ' 段'], ['等级', lv ? lv + '/' + KP.LEVEL_MAX : '—'], ['道具持续', '+' + KP.levelItemPct(lv || 1) + '%']);
      desc = `<div><span class="k">技能 · ${item.skill.name}</span>：${skillText(item)}</div><div><span class="k">天赋</span>：${item.passive}</div>
        <div><span class="k">升级</span>：每升一级，所有道具持续时间 +${KP.LEVEL_ITEM_PCT}%</div>
        <div style="opacity:.75;margin-top:4px">滑翔：下落时轻按跳跃键是多段跳，按住约 0.15 秒就开始滑翔，每段最长 1.2 秒</div>`;
    } else if (kind === 'mounts') {
      sub = item.id === 'none' ? '不骑坐骑' : '被撞时坐骑会替你挡下一次';
      const lv = S.level('mounts', item.id);
      stats.push(['分数加成', '+' + Math.round(item.bonus * 100) + '%']);
      if (item.id !== 'none') stats.push(['等级', lv ? lv + '/' + KP.LEVEL_MAX : '—'], ['道具持续', '+' + KP.levelItemPct(lv || 1) + '%']);
      desc = `<div><span class="k">特殊能力</span>：${KP.MOUNT_ABIL[item.ability]}</div>` +
        (item.id === 'none' ? '' : `<div><span class="k">升级</span>：每升一级，所有道具持续时间 +${KP.LEVEL_ITEM_PCT}%</div>`) +
        `<div style="opacity:.75">坐骑在游戏中被撞掉后，可拾取“坐骑召回”道具重新骑上</div>`;
    } else if (kind === 'pets') {
      sub = '跟随你一起奔跑';
      const lv = S.level('pets', item.id);
      stats.push(['跳跃', item.jump ? '+' + item.jump : '—'], ['滑翔', item.glide ? '+' + item.glide : '—']);
      if (item.id !== 'none') stats.push(['等级', lv ? lv + '/' + KP.LEVEL_MAX : '—']);
      desc = `<div><span class="k">宠物能力</span>：${KP.petDesc(item, lv || 1)}</div>` +
        (item.id !== 'none' && lv && lv < KP.LEVEL_MAX ? `<div style="opacity:.8">下一级：${KP.petDesc(item, lv + 1)}</div>` : '') +
        (item.id === 'none' ? '' : '<div style="opacity:.75">每升一级，宠物能力增强 10%</div>');
    } else {
      const lv = P().treasures[item.id] || 0;
      sub = '装备后在每局游戏中生效';
      stats.push(['等级', lv ? 'Lv' + lv : '未拥有'], ['当前', lv ? item.fmt.replace('{v}', item.vals[lv - 1]) : '—']);
      desc = item.vals.map((v, i) => `<div style="${i + 1 === lv ? 'color:#ffd24a' : ''}">Lv${i + 1}：${item.fmt.replace('{v}', v)}</div>`).join('');
    }
    $('#dSub').textContent = sub;
    $('#dStats').innerHTML = stats.map(([k, v]) => `<div class="stat">${k}<b class="fun">${v}</b></div>`).join('');
    $('#dDesc').innerHTML = desc;
    // 按钮
    const actBox = $('#dActs'); actBox.innerHTML = '';
    const addBtn = (label, cls, fn, disabled) => {
      const b = document.createElement('button'); b.className = 'btn fun ' + (cls || ''); b.innerHTML = label;
      b.disabled = !!disabled; b.onclick = () => { click(); fn(); }; actBox.appendChild(b);
    };
    if (!owned) {
      const price = S.priceOf(kind, item);
      addBtn('购买 ' + priceTxt(price), 'primary', () => {
        if (S.buy(kind, item)) { KP.audio.sfx('item'); toast('获得 ' + item.name + '！'); buildGrid(); showDetail(); }
        else toast(price.coin ? '金币不足' : '钻石不足');
      }, !S.canPay(price));
      addBtn('去抽奖', 'purple', openGacha);
    } else if (kind === 'treasures') {
      const on = P().equip.treasures.includes(item.id);
      addBtn(on ? '卸下' : '装备', on ? 'gray' : 'primary', () => {
        const r = S.toggleTreasure(item.id);
        if (r === 'full') toast('装备栏已满，先卸下一件'); else toast(r === 'on' ? '已装备' : '已卸下');
        buildGrid(); showDetail();
      });
      const cost = S.upgradeCost(item.id);
      addBtn(cost == null ? '已满级' : '升级 🪙 ' + cost, '', () => {
        if (S.upgrade(item.id)) { KP.audio.sfx('item'); toast(item.name + ' 升到 Lv' + P().treasures[item.id] + '！'); buildGrid(); showDetail(); }
        else toast('金币不足');
      }, cost == null || P().coins < cost);
    } else {
      const isEq = equipped(kind) === item.id;
      addBtn(isEq ? (kind === 'chars' ? '出战中' : '已装备') : (kind === 'chars' ? '出战' : '装备'), 'primary', () => {
        S.equip(kind, item.id); toast('已更换为 ' + item.name); buildGrid(); showDetail();
      }, isEq);
      if (item.id !== 'none') {
        const cost = S.levelCost(kind, item.id);
        addBtn(cost == null ? '已满级' : '升级 🪙 ' + cost, '', () => {
          if (S.levelUp(kind, item.id)) { KP.audio.sfx('item'); toast(item.name + ' 升到 Lv' + S.level(kind, item.id) + '！'); buildGrid(); showDetail(); }
          else toast('金币不足');
        }, cost == null || P().coins < cost);
      }
    }
    refreshCurrency();
  }

  function drawPanelPreview() {
    const c = $('#pv').getContext('2d');
    c.setTransform(K, 0, 0, K, 0, 0);
    c.clearRect(0, 0, 430, 250);
    const item = LIST[view].find(x => x.id === selId); if (!item) return;
    const col = KP.RARITY[item.rarity].color;
    c.fillStyle = A.rg(c, 215, 170, 10, 260, [col + 'aa', col + '00']); c.fillRect(0, 0, 430, 250);
    c.save(); c.translate(215, 215); c.rotate(uiTime * 0.3);
    c.strokeStyle = 'rgba(255,255,255,.1)'; c.lineWidth = 12;
    for (let i = 0; i < 12; i++) { c.rotate(Math.PI / 6); c.beginPath(); c.moveTo(40, 0); c.lineTo(320, 0); c.stroke(); }
    c.restore();
    A.ell(c, 215, 222, 130, 20); c.fillStyle = 'rgba(0,0,0,.3)'; c.fill();
    const t = uiTime * 13;
    if (view === 'chars') A.drawChar(c, item.id, 205, 222, { pose: 'run', t, time: uiTime, scale: 1.45 });
    else if (view === 'mounts') {
      if (item.id === 'none') A.drawChar(c, P().equip.char, 205, 222, { pose: 'run', t, time: uiTime, scale: 1.45 });
      else {
        c.save(); c.translate(205, 222); c.scale(1.25, 1.25);
        const mo = { t, time: uiTime }; A.drawMount(c, item.id, 0, 0, mo);
        const sd = A.saddle(item.id, mo);
        if (sd.stand) A.drawChar(c, P().equip.char, sd.x, sd.y, { pose: 'stand', t, time: uiTime });
        else A.drawChar(c, P().equip.char, sd.x, sd.y + 32, { pose: 'ride', t, time: uiTime });
        c.restore();
      }
    } else if (view === 'pets') {
      if (item.id !== 'none') A.drawPet(c, item.id, 215, 120, uiTime, 3.4);
    } else {
      c.save(); c.translate(215, 125); c.scale(1 + Math.sin(uiTime * 3) * 0.04, 1 + Math.sin(uiTime * 3) * 0.04);
      c.shadowColor = col; c.shadowBlur = 30;
      c.font = '120px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(item.icon, 0, 0);
      c.restore();
    }
  }

  // ---------- 抽奖 ----------
  let gShake = 0, gBalls = null;
  function openGacha() {
    click(); view = 'gacha';
    $('#hall').classList.add('hidden'); $('#panel').classList.add('hidden'); $('#gacha').classList.remove('hidden');
    const r = KP.GACHA.rates;
    $('#gRates').innerHTML = `<b style="color:#fff">概率</b><br>${rarHtml('SSR')} ${r.SSR}% &nbsp; ${rarHtml('SR')} ${r.SR}% &nbsp; ${rarHtml('R')} ${r.R}% &nbsp; ${rarHtml('N')} ${r.N}%
      <br>奖池包含角色、坐骑、宠物、宝物和金币。<br>重复获得：自动升一级；满级后折算成金币。<br>每 60 抽必出 SSR（当前已 ${P().pity} 抽）。`;
    refreshGacha();
    if (!gBalls) gBalls = Array.from({ length: 26 }, (_, i) => ({ x: 360 + (Math.random() - 0.5) * 300, y: 200 + Math.random() * 120, vx: (Math.random() - 0.5) * 100, vy: 0, c: ['#ff5a8a', '#ffd24a', '#4ab8ff', '#a56bff', '#5ee07a', '#ff8a1f'][i % 6] }));
  }
  function refreshGacha() {
    refreshCurrency();
    $('#gFree').disabled = !S.freeDrawReady();
    $('#gFreeT').textContent = S.freeDrawReady() ? '今日可用' : '明天再来';
    $('#g1').disabled = P().diamonds < KP.GACHA.single;
    $('#g10').disabled = P().diamonds < KP.GACHA.ten;
  }
  function doDraw(n, free) {
    if (gShake > 0) return;
    const res = S.draw(n, free);
    if (!res) { toast('钻石不足'); return; }
    KP.audio.sfx('skill'); gShake = 1.3;
    refreshGacha();
    setTimeout(() => showDrawResult(res), 1300);
  }
  function showDrawResult(res) {
    const g = $('#rGrid'); g.innerHTML = ''; g.classList.toggle('one', res.length === 1);
    res.forEach((r, i) => {
      const d = document.createElement('div'); d.className = `rcard ${r.rarity} ${r.isNew ? 'new' : ''}`;
      let name, sub, cnv;
      if (r.kind === 'coin') {
        name = '金币 ×' + r.amount; sub = '已存入';
        cnv = mini(150, 104, c => { c.save(); c.translate(75, 52); c.scale(2.6, 2.6); A.drawCoin(c, 0, 0, 0); c.restore(); });
      } else {
        name = r.item.name.split('·').pop();
        sub = { chars: '角色', mounts: '坐骑', pets: '宠物', treasures: '宝物' }[r.kind] + ' · ' +
          (r.isNew ? '新获得！' : r.levelUp ? '升到 Lv' + r.levelUp : '重复 → 🪙' + r.dupe);
        if (r.kind === 'treasures') cnv = mini(150, 104, c => { c.font = '68px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(r.item.icon, 75, 54); });
        else cnv = mini(150, 104, c => drawThumb(c, r.kind, r.item, 150, 104, 1));
      }
      d.innerHTML = `${rarHtml(r.rarity)}<div class="n">${name}</div><div class="s">${sub}</div>`;
      d.prepend(cnv);
      g.appendChild(d);
      setTimeout(() => { d.classList.add('show'); if (r.rarity === 'SSR' || r.rarity === 'SR') KP.audio.sfx('item'); else KP.audio.sfx('coin', i); }, 150 + i * 160);
    });
    $('#drawM').classList.remove('hidden');
  }
  function drawGacha(dt) {
    const c = $('#gcv').getContext('2d');
    c.setTransform(K, 0, 0, K, 0, 0); c.clearRect(0, 0, 720, 612);
    gShake = Math.max(0, gShake - dt);
    const sh = gShake > 0 ? Math.sin(uiTime * 60) * 8 * Math.min(1, gShake) : 0;
    c.fillStyle = A.rg(c, 360, 280, 20, 380, ['rgba(255,140,220,.35)', 'rgba(255,140,220,0)']); c.fillRect(0, 0, 720, 612);
    c.save(); c.translate(360 + sh, 0);
    // 底座
    A.rr(c, -170, 380, 340, 190, 30); A.fs(c, A.lg(c, 0, 380, 0, 570, ['#ff6a9a', '#c0306a']), 4);
    A.rr(c, -120, 420, 240, 60, 20); A.fs(c, '#2a1838', 3);
    c.font = '900 34px "ZCOOL KuaiLe",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#ffe14d'; c.fillText('幸运扭蛋', 0, 452);
    c.beginPath(); c.arc(0, 520, 30, 0, Math.PI * 2); A.fs(c, A.lg(c, 0, 490, 0, 550, ['#ffe14d', '#ff8a1f']), 4);
    c.save(); c.translate(0, 520); c.rotate(gShake > 0 ? uiTime * 10 : 0); c.fillStyle = '#2a1838'; c.fillRect(-22, -5, 44, 10); c.restore();
    c.restore();
    // 玻璃罩与扭蛋
    c.save(); c.translate(sh, 0);
    c.beginPath(); c.arc(360, 230, 190, 0, Math.PI * 2); c.fillStyle = 'rgba(200,240,255,.15)'; c.fill();
    c.save(); c.beginPath(); c.arc(360, 230, 186, 0, Math.PI * 2); c.clip();
    for (const b of gBalls) {
      b.vy += 900 * dt; if (gShake > 0 && Math.random() < 0.1) { b.vy = -400 - Math.random() * 400; b.vx = (Math.random() - 0.5) * 500; }
      b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= 0.99;
      const dx = b.x - 360, dy = b.y - 230, d = Math.hypot(dx, dy);
      if (d > 160) { const nx = dx / d, ny = dy / d; b.x = 360 + nx * 160; b.y = 230 + ny * 160; const vn = b.vx * nx + b.vy * ny; if (vn > 0) { b.vx -= 1.6 * vn * nx; b.vy -= 1.6 * vn * ny; } }
      c.beginPath(); c.arc(b.x, b.y, 24, 0, Math.PI * 2); A.fs(c, b.c, 3);
      c.beginPath(); c.arc(b.x, b.y, 24, Math.PI, 0); c.fillStyle = 'rgba(255,255,255,.55)'; c.fill();
      c.beginPath(); c.moveTo(b.x - 24, b.y); c.lineTo(b.x + 24, b.y); c.strokeStyle = A.OL; c.lineWidth = 2.5; c.stroke();
    }
    c.restore();
    c.beginPath(); c.arc(360, 230, 190, 0, Math.PI * 2); c.lineWidth = 6; c.strokeStyle = A.OL; c.stroke();
    c.beginPath(); c.arc(360, 230, 170, -2.6, -1.9); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 10; c.lineCap = 'round'; c.stroke();
    c.restore();
  }
  $('#gFree').onclick = () => { click(); doDraw(1, true); };
  $('#g1').onclick = () => { click(); doDraw(1, false); };
  $('#g10').onclick = () => { click(); doDraw(10, false); };
  $('#drawOk').onclick = () => { click(); $('#drawM').classList.add('hidden'); openGacha(); };

  // ---------- 签到 ----------
  function openSign() {
    click();
    const p = P().sign, can = S.canSign();
    const y = new Date(Date.now() - 864e5), yStr = y.getFullYear() + '-' + (y.getMonth() + 1) + '-' + y.getDate();
    const doneDays = can ? (p.last === yStr ? p.streak % 7 : 0) : p.streak;
    const todayIdx = can ? doneDays : p.streak - 1;
    $('#signRow').innerHTML = KP.SIGNIN.map((r, i) => `<div class="sday fun ${i < doneDays ? 'got' : ''} ${i === todayIdx ? 'today' : ''}">
      <div>第 ${i + 1} 天</div><div class="e">${r.dia ? '💎' : '🪙'}</div><div class="a">${r.dia ? r.dia : r.coin}</div></div>`).join('');
    $('#signBtn').disabled = !can; $('#signBtn').textContent = can ? '签到领取' : '今日已签到';
    $('#signM').classList.remove('hidden');
  }
  $('#signBtn').onclick = () => {
    const r = S.signIn(); if (!r) return;
    KP.audio.sfx('item'); toast('签到成功：' + (r.dia ? '💎 ' + r.dia : '🪙 ' + r.coin));
    openSign(); buildHall();
  };
  $('#signClose').onclick = () => { click(); $('#signM').classList.add('hidden'); };

  // ---------- 游戏流程 ----------
  function show(id, on) { $(id).classList.toggle('hidden', !on); }
  function startGame() {
    KP.audio.init();
    state = 'play'; view = null;
    ['#hall', '#panel', '#gacha', '#pauseM', '#resultM', '#signM', '#drawM'].forEach(id => show(id, false));
    show('#hud', true);
    const e = P().equip, ch = KP.charOf(e.char);
    $('#skName').textContent = ch.skill.name;
    $('#btnSkill .core').style.background = `radial-gradient(circle at 35% 30%, #fff8, ${ch.color} 60%)`;
    lastPct = -1;
    game.start({
      mode: P().mode, char: e.char, mount: e.mount, pet: e.pet, tfx: S.treasureFx(),
      levels: { char: S.level('chars', e.char), mount: S.level('mounts', e.mount), pet: S.level('pets', e.pet) }
    });
  }
  function toHall() {
    state = 'hall'; view = null; game.running = false; KP.audio.stopMusic(); KP.audio.resume();
    ['#panel', '#gacha', '#pauseM', '#resultM', '#hud'].forEach(id => show(id, false));
    show('#hall', true); buildHall();
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
    const prev = P().best[res.mode] || 0, rec = res.score > prev;
    if (rec) P().best[res.mode] = res.score;
    P().coins += res.coinsEarned; P().diamonds += res.diaEarned; S.write();
    const titles = { 1: '🏆 冠军！', 2: '🥈 第 2 名', 3: '🥉 第 3 名', 4: '第 4 名' };
    $('#rTitle').innerHTML = res.rank != null ? (res.rank ? titles[res.rank] : '比赛中断') : '游戏结束';
    $('#rScore').innerHTML = res.score + (rec ? '<span class="newrec">新纪录</span>' : '');
    $('#rDist').textContent = res.dist + ' 米';
    $('#rCoins').textContent = '+' + res.coinsEarned;
    $('#rDia').textContent = '+' + res.diaEarned;
    $('#rSmash').textContent = res.smashed;
    $('#rBest').textContent = Math.max(prev, res.score);
    $('#rMode').textContent = KP.MODES.find(m => m.id === res.mode).name;
    show('#hud', false); show('#resultM', true);
  };

  $('#startBtn').addEventListener('click', startGame);
  $('#btnMute').addEventListener('click', () => { KP.audio.init(); P().muted = !P().muted; KP.audio.setMuted(P().muted); S.write(); buildHall(); });
  $$('[data-open]').forEach(b => b.addEventListener('click', () => openPanel(b.dataset.open)));
  $$('[data-close]').forEach(b => b.addEventListener('click', closeView));
  $('#openGacha').addEventListener('click', openGacha);
  $('#openSign').addEventListener('click', openSign);
  $('#btnPause').addEventListener('click', () => pause(true));
  $('#bResume').addEventListener('click', () => pause(false));
  $('#bRestart').addEventListener('click', () => { KP.audio.resume(); startGame(); });
  $('#bHome').addEventListener('click', toHall);
  $('#bAgain').addEventListener('click', startGame);
  $('#bHome2').addEventListener('click', toHall);
  $('#btnSkill').addEventListener('pointerdown', e => { e.stopPropagation(); game.useSkill(); });

  // ---------- 键盘 ----------
  const JUMP = ['Space', 'ArrowUp', 'KeyW', 'KeyK'], SLIDE = ['ArrowDown', 'KeyS', 'KeyJ'];
  const modalOpen = () => ['#signM', '#drawM'].some(id => !$(id).classList.contains('hidden'));
  window.addEventListener('keydown', e => {
    if (JUMP.includes(e.code) || SLIDE.includes(e.code)) e.preventDefault();
    if (state === 'hall') {
      if (e.repeat) return;
      if (e.code === 'Escape') { if (modalOpen()) { $('#signM').classList.add('hidden'); } else if (view) closeView(); return; }
      if ((e.code === 'Enter' || e.code === 'Space') && !view && !modalOpen()) startGame();
      return;
    }
    if (state === 'result') { if (e.repeat) return; if (e.code === 'Enter' || e.code === 'Space') startGame(); else if (e.code === 'Escape') toHall(); return; }
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
    $('#btnSkill .ring').style.background = `conic-gradient(${pct >= 100 ? '#ffe14d' : game.ch.color} ${pct * 3.6}deg, rgba(30,14,60,.6) 0)`;
    $('#skPct').textContent = pct >= 100 ? '就绪！' : pct + '%';
    $('#btnSkill').classList.toggle('ready', pct >= 100);
  }

  // ---------- 主循环 ----------
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    uiTime += dt;
    fit();
    if (state === 'hall') {
      if (view === 'gacha') drawGacha(dt);
      else if (view) drawPanelPreview();
      else drawHall(dt);
    } else {
      if (state === 'play') game.update(dt);
      game.render();
      updHud();
    }
    requestAnimationFrame(loop);
  }
  // ---------- 自动更新：发现新版本时（只在大厅里）刷新一次 ----------
  function checkUpdate() {
    if (!KP.VER || !window.fetch) return;
    fetch('version.json?t=' + Date.now(), { cache: 'no-store' }).then(r => r.json()).then(j => {
      if (!j.v || j.v === KP.VER || state !== 'hall') return;
      let tried = '';
      try { tried = sessionStorage.getItem('kp_reload') || ''; } catch (e) { }
      if (tried === j.v) return; // 同一个版本只尝试刷新一次，避免死循环
      try { sessionStorage.setItem('kp_reload', j.v); } catch (e) { }
      location.replace(location.pathname + '?v=' + j.v);
    }).catch(() => { });
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkUpdate(); });
  setTimeout(checkUpdate, 1500);

  buildHall();
  requestAnimationFrame(loop);
  KP.ui = { game, startGame, toHall, openPanel, openGacha, S };
})();
