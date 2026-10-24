// 游戏核心：物理、关卡生成、碰撞、技能、宠物、宝物、模式、渲染
(function () {
  'use strict';
  const { W, H, G } = KP; const A = KP.art;
  const PX = 300, MPX = 20, GRAV = 3000, JV = 1060, JV2 = 960;
  const RACE_LEN = 2000;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  function weighted(list) {
    let s = 0; for (const [, w] of list) s += Math.max(0, w);
    let r = Math.random() * s;
    for (const [k, w] of list) { r -= Math.max(0, w); if (r <= 0) return k; }
    return list[0][0];
  }

  // 角色天赋
  const PAS = {
    afei: { dashPct: 50 }, mengmeng: { magnetPct: 50 }, tiequan: { startShield: 1 }, xiaoyan: { revive: 1 },
    xiaoying: { scorePct: 5 }, bingbing: { giantPct: 50 }, leiming: { energyPct: 15 }, ali: { coinPct: 10 },
    miaomiao: { magnetPct: 30 }, langlang: { itemPct: 10 }, tuantuan: { startShield: 1 }, luna: { scorePct: 15 },
    luxi: { smashMul: 2 }, jieke: { coinPct: 15 }, yase: { startShield: 1 }, tutu: { lowGrav: 1 },
    bili: { dashPct: 30 }, xingxing: { flyScorePct: 20 }, aoxiao: { coinPct: 15, scorePct: 10 },
    mosheng: { itemRate: 20 }, huahua: { revive: 1 }, wukong: { dashPct: 50, scorePct: 10 }
  };

  class Game {
    constructor(cv) {
      this.cv = cv; this.c = cv.getContext('2d'); this.k = 1;
      this.running = false; this.paused = false; this.jumpHeld = false; this.slideHeld = false;
      this.p = null; this.onEnd = null;
    }

    // 汇总角色天赋、坐骑、宠物、宝物的加成
    buildMods(cfg) {
      const M = {
        coinPct: 0, scorePct: 0, itemPct: 0, dashPct: 0, magnetPct: 0, giantPct: 0, energyPct: 0, itemRate: 0,
        diamondMul: 1, startShield: 0, revive: 0, reviveChance: 0, smashMul: 1, lowGrav: 0, flyScorePct: 0,
        dashStart: 0, magnetStart: 0, startEnergy: 30, beeR: 0
      };
      const add = o => { for (const k in o) M[k] = (M[k] || 0) + o[k]; };
      const P = PAS[cfg.char]; if (P) { add(P); if (P.smashMul) M.smashMul = 1 + P.smashMul; }
      const timers = [];
      const T = cfg.tfx || {};
      for (const k of ['coinPct', 'scorePct', 'itemPct', 'energyPct', 'itemRate', 'reviveChance']) if (T[k]) M[k] += T[k];
      if (T.allPct) { M.coinPct += T.allPct; M.scorePct += T.allPct; }
      if (T.dashStart) M.dashStart = Math.max(M.dashStart, T.dashStart);
      if (T.magnetStart) M.magnetStart = Math.max(M.magnetStart, T.magnetStart);
      if (T.startEnergy) M.startEnergy = Math.max(M.startEnergy, T.startEnergy);
      if (T.diamondPct) M.diamondMul *= 1 + T.diamondPct / 100;
      if (T.guardEvery) timers.push({ kind: 'shield', every: T.guardEvery, cd: T.guardEvery, src: 'treasure' });
      const lv = cfg.levels || {};
      M.itemPct += KP.levelItemPct(lv.char);
      if (cfg.mount && cfg.mount !== 'none') M.itemPct += KP.levelItemPct(lv.mount);
      const mt = KP.mountOf(cfg.mount);
      switch (mt.ability) {
        case 'coin': M.coinPct += 15; break;
        case 'energy': M.energyPct += 25; break;
        case 'dash': M.dashStart = Math.max(M.dashStart, 3); break;
        case 'item': M.itemPct += 30; break;
        case 'diamond': M.diamondMul *= 2; break;
        case 'shield': timers.push({ kind: 'shield', every: 25, cd: 25, src: 'mount' }); break;
        case 'magnet': timers.push({ kind: 'magnet', every: 15, cd: 8, src: 'mount' }); break;
        case 'fire': timers.push({ kind: 'fire', every: 8, cd: 3, src: 'mount' }); break;
      }
      const pv = KP.petVal(KP.petOf(cfg.pet), lv.pet);
      switch (cfg.pet) {
        case 'bee': M.beeR = pv; break;
        case 'fairy': M.energyPct += pv; break;
        case 'owl': M.itemPct += pv; break;
        case 'firedrake': timers.push({ kind: 'fire', every: pv, cd: 5, src: 'pet' }); break;
        case 'starbaby': M.scorePct += pv; break;
        case 'ghost': timers.push({ kind: 'shield', every: pv, cd: pv, src: 'pet' }); break;
        case 'luckycat': M.coinPct += pv; break;
        case 'robot': timers.push({ kind: 'magnet', every: pv, cd: 10, src: 'pet' }); break;
        case 'penguin': M.dashStart = Math.max(M.dashStart, pv); break;
        case 'gembunny': M.diamondMul *= pv; M.coinPct += 10; break;
        case 'butterfly': case 'frog': M.scorePct += pv; break;
      }
      this.timers = timers;
      return M;
    }

    start(cfg) {
      this.cfg = cfg;
      const m = this.mode = cfg.mode;
      this.theme = KP.MODES.find(x => x.id === m).theme;
      this.charId = cfg.char; this.ch = KP.charOf(cfg.char);
      this.stype = this.ch.skill.type;
      this.mountId = cfg.mount === 'none' ? null : cfg.mount;
      this.mountInfo = KP.mountOf(cfg.mount);
      this.mountStand = !!(this.mountId && A.saddle(this.mountId, { time: 0 }).stand);
      this.petId = cfg.pet && cfg.pet !== 'none' ? cfg.pet : null;
      const pet = KP.petOf(cfg.pet);
      this.maxJumps = Math.min(4, this.ch.jumps + (pet.jump || 0));
      this.maxGlides = Math.min(3, this.ch.glides + (pet.glide || 0));
      const M = this.M = this.buildMods(cfg);
      this.fly = m === 'fly';
      this.cam = 0; this.time = 0; this.dist = 0; this.coins = 0; this.gems = 0; this.score = 0; this.smashed = 0;
      this.obs = []; this.coinA = []; this.items = []; this.pits = []; this.plats = [];
      this.parts = []; this.texts = []; this.runaways = []; this.trail = []; this.trailT = 0; this.rainT = 0;
      this.genX = this.fly ? 1100 : 950; this.lastGy = 360;
      this.p = {
        y: this.fly ? 380 : G, vy: 0, ground: !this.fly, jumps: 0, slideT: 0, sliding: false,
        mount: this.mountId, inv: 0, shield: Math.min(3, M.startShield), revive: M.revive, chanceUsed: false,
        energy: Math.min(100, M.startEnergy), skill: 0,
        eff: { magnet: M.magnetStart, dash: M.dashStart, giant: 0, double: 0, flight: 0 },
        dead: false, deadT: 0, spin: 0, runT: 0, stumble: 0, giantK: 1, combo: 0, comboT: 0,
        gliding: false, glidesUsed: 0, glideT: 0, glideLock: false,
        petX: PX - 80, petY: (this.fly ? 380 : G) - 150
      };
      this.speed = this.baseSpeed();
      this.shake = 0; this.flash = 0; this.flashCol = '#fff'; this.shock = 0; this.breath = 0; this.breathSrc = 'mount';
      this.ended = false; this.running = true; this.paused = false;
      this.finished = false; this.finishT = 0; this.rank = 0; this.finishOrder = [];
      this.racers = null;
      if (m === 'race') {
        const fs = [1.03, 0.995, 0.965].sort(() => Math.random() - 0.5);
        const others = KP.CHARS.filter(c => c.id !== this.charId).sort(() => Math.random() - 0.5).slice(0, 3);
        this.racers = others.map((ch, i) => ({
          id: ch.id, name: ch.name.split('·').pop(), dist: 0, f: fs[i], stumble: 0, nextS: rnd(4, 10), t: i, done: false, lane: i
        }));
      }
      this.jumpHeld = false; this.slideHeld = false;
      this.coinLine(520, this.fly ? 380 : G - 40, 8);
      this.hint = 6;
      KP.audio.music(m);
    }

    baseSpeed() {
      const t = this.time;
      switch (this.mode) {
        case 'speed': return Math.min(1400, 780 + t * 9);
        case 'fly': return Math.min(880, 520 + t * 4);
        case 'race': return 620 + Math.min(160, t * 2.5);
        default: return Math.min(1050, 480 + t * 6.5);
      }
    }
    mult() {
      let k = 1 + this.M.scorePct / 100;
      if (this.p.mount) k += this.mountInfo.bonus;
      if (this.fly) k += this.M.flyScorePct / 100;
      return k * (this.mode === 'speed' ? 2 : 1);
    }
    skillOn(type) { return this.p.skill > 0 && this.stype === type; }
    isDashing() { return this.p.eff.dash > 0 || this.skillOn('dash'); }
    isGiant() { return this.p.eff.giant > 0 || this.skillOn('giant'); }
    isFlying() { return this.fly || this.p.eff.flight > 0; }
    itemDur(type) {
      const M = this.M;
      const extra = { dash: M.dashPct, magnet: M.magnetPct, giant: M.giantPct }[type] || 0;
      return KP.ITEMS[type].dur * (1 + (M.itemPct + extra) / 100);
    }

    // ---------- 输入 ----------
    jump(down) {
      this.jumpHeld = down;
      const p = this.p;
      if (!p) return;
      if (!down) { p.gliding = false; return; }
      if (!this.running || this.paused || p.dead || this.finished) return;
      if (this.isFlying()) return;
      const canGlide = p.glidesUsed < this.maxGlides;
      if (p.ground) {
        p.vy = -JV; p.ground = false; p.jumps = 1; p.slideT = 0;
        KP.audio.sfx('jump'); this.puff(PX, p.y, 6);
      } else if (canGlide && p.jumps >= 1 && (p.vy > 0 || p.jumps >= this.maxJumps)) {
        this.startGlide();
      } else if (p.jumps < this.maxJumps) {
        if (p.jumps === 0) p.jumps = 1;
        p.vy = -JV2; p.jumps++; p.spin = 1; p.gliding = false;
        KP.audio.sfx('jump2'); this.puff(PX, p.y - 20, 8, '#ffffff');
      }
    }
    startGlide() {
      const p = this.p;
      p.gliding = true; p.glidesUsed++; p.glideT = 1.2; p.spin = 0;
      p.vy = clamp(p.vy, 0, 140);
      KP.audio.sfx('jump'); this.puff(PX, p.y - 120, 6, '#ffffff');
    }
    slide(down) {
      this.slideHeld = down;
      const p = this.p;
      if (!down || !this.running || this.paused || !p || p.dead || this.isFlying()) return;
      if (!p.ground) { p.vy = Math.max(p.vy, 1600); p.gliding = false; }
      else { p.slideT = 0.55; KP.audio.sfx('slide'); }
    }
    useSkill() {
      const p = this.p;
      if (!this.running || this.paused || !p || p.dead || p.energy < 100 || this.finished) return;
      p.energy = 0;
      const col = this.ch.color, type = this.stype, dur = KP.SKILLS[type].dur;
      this.bigText(this.ch.skill.name + '！', col);
      KP.audio.sfx('skill'); this.flash = 0.45; this.flashCol = col;
      p.skill = dur;
      switch (type) {
        case 'giant': this.burst(this.cam + PX, p.y - 60, 40, [col, '#ffb02e', '#fff2a0'], 600); break;
        case 'shock':
          p.shield = Math.min(3, p.shield + 1); this.shake = 0.6; this.shock = 0.01;
          for (const o of this.obs) if (!o.dead && o.x < this.cam + W + 200) this.smash(o, true);
          break;
        case 'flight':
          if (!this.fly) { p.eff.flight = Math.max(p.eff.flight, dur); p.vy = 0; p.ground = false; }
          break;
        case 'guard': p.shield = Math.min(3, p.shield + 2); p.inv = Math.max(p.inv, dur); break;
      }
    }

    // ---------- 关卡生成 ----------
    coinLine(x, y, n, kind) {
      for (let i = 0; i < n; i++) this.coinA.push({ x: x + i * 46, y, kind });
      return n * 46;
    }
    coinArc(cx, peak, span, n, baseY) {
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1);
        this.coinA.push({ x: cx - span / 2 + u * span, y: (baseY || G - 40) - Math.sin(u * Math.PI) * peak });
      }
    }
    addItem(x, y) {
      const p = this.p;
      const list = [['magnet', 3], ['shield', 2], ['dash', this.mode === 'race' ? 5 : 2], ['giant', 1.5], ['double', 1.5]];
      if (!this.fly && this.mode !== 'race') list.push(['flight', 1.2]);
      if (this.mountId && !p.mount) list.push(['mount', 3]);
      this.items.push({ x, y, type: weighted(list) });
    }
    maybeGem(x, y) {
      if (Math.random() < 0.035 * this.M.diamondMul) this.coinA.push({ x, y, kind: 'gem' });
    }

    genGround() {
      const p = this.p, sp = this.speed, d = clamp(this.dist / (MPX * 2500), 0, 1), x = this.genX;
      let w = 0;
      if (this.mode === 'race' && x > RACE_LEN * MPX - 300) {
        w = this.coinLine(x, G - 40, 10); this.genX = x + w + 200; return;
      }
      if (p.eff.flight > 1.2) {
        for (let i = 0; i < 16; i++) this.coinA.push({ x: x + i * 46, y: 300 + Math.sin((x + i * 46) * 0.012) * 70 });
        this.maybeGem(x + 400, 220);
        this.genX = x + 16 * 46 + 40; return;
      }
      const t = weighted([
        ['coins', 2.5], ['box', 3], ['spike', 2.5], ['bar', 2 + d * 2], ['pit', 2.5 + d], ['bird', 0.8 + d * 2.2],
        ['wall', 0.6 + d * 2], ['plats', 1.3], ['combo', d * 3], ['double', 0.5 + d * 2.5]
      ]);
      const arcPeak = 160;
      switch (t) {
        case 'coins': {
          const n = 8 + (Math.random() * 7 | 0), style = Math.random();
          for (let i = 0; i < n; i++) {
            const y = style < 0.4 ? G - 40 : style < 0.75 ? G - 40 - Math.abs(Math.sin(i * 0.5)) * 90 : G - 175;
            this.coinA.push({ x: x + i * 46, y });
          }
          w = n * 46;
          break;
        }
        case 'box': case 'spike': {
          const big = t === 'spike' && Math.random() < 0.4 + d * 0.4;
          const ow = t === 'box' ? 60 : big ? 110 : 66, oh = t === 'box' ? 60 : 50;
          this.obs.push({ type: t, x, y: G - oh, w: ow, h: oh });
          this.coinArc(x + ow / 2, arcPeak, sp * 0.62, 7);
          w = ow; break;
        }
        case 'wall': {
          this.obs.push({ type: 'wall', x, y: G - 205, w: 64, h: 205 });
          this.coinArc(x + 32, 290, sp * 0.8, 9);
          w = 64; break;
        }
        case 'bar': {
          this.obs.push({ type: 'bar', x, y: G - 75 - 520, w: 96, h: 520 });
          this.coinLine(x - 140, G - 24, Math.round((96 + 260) / 46));
          w = 96; break;
        }
        case 'bird': {
          this.obs.push({ type: 'bird', x: x + 120, y: G - 131, by: G - 131, w: 56, h: 42, vx: 140, ph: rnd(0, 6), amp: 5 });
          this.coinLine(x - 60, G - 24, 6);
          w = 200; break;
        }
        case 'pit': {
          const pw = clamp(sp * 0.36, 170, 380) * rnd(0.85, 1.1);
          this.pits.push({ x, w: pw });
          this.coinArc(x + pw / 2, arcPeak, pw + 120, 7);
          w = pw; break;
        }
        case 'plats': {
          const start = x + 40;
          let cur = x + 110, last = cur;
          const L = rnd(700, 1100);
          while (cur < start + L - 180) {
            const pw = rnd(220, 320), py = G - rnd(115, 165);
            this.plats.push({ x: cur, y: py, w: pw });
            this.coinLine(cur + 20, py - 34, Math.floor((pw - 30) / 46));
            if (Math.random() < 0.25) this.addItem(cur + pw / 2, py - 110);
            last = cur + pw;
            cur += pw + rnd(110, 170);
          }
          const pitW = last - start + 120;
          this.pits.push({ x: start, w: pitW });
          w = pitW + 40; break;
        }
        case 'combo': {
          this.obs.push({ type: 'spike', x, y: G - 50, w: 66, h: 50 });
          this.coinArc(x + 33, arcPeak, sp * 0.62, 7);
          const bx = x + Math.max(sp * 0.95, 420);
          this.obs.push({ type: 'bar', x: bx, y: G - 75 - 520, w: 96, h: 520 });
          this.coinLine(bx - 100, G - 24, 6);
          w = bx - x + 96; break;
        }
        case 'double': {
          this.obs.push({ type: 'box', x, y: G - 60, w: 60, h: 60 });
          const gap = Math.max(sp * 0.8, 380);
          if (Math.random() < 0.5) {
            this.obs.push({ type: 'box', x: x + gap, y: G - 60, w: 60, h: 60 });
            this.obs.push({ type: 'box', x: x + gap, y: G - 120, w: 60, h: 60 });
            this.coinArc(x + gap + 30, 270, sp * 0.8, 8);
          } else {
            const pw = clamp(sp * 0.3, 160, 320);
            this.pits.push({ x: x + gap, w: pw });
            this.coinArc(x + gap + pw / 2, arcPeak, pw + 120, 7);
          }
          w = gap + 200; break;
        }
      }
      if (t !== 'plats' && Math.random() < 0.12 * (1 + this.M.itemRate / 100)) this.addItem(x + w / 2, G - 190);
      else this.maybeGem(x + w / 2, G - 230);
      this.genX = x + w + sp * rnd(0.68, 1.0);
    }

    genFly() {
      const sp = this.speed, d = clamp(this.dist / (MPX * 2500), 0, 1), x = this.genX;
      let w = 0;
      const t = weighted([['pillar', 4], ['mines', 1.8 + d], ['wave', 1.4], ['birds', 0.8 + d * 1.5]]);
      switch (t) {
        case 'pillar': {
          const gap = 300 - d * 80;
          const lo = 120 + gap / 2, hi = G - 30 - gap / 2;
          const gy = clamp(this.lastGy + rnd(-230, 230), lo, hi); this.lastGy = gy;
          this.obs.push({ type: 'crysT', x, y: -40, w: 90, h: gy - gap / 2 + 40 });
          this.obs.push({ type: 'crysB', x, y: gy + gap / 2, w: 90, h: H - (gy + gap / 2) + 40 });
          this.coinLine(x - 70, gy, 6);
          w = 90; break;
        }
        case 'mines': {
          const n = 2 + (Math.random() * 2 | 0);
          for (let i = 0; i < n; i++) {
            const by = rnd(150, G - 110);
            this.obs.push({ type: 'mine', x: x + i * rnd(230, 300), y: by, by, w: 46, h: 46, amp: rnd(20, 60), ph: rnd(0, 6) });
          }
          for (let i = 0; i < n * 6; i++) this.coinA.push({ x: x + i * 46, y: 360 + Math.sin(i * 0.6) * 150 });
          w = n * 270; break;
        }
        case 'wave': {
          for (let i = 0; i < 18; i++) this.coinA.push({ x: x + i * 46, y: 360 + Math.sin(i * 0.45) * 170 });
          w = 18 * 46; break;
        }
        case 'birds': {
          for (let i = 0; i < 3; i++) {
            const by = 140 + i * 150 + rnd(-30, 30);
            this.obs.push({ type: 'bird', x: x + i * 160, y: by, by, w: 56, h: 42, vx: 170, ph: rnd(0, 6), amp: 30 });
          }
          this.coinLine(x, rnd(200, 500), 8);
          w = 500; break;
        }
      }
      if (Math.random() < 0.16 * (1 + this.M.itemRate / 100)) this.addItem(x + w / 2 + 120, rnd(180, 480));
      else this.maybeGem(x + w / 2 + 120, rnd(180, 480));
      this.genX = x + w + sp * rnd(0.62, 0.9);
    }

    // ---------- 判定 ----------
    hitbox() {
      const p = this.p, px = this.cam + PX, k = p.giantK;
      let w, h, ox = 0, oy = 0;
      if (this.isFlying()) { if (p.mount) { w = 86; h = 96; } else { w = 78; h = 46; ox = 8; oy = -10; } }
      else if (p.sliding) { w = p.mount ? 84 : 70; h = p.mount ? 66 : 46; ox = p.mount ? 0 : 6; }
      else if (p.mount) {
        if (this.mountStand) { w = 44; h = 98 - A.saddle(p.mount, { time: this.time }).y; }
        else { w = 78; h = 134; }
      }
      else { w = 42; h = 98; }
      w *= k; h *= k;
      return { x: px - w / 2 + ox, y: p.y - h + oy, w, h };
    }

    smash(o, quiet) {
      o.dead = true; this.smashed++;
      this.score += 20 * this.M.smashMul * this.mult();
      const cx = o.x + o.w / 2, cy = Math.max(o.y, o.y + o.h - 80) + Math.min(o.h, 80) / 2;
      const cols = { box: ['#f0b46a', '#8a4c1e'], spike: ['#c8cee0', '#6b7696'], wall: ['#9aa6c4', '#5fc24a'], bar: ['#ffd24a', '#2b2440'], bird: ['#a668ff', '#ffffff'], crysT: ['#d6aaff', '#8c5af0'], crysB: ['#d6aaff', '#8c5af0'], mine: ['#6b6f84', '#ff4040'] }[o.type];
      this.burst(cx, cy, 16, cols, 700, 'sq');
      if (!quiet) { KP.audio.sfx('smash'); this.shake = Math.max(this.shake, 0.18); }
    }
    starify(o) {
      o.dead = true;
      const cx = o.x + o.w / 2, top = Math.max(o.y, o.y + o.h - 90), bot = Math.min(o.y + o.h, G - 20);
      for (let i = 0; i < 3; i++) this.coinA.push({ x: cx + (i - 1) * 30, y: top + (bot - top) * (i + 1) / 4, kind: 'star', mag: true });
      this.burst(cx, (top + bot) / 2, 12, [this.ch.color, '#ffe14d', '#ffffff'], 400, 'star');
    }
    canRevive() {
      const p = this.p;
      if (p.revive > 0) { p.revive--; return true; }
      if (this.M.reviveChance && !p.chanceUsed) { p.chanceUsed = true; if (Math.random() * 100 < this.M.reviveChance) return true; }
      return false;
    }
    hurt(o) {
      const p = this.p;
      o.hitDone = true;
      if (p.shield > 0) {
        p.shield--; p.inv = 1.2; KP.audio.sfx('shield');
        this.burst(this.cam + PX, p.y - 50, 20, ['#8fe9ff', '#ffffff'], 500);
        this.text('护盾抵挡！', '#8fe9ff'); return;
      }
      if (p.mount) { this.loseMount(); p.inv = 1.6; return; }
      if (this.mode === 'race') {
        p.stumble = 1.0; p.inv = 1.6; this.shake = 0.3; KP.audio.sfx('hit');
        this.text('绊倒了！', '#ff8a8a'); return;
      }
      if (this.canRevive()) { this.doRevive(); return; }
      this.die();
    }
    loseMount() {
      const p = this.p;
      this.runaways.push({ id: p.mount, x: this.cam + PX, y: p.y, vy: -600, t: 0 });
      p.mount = null; KP.audio.sfx('hit'); this.shake = 0.35;
      this.text('坐骑被撞飞了！', '#ffd24a');
    }
    doRevive() {
      const p = this.p;
      p.inv = 2.5; this.flash = 0.6; this.flashCol = this.ch.color;
      for (const o of this.obs) if (!o.dead && o.x < this.cam + W) this.smash(o, true);
      this.burst(this.cam + PX, p.y - 50, 50, [this.ch.color, '#ffb02e', '#fff2a0'], 800);
      this.bigText('复活！', this.ch.color); KP.audio.sfx('skill');
    }
    die() {
      const p = this.p;
      p.dead = true; p.vy = -900; p.deadT = 0; p.mount = null;
      KP.audio.sfx('die'); KP.audio.stopMusic(); this.shake = 0.6;
    }
    fallPit() {
      const p = this.p;
      let saved = '';
      if (this.mode === 'race') saved = 'race';
      else if (p.shield > 0) { p.shield--; saved = '护盾救援！'; }
      else if (p.mount) { this.runaways.push({ id: p.mount, x: this.cam + PX, y: G + 60, vy: -900, t: 0 }); p.mount = null; saved = '坐骑救援！'; }
      else if (this.canRevive()) { saved = '复活！'; this.flash = 0.5; this.flashCol = this.ch.color; }
      if (!saved) { p.dead = true; p.deadT = 0.6; p.vy = 300; KP.audio.sfx('die'); KP.audio.stopMusic(); return; }
      p.y = G + 60; p.vy = -1650; p.inv = 1.8; p.jumps = 1;
      if (saved === 'race') { p.stumble = 0.8; this.text('掉坑了！', '#ff8a8a'); }
      else this.text(saved, '#ffd24a');
      KP.audio.sfx('shield');
    }
    collectItem(it) {
      const p = this.p; it.taken = true;
      KP.audio.sfx('item');
      const base = KP.ITEMS[it.type];
      if (it.type === 'shield') p.shield = Math.min(3, p.shield + 1);
      else if (it.type === 'mount') {
        p.mount = this.mountId; this.burst(this.cam + PX, p.y - 50, 24, ['#ff7ac8', '#ffe14d', '#4ab8ff'], 500, 'star');
      } else p.eff[it.type] = Math.max(p.eff[it.type], this.itemDur(it.type));
      if (it.type === 'flight') { p.vy = 0; p.ground = false; }
      this.text(base.name + '！', '#ffffff');
      this.burst(it.x, it.y, 14, ['#ffffff', '#9fe6ff'], 400, 'star');
    }

    // 坐骑 / 宠物 / 宝物的定时能力
    updTimers(dt, px) {
      const p = this.p;
      for (const tm of this.timers) {
        if (tm.src === 'mount' && p.mount !== this.mountId) continue;
        tm.cd -= dt;
        if (tm.cd > 0) continue;
        if (tm.kind === 'shield') {
          if (p.shield < 1) { p.shield = 1; this.text('获得护盾！', '#8fe9ff'); KP.audio.sfx('shield'); }
          tm.cd = tm.every;
        } else if (tm.kind === 'magnet') {
          p.eff.magnet = Math.max(p.eff.magnet, 4); tm.cd = tm.every; this.text('自动磁铁！', '#ff8a9a');
        } else if (tm.kind === 'fire') {
          const tgt = this.obs.find(o => !o.dead && o.x > px && o.x < px + 420);
          if (tgt) {
            tm.cd = tm.every; this.breath = 0.5; this.breathSrc = tm.src; this.smash(tgt, true); KP.audio.sfx('fire');
            this.text(tm.src === 'pet' ? '小火龙喷火！' : '坐骑喷火！', '#ffb02e');
          }
        }
      }
    }

    // ---------- 主更新 ----------
    update(dt) {
      if (!this.running || this.paused) return;
      dt = Math.min(dt, 1 / 30);
      const p = this.p;
      this.updFx(dt);
      if (p.dead) {
        p.deadT += dt; p.vy += GRAV * dt; p.y += p.vy * dt;
        if (p.deadT > 1.7 && !this.ended) this.end();
        return;
      }
      this.time += dt;
      if (this.hint > 0) this.hint -= dt;
      const fx = p.eff, wasFlight = fx.flight > 0;
      for (const k in fx) fx[k] = Math.max(0, fx[k] - dt);
      if (wasFlight && fx.flight <= 0) { p.vy = 0; p.inv = Math.max(p.inv, 1.6); p.ground = false; p.jumps = 1; }
      p.inv = Math.max(0, p.inv - dt); p.skill = Math.max(0, p.skill - dt);
      p.stumble = Math.max(0, p.stumble - dt); p.spin = Math.max(0, p.spin - dt * 2.6);
      p.comboT -= dt; if (p.comboT <= 0) p.combo = 0;
      const dashing = this.isDashing(), giant = this.isGiant();
      p.giantK += ((giant ? 1.55 : 1) - p.giantK) * Math.min(1, dt * 6);

      // 速度
      let sp = this.baseSpeed();
      if (dashing) sp *= 1.75;
      if (fx.flight > 0) sp *= 1.25;
      if (p.stumble > 0) sp *= 0.4;
      if (this.finished) sp = Math.max(0, this.speed - 600 * dt);
      this.speed += (sp - this.speed) * Math.min(1, dt * (p.stumble > 0 ? 8 : 3));
      const dx = this.speed * dt;
      this.cam += dx; this.dist += dx;
      if (!this.finished) this.score += dx / MPX * this.mult();
      const px = this.cam + PX;

      if (!this.finished) while (this.genX < this.cam + W + 300) { if (this.fly) this.genFly(); else this.genGround(); }

      // 物理
      if (this.fly) {
        const up = this.jumpHeld;
        p.vy += (up ? -2900 : 1700) * dt; p.vy = clamp(p.vy, -620, 700);
        p.y += p.vy * dt;
        if (p.y < 120) { p.y = 120; p.vy = Math.max(0, p.vy); }
        if (p.y > G + 10) { p.y = G + 10; p.vy = Math.min(0, p.vy); }
        p.ground = false; p.sliding = false;
        if (up && Math.random() < 0.5) this.parts.push({ x: px - 30, y: p.y - 30, vx: -200, vy: rnd(-40, 40), life: 0.4, max: 0.4, size: rnd(3, 6), col: this.ch.color, type: 'c', g: 0 });
      } else if (fx.flight > 0) {
        const ty = 300 + Math.sin(this.time * 2.5) * 40;
        p.y += (ty - p.y) * Math.min(1, dt * 3); p.vy = 0; p.ground = false; p.sliding = false; p.gliding = false;
        if (Math.random() < 0.6) this.parts.push({ x: px - 20, y: p.y - 30 + rnd(-10, 10), vx: -300, vy: 0, life: 0.5, max: 0.5, size: rnd(3, 6), col: '#ffffff', type: 'star', g: 0 });
      } else {
        const prevY = p.y, wasGround = p.ground;
        p.vy += GRAV * (this.M.lowGrav ? 0.9 : 1) * dt;
        // 滑翔：由 jump() 立即开启，按住保持，每段最长 1.2 秒
        if (p.gliding) {
          p.glideT -= dt;
          if (!this.jumpHeld || p.glideT <= 0) p.gliding = false;
          else {
            p.vy = Math.min(p.vy, 140);
            if (Math.random() < 0.4) this.parts.push({ x: px - 30, y: p.y - 150 + rnd(-6, 6), vx: -120, vy: 0, life: 0.5, max: 0.5, size: 4, col: this.ch.color, type: 'c', g: 0 });
          }
        }
        p.y += p.vy * dt; p.ground = false;
        if (p.vy >= 0) {
          for (const q of this.plats) {
            if (px + 20 > q.x && px - 20 < q.x + q.w && prevY <= q.y + 2 && p.y >= q.y) { p.y = q.y; p.vy = 0; p.ground = true; break; }
          }
          if (!p.ground && p.y >= G && prevY <= G + 14) {
            const solid = p.inv > 0 || dashing || giant;
            const over = this.pits.some(q => px - 16 > q.x && px + 16 < q.x + q.w);
            if (!over || solid) { p.y = G; p.vy = 0; p.ground = true; }
          }
        }
        if (p.ground && !wasGround) { p.jumps = 0; p.spin = 0; p.glidesUsed = 0; p.gliding = false; this.puff(PX, p.y, 5); }
        p.slideT -= dt;
        p.sliding = p.ground && (this.slideHeld || p.slideT > 0);
        if (p.y > G + 170) this.fallPit();
        if (p.dead) return;
      }
      p.runT += dt * (7 + this.speed * 0.011);

      // 障碍
      const hb = this.hitbox();
      const smashing = dashing || giant || fx.flight > 0 || (this.fly && this.skillOn('flight'));
      for (const o of this.obs) {
        if (o.dead) continue;
        if (o.type === 'bird') { o.x -= o.vx * dt; o.y = o.by + Math.sin(this.time * 4 + o.ph) * o.amp; }
        else if (o.type === 'mine') o.y = o.by + Math.sin(this.time * 2.5 + o.ph) * o.amp;
        if (o.hitDone || this.finished) continue;
        if (overlap(hb, o)) {
          if (smashing) this.smash(o);
          else if (p.inv > 0) o.hitDone = true;
          else { this.hurt(o); if (p.dead) return; }
        }
      }
      if (this.skillOn('starify'))
        for (const o of this.obs) if (!o.dead && o.x < this.cam + W + 100) this.starify(o);
      if (this.skillOn('coinRain')) {
        this.rainT -= dt;
        while (this.rainT <= 0) { this.rainT += 0.07; this.coinA.push({ x: this.cam + rnd(PX + 60, W + 200), y: -20, vy: rnd(380, 560) }); }
      }

      this.updTimers(dt, px);
      if (this.breath > 0) {
        this.breath -= dt;
        const bx = this.breathSrc === 'pet' ? this.cam + p.petX + 16 : px + 70;
        const by = this.breathSrc === 'pet' ? p.petY : p.y - 85;
        for (let i = 0; i < 4; i++) this.parts.push({ x: bx, y: by, vx: rnd(600, 900), vy: rnd(-90, 90), life: 0.35, max: 0.35, size: rnd(8, 14), col: ['#ff3d17', '#ffb02e', '#fff2a0'][i % 3], type: 'c', g: -100 });
      }

      // 宠物跟随
      const k = p.giantK;
      const ptx = PX - 70 * k, pty = (this.isFlying() ? p.y - 90 : p.y - 150 * k) + (p.mount && !this.isFlying() ? -30 : 0);
      p.petX += (ptx - p.petX) * Math.min(1, dt * 5); p.petY += (pty - p.petY) * Math.min(1, dt * 4);

      // 金币 / 钻石
      const storm = this.skillOn('magnetStorm');
      const magnet = fx.magnet > 0 || storm || this.skillOn('starify');
      const range = storm ? 1400 : 460;
      const hcx = hb.x + hb.w / 2, hcy = hb.y + hb.h / 2;
      const coinMul = (fx.double > 0 ? 2 : 1) * (this.skillOn('giant') || this.skillOn('coinRain') ? 2 : 1);
      const beeX = this.cam + p.petX, beeY = p.petY;
      for (const cn of this.coinA) {
        if (cn.taken) continue;
        if (cn.vy) { cn.y += cn.vy * dt; if (cn.y > G - 30) { cn.y = G - 30; cn.vy = 0; } }
        const ddx = hcx - cn.x, ddy = hcy - cn.y;
        if (!cn.mag) {
          if (magnet && Math.abs(ddx) < range && Math.abs(ddy) < 420) cn.mag = true;
          else if (this.M.beeR && Math.hypot(beeX - cn.x, beeY - cn.y) < this.M.beeR) cn.mag = true;
        }
        if (cn.mag) {
          const L = Math.hypot(ddx, ddy) || 1, v = 900 + this.speed;
          cn.x += ddx / L * v * dt; cn.y += ddy / L * v * dt; cn.vy = 0;
        }
        if (Math.abs(ddx) < hb.w / 2 + 16 && Math.abs(ddy) < hb.h / 2 + 16) {
          cn.taken = true;
          if (cn.kind === 'gem') {
            this.gems++; KP.audio.sfx('item'); this.text('钻石 +1', '#9ff0ff');
            this.burst(cn.x, cn.y, 12, ['#9ff0ff', '#ffffff'], 400, 'star');
            continue;
          }
          const v = (cn.kind === 'star' ? 2 : 1) * coinMul;
          this.coins += v; this.score += 10 * v * this.mult();
          p.energy = Math.min(100, p.energy + 1.6 * v * (1 + this.M.energyPct / 100));
          p.combo++; p.comboT = 0.5;
          KP.audio.sfx('coin', p.combo);
          this.parts.push({ x: cn.x, y: cn.y, vx: 0, vy: -60, life: 0.3, max: 0.3, size: 14, col: '#fff6c4', type: 'ring', g: 0 });
        }
      }
      for (const it of this.items) {
        if (it.taken) continue;
        if (magnet) { const ddx = hcx - it.x, ddy = hcy - it.y; if (Math.abs(ddx) < 300) { const L = Math.hypot(ddx, ddy) || 1; it.x += ddx / L * 900 * dt; it.y += ddy / L * 900 * dt; } }
        if (Math.abs(hcx - it.x) < hb.w / 2 + 26 && Math.abs(hcy - it.y) < hb.h / 2 + 26) this.collectItem(it);
      }

      this.charParticles(dt, px);
      if (dashing) {
        this.trailT -= dt;
        if (this.trailT <= 0) { this.trailT = 0.035; this.trail.push({ y: p.y, t: p.runT, life: 0.25 }); }
      }
      for (const tr of this.trail) tr.life -= dt;
      this.trail = this.trail.filter(t => t.life > 0);

      // 清理
      const cut = this.cam - 400;
      this.obs = this.obs.filter(o => o.x + o.w > cut);
      this.coinA = this.coinA.filter(o => !o.taken && o.x > cut);
      this.items = this.items.filter(o => !o.taken && o.x > cut);
      this.pits = this.pits.filter(o => o.x + o.w > cut);
      this.plats = this.plats.filter(o => o.x + o.w > cut);

      if (this.racers) this.updRace(dt);
    }

    charParticles(dt, px) {
      const p = this.p, id = this.charId, k = p.giantK, col = this.ch.color;
      if (id === 'xiaoyan' && Math.random() < (p.skill > 0 ? 1 : 0.35)) {
        this.parts.push({ x: px - 5 * k + rnd(-10, 10), y: p.y - 115 * k + rnd(-10, 10), vx: rnd(-140, -60), vy: rnd(-120, -40), life: 0.5, max: 0.5, size: rnd(3, 6) * k, col: ['#ff3d17', '#ffb02e', '#ffe14d'][Math.random() * 3 | 0], type: 'c', g: -50 });
      }
      if ((id === 'mengmeng' || id === 'luna' || id === 'huahua') && Math.random() < (p.skill > 0 ? 0.9 : 0.25)) {
        this.parts.push({ x: px + rnd(-30, 30), y: p.y - rnd(20, 110), vx: rnd(-160, -60), vy: rnd(-30, 30), life: 0.7, max: 0.7, size: rnd(4, 8), col: [col, '#ffe14d', '#ffffff'][Math.random() * 3 | 0], type: 'star', g: 0 });
      }
      if (p.shield > 0 && Math.random() < 0.25) {
        const a = rnd(0, Math.PI * 2);
        this.parts.push({ x: px + Math.cos(a) * 70, y: p.y - 60 + Math.sin(a) * 70, vx: 0, vy: 0, life: 0.15, max: 0.15, size: 2, col: '#9ffcff', type: 'bolt', g: 0, a });
      }
      if (p.skill > 0 && Math.random() < 0.6) {
        this.parts.push({ x: px + rnd(-40, 40), y: p.y - rnd(10, 120) * k, vx: rnd(-200, -80), vy: rnd(-60, 20), life: 0.5, max: 0.5, size: rnd(3, 7), col, type: 'star', g: 0 });
      }
      if (this.isDashing() && Math.random() < 0.8) {
        this.parts.push({ x: px + rnd(-20, 40), y: p.y - rnd(10, 110), vx: -900, vy: 0, life: 0.25, max: 0.25, size: rnd(20, 60), col: 'rgba(255,255,255,.8)', type: 'line', g: 0 });
      }
    }

    updRace(dt) {
      const len = RACE_LEN * MPX;
      const base = this.baseSpeed();
      for (const r of this.racers) {
        if (r.done) { r.dist += base * 0.3 * dt; continue; }
        r.nextS -= dt;
        if (r.nextS <= 0) { r.stumble = 0.9; r.nextS = rnd(5, 12); }
        r.stumble = Math.max(0, r.stumble - dt);
        let f = r.f;
        if (r.dist < this.dist - 1400) f += 0.08;
        if (r.dist > this.dist + 1400) f -= 0.05;
        r.dist += base * f * (r.stumble > 0 ? 0.45 : 1) * dt;
        r.t += dt * (7 + base * 0.011);
        if (r.dist >= len) { r.done = true; this.finishOrder.push(r.id); }
      }
      if (!this.finished && this.dist >= len) {
        this.finished = true; this.finishT = 0;
        this.rank = this.finishOrder.length + 1;
        this.score += [3000, 1500, 800, 300][this.rank - 1] * this.mult();
        this.gems += [5, 3, 1, 0][this.rank - 1];
        KP.audio.sfx('win'); KP.audio.stopMusic();
        this.bigText(this.rank === 1 ? '冠军！' : '第 ' + this.rank + ' 名', '#ffe14d');
        this.p.inv = 99;
      }
      if (this.finished) {
        this.finishT += dt;
        if (Math.random() < 0.3) this.burst(this.cam + rnd(200, W - 200), rnd(100, 300), 20, ['#ff5a6a', '#ffe14d', '#4ab8ff', '#7cf08a'], 500, 'star');
        if (this.finishT > 2.6 && !this.ended) this.end();
      }
    }
    raceRank() {
      if (!this.racers) return 0;
      if (this.finished) return this.rank;
      return 1 + this.racers.filter(r => r.dist > this.dist).length;
    }

    end() {
      this.ended = true; this.running = false; KP.audio.stopMusic();
      const dist = Math.floor(this.dist / MPX);
      const res = {
        mode: this.mode, score: Math.floor(this.score), dist, coins: this.coins,
        coinsEarned: Math.floor(this.coins * (1 + this.M.coinPct / 100)),
        diaEarned: this.gems + Math.floor(dist / 500), gems: this.gems,
        smashed: this.smashed, rank: this.racers ? (this.finished ? this.rank : 0) : null
      };
      if (this.onEnd) this.onEnd(res);
    }

    // ---------- 特效 ----------
    puff(sx, y, n, col) {
      for (let i = 0; i < n; i++) this.parts.push({ x: this.cam + sx + rnd(-15, 15), y: y - rnd(0, 8), vx: rnd(-160, 40), vy: rnd(-120, -20), life: 0.4, max: 0.4, size: rnd(5, 10), col: col || 'rgba(230,220,210,.9)', type: 'c', g: 0 });
    }
    burst(x, y, n, cols, spd, type) {
      for (let i = 0; i < n; i++) {
        const a = rnd(0, Math.PI * 2), v = rnd(0.3, 1) * spd;
        this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 100, life: rnd(0.4, 0.8), max: 0.8, size: rnd(4, 9), col: cols[i % cols.length], type: type || 'c', g: 900, rot: rnd(0, 6) });
      }
    }
    text(t, col) { this.texts.push({ t, col, x: PX + 40, y: this.p.y - 160, life: 1, big: false }); }
    bigText(t, col) { this.texts.push({ t, col, x: W / 2, y: 260, life: 1.6, big: true }); }
    updFx(dt) {
      for (const q of this.parts) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += q.g * dt; }
      this.parts = this.parts.filter(q => q.life > 0);
      if (this.parts.length > 600) this.parts.splice(0, this.parts.length - 600);
      for (const t of this.texts) { t.life -= dt; if (!t.big) t.y -= 60 * dt; }
      this.texts = this.texts.filter(t => t.life > 0);
      for (const r of this.runaways) { r.t += dt; r.vy += GRAV * 0.6 * dt; r.y += r.vy * dt; r.x -= 250 * dt; }
      this.runaways = this.runaways.filter(r => r.t < 1.5);
      this.shake = Math.max(0, this.shake - dt * 1.4);
      this.flash = Math.max(0, this.flash - dt);
      if (this.shock > 0) { this.shock += dt; if (this.shock > 0.7) this.shock = 0; }
    }

    // ---------- 渲染 ----------
    render() {
      const c = this.c, p = this.p, cam = this.cam, time = this.time;
      c.setTransform(this.k, 0, 0, this.k, 0, 0);
      c.save();
      if (this.shake > 0) c.translate(rnd(-1, 1) * this.shake * 18, rnd(-1, 1) * this.shake * 18);
      A.drawBG(c, this.theme, cam, time);
      if (this.speed > 950 || this.isDashing()) {
        c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2;
        for (let i = 0; i < 10; i++) {
          const y = (A.hash(i + Math.floor(time * 8)) * G), x = ((A.hash(i * 7) * W) - time * 3000) % W + W;
          c.beginPath(); c.moveTo(x % W, y); c.lineTo(x % W + 120, y); c.stroke();
        }
      }
      A.drawGround(c, this.theme, cam, this.pits, time);
      for (const q of this.plats) if (q.x - cam < W + 20 && q.x + q.w - cam > -20) A.drawPlat(c, q.x - cam, q.y, q.w, this.theme);
      if (this.racers) { const fx = RACE_LEN * MPX - cam + PX; if (fx > -200 && fx < W + 200) A.drawFinish(c, fx); }
      for (const cn of this.coinA) {
        const x = cn.x - cam; if (x < -30 || x > W + 30) continue;
        if (cn.kind === 'gem') A.drawGem(c, x, cn.y, time); else A.drawCoin(c, x, cn.y, time, cn.kind);
      }
      for (const it of this.items) { const x = it.x - cam; if (x > -40 && x < W + 40) A.drawItem(c, it.type, x, it.y, time); }
      for (const o of this.obs) { if (o.dead) continue; const x = o.x - cam; if (x < W + 40 && x + o.w > -40) A.drawObs(c, o, x, time, this.theme); }
      if (this.racers) this.drawRacers(c);
      for (const r of this.runaways) {
        A.drawMount(c, r.id, r.x - cam, r.y, { t: r.t * 20, time, alpha: Math.max(0, 1 - r.t / 1.5), air: true });
      }
      this.drawPlayer(c);
      this.drawParts(c);
      if (this.shock > 0) {
        const r = this.shock * 1800;
        c.save(); c.globalAlpha = Math.max(0, 1 - this.shock / 0.7);
        c.lineWidth = 18; c.strokeStyle = '#9ffcff'; c.shadowColor = this.ch.color; c.shadowBlur = 30;
        c.beginPath(); c.arc(PX, p.y - 60, r, 0, Math.PI * 2); c.stroke(); c.restore();
      }
      c.restore();
      if (this.flash > 0) { c.save(); c.globalAlpha = Math.min(0.6, this.flash); c.fillStyle = this.flashCol; c.fillRect(0, 0, W, H); c.restore(); }
      if (p.skill > 0.3 || this.isDashing() || this.isGiant()) {
        const hx = this.isDashing() && p.skill <= 0 ? '#ff5050' : this.isGiant() && p.skill <= 0 ? '#ff7814' : this.ch.color;
        c.fillStyle = A.rg(c, W / 2, H / 2, H * 0.45, W * 0.7, ['rgba(0,0,0,0)', A.mix(hx, hx, 0) + '59']); c.fillRect(0, 0, W, H);
      }
      this.drawTexts(c);
      this.drawHUD(c);
    }

    drawRacers(c) {
      const time = this.time;
      for (const r of this.racers) {
        const x = PX + (r.dist - this.dist) - 30 - r.lane * 14;
        if (x < -100 || x > W + 100) continue;
        const pose = r.stumble > 0 ? 'fall' : 'run';
        A.drawChar(c, r.id, x, G - 4, { pose, t: r.t, time, alpha: 0.6, scale: 0.85, rot: r.stumble > 0 ? -0.5 : 0 });
        c.font = '700 16px "PingFang SC",sans-serif'; c.textAlign = 'center';
        c.fillStyle = 'rgba(20,10,40,.6)'; A.rr(c, x - 34, G - 140, 68, 22, 11); c.fill();
        c.fillStyle = '#fff'; c.fillText(r.name, x, G - 123);
      }
    }

    drawPlayer(c) {
      const p = this.p, time = this.time, k = p.giantK;
      const x = PX, y = p.y;
      const flying = this.isFlying();
      let alpha = 1;
      if (p.inv > 0 && p.inv < 50 && !p.dead && Math.floor(time * 18) % 2 === 0) alpha = 0.4;
      let pose = 'run', rot = 0;
      if (p.dead) { pose = 'fall'; rot = -p.deadT * 7; }
      else if (this.finished && this.speed < 50) pose = 'win';
      else if (flying) { pose = 'fly'; rot = clamp(p.vy / 1800, -0.3, 0.3); }
      else if (p.sliding) pose = 'slide';
      else if (!p.ground) { pose = p.gliding ? 'fall' : p.vy < 0 ? 'jump' : 'fall'; if (p.spin > 0) rot = (1 - p.spin) * Math.PI * 2; }

      if (this.isGiant()) {
        c.save(); c.globalAlpha = 0.5 + Math.sin(time * 20) * 0.15;
        c.fillStyle = A.rg(c, x, y - 70 * k, 10, 110 * k, ['rgba(255,200,60,.7)', 'rgba(255,80,20,.3)', 'rgba(255,60,0,0)']);
        c.beginPath(); c.arc(x, y - 70 * k, 110 * k, 0, Math.PI * 2); c.fill(); c.restore();
      }
      for (const tr of this.trail) {
        const age = 1 - tr.life / 0.25;
        c.save(); c.globalAlpha = 0.35 * (1 - age);
        A.drawChar(c, this.charId, x - age * 120, tr.y, { pose: p.mount ? 'ride' : (flying ? 'fly' : 'run'), t: tr.t, time, scale: k });
        c.restore();
      }

      c.save(); c.translate(x, y); c.scale(k, k); c.globalAlpha = alpha;
      let topY = -110;
      if (p.mount && !p.dead) {
        const mo = { t: p.runT, time, slide: p.sliding, air: !p.ground || flying };
        if (flying) c.rotate(rot * 0.6);
        if (p.spin > 0 && !flying) { c.translate(0, -60); c.rotate((1 - p.spin) * Math.PI * 2); c.translate(0, 60); }
        A.drawMount(c, p.mount, 0, 0, mo);
        const s = A.saddle(p.mount, mo);
        if (s.stand) A.drawChar(c, this.charId, s.x, s.y, { pose: p.sliding ? 'slide' : (pose === 'win' ? 'win' : 'stand'), t: p.runT, time });
        else A.drawChar(c, this.charId, s.x, s.y + 32, { pose: 'ride', t: p.runT, time, rot: p.sliding ? -0.9 : 0 });
        topY = s.y - (s.stand ? 110 : 80);
      } else {
        A.drawChar(c, this.charId, 0, 0, { pose, t: p.runT, time, rot });
      }
      // 滑翔伞
      if (p.gliding && !p.dead) {
        const cy = topY - 40, col = this.ch.color;
        c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(-40, cy + 6); c.lineTo(0, topY + 40); c.lineTo(40, cy + 6); c.stroke();
        c.beginPath(); c.moveTo(-46, cy + 8); c.quadraticCurveTo(0, cy - 40, 46, cy + 8);
        for (let i = 0; i < 4; i++) c.quadraticCurveTo(46 - i * 23 - 11.5, cy + 2, 46 - (i + 1) * 23, cy + 8);
        c.closePath(); A.fs(c, A.lg(c, 0, cy - 30, 0, cy + 8, [A.light(col, 0.4), col]));
      }
      c.restore();

      if (this.petId && !p.dead) A.drawPet(c, this.petId, p.petX, p.petY, time);

      if (p.dead) return;
      const hb = this.hitbox(), cx = hb.x - this.cam + hb.w / 2, cy = hb.y + hb.h / 2;
      if (p.shield > 0) {
        const r = Math.max(hb.w, hb.h) * 0.62 + 10;
        c.save();
        c.fillStyle = A.rg(c, cx, cy, r * 0.5, r, ['rgba(140,230,255,0)', 'rgba(140,230,255,.35)']);
        c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
        c.lineWidth = 3; c.strokeStyle = 'rgba(200,250,255,.8)'; c.stroke();
        for (let i = 0; i < p.shield; i++) {
          c.beginPath(); c.arc(cx, cy, r - 6 - i * 6, -2.4 + time * (1 + i * 0.4), -1.6 + time * (1 + i * 0.4)); c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 4; c.stroke();
        }
        c.restore();
      }
      if (p.eff.magnet > 0 || this.skillOn('magnetStorm') || this.skillOn('starify')) {
        c.save(); c.strokeStyle = 'rgba(255,90,110,.5)'; c.lineWidth = 3; c.setLineDash([10, 12]);
        c.lineDashOffset = -time * 60;
        c.beginPath(); c.arc(cx, cy, 90 + Math.sin(time * 6) * 6, 0, Math.PI * 2); c.stroke(); c.restore();
      }
    }

    drawParts(c) {
      const cam = this.cam;
      for (const q of this.parts) {
        const a = Math.max(0, q.life / q.max), x = q.x - cam;
        c.globalAlpha = a; c.fillStyle = q.col; c.strokeStyle = q.col;
        switch (q.type) {
          case 'star': A.star(c, x, q.y, q.size, q.size * 0.45, 5, q.life * 6); c.fill(); break;
          case 'sq': c.save(); c.translate(x, q.y); c.rotate(q.rot + q.life * 8); c.fillRect(-q.size / 2, -q.size / 2, q.size, q.size); c.restore(); break;
          case 'ring': c.lineWidth = 3; c.beginPath(); c.arc(x, q.y, q.size * (1.6 - a), 0, Math.PI * 2); c.stroke(); break;
          case 'line': c.lineWidth = 2; c.beginPath(); c.moveTo(x, q.y); c.lineTo(x + q.size, q.y); c.stroke(); break;
          case 'bolt': {
            c.lineWidth = 2.5; c.beginPath(); let bx = x, by = q.y; c.moveTo(bx, by);
            for (let i = 0; i < 4; i++) { bx += Math.cos(q.a + 1.6) * 10 + rnd(-6, 6); by += Math.sin(q.a + 1.6) * 10 + rnd(-6, 6); c.lineTo(bx, by); }
            c.stroke(); break;
          }
          default: c.beginPath(); c.arc(x, q.y, q.size * (0.5 + a * 0.5), 0, Math.PI * 2); c.fill();
        }
      }
      c.globalAlpha = 1;
    }

    drawTexts(c) {
      c.textAlign = 'center'; c.textBaseline = 'middle';
      for (const t of this.texts) {
        const a = Math.min(1, t.life * 3);
        c.save(); c.globalAlpha = a;
        if (t.big) {
          const s = 1 + Math.max(0, t.life - 1.3) * 3;
          c.translate(t.x, t.y); c.scale(s, s);
          c.font = '900 64px "ZCOOL KuaiLe","PingFang SC",sans-serif';
          c.lineWidth = 12; c.strokeStyle = A.OL; c.strokeText(t.t, 0, 0);
          c.fillStyle = t.col; c.fillText(t.t, 0, 0);
        } else {
          c.font = '900 28px "ZCOOL KuaiLe","PingFang SC",sans-serif';
          c.lineWidth = 7; c.strokeStyle = A.OL; c.strokeText(t.t, t.x, t.y);
          c.fillStyle = t.col; c.fillText(t.t, t.x, t.y);
        }
        c.restore();
      }
    }

    drawHUD(c) {
      const p = this.p, time = this.time;
      const txt = (s, x, y, size, col, align) => {
        c.font = `900 ${size}px "ZCOOL KuaiLe","PingFang SC",sans-serif`; c.textAlign = align || 'left'; c.textBaseline = 'middle';
        c.lineWidth = size / 5; c.strokeStyle = A.OL; c.lineJoin = 'round'; c.strokeText(s, x, y);
        c.fillStyle = col || '#fff'; c.fillText(s, x, y);
      };
      c.save();
      c.fillStyle = 'rgba(30,14,60,.45)'; A.rr(c, 20, 18, 330, 106, 22); c.fill();
      txt(String(Math.floor(this.score)), 40, 52, 40, '#fff');
      txt(Math.floor(this.dist / MPX) + ' 米', 40, 98, 24, '#bfe8ff');
      A.drawCoin(c, 172, 98, 0); txt(String(this.coins), 192, 98, 24, '#ffe14d');
      c.save(); A.drawGemShape(c, 262, 97, 11); c.restore(); txt(String(this.gems), 280, 98, 24, '#9ff0ff');
      // 状态图标
      const icons = [];
      for (const k of ['magnet', 'dash', 'giant', 'double', 'flight']) if (p.eff[k] > 0) icons.push([k, p.eff[k] / Math.max(this.itemDur(k), p.eff[k])]);
      if (p.shield) icons.push(['shield', 1, p.shield]);
      icons.forEach(([k, f, n], i) => {
        const x = 390 + i * 64, y = 58;
        c.beginPath(); c.arc(x, y, 27, 0, Math.PI * 2); c.fillStyle = 'rgba(30,14,60,.45)'; c.fill();
        c.beginPath(); c.arc(x, y, 27, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(f, 0, 1));
        c.lineWidth = 5; c.strokeStyle = '#ffe14d'; c.stroke();
        c.save(); c.translate(x, y); c.scale(0.8, 0.8); A.drawItemIcon(c, k, time); c.restore();
        if (n > 1) txt('×' + n, x + 14, y + 20, 16, '#fff');
      });
      // 跳跃 / 滑翔段数 + 坐骑
      let ix = 34;
      const pip = (n, used, col, label) => {
        txt(label, ix, 150, 16, '#fff'); ix += 22;
        for (let i = 0; i < n; i++) { c.beginPath(); c.arc(ix + i * 13, 150, 5, 0, Math.PI * 2); c.fillStyle = i < n - used ? col : 'rgba(255,255,255,.25)'; c.fill(); }
        ix += n * 13 + 12;
      };
      pip(this.maxJumps, this.fly ? 0 : p.jumps, '#ffe14d', '跳');
      if (this.maxGlides) pip(this.maxGlides, p.glidesUsed, '#9ff0ff', '翔');
      if (p.revive > 0) { txt('复活×' + p.revive, ix, 150, 16, '#ffb02e'); ix += 70; }
      if (this.mountId) txt(p.mount ? this.mountInfo.name : '坐骑已失去', ix, 150, 16, p.mount ? '#c8ffe8' : '#ff9a9a');
      // 竞速进度
      if (this.racers) {
        const bx = 440, bw = 520, by = 106;
        c.fillStyle = 'rgba(30,14,60,.5)'; A.rr(c, bx - 10, by - 18, bw + 20, 36, 18); c.fill();
        c.fillStyle = 'rgba(255,255,255,.3)'; A.rr(c, bx, by - 4, bw, 8, 4); c.fill();
        const len = RACE_LEN * MPX;
        for (const r of this.racers) {
          const f = clamp(r.dist / len, 0, 1);
          c.beginPath(); c.arc(bx + f * bw, by, 8, 0, Math.PI * 2); c.fillStyle = KP.charOf(r.id).color; c.fill(); c.lineWidth = 2; c.strokeStyle = '#fff'; c.stroke();
        }
        const f = clamp(this.dist / len, 0, 1);
        c.beginPath(); c.arc(bx + f * bw, by, 12, 0, Math.PI * 2); c.fillStyle = this.ch.color; c.fill(); c.lineWidth = 3; c.strokeStyle = '#ffe14d'; c.stroke();
        txt('🏁', bx + bw + 22, by, 24);
        txt('第 ' + this.raceRank() + ' 名', W - 220, 52, 40, '#ffe14d', 'center');
        txt('剩余 ' + Math.max(0, Math.ceil(RACE_LEN - this.dist / MPX)) + ' 米', W - 220, 96, 22, '#fff', 'center');
      }
      if (this.mode === 'speed') txt('分数×2', W - 190, 56, 30, '#ffe14d', 'center');
      if (this.hint > 0) {
        c.globalAlpha = Math.min(1, this.hint);
        const msg = this.fly ? '按住 空格 / 右侧屏幕 上升，松开下降 · E 释放技能'
          : '空格 跳跃（可' + this.maxJumps + '段跳）' + (this.maxGlides ? ' · 起跳后下落时按住空格立即滑翔' : '') + ' · ↓ 下滑 · E 技能';
        c.fillStyle = 'rgba(30,14,60,.55)'; A.rr(c, W / 2 - 380, H - 64, 760, 44, 22); c.fill();
        txt(msg, W / 2, H - 42, 21, '#fff', 'center');
        c.globalAlpha = 1;
      }
      c.restore();
    }
  }
  KP.Game = Game;
  KP.PX = PX;
})();
