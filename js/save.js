// 存档：货币、拥有物、装备、签到、抽奖
(function () {
  'use strict';
  const KEY = 'kp_profile_v2';
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };

  function fresh() {
    const p = {
      coins: 2000, diamonds: 500,
      chars: {}, mounts: {}, pets: {}, treasures: {}, // treasures: id -> 等级
      equip: { char: 'afei', mount: 'wheel', pet: 'bee', treasures: [null, null, null] },
      mode: 'classic', best: {}, muted: false,
      sign: { last: '', streak: 0 }, freeDraw: '', pity: 0
    };
    KP.CHARS.forEach(c => { if (c.free) p.chars[c.id] = true; });
    KP.MOUNTS.forEach(c => { if (c.free) p.mounts[c.id] = true; });
    KP.PETS.forEach(c => { if (c.free) p.pets[c.id] = true; });
    return p;
  }

  let P;
  try { P = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { P = null; }
  if (!P) {
    P = fresh();
    // 迁移旧存档的金币和最佳成绩
    try {
      const old = JSON.parse(localStorage.getItem('kp_save') || 'null');
      if (old) { P.coins += old.coins || 0; P.best = old.best || {}; P.muted = !!old.muted; }
    } catch (e) { }
  } else {
    const f = fresh();
    for (const k in f) if (P[k] == null) P[k] = f[k];
    for (const k of ['chars', 'mounts', 'pets']) for (const id in f[k]) P[k][id] = true;
  }

  const S = KP.save = {
    get p() { return P; },
    write() { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) { } },
    reset() { P = fresh(); S.write(); },
    owns(kind, id) { return kind === 'treasures' ? !!P.treasures[id] : !!P[kind][id]; },
    canPay(cost) { return cost.coin ? P.coins >= cost.coin : P.diamonds >= (cost.dia || 0); },
    pay(cost) {
      if (!S.canPay(cost)) return false;
      if (cost.coin) P.coins -= cost.coin; else P.diamonds -= cost.dia || 0;
      S.write(); return true;
    },
    priceOf(kind, item) {
      if (kind === 'pets') return KP.PET_PRICE[item.rarity];
      if (kind === 'treasures') return KP.TREASURE_PRICE[item.rarity];
      const r = KP.RARITY[item.rarity];
      return r.coin ? { coin: r.coin } : { dia: r.dia };
    },
    buy(kind, item) {
      if (S.owns(kind, item.id)) return false;
      if (!S.pay(S.priceOf(kind, item))) return false;
      if (kind === 'treasures') P.treasures[item.id] = 1; else P[kind][item.id] = true;
      S.write(); return true;
    },
    upgradeCost(id) { const lv = P.treasures[id] || 0; return lv >= 5 ? null : KP.TREASURE_UP[lv]; },
    upgrade(id) {
      const c = S.upgradeCost(id);
      if (c == null || P.coins < c) return false;
      P.coins -= c; P.treasures[id]++; S.write(); return true;
    },
    equip(kind, id) {
      if (kind === 'chars') P.equip.char = id;
      else if (kind === 'mounts') P.equip.mount = id;
      else if (kind === 'pets') P.equip.pet = id;
      S.write();
    },
    // 宝物装备到第 slot 格（-1 = 自动找空格）；再次装备同一件则卸下
    toggleTreasure(id) {
      const t = P.equip.treasures, i = t.indexOf(id);
      if (i >= 0) { t[i] = null; S.write(); return 'off'; }
      const e = t.indexOf(null);
      if (e < 0) return 'full';
      t[e] = id; S.write(); return 'on';
    },
    // 汇总已装备宝物的效果
    treasureFx() {
      const fx = {};
      for (const id of P.equip.treasures) {
        if (!id || !P.treasures[id]) continue;
        const t = KP.treasureOf(id); fx[t.key] = (fx[t.key] || 0) + t.vals[P.treasures[id] - 1];
      }
      return fx;
    },

    // ---------- 签到 ----------
    canSign() { return P.sign.last !== today(); },
    signIn() {
      if (!S.canSign()) return null;
      const y = new Date(Date.now() - 864e5);
      const yesterday = y.getFullYear() + '-' + (y.getMonth() + 1) + '-' + y.getDate();
      P.sign.streak = P.sign.last === yesterday ? (P.sign.streak % 7) + 1 : 1;
      P.sign.last = today();
      const r = KP.SIGNIN[P.sign.streak - 1];
      if (r.coin) P.coins += r.coin; if (r.dia) P.diamonds += r.dia;
      S.write(); return r;
    },

    // ---------- 抽奖 ----------
    freeDrawReady() { return P.freeDraw !== today(); },
    draw(n, free) {
      const cost = n === 10 ? KP.GACHA.ten : KP.GACHA.single;
      if (free) { if (!S.freeDrawReady()) return null; P.freeDraw = today(); }
      else { if (P.diamonds < cost) return null; P.diamonds -= cost; }
      const res = [];
      for (let i = 0; i < n; i++) {
        let minR = null;
        if (n === 10 && i === 9 && !res.some(r => r.rarity === 'SR' || r.rarity === 'SSR')) minR = 'SR';
        P.pity++;
        if (P.pity >= 60) minR = 'SSR';
        const r = roll(minR);
        if (r.rarity === 'SSR') P.pity = 0;
        res.push(grant(r));
      }
      S.write(); return res;
    }
  };

  function roll(minR) {
    const order = ['N', 'R', 'SR', 'SSR'];
    let rar;
    if (minR === 'SSR') rar = 'SSR';
    else {
      const rates = Object.assign({}, KP.GACHA.rates);
      if (minR === 'SR') { rates.N = 0; rates.R = 0; }
      let s = 0; for (const k in rates) s += rates[k];
      let x = Math.random() * s;
      for (const k of order) { x -= rates[k]; if (x <= 0) { rar = k; break; } }
      rar = rar || 'N';
    }
    // N/R 有一定几率是金币奖励
    if ((rar === 'N' && Math.random() < 0.45) || (rar === 'R' && Math.random() < 0.2)) {
      return { kind: 'coin', rarity: rar, amount: KP.GACHA.coinPrize[rar === 'N' ? (Math.random() < 0.7 ? 0 : 1) : 2] };
    }
    const pool = [];
    KP.CHARS.forEach(c => { if (c.rarity === rar && !c.free) pool.push({ kind: 'chars', item: c }); });
    KP.MOUNTS.forEach(c => { if (c.rarity === rar && !c.free) pool.push({ kind: 'mounts', item: c }); });
    KP.PETS.forEach(c => { if (c.rarity === rar && !c.free) pool.push({ kind: 'pets', item: c }); });
    KP.TREASURES.forEach(c => { if (c.rarity === rar) pool.push({ kind: 'treasures', item: c }); });
    const pk = pool[Math.random() * pool.length | 0];
    return { kind: pk.kind, item: pk.item, rarity: rar };
  }

  function grant(r) {
    if (r.kind === 'coin') { P.coins += r.amount; return r; }
    const id = r.item.id;
    if (r.kind === 'treasures') {
      if (!P.treasures[id]) { P.treasures[id] = 1; r.isNew = true; }
      else if (P.treasures[id] < 5) { P.treasures[id]++; r.levelUp = P.treasures[id]; }
      else { r.dupe = KP.RARITY[r.rarity].dupe; P.coins += r.dupe; }
      return r;
    }
    if (!P[r.kind][id]) { P[r.kind][id] = true; r.isNew = true; }
    else { r.dupe = KP.RARITY[r.rarity].dupe; P.coins += r.dupe; }
    return r;
  }

  S.write();
})();
