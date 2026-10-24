// 所有画面都用 Canvas 矢量绘制：角色、坐骑、障碍、道具、场景
(function () {
  'use strict';
  const A = KP.art = {};
  const { W, H, G } = KP;
  const OL = '#2a1838';
  const TAU = Math.PI * 2;
  A.OL = OL;

  // ---------- 基础工具 ----------
  function rr(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath(); c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function lg(c, x0, y0, x1, y1, cols) {
    const g = c.createLinearGradient(x0, y0, x1, y1);
    cols.forEach((col, i) => g.addColorStop(i / (cols.length - 1), col));
    return g;
  }
  function rg(c, x, y, r0, r1, cols) {
    const g = c.createRadialGradient(x, y, r0, x, y, r1);
    cols.forEach((col, i) => g.addColorStop(i / (cols.length - 1), col));
    return g;
  }
  function ell(c, x, y, rx, ry, rot) { c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU); }
  function fs(c, fill, lw) { c.fillStyle = fill; c.fill(); c.lineWidth = lw == null ? 3 : lw; c.strokeStyle = OL; c.stroke(); }
  function star(c, x, y, r1, r2, n, rot) {
    c.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 ? r2 : r1, a = rot + i * Math.PI / n - Math.PI / 2;
      c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    c.closePath();
  }
  const hash = k => { const s = Math.sin(k * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  A.rr = rr; A.lg = lg; A.rg = rg; A.ell = ell; A.fs = fs; A.star = star; A.hash = hash;

  // 两段式肢体（大腿/小腿、上臂/前臂）
  function limb(c, x0, y0, a, l1, k, l2, w, col) {
    const x1 = x0 + Math.sin(a) * l1, y1 = y0 + Math.cos(a) * l1;
    const b = a - k, x2 = x1 + Math.sin(b) * l2, y2 = y1 + Math.cos(b) * l2;
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.lineTo(x2, y2);
    c.strokeStyle = OL; c.lineWidth = w + 5; c.stroke();
    c.strokeStyle = col; c.lineWidth = w; c.stroke();
    return { x1, y1, x2, y2, b };
  }
  function shoe(c, L, col, sole) {
    c.save(); c.translate(L.x2, L.y2); c.rotate(-L.b);
    ell(c, 4, 1.5, 9.5, 5.8); fs(c, col, 2.5);
    if (sole) { c.beginPath(); c.moveTo(-4, 5); c.lineTo(12, 5); c.strokeStyle = sole; c.lineWidth = 2; c.stroke(); }
    c.restore();
  }
  function hand(c, L, col) { c.beginPath(); c.arc(L.x2, L.y2, 5.2, 0, TAU); fs(c, col, 2.5); }

  // 飘带：从 (x0,y0) 向后飘动，宽度渐变
  function ribbon(c, x0, y0, len, w0, w1, col, time, freq, amp, droop, phase) {
    const n = 10, top = [], bot = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const x = x0 - u * len;
      const y = y0 + Math.sin(time * freq - u * 5 + (phase || 0)) * amp * u + u * len * (droop || 0.1);
      const w = (w0 + (w1 - w0) * u) / 2;
      top.push([x, y - w]); bot.push([x, y + w]);
    }
    c.beginPath(); c.moveTo(top[0][0], top[0][1]);
    for (const p of top) c.lineTo(p[0], p[1]);
    for (let i = bot.length - 1; i >= 0; i--) c.lineTo(bot[i][0], bot[i][1]);
    c.closePath(); fs(c, col, 2.5);
  }
  A.ribbon = ribbon;

  // ---------- 姿势 ----------
  function getPose(name, t, time) {
    const P = { rot: 0, bob: 0, lf: [0.1, 0.15], lb: [-0.1, 0.15], af: [0.3, -0.5], ab: [-0.25, -0.5] };
    const s = Math.sin(t), co = Math.cos(t);
    switch (name) {
      case 'run':
        P.rot = 0.12; P.bob = -Math.abs(co) * 5 + 2;
        P.lf = [0.95 * s, 0.15 + 1.5 * Math.max(0, co)];
        P.lb = [-0.95 * s, 0.15 + 1.5 * Math.max(0, -co)];
        P.af = [-1.0 * s + 0.1, -1.2]; P.ab = [1.0 * s + 0.1, -1.2];
        break;
      case 'jump':
        P.rot = 0.05; P.lf = [0.8, 1.6]; P.lb = [-0.25, 1.1]; P.af = [2.6, -0.4]; P.ab = [-0.9, -0.7]; break;
      case 'fall':
        P.lf = [0.4, 0.6]; P.lb = [-0.3, 0.5]; P.af = [2.0, -0.3]; P.ab = [-1.6, -0.3]; break;
      case 'slide':
        P.rot = -1.3; P.bob = 15; P.lf = [0.2, 0.05]; P.lb = [0.5, 0.7]; P.af = [1.2, -0.5]; P.ab = [-1.8, -0.2]; break;
      case 'ride':
        P.rot = 0.06; P.bob = Math.sin(t * 2) * 1.5;
        P.lf = [1.25, 1.55]; P.lb = [1.05, 1.4]; P.af = [1.2, -0.7]; P.ab = [1.0, -0.8]; break;
      case 'stand':
        P.rot = 0.08; P.bob = Math.sin(time * 9) * 1.2;
        P.lf = [0.2, 0.15]; P.lb = [-0.15, 0.15]; P.af = [1.0, -0.4]; P.ab = [-0.8, -0.4]; break;
      case 'fly':
        P.rot = 1.2; P.lf = [-0.15 + Math.sin(time * 10) * 0.08, 0.3]; P.lb = [-0.35 - Math.sin(time * 10) * 0.08, 0.6];
        P.af = [2.85, 0]; P.ab = [-0.5, -0.4]; break;
      case 'win':
        P.bob = -Math.abs(Math.sin(time * 6)) * 8; P.lf = [0.3, 0.6]; P.lb = [-0.2, 0.5]; P.af = [2.8, -0.2]; P.ab = [-2.6, 0.2]; break;
      default: // idle
        P.bob = Math.sin(time * 3) * 1.5; P.lf = [0.08, 0.05]; P.lb = [-0.08, 0.05]; P.af = [0.3, -0.5]; P.ab = [-0.2, -0.4];
    }
    return P;
  }

  // ---------- 通用头部 / 五官 ----------
  function headBase(c, D) {
    rr(c, -3, -66, 11, 10, 3); fs(c, D.skin2, 2);
    ell(c, 3, -84, 24, 23); fs(c, lg(c, 0, -108, 0, -60, [D.skin, D.skin2]));
    ell(c, -12, -81, 5, 6.5); fs(c, D.skin2, 2.5);
  }
  function blink(time) { return (time % 3.7) < 0.12 ? 0.12 : 1; }
  function eyes(c, D, time, mood) {
    const bl = blink(time);
    for (const [ex, sc] of [[11, 0.88], [22, 1]]) {
      c.save(); c.translate(ex, -83); c.scale(sc, 1);
      ell(c, 0, 0, 4.8, 6.6 * bl); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 2; c.strokeStyle = OL; c.stroke();
      if (bl > 0.5) {
        ell(c, 0.9, 0.8, 3.7, 5.2); c.fillStyle = lg(c, 0, -5, 0, 6, [D.eye2 || D.eye, D.eye]); c.fill();
        ell(c, 1.3, 1.4, 1.8, 2.7); c.fillStyle = '#1a1020'; c.fill();
        c.beginPath(); c.arc(-0.4, -2.2, 1.6, 0, TAU); c.fillStyle = '#fff'; c.fill();
        c.beginPath(); c.arc(2.4, 2.8, 0.8, 0, TAU); c.fill();
      }
      c.restore();
    }
    // 眉毛
    c.strokeStyle = OL; c.lineWidth = 2.2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(7, -93); c.lineTo(14, mood === 'cool' ? -91 : -94); c.stroke();
    c.beginPath(); c.moveTo(18, mood === 'cool' ? -92 : -94.5); c.lineTo(25, -93); c.stroke();
    // 嘴
    c.beginPath();
    if (mood === 'cool') { c.moveTo(14, -71); c.quadraticCurveTo(18, -69, 22, -72); }
    else c.arc(18, -73, 3.6, 0.15 * Math.PI, 0.85 * Math.PI);
    c.lineWidth = 2; c.stroke();
    ell(c, 7, -75, 4, 2.2); c.fillStyle = 'rgba(255,110,140,.45)'; c.fill();
    ell(c, 25, -75, 2.6, 1.8); c.fill();
  }
  function basicTorso(c, D, cols) {
    rr(c, -14, -64, 30, 37, 11); fs(c, lg(c, 0, -64, 0, -27, cols));
  }

  // ---------- 角色定义 ----------
  const CH = {};

  // 疾风·阿飞：忍者，红围巾、护额
  CH.afei = {
    skin: '#ffe2c6', skin2: '#f3bf9a', eye: '#c3202a', eye2: '#ff6a5a', mood: 'cool',
    pants: '#2a3062', pantsB: '#1b1f42', shoe: '#3b3b4c', shoeB: '#2a2a36',
    sleeve: '#36458a', sleeveB: '#252f63', hand: '#ffe2c6', handB: '#e9b38e',
    back(c, time) {
      ribbon(c, -6, -62, 62, 11, 5, '#e8424a', time, 13, 7, 0.12);
      ribbon(c, -4, -60, 44, 8, 3, '#b8232f', time, 11, 6, 0.3, 1.3);
      ribbon(c, -20, -96, 30, 6, 3, '#e8424a', time, 15, 4, 0.18, 0.5);
      ribbon(c, -20, -93, 24, 5, 2, '#b8232f', time, 14, 4, 0.4, 2);
    },
    torso(c) {
      basicTorso(c, this, ['#4153a0', '#28336e']);
      c.beginPath(); c.moveTo(-6, -63); c.lineTo(6, -46); c.lineTo(14, -63);
      c.strokeStyle = '#e8eaf6'; c.lineWidth = 3; c.stroke();
      rr(c, -15, -36, 32, 7, 3); fs(c, '#e8424a', 2);
      c.beginPath(); c.moveTo(-12, -32); c.lineTo(-20, -24); c.strokeStyle = '#e8424a'; c.lineWidth = 4; c.stroke();
      ell(c, 2, -61, 15, 6); fs(c, lg(c, 0, -67, 0, -55, ['#ff5a62', '#c62832']), 2.5);
    },
    head(c, time) {
      headBase(c, this); eyes(c, this, time, this.mood);
      c.beginPath();
      c.moveTo(-20, -76);
      c.quadraticCurveTo(-27, -94, -15, -104);
      c.lineTo(-33, -110); c.lineTo(-12, -112); c.lineTo(-22, -127); c.lineTo(1, -115);
      c.lineTo(4, -133); c.lineTo(13, -113); c.lineTo(29, -121); c.lineTo(25, -104);
      c.quadraticCurveTo(31, -97, 28, -90);
      c.lineTo(23, -95); c.lineTo(19, -89); c.lineTo(13, -96); c.lineTo(7, -90); c.lineTo(2, -97); c.lineTo(-5, -91);
      c.quadraticCurveTo(-12, -88, -14, -77);
      c.closePath(); fs(c, lg(c, 0, -130, 0, -80, ['#3d3358', '#15111f']));
      c.beginPath(); c.moveTo(-4, -118); c.quadraticCurveTo(4, -114, 8, -104);
      c.strokeStyle = 'rgba(160,150,220,.5)'; c.lineWidth = 2; c.stroke();
      // 护额
      c.beginPath(); c.moveTo(-19, -95); c.quadraticCurveTo(5, -104, 27, -98);
      c.strokeStyle = OL; c.lineWidth = 9; c.stroke();
      c.strokeStyle = '#e8424a'; c.lineWidth = 5.5; c.stroke();
      rr(c, 8, -104, 14, 9, 2); fs(c, lg(c, 0, -104, 0, -95, ['#f4f7ff', '#9aa6c0']), 2);
      c.beginPath(); c.moveTo(11, -99.5); c.lineTo(19, -99.5); c.strokeStyle = '#59627a'; c.lineWidth = 1.5; c.stroke();
    }
  };

  // 星光·萌萌：魔法少女，双马尾、魔女帽、星星法杖
  CH.mengmeng = {
    skin: '#ffe8da', skin2: '#f8c6b2', eye: '#6a2cff', eye2: '#c99bff',
    pants: '#fff2fa', pantsB: '#e7d4ef', shoe: '#ff5aa5', shoeB: '#d63f86',
    sleeve: '#ffd2ec', sleeveB: '#e8b3d5', hand: '#ffe8da', handB: '#efc0aa',
    back(c, time) {
      const sw = Math.sin(time * 7) * 4;
      for (const [bx, by, tx, col] of [[-14, -98, -38, '#ff5fae'], [18, -103, 6, '#ff79bf']]) {
        c.beginPath(); c.moveTo(bx - 6, by);
        c.bezierCurveTo(bx - 18, by + 8, tx - 8 + sw, by + 28, tx + sw, by + 46);
        c.bezierCurveTo(tx + 10 + sw, by + 28, bx + 6, by + 12, bx + 6, by);
        c.closePath(); fs(c, lg(c, 0, by, 0, by + 46, [col, '#e33d8f']));
      }
    },
    torso(c) {
      basicTorso(c, this, ['#9a63ff', '#6b35d6']);
      c.beginPath(); c.moveTo(-8, -63); c.quadraticCurveTo(2, -55, 13, -63);
      c.lineWidth = 3; c.strokeStyle = '#fff'; c.stroke();
      star(c, 2, -50, 6, 2.6, 5, 0); fs(c, '#ffe14d', 1.5);
    },
    over(c, time) {
      const fl = Math.sin(time * 9) * 1.5;
      c.beginPath(); c.moveTo(-15, -40); c.lineTo(17, -40);
      c.lineTo(26 + fl, -22); c.quadraticCurveTo(20, -18, 14, -22); c.quadraticCurveTo(8, -18, 2, -22);
      c.quadraticCurveTo(-4, -18, -10, -22); c.quadraticCurveTo(-16, -18, -22 + fl, -22);
      c.closePath(); fs(c, lg(c, 0, -40, 0, -20, ['#ff8bd0', '#e2449d']));
      c.beginPath(); c.moveTo(-20, -25); c.quadraticCurveTo(2, -21, 24, -25);
      c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke();
    },
    head(c, time) {
      headBase(c, this); eyes(c, this, time);
      c.beginPath();
      c.moveTo(-21, -76); c.bezierCurveTo(-28, -112, 22, -122, 29, -88);
      c.quadraticCurveTo(25, -90, 22, -96); c.quadraticCurveTo(19, -88, 12, -94);
      c.quadraticCurveTo(8, -87, 1, -95); c.quadraticCurveTo(-5, -88, -10, -92);
      c.quadraticCurveTo(-14, -84, -14, -76); c.closePath();
      fs(c, lg(c, 0, -115, 0, -80, ['#ffa0d8', '#ff5fae']));
      ell(c, -16, -96, 5, 4); fs(c, '#ffe14d', 2);
      // 魔女帽
      c.save(); c.translate(4, -106); c.rotate(-0.14 + Math.sin(time * 3) * 0.03);
      c.beginPath(); c.moveTo(-17, 2); c.quadraticCurveTo(-8, -20, -26, -42);
      c.quadraticCurveTo(4, -30, 17, 2); c.closePath();
      fs(c, lg(c, 0, -42, 0, 2, ['#8b4dff', '#4a1fa8']));
      ell(c, 0, 2, 27, 6); fs(c, '#5b28c4');
      rr(c, -16, -6, 32, 6, 2); fs(c, '#ff7ac8', 2);
      star(c, 2, -14, 6, 2.6, 5, 0.2); fs(c, '#ffe14d', 1.5);
      c.restore();
    },
    handItem(c, L, time) {
      const ex = L.x2 + Math.sin(L.b) * 18, ey = L.y2 + Math.cos(L.b) * 18;
      c.beginPath(); c.moveTo(L.x2, L.y2); c.lineTo(ex, ey);
      c.strokeStyle = OL; c.lineWidth = 5; c.stroke(); c.strokeStyle = '#fff1a8'; c.lineWidth = 2.5; c.stroke();
      c.save(); c.shadowColor = '#ffe14d'; c.shadowBlur = 14;
      star(c, ex, ey, 9, 4, 5, time * 3); fs(c, '#ffe14d', 2);
      c.restore();
    }
  };

  // 雷霆·铁拳：机甲战士
  CH.tiequan = {
    robot: true, eye: '#4ff0ff',
    pants: '#5c6f90', pantsB: '#43526c', shoe: '#2f3a52', shoeB: '#232b3d',
    sleeve: '#7f95b6', sleeveB: '#5d6f8c', hand: '#cfd9e8', handB: '#9aa8bd',
    back(c, time, P, o) {
      rr(c, -26, -66, 13, 30, 4); fs(c, lg(c, -26, 0, -13, 0, ['#5e6f8c', '#9fb2cc']), 2.5);
      if (o.pose === 'jump' || o.pose === 'fly' || o.pose === 'fall') {
        const f = 14 + Math.sin(time * 40) * 4;
        c.beginPath(); c.moveTo(-24, -36); c.lineTo(-19.5, -36 + f); c.lineTo(-15, -36); c.closePath();
        c.fillStyle = '#ffb03a'; c.fill();
        c.beginPath(); c.moveTo(-22, -36); c.lineTo(-19.5, -36 + f * 0.6); c.lineTo(-17, -36); c.closePath();
        c.fillStyle = '#fff3b0'; c.fill();
      }
    },
    torso(c, time) {
      rr(c, -16, -65, 34, 38, 9); fs(c, lg(c, 0, -65, 0, -27, ['#5ec0ff', '#2465c8']));
      rr(c, -10, -60, 22, 10, 4); c.fillStyle = 'rgba(255,255,255,.25)'; c.fill();
      c.save(); c.shadowColor = '#ffae2a'; c.shadowBlur = 12 + Math.sin(time * 6) * 4;
      c.beginPath(); c.arc(5, -45, 6.5, 0, TAU); fs(c, rg(c, 5, -45, 1, 7, ['#fff6c0', '#ff9a1a']), 2);
      c.restore();
      rr(c, -16, -34, 34, 7, 3); fs(c, '#33415a', 2);
      ell(c, -9, -63, 9, 7); fs(c, lg(c, 0, -70, 0, -56, ['#d9e4f2', '#8a9cb6']), 2.5);
    },
    head(c, time) {
      rr(c, -2, -68, 11, 10, 3); fs(c, '#5d6f8c', 2);
      rr(c, -20, -108, 47, 45, 16); fs(c, lg(c, 0, -108, 0, -63, ['#f2f7fd', '#9eb0c8']));
      c.beginPath(); c.moveTo(-12, -106); c.quadraticCurveTo(4, -112, 20, -106);
      c.strokeStyle = '#36a8ff'; c.lineWidth = 5; c.stroke();
      c.beginPath(); c.arc(-9, -84, 7.5, 0, TAU); fs(c, '#41506b', 2.5);
      c.beginPath(); c.arc(-9, -84, 3.5, 0, TAU); c.fillStyle = '#36a8ff'; c.fill();
      rr(c, 3, -96, 25, 15, 7); fs(c, lg(c, 0, -96, 0, -81, ['#1d2c46', '#0d1424']), 2.5);
      const bl = blink(time);
      c.save(); c.shadowColor = '#4ff0ff'; c.shadowBlur = 10; c.fillStyle = '#9ffcff';
      ell(c, 11, -88.5, 3, 3.6 * bl); c.fill(); ell(c, 21, -88.5, 3.4, 4 * bl); c.fill();
      c.restore();
      c.beginPath(); c.moveTo(12, -73); c.lineTo(24, -73); c.strokeStyle = '#6a7c98'; c.lineWidth = 2; c.stroke();
      c.beginPath(); c.moveTo(-2, -107); c.lineTo(-8, -124); c.strokeStyle = OL; c.lineWidth = 4; c.stroke();
      c.strokeStyle = '#9eb0c8'; c.lineWidth = 2; c.stroke();
      c.save(); c.globalAlpha *= 0.55 + 0.45 * Math.sin(time * 6);
      c.shadowColor = '#ff3a3a'; c.shadowBlur = 10;
      c.beginPath(); c.arc(-8, -126, 4.5, 0, TAU); fs(c, '#ff4a4a', 2);
      c.restore();
    }
  };

  // 焰灵·小炎：火焰发型
  CH.xiaoyan = {
    skin: '#ffe3ca', skin2: '#f6bd95', eye: '#ff8a00', eye2: '#ffd34d',
    pants: '#4a2b2b', pantsB: '#352020', shoe: '#ffb02e', shoeB: '#d98a1b',
    sleeve: '#ff6a3a', sleeveB: '#d44a22', hand: '#ffe3ca', handB: '#ecb08c',
    back(c, time) {
      for (let i = 0; i < 3; i++) {
        const f = Math.sin(time * 14 + i * 2) * 4;
        flame(c, -16, -96 + i * 10, -44 - i * 4 + f, -104 + i * 12, 8 - i, '#ff4a1a', '#ffb02e');
      }
    },
    torso(c, time) {
      basicTorso(c, this, ['#ff6a3a', '#d6371a']);
      c.beginPath(); c.moveTo(1, -64); c.lineTo(1, -28); c.strokeStyle = '#ffd34d'; c.lineWidth = 2.5; c.stroke();
      const f = Math.sin(time * 12) * 1.5;
      c.beginPath(); c.moveTo(8, -38); c.quadraticCurveTo(15, -46, 10 + f, -56);
      c.quadraticCurveTo(7, -48, 4, -50); c.quadraticCurveTo(3, -43, 8, -38);
      c.fillStyle = '#ffd34d'; c.fill();
      c.beginPath(); c.moveTo(-9, -64); c.lineTo(-2, -57); c.lineTo(5, -64); c.lineTo(12, -57); c.lineTo(16, -63);
      c.strokeStyle = '#ffd34d'; c.lineWidth = 2.5; c.stroke();
    },
    head(c, time) {
      headBase(c, this); eyes(c, this, time);
      const tips = [[-18, -96, -40, -122], [-8, -104, -22, -140], [4, -107, 2, -146], [15, -104, 22, -138], [24, -96, 38, -118]];
      tips.forEach(([bx, by, tx, ty], i) => {
        const f = Math.sin(time * 16 + i * 1.7) * 5, g = Math.cos(time * 13 + i) * 3;
        flame(c, bx, by, tx + f, ty + g, 11, '#ff3d17', '#ff9a1a');
      });
      tips.forEach(([bx, by, tx, ty], i) => {
        const f = Math.sin(time * 16 + i * 1.7) * 4;
        flame(c, bx, by + 2, bx + (tx - bx) * 0.6 + f, by + (ty - by) * 0.6, 6, '#ffb02e', '#fff2a0', true);
      });
      c.beginPath();
      c.moveTo(-21, -78); c.bezierCurveTo(-26, -110, 24, -118, 29, -89);
      c.lineTo(23, -94); c.lineTo(20, -88); c.lineTo(14, -96); c.lineTo(9, -88); c.lineTo(3, -97);
      c.lineTo(-4, -90); c.quadraticCurveTo(-13, -88, -14, -78); c.closePath();
      fs(c, lg(c, 0, -112, 0, -85, ['#ff7a2a', '#e0331a']));
    }
  };
  function flame(c, bx, by, tx, ty, w, c1, c2, noStroke) {
    const dx = tx - bx, dy = ty - by, L = Math.hypot(dx, dy) || 1, nx = -dy / L * w, ny = dx / L * w;
    c.beginPath(); c.moveTo(bx + nx, by + ny);
    c.quadraticCurveTo(bx + dx * 0.5 + nx * 1.3, by + dy * 0.5 + ny * 1.3, tx, ty);
    c.quadraticCurveTo(bx + dx * 0.5 - nx * 1.3, by + dy * 0.5 - ny * 1.3, bx - nx, by - ny);
    c.closePath();
    c.fillStyle = lg(c, bx, by, tx, ty, [c2, c1]);
    c.fill();
    if (!noStroke) { c.lineWidth = 2.5; c.strokeStyle = OL; c.stroke(); }
  }
  A.flame = flame;

  A._CH = CH; A._limb = limb; A._shoe = shoe; A._hand = hand; A._headBase = headBase; A._eyes = eyes; A._basicTorso = basicTorso; A._blink = blink;

  A.drawChar = function (c, id, x, y, o) {
    o = o || {};
    const D = CH[id] || CH.afei, time = o.time || 0, t = o.t || 0;
    const P = getPose(o.pose || 'idle', t, time);
    c.save();
    c.translate(x, y);
    if (o.scale) c.scale(o.scale, o.scale);
    if (o.alpha != null) c.globalAlpha *= o.alpha;
    c.translate(0, P.bob); c.translate(0, -32); c.rotate(P.rot + (o.rot || 0)); c.translate(0, 32);
    if (D.back) D.back(c, time, P, o);
    const lb = limb(c, -3, -32, P.lb[0], 16, P.lb[1], 15, 9.5, D.pantsB); shoe(c, lb, D.shoeB);
    const ab = limb(c, 0, -56, P.ab[0], 12, P.ab[1], 12, 7.5, D.sleeveB); hand(c, ab, D.handB);
    D.torso(c, time, P);
    const lf = limb(c, 3, -32, P.lf[0], 16, P.lf[1], 15, 9.5, D.pants); shoe(c, lf, D.shoe, 'rgba(255,255,255,.6)');
    if (D.over) D.over(c, time);
    D.head(c, time, o);
    const af = limb(c, 5, -56, P.af[0], 12, P.af[1], 12, 7.5, D.sleeve); hand(c, af, D.hand);
    if (D.handItem) D.handItem(c, af, time);
    c.restore();
  };

  // ---------- 坐骑 ----------
  A.mountDraw = {}; A.mountSaddle = {};
  A.saddle = function (id, o) {
    const sl = o.slide ? 0.7 : 1;
    if (A.mountSaddle[id]) return A.mountSaddle[id](o, sl);
    if (id === 'wheel') return { x: 0, y: -22, stand: true };
    if (id === 'unicorn') return { x: -6, y: -70 * sl };
    const bob = Math.sin((o.time || 0) * 5) * 3;
    return { x: -8, y: (-80 + bob) * sl };
  };

  A.drawMount = function (c, id, x, y, o) {
    o = o || {};
    c.save(); c.translate(x, y);
    if (o.alpha != null) c.globalAlpha *= o.alpha;
    if (o.scale) c.scale(o.scale, o.scale);
    if (id === 'wheel') drawWheels(c, o);
    else if (id === 'unicorn') drawUnicorn(c, o);
    else if (id === 'dragon') drawDragon(c, o);
    else if (A.mountDraw[id]) A.mountDraw[id](c, o);
    c.restore();
  };

  function drawWheels(c, o) {
    const time = o.time || 0, t = o.t || 0;
    for (const wx of [-14, 16]) {
      c.save(); c.translate(wx, -11);
      for (let i = 0; i < 4; i++) {
        const f = Math.sin(time * 20 + i * 1.6 + wx) * 4;
        flame(c, 4, -6 + i * 4, -26 - i * 3 + f, -10 + i * 6, 5, '#ff3d17', '#ffd34d', true);
      }
      c.save(); c.shadowColor = '#ff7a1a'; c.shadowBlur = 14;
      c.beginPath(); c.arc(0, 0, 12, 0, TAU); fs(c, rg(c, -3, -3, 1, 13, ['#ffe08a', '#e0461a', '#8a1e10']), 2.5);
      c.restore();
      c.save(); c.rotate(t * 1.4);
      c.strokeStyle = '#ffd34d'; c.lineWidth = 2;
      for (let k = 0; k < 4; k++) { c.rotate(Math.PI / 4); c.beginPath(); c.moveTo(-9, 0); c.lineTo(9, 0); c.stroke(); }
      c.restore();
      c.beginPath(); c.arc(0, 0, 4, 0, TAU); fs(c, '#ffd34d', 2);
      c.beginPath(); c.arc(0, 0, 14.5, 0, TAU); c.strokeStyle = 'rgba(255,170,40,.7)'; c.lineWidth = 2.5; c.stroke();
      c.restore();
    }
  }

  function drawUnicorn(c, o) {
    const t = o.t || 0, time = o.time || 0;
    if (o.slide) c.scale(1.08, 0.72);
    const air = o.air;
    const legs = [[-26, Math.PI + 0.5, '#d8d0f2'], [20, 0.5, '#d8d0f2'], [-16, Math.PI, '#ffffff'], [28, 0, '#ffffff']];
    // 尾巴（彩虹）
    const rb = ['#ff5a6a', '#ffb03a', '#ffe14d', '#5ee07a', '#4ab8ff', '#a56bff'];
    rb.forEach((col, i) => ribbon(c, -36, -64 + i * 3, 44 - i * 2, 6, 2, col, time, 10, 6, 0.3 + i * 0.05, i * 0.4));
    for (let i = 0; i < 4; i++) {
      const [lx, off, col] = legs[i];
      if (i === 2) {
        ell(c, 0, -54, 40, 20); fs(c, lg(c, 0, -74, 0, -34, ['#ffffff', '#e4dcf8']));
      }
      const ph = t + off;
      const a = air ? (i % 2 ? 0.9 : -0.7) : Math.sin(ph) * 0.65;
      const k = air ? 1.2 : 0.2 + 1.0 * Math.max(0, Math.cos(ph));
      const L = limb(c, lx, -46, a, 21, lx > 0 ? -k : k, 21, 9, col);
      c.beginPath(); c.arc(L.x2, L.y2, 5.5, 0, TAU); fs(c, '#ffc94a', 2);
    }
    // 脖子和头
    c.beginPath(); c.moveTo(18, -68); c.lineTo(34, -98); c.lineTo(50, -94); c.lineTo(40, -58); c.closePath();
    fs(c, lg(c, 0, -98, 0, -58, ['#ffffff', '#ebe4fb']));
    c.save(); c.translate(48, -98); c.rotate(0.45);
    ell(c, 0, 0, 18, 11.5); fs(c, '#ffffff');
    ell(c, 13, 2, 8, 8); fs(c, '#ffd9e8', 2.5);
    c.beginPath(); c.arc(15, 1, 1.4, 0, TAU); c.fillStyle = OL; c.fill();
    c.restore();
    c.beginPath(); c.moveTo(38, -108); c.lineTo(42, -122); c.lineTo(47, -106); c.closePath(); fs(c, '#f4eefc', 2.5);
    c.save(); c.shadowColor = '#ffe14d'; c.shadowBlur = 10;
    c.beginPath(); c.moveTo(45, -108); c.lineTo(56, -136); c.lineTo(52, -106); c.closePath();
    fs(c, lg(c, 45, -108, 56, -136, ['#ffb02e', '#fff2a0']), 2);
    c.restore();
    ell(c, 49, -101, 3.2, 4.2); c.fillStyle = OL; c.fill();
    c.beginPath(); c.arc(48.3, -102.5, 1.2, 0, TAU); c.fillStyle = '#fff'; c.fill();
    ell(c, 53, -94, 3, 1.6); c.fillStyle = 'rgba(255,110,160,.5)'; c.fill();
    // 鬃毛
    rb.forEach((col, i) => ribbon(c, 40 - i * 3.2, -110 + i * 5.5, 24, 7, 2, col, time, 12, 4, 0.5, i * 0.6));
    // 马鞍
    rr(c, -22, -77, 32, 11, 5); fs(c, lg(c, 0, -77, 0, -66, ['#ff7ac8', '#d9418f']), 2.5);
    c.beginPath(); c.moveTo(-6, -66); c.lineTo(-6, -46); c.strokeStyle = '#ffc94a'; c.lineWidth = 3; c.stroke();
  }

  function drawDragon(c, o) {
    const time = o.time || 0;
    const bob = Math.sin(time * 5) * 3;
    if (o.slide) c.scale(1.05, 0.7);
    c.translate(0, bob);
    const flap = Math.sin(time * 9) * 0.5;
    // 后翼
    c.save(); c.translate(-6, -64); c.rotate(-flap - 0.2);
    c.beginPath(); c.moveTo(0, 0); c.lineTo(-30, -52); c.lineTo(-62, -40); c.lineTo(-48, -22); c.lineTo(-56, -6); c.closePath();
    fs(c, lg(c, 0, -50, 0, 0, ['#1f7f86', '#145a62']));
    c.restore();
    // 尾巴
    ribbon(c, -32, -50, 56, 18, 4, '#23a69e', time, 6, 8, -0.1);
    c.beginPath(); c.moveTo(-86, -48 + Math.sin(time * 6 - 5) * 8); c.lineTo(-100, -58); c.lineTo(-96, -40); c.closePath();
    fs(c, '#ffb02e', 2);
    // 推进器火焰
    for (const tx of [-18, 14]) {
      const f = 12 + Math.sin(time * 30 + tx) * 4;
      c.beginPath(); c.moveTo(tx - 5, -38); c.lineTo(tx, -38 + f); c.lineTo(tx + 5, -38); c.closePath();
      c.fillStyle = 'rgba(80,240,255,.85)'; c.fill();
      rr(c, tx - 7, -44, 14, 8, 3); fs(c, '#41506b', 2);
    }
    // 身体
    ell(c, -2, -56, 40, 19); fs(c, lg(c, 0, -76, 0, -36, ['#4ff0c8', '#1a8f8a']));
    c.beginPath(); c.ellipse(-2, -48, 30, 9, 0, 0, Math.PI); c.fillStyle = 'rgba(255,255,255,.35)'; c.fill();
    c.strokeStyle = 'rgba(20,70,80,.6)'; c.lineWidth = 2;
    for (const ax of [-22, -8, 6]) { c.beginPath(); c.arc(ax, -60, 9, -2.4, -0.7); c.stroke(); }
    // 背刺
    for (let i = 0; i < 4; i++) {
      c.beginPath(); c.moveTo(-30 + i * 10, -72); c.lineTo(-26 + i * 10, -82); c.lineTo(-22 + i * 10, -73); c.closePath(); fs(c, '#ffb02e', 2);
    }
    // 脖子和头
    c.beginPath(); c.moveTo(24, -68); c.lineTo(38, -88); c.lineTo(48, -80); c.lineTo(36, -52); c.closePath();
    fs(c, '#2cc4b0');
    c.beginPath(); c.moveTo(32, -98); c.lineTo(58, -96); c.lineTo(74, -86); c.lineTo(66, -77); c.lineTo(42, -74); c.lineTo(30, -84); c.closePath();
    fs(c, lg(c, 0, -98, 0, -74, ['#5ff5d0', '#1f9a90']));
    c.beginPath(); c.moveTo(44, -77); c.lineTo(70, -80); c.strokeStyle = OL; c.lineWidth = 2; c.stroke();
    c.beginPath(); c.moveTo(34, -96); c.lineTo(18, -110); c.lineTo(28, -92); c.closePath(); fs(c, '#ffb02e', 2);
    c.beginPath(); c.moveTo(42, -97); c.lineTo(32, -112); c.lineTo(48, -96); c.closePath(); fs(c, '#ffb02e', 2);
    c.save(); c.shadowColor = '#ffe14d'; c.shadowBlur = 10;
    c.beginPath(); c.moveTo(46, -90); c.lineTo(58, -90); c.lineTo(54, -86); c.closePath(); c.fillStyle = '#fff36a'; c.fill();
    c.restore();
    // 爪子
    for (const lx of [-16, 16]) { c.beginPath(); c.moveTo(lx, -40); c.lineTo(lx + 6, -30); c.lineTo(lx + 10, -36); c.strokeStyle = OL; c.lineWidth = 5; c.stroke(); c.strokeStyle = '#1a8f8a'; c.lineWidth = 3; c.stroke(); }
    // 前翼
    c.save(); c.translate(0, -66); c.rotate(flap * 0.9);
    c.beginPath(); c.moveTo(0, 0); c.lineTo(-22, -48); c.lineTo(-52, -44); c.lineTo(-40, -24); c.lineTo(-44, -8); c.closePath();
    fs(c, lg(c, 0, -48, 0, 0, ['#4ff0c8', '#23a69e']));
    c.strokeStyle = 'rgba(20,70,80,.6)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(-40, -24); c.moveTo(0, 0); c.lineTo(-22, -48); c.stroke();
    c.restore();
    rr(c, -24, -80, 28, 9, 4); fs(c, '#41506b', 2.5);
  }

  // ---------- 障碍 ----------
  A.drawObs = function (c, o, x, time, theme) {
    const y = o.y, w = o.w, h = o.h;
    switch (o.type) {
      case 'box': {
        rr(c, x, y, w, h, 6); fs(c, lg(c, 0, y, 0, y + h, ['#f0b46a', '#b06a30']));
        rr(c, x + 6, y + 6, w - 12, h - 12, 3); c.strokeStyle = '#8a4c1e'; c.lineWidth = 3; c.stroke();
        c.beginPath(); c.moveTo(x + 8, y + 8); c.lineTo(x + w - 8, y + h - 8); c.moveTo(x + w - 8, y + 8); c.lineTo(x + 8, y + h - 8);
        c.lineWidth = 5; c.stroke();
        c.fillStyle = '#5a3312';
        for (const [nx, ny] of [[9, 9], [w - 9, 9], [9, h - 9], [w - 9, h - 9]]) { c.beginPath(); c.arc(x + nx, y + ny, 2.5, 0, TAU); c.fill(); }
        c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(x + 4, y + 3, w - 8, 3);
        break;
      }
      case 'spike': {
        rr(c, x - 4, y + h - 12, w + 8, 14, 4); fs(c, '#5a6178');
        const n = Math.max(2, Math.round(w / 22)), sw = w / n;
        for (let i = 0; i < n; i++) {
          const sx = x + i * sw;
          c.beginPath(); c.moveTo(sx, y + h - 10); c.lineTo(sx + sw / 2, y); c.lineTo(sx + sw, y + h - 10); c.closePath();
          fs(c, lg(c, sx, 0, sx + sw, 0, ['#f2f4fa', '#9aa2ba', '#5f6780']), 2.5);
          c.beginPath(); c.moveTo(sx + sw / 2, y + 3); c.lineTo(sx + sw / 2 - 3, y + h - 12);
          c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1.5; c.stroke();
        }
        c.save(); c.globalAlpha *= 0.8; c.fillStyle = '#ff3b4f';
        for (let i = 0; i < n; i++) { c.beginPath(); c.arc(x + i * sw + sw / 2, y + 4, 2.5, 0, TAU); c.fill(); }
        c.restore();
        break;
      }
      case 'wall': {
        rr(c, x, y, w, h, 8); fs(c, lg(c, x, 0, x + w, 0, ['#9aa6c4', '#6b7696', '#4c5574']));
        c.strokeStyle = 'rgba(30,30,60,.45)'; c.lineWidth = 2;
        for (let by = y + 22, r = 0; by < y + h - 4; by += 22, r++) {
          c.beginPath(); c.moveTo(x + 3, by); c.lineTo(x + w - 3, by); c.stroke();
          const ox = r % 2 ? w / 2 : w / 4;
          c.beginPath(); c.moveTo(x + ox, by - 22); c.lineTo(x + ox, by); c.stroke();
        }
        c.beginPath(); c.moveTo(x - 3, y + 10);
        for (let i = 0; i <= 6; i++) c.quadraticCurveTo(x + i * w / 6 - w / 12, y - 6, x + i * w / 6, y + 6 + (i % 2) * 6);
        c.lineTo(x + w + 3, y + 10); c.lineTo(x + w, y); c.lineTo(x, y); c.closePath();
        fs(c, '#5fc24a', 2.5);
        // 警示眼睛
        c.fillStyle = '#ffde3a';
        c.beginPath(); c.arc(x + w * 0.32, y + 52, 5, 0, TAU); c.arc(x + w * 0.68, y + 52, 5, 0, TAU); c.fill();
        break;
      }
      case 'bar': {
        const by = y + h - 36;
        c.strokeStyle = '#6b6b80'; c.lineWidth = 4;
        for (const cx of [x + 14, x + w - 14]) {
          for (let ly = Math.max(-10, y); ly < by; ly += 14) { ell(c, cx, ly + 7, 4, 7); c.stroke(); }
        }
        rr(c, x - 6, by, w + 12, 36, 8); fs(c, lg(c, 0, by, 0, by + 36, ['#ffd24a', '#e0941c']));
        c.save(); rr(c, x - 3, by + 3, w + 6, 30, 6); c.clip();
        c.fillStyle = '#2b2440';
        for (let sx = x - 40; sx < x + w + 30; sx += 26) {
          c.beginPath(); c.moveTo(sx, by + 36); c.lineTo(sx + 13, by + 36); c.lineTo(sx + 33, by); c.lineTo(sx + 20, by); c.closePath(); c.fill();
        }
        c.restore();
        rr(c, x - 6, by, w + 12, 36, 8); c.lineWidth = 3; c.strokeStyle = OL; c.stroke();
        break;
      }
      case 'bird': {
        const cx = x + w / 2, cy = y + h / 2, fl = Math.sin(time * 18 + o.ph) * 0.8;
        c.save(); c.translate(cx, cy);
        c.save(); c.rotate(-0.4 - fl);
        ell(c, 10, -14, 22, 9, -0.6); fs(c, '#7b3fc4', 2.5); c.restore();
        ell(c, 0, 0, 25, 20); fs(c, lg(c, 0, -20, 0, 20, ['#a668ff', '#6a2fc0']));
        ell(c, 2, 8, 15, 9); c.fillStyle = '#e7d3ff'; c.fill();
        c.beginPath(); c.moveTo(18, -4); c.lineTo(34, -8); c.lineTo(32, 4); c.closePath(); fs(c, '#6a2fc0', 2);
        c.beginPath(); c.moveTo(-22, -6); c.lineTo(-36, -2); c.lineTo(-22, 4); c.closePath(); fs(c, '#ffb02e', 2.5);
        for (const ex of [-12, 0]) {
          ell(c, ex, -6, 5, 6); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 2; c.strokeStyle = OL; c.stroke();
          c.beginPath(); c.arc(ex - 2, -5, 2.4, 0, TAU); c.fillStyle = '#1a1020'; c.fill();
        }
        c.beginPath(); c.moveTo(-19, -15); c.lineTo(-8, -11); c.moveTo(5, -11); c.lineTo(-4, -13);
        c.strokeStyle = OL; c.lineWidth = 2.5; c.stroke();
        c.save(); c.rotate(0.3 + fl);
        ell(c, 6, -16, 20, 8, -0.8); fs(c, '#8d4fe0', 2.5); c.restore();
        c.restore();
        break;
      }
      case 'crysT': case 'crysB': {
        const top = o.type === 'crysT';
        c.save(); c.shadowColor = '#b06bff'; c.shadowBlur = 18;
        c.beginPath();
        if (top) {
          c.moveTo(x, y); c.lineTo(x + w, y); c.lineTo(x + w, y + h - 30); c.lineTo(x + w * 0.7, y + h - 10);
          c.lineTo(x + w * 0.5, y + h); c.lineTo(x + w * 0.3, y + h - 14); c.lineTo(x, y + h - 30);
        } else {
          c.moveTo(x, y + h); c.lineTo(x + w, y + h); c.lineTo(x + w, y + 30); c.lineTo(x + w * 0.72, y + 12);
          c.lineTo(x + w * 0.5, y); c.lineTo(x + w * 0.28, y + 16); c.lineTo(x, y + 30);
        }
        c.closePath(); fs(c, lg(c, x, 0, x + w, 0, ['rgba(214,170,255,.95)', 'rgba(140,90,240,.95)', 'rgba(90,50,190,.95)']));
        c.restore();
        c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2;
        c.beginPath();
        if (top) { c.moveTo(x + w * 0.5, y); c.lineTo(x + w * 0.5, y + h); c.moveTo(x + w * 0.22, y); c.lineTo(x + w * 0.3, y + h - 16); }
        else { c.moveTo(x + w * 0.5, y + h); c.lineTo(x + w * 0.5, y); c.moveTo(x + w * 0.22, y + h); c.lineTo(x + w * 0.28, y + 18); }
        c.stroke();
        break;
      }
      case 'mine': {
        const cx = x + w / 2, cy = y + h / 2;
        c.save(); c.translate(cx, cy); c.rotate(time * 1.5 + o.ph);
        for (let i = 0; i < 8; i++) {
          c.rotate(TAU / 8);
          c.beginPath(); c.moveTo(-5, -18); c.lineTo(0, -32); c.lineTo(5, -18); c.closePath(); fs(c, '#9aa2ba', 2);
        }
        c.restore();
        c.beginPath(); c.arc(cx, cy, 22, 0, TAU); fs(c, rg(c, cx - 7, cy - 7, 2, 24, ['#6b6f84', '#2c2f40']));
        c.save(); c.globalAlpha *= 0.5 + 0.5 * Math.sin(time * 8 + o.ph); c.shadowColor = '#ff2a2a'; c.shadowBlur = 16;
        c.beginPath(); c.arc(cx, cy, 7, 0, TAU); c.fillStyle = '#ff4040'; c.fill(); c.restore();
        break;
      }
    }
  };

  // ---------- 金币与道具 ----------
  A.drawCoin = function (c, x, y, time, kind) {
    if (kind === 'star') {
      c.save(); c.shadowColor = '#ff8ad8'; c.shadowBlur = 10;
      star(c, x, y, 15, 7, 5, time * 2); fs(c, lg(c, 0, y - 15, 0, y + 15, ['#fff0fa', '#ff6fc0']), 2.5);
      c.restore(); return;
    }
    const sx = Math.abs(Math.cos(time * 4 + x * 0.013));
    c.save(); c.translate(x, y); c.scale(0.25 + sx * 0.75, 1);
    c.beginPath(); c.arc(0, 0, 14, 0, TAU); fs(c, lg(c, 0, -14, 0, 14, ['#fff3a0', '#ffc61a', '#e08a00']), 2.5);
    c.beginPath(); c.arc(0, 0, 9, 0, TAU); c.strokeStyle = 'rgba(160,80,0,.6)'; c.lineWidth = 2; c.stroke();
    star(c, 0, 0.5, 6, 2.6, 5, 0); c.fillStyle = '#fff6c4'; c.fill();
    c.restore();
  };

  A.drawItem = function (c, type, x, y, time, r) {
    r = r || 26;
    const b = Math.sin(time * 3 + x * 0.01) * 4;
    c.save(); c.translate(x, y + b);
    c.beginPath(); c.arc(0, 0, r, 0, TAU);
    c.fillStyle = rg(c, -r * 0.3, -r * 0.3, 2, r, ['rgba(255,255,255,.95)', 'rgba(170,230,255,.55)', 'rgba(90,160,255,.4)']);
    c.fill(); c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,.95)'; c.stroke();
    const s = r / 26; c.scale(s, s);
    drawItemIcon(c, type, time);
    c.beginPath(); c.ellipse(-9, -12, 7, 4, -0.6, 0, TAU); c.fillStyle = 'rgba(255,255,255,.8)'; c.fill();
    c.restore();
  };
  function drawItemIcon(c, type, time) {
    switch (type) {
      case 'magnet':
        c.beginPath(); c.arc(0, -2, 12, Math.PI, 0); c.lineTo(12, 10); c.lineTo(5, 10); c.lineTo(5, -2);
        c.arc(0, -2, 5, 0, Math.PI, true); c.lineTo(-5, 10); c.lineTo(-12, 10); c.closePath(); fs(c, '#ff3b4f', 2.5);
        c.fillStyle = '#e8ecf6'; c.fillRect(-12, 5, 7, 5); c.fillRect(5, 5, 7, 5);
        break;
      case 'shield':
        c.beginPath(); c.moveTo(0, -15); c.lineTo(13, -9); c.quadraticCurveTo(12, 8, 0, 15); c.quadraticCurveTo(-12, 8, -13, -9); c.closePath();
        fs(c, lg(c, 0, -15, 0, 15, ['#8fe9ff', '#2a8fff']), 2.5);
        star(c, 0, 0, 6, 2.6, 5, 0); c.fillStyle = '#fff'; c.fill();
        break;
      case 'dash':
        for (const ox of [-8, 4]) {
          c.beginPath(); c.moveTo(ox - 4, -12); c.lineTo(ox + 8, 0); c.lineTo(ox - 4, 12); c.lineTo(ox - 10, 12); c.lineTo(ox + 2, 0); c.lineTo(ox - 10, -12); c.closePath();
          fs(c, '#ff8a1f', 2.5);
        }
        break;
      case 'giant':
        c.beginPath(); c.moveTo(-15, 2); c.quadraticCurveTo(-15, -15, 0, -15); c.quadraticCurveTo(15, -15, 15, 2); c.closePath(); fs(c, '#ff3b4f', 2.5);
        rr(c, -6, 2, 12, 12, 4); fs(c, '#fff3e0', 2.5);
        c.fillStyle = '#fff'; for (const [dx, dy, dr] of [[-7, -6, 3], [5, -9, 2.5], [8, -2, 2]]) { c.beginPath(); c.arc(dx, dy, dr, 0, TAU); c.fill(); }
        break;
      case 'double':
        c.font = '900 22px "ZCOOL KuaiLe","PingFang SC",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.lineWidth = 5; c.strokeStyle = OL; c.strokeText('×2', 0, 1); c.fillStyle = '#ffc61a'; c.fillText('×2', 0, 1);
        break;
      case 'flight':
        for (const sgn of [-1, 1]) {
          c.save(); c.scale(sgn, 1);
          c.beginPath(); c.moveTo(2, 4); c.quadraticCurveTo(8, -16, 18, -12); c.quadraticCurveTo(16, -4, 12, -2);
          c.quadraticCurveTo(16, 2, 10, 6); c.quadraticCurveTo(8, 8, 2, 4); c.closePath(); fs(c, '#ffffff', 2.5);
          c.restore();
        }
        break;
      case 'mount':
        ell(c, 0, 2, 11, 14); fs(c, lg(c, 0, -12, 0, 16, ['#fff8e8', '#ffd38a']), 2.5);
        c.fillStyle = '#ff7ac8'; c.beginPath(); c.arc(-4, -2, 3, 0, TAU); c.arc(5, 6, 2.5, 0, TAU); c.fill();
        c.fillStyle = '#4ab8ff'; c.beginPath(); c.arc(4, -6, 2, 0, TAU); c.arc(-4, 9, 2, 0, TAU); c.fill();
        break;
    }
  }
  A.drawItemIcon = drawItemIcon;

  // ---------- 场景 ----------
  function cloud(c, x, y, s, col) {
    c.fillStyle = col || '#fff';
    c.beginPath();
    c.arc(x, y, 26 * s, 0, TAU); c.arc(x + 30 * s, y - 14 * s, 32 * s, 0, TAU);
    c.arc(x + 64 * s, y - 4 * s, 26 * s, 0, TAU); c.arc(x + 34 * s, y + 8 * s, 26 * s, 0, TAU);
    c.fill();
  }
  function ridge(c, off, base, parts, step) {
    c.beginPath(); c.moveTo(0, H);
    for (let x = 0; x <= W + step; x += step) {
      const wx = x + off; let y = base;
      for (const [f, a, p] of parts) y += Math.sin(wx * f + p) * a;
      c.lineTo(x, y);
    }
    c.lineTo(W, H); c.closePath();
  }
  function repeat(off, spacing, fn) {
    const k0 = Math.floor(off / spacing) - 1, k1 = Math.floor((off + W) / spacing) + 1;
    for (let k = k0; k <= k1; k++) fn(k * spacing - off, k);
  }
  function tree(c, x, y, s, col) {
    c.fillStyle = '#7a4a2a'; c.fillRect(x - 4 * s, y - 30 * s, 8 * s, 30 * s);
    c.fillStyle = col;
    c.beginPath(); c.arc(x, y - 44 * s, 22 * s, 0, TAU); c.arc(x - 14 * s, y - 32 * s, 16 * s, 0, TAU); c.arc(x + 14 * s, y - 32 * s, 16 * s, 0, TAU); c.fill();
  }

  A.drawBG = function (c, theme, cam, time) {
    if (theme === 'speed') return bgSpeed(c, cam, time);
    if (theme === 'fly') return bgFly(c, cam, time);
    if (theme === 'race') return bgRace(c, cam, time);
    bgClassic(c, cam, time);
  };

  function bgClassic(c, cam) {
    c.fillStyle = lg(c, 0, 0, 0, G, ['#46b6ff', '#9fdcff', '#e3f6ff']); c.fillRect(0, 0, W, H);
    c.fillStyle = rg(c, 1050, 120, 10, 190, ['rgba(255,255,220,1)', 'rgba(255,250,200,.5)', 'rgba(255,250,200,0)']);
    c.fillRect(800, 0, 480, 360);
    c.beginPath(); c.arc(1050, 120, 46, 0, TAU); c.fillStyle = '#fffbe0'; c.fill();
    repeat(cam * 0.06, 420, (x, k) => cloud(c, x, 90 + hash(k) * 110, 0.8 + hash(k + 3) * 0.6, 'rgba(255,255,255,.9)'));
    ridge(c, cam * 0.1, 380, [[0.004, 50, 0], [0.011, 22, 1]], 20); c.fillStyle = '#a9c7f0'; c.fill();
    ridge(c, cam * 0.22, 460, [[0.006, 30, 2], [0.017, 12, 0]], 16); c.fillStyle = '#86d27a'; c.fill();
    repeat(cam * 0.22, 150, (x, k) => { if (hash(k) > 0.45) tree(c, x, 470 + Math.sin((x + cam * 0.22) * 0.006 + 2) * 30, 0.8 + hash(k + 1) * 0.5, '#4fb04a'); });
    ridge(c, cam * 0.45, 545, [[0.008, 16, 1], [0.02, 6, 3]], 16); c.fillStyle = '#5cbf4f'; c.fill();
    repeat(cam * 0.45, 110, (x, k) => {
      if (hash(k * 3) > 0.5) {
        c.fillStyle = '#3e9e3c'; c.beginPath(); c.arc(x, 560, 18, Math.PI, 0); c.arc(x + 20, 560, 14, Math.PI, 0); c.fill();
        if (hash(k) > 0.7) { c.fillStyle = ['#ff7ac8', '#ffe14d', '#fff'][k & 1 ? 0 : 1]; c.beginPath(); c.arc(x + 6, 548, 3.5, 0, TAU); c.fill(); }
      }
    });
  }

  function bgSpeed(c, cam) {
    c.fillStyle = lg(c, 0, 0, 0, G, ['#3a1d6e', '#c4407a', '#ff8a4a', '#ffd27a']); c.fillRect(0, 0, W, H);
    c.beginPath(); c.arc(900, 420, 150, 0, TAU); c.fillStyle = lg(c, 0, 270, 0, 570, ['#fff3a0', '#ff7a4a']); c.fill();
    c.fillStyle = 'rgba(196,64,122,.6)';
    for (let i = 0; i < 6; i++) c.fillRect(740, 380 + i * 22, 320, 6 + i);
    repeat(cam * 0.12, 70, (x, k) => {
      const h = 120 + hash(k) * 180;
      c.fillStyle = '#5a2a7a'; c.fillRect(x, 560 - h, 64, h);
    });
    repeat(cam * 0.3, 110, (x, k) => {
      const h = 90 + hash(k + 7) * 200, bw = 90;
      c.fillStyle = '#2a1745'; c.fillRect(x, 580 - h, bw, h + 30);
      c.fillStyle = 'rgba(255,214,110,.75)';
      for (let wy = 580 - h + 14; wy < 570; wy += 22)
        for (let wx = 10; wx < bw - 10; wx += 18) if (hash(k * 31 + wx + wy) > 0.45) c.fillRect(x + wx, wy, 8, 10);
    });
  }

  function bgFly(c, cam, time) {
    c.fillStyle = lg(c, 0, 0, 0, H, ['#2a6fe0', '#62b4ff', '#c6ecff']); c.fillRect(0, 0, W, H);
    repeat(cam * 0.05, 520, (x, k) => cloud(c, x, 130 + hash(k) * 200, 1.4 + hash(k + 1), 'rgba(255,255,255,.55)'));
    repeat(cam * 0.1, 640, (x, k) => {
      if (hash(k + 5) < 0.35) return;
      const y = 130 + hash(k) * 160, s = 0.4 + hash(k + 2) * 0.3;
      c.save(); c.globalAlpha = 0.55; c.translate(x, y + Math.sin(time + k) * 6); c.scale(s, s);
      c.beginPath(); c.moveTo(-90, 0); c.quadraticCurveTo(0, 20, 90, 0); c.lineTo(30, 70); c.lineTo(0, 110); c.lineTo(-30, 60); c.closePath();
      c.fillStyle = '#a77a5a'; c.fill();
      c.beginPath(); c.ellipse(0, 0, 92, 14, 0, 0, TAU); c.fillStyle = '#7fd26a'; c.fill();
      tree(c, -40, -4, 0.7, '#4fb04a'); tree(c, 30, -4, 0.9, '#5cbf4f');
      c.restore();
    });
    repeat(cam * 0.35, 380, (x, k) => cloud(c, x, 420 + hash(k + 9) * 140, 0.9 + hash(k) * 0.6, 'rgba(255,255,255,.8)'));
  }

  function bgRace(c, cam, time) {
    c.fillStyle = lg(c, 0, 0, 0, G, ['#1b1f5a', '#5a2f8a', '#e0679a', '#ffb07a']); c.fillRect(0, 0, W, H);
    c.fillStyle = '#fff';
    for (let i = 0; i < 40; i++) {
      c.globalAlpha = 0.4 + 0.4 * Math.sin(time * 2 + i);
      c.fillRect(hash(i) * W, hash(i + 50) * 260, 2, 2);
    }
    c.globalAlpha = 1;
    ridge(c, cam * 0.08, 400, [[0.005, 40, 0], [0.013, 18, 2]], 20); c.fillStyle = '#4a2a6a'; c.fill();
    // 看台
    repeat(cam * 0.3, 360, (x, k) => {
      c.fillStyle = '#2a1a48';
      c.beginPath(); c.moveTo(x, 560); c.lineTo(x + 40, 470); c.lineTo(x + 320, 470); c.lineTo(x + 360, 560); c.closePath(); c.fill();
      for (let r = 0; r < 4; r++) for (let i = 0; i < 14; i++) {
        c.fillStyle = ['#ff6a8a', '#ffe14d', '#4ab8ff', '#7cf08a'][(i + r + k) & 3];
        c.beginPath(); c.arc(x + 56 + i * 20 + r * 4, 488 + r * 18 + Math.sin(time * 8 + i + r) * 2, 4, 0, TAU); c.fill();
      }
      c.fillStyle = '#55557a'; c.fillRect(x + 20, 360, 6, 110);
      c.save(); c.shadowColor = '#fff7c0'; c.shadowBlur = 20; c.fillStyle = '#fff7c0'; rr(c, x + 6, 350, 34, 14, 4); c.fill(); c.restore();
    });
    // 彩旗
    const off = cam * 0.5;
    c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 2;
    repeat(off, 300, (x) => {
      c.beginPath(); c.moveTo(x, 300); c.quadraticCurveTo(x + 150, 340, x + 300, 300); c.stroke();
      for (let i = 1; i < 10; i++) {
        const u = i / 10, fx = x + u * 300, fy = 300 + Math.sin(u * Math.PI) * 20;
        c.fillStyle = ['#ff5a6a', '#ffe14d', '#4ab8ff'][i % 3];
        c.beginPath(); c.moveTo(fx - 7, fy); c.lineTo(fx + 7, fy); c.lineTo(fx, fy + 16); c.closePath(); c.fill();
      }
    });
  }

  // 地面（含坑洞）
  A.drawGround = function (c, theme, cam, pits, time) {
    if (theme === 'fly') {
      c.fillStyle = lg(c, 0, G - 20, 0, H, ['#ffffff', '#d6ecff']);
      c.beginPath(); c.moveTo(0, H);
      for (let x = 0; x <= W + 30; x += 30) c.lineTo(x, G + 6 + Math.sin((x + cam) * 0.03) * 8 + Math.sin((x + cam) * 0.011 + time) * 6);
      c.lineTo(W, H); c.closePath(); c.fill();
      return;
    }
    c.fillStyle = lg(c, 0, G, 0, H, ['#1a1030', '#05020c']); c.fillRect(0, G, W, H - G);
    const segs = []; let sx = -50;
    const ps = pits.filter(p => p.x + p.w > cam - 50 && p.x < cam + W + 50).sort((a, b) => a.x - b.x);
    for (const p of ps) { segs.push([sx, p.x - cam]); sx = p.x + p.w - cam; }
    segs.push([sx, W + 50]);
    for (const [a, b] of segs) {
      if (b - a < 2) continue;
      const pal = {
        classic: ['#c47f47', '#9a5a2e', '#78d64e', '#5bb33a'],
        speed: ['#45435a', '#2c2a3c', '#d24a5a', '#ffffff'],
        race: ['#c9573f', '#9a3a2a', '#5fc24a', '#3d9a34']
      }[theme] || ['#c47f47', '#9a5a2e', '#78d64e', '#5bb33a'];
      rr(c, a, G, b - a, H - G + 20, 10); c.fillStyle = lg(c, 0, G, 0, H, [pal[0], pal[1]]); c.fill();
      c.save(); rr(c, a, G, b - a, H - G + 20, 10); c.clip();
      if (theme === 'classic') {
        c.fillStyle = 'rgba(90,50,20,.35)';
        repeat(cam, 60, (x, k) => { if (x > a - 20 && x < b + 20) { ell(c, x + hash(k) * 30, G + 40 + hash(k + 1) * 70, 8, 5); c.fill(); } });
        c.fillStyle = pal[2]; c.fillRect(a, G, b - a, 18);
        c.fillStyle = pal[3]; c.fillRect(a, G + 16, b - a, 6);
        c.fillStyle = pal[2];
        repeat(cam, 24, (x) => { if (x > a && x < b) { c.beginPath(); c.arc(x, G + 22, 7, 0, Math.PI); c.fill(); } });
      } else if (theme === 'speed') {
        c.fillStyle = '#ffd24a';
        repeat(cam, 160, (x) => c.fillRect(x, G + 60, 80, 8));
        repeat(cam, 40, (x, k) => { c.fillStyle = k & 1 ? pal[2] : pal[3]; c.fillRect(x, G, 40, 14); });
      } else {
        c.fillStyle = 'rgba(255,255,255,.8)'; c.fillRect(a, G + 36, b - a, 4); c.fillRect(a, G + 84, b - a, 4);
        c.fillStyle = pal[2]; c.fillRect(a, G, b - a, 14);
        c.fillStyle = pal[3]; c.fillRect(a, G + 12, b - a, 4);
      }
      c.restore();
      rr(c, a, G, b - a, H - G + 20, 10); c.lineWidth = 3; c.strokeStyle = OL; c.stroke();
    }
  };

  A.drawPlat = function (c, x, y, w, theme) {
    rr(c, x, y, w, 26, 10); fs(c, lg(c, 0, y, 0, y + 26, theme === 'speed' ? ['#8a8aa8', '#55556e'] : ['#d9965a', '#9a5a2e']));
    c.fillStyle = theme === 'speed' ? '#ffd24a' : '#78d64e';
    rr(c, x, y - 2, w, 10, 5); c.fill(); c.lineWidth = 2.5; c.strokeStyle = OL; c.stroke();
    c.fillStyle = 'rgba(0,0,0,.2)';
    for (let i = 1; i < w / 40; i++) c.fillRect(x + i * 40, y + 10, 3, 14);
  };

  A.drawFinish = function (c, x) {
    for (const px of [x - 8, x + 120]) { c.fillStyle = '#ddd'; c.fillRect(px, 330, 10, G - 330); }
    c.fillStyle = '#fff'; c.fillRect(x - 10, 320, 142, 50);
    for (let i = 0; i < 14; i++) for (let j = 0; j < 5; j++) if ((i + j) % 2) { c.fillStyle = '#222'; c.fillRect(x - 10 + i * 10.15, 320 + j * 10, 10.15, 10); }
    c.font = '900 26px "ZCOOL KuaiLe","PingFang SC",sans-serif'; c.textAlign = 'center';
    c.lineWidth = 6; c.strokeStyle = OL; c.strokeText('终 点', x + 61, 308); c.fillStyle = '#ffe14d'; c.fillText('终 点', x + 61, 308);
    c.save(); c.globalAlpha = 0.5;
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) if ((i + j) % 2) { c.fillStyle = '#fff'; c.fillRect(x + i * 20, G + j * 20, 20, 20); }
    c.restore();
  };
})();
