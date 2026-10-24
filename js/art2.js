// 扩展美术：参数化角色、新坐骑、宠物、钻石
(function () {
  'use strict';
  const A = KP.art, CH = A._CH, OL = A.OL, TAU = Math.PI * 2;
  const { rr, lg, rg, ell, fs, star, ribbon, flame } = A;
  const limb = A._limb;

  // ---------- 颜色工具 ----------
  function hex(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(x => x + x).join(''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); }
  function mix(a, b, t) { const x = hex(a), y = hex(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
  const dark = (c, t) => mix(c, '#1a1020', t == null ? 0.25 : t);
  const light = (c, t) => mix(c, '#ffffff', t == null ? 0.35 : t);
  A.mix = mix; A.dark = dark; A.light = light;

  // ======================================================
  //                     参数化角色
  // ======================================================
  const SKINS = [['#ffe2c6', '#f3bf9a'], ['#ffeadc', '#f8c6b2'], ['#f2c49a', '#d99a6a'], ['#ecd6ff', '#c9a8ea']];

  function frontHair(c, a) {
    const [h1, h2] = a.hairCol, fill = lg(c, 0, -118, 0, -80, [h1, h2]);
    c.beginPath();
    switch (a.hair) {
      case 'spiky':
        c.moveTo(-20, -76); c.quadraticCurveTo(-27, -94, -15, -104);
        c.lineTo(-31, -112); c.lineTo(-10, -112); c.lineTo(-18, -126); c.lineTo(2, -114); c.lineTo(8, -130);
        c.lineTo(14, -112); c.lineTo(29, -119); c.lineTo(25, -103); c.quadraticCurveTo(31, -97, 28, -90);
        c.lineTo(22, -96); c.lineTo(17, -88); c.lineTo(11, -97); c.lineTo(4, -89); c.lineTo(-3, -96);
        c.quadraticCurveTo(-12, -88, -14, -77); break;
      case 'messy':
        c.moveTo(-21, -76); c.bezierCurveTo(-30, -104, -10, -120, 6, -114);
        c.lineTo(10, -124); c.lineTo(16, -112); c.lineTo(26, -116); c.lineTo(25, -104);
        c.quadraticCurveTo(31, -96, 28, -88); c.lineTo(22, -94); c.lineTo(18, -86); c.lineTo(12, -95);
        c.lineTo(5, -88); c.lineTo(0, -97); c.quadraticCurveTo(-12, -90, -14, -77); break;
      case 'short':
        c.moveTo(-20, -78); c.bezierCurveTo(-26, -112, 24, -118, 28, -92);
        c.quadraticCurveTo(22, -97, 16, -95); c.quadraticCurveTo(8, -100, 0, -96);
        c.quadraticCurveTo(-10, -92, -14, -78); break;
      case 'none': return;
      default: // bob / long / twin / pony
        c.moveTo(-21, -74); c.bezierCurveTo(-28, -112, 22, -122, 29, -86);
        c.quadraticCurveTo(25, -90, 22, -96); c.quadraticCurveTo(19, -88, 12, -94);
        c.quadraticCurveTo(8, -87, 1, -95); c.quadraticCurveTo(-5, -88, -10, -92);
        c.quadraticCurveTo(-14, -84, -14, -74);
    }
    c.closePath(); fs(c, fill);
    c.beginPath(); c.moveTo(-6, -110); c.quadraticCurveTo(4, -114, 12, -108);
    c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 2.5; c.stroke();
  }

  function backHair(c, a, time) {
    const [h1, h2] = a.hairCol, sw = Math.sin(time * 7) * 4;
    switch (a.hair) {
      case 'long':
        c.beginPath(); c.moveTo(-22, -96);
        c.bezierCurveTo(-34, -80, -34 + sw * 0.5, -60, -28 + sw, -48);
        c.lineTo(6, -52); c.quadraticCurveTo(20, -70, 22, -100); c.closePath();
        fs(c, lg(c, 0, -100, 0, -48, [h1, h2])); break;
      case 'bob':
        ell(c, 0, -82, 27, 22); fs(c, h2); break;
      case 'pony':
        ribbon(c, -18, -102, 40, 16, 4, h2, time, 9, 6, 0.6); break;
      case 'twin':
        for (const [bx, by, tx] of [[-14, -98, -36], [18, -103, 6]]) {
          c.beginPath(); c.moveTo(bx - 6, by);
          c.bezierCurveTo(bx - 18, by + 8, tx - 8 + sw, by + 26, tx + sw, by + 42);
          c.bezierCurveTo(tx + 10 + sw, by + 26, bx + 6, by + 12, bx + 6, by);
          c.closePath(); fs(c, lg(c, 0, by, 0, by + 42, [h1, h2]));
        }
        break;
    }
  }

  function headwear(c, a, time) {
    const hc = a.headCol || '#e8424a';
    switch (a.head) {
      case 'headband':
        c.beginPath(); c.moveTo(-19, -95); c.quadraticCurveTo(5, -104, 27, -98);
        c.strokeStyle = OL; c.lineWidth = 8; c.stroke(); c.strokeStyle = hc; c.lineWidth = 4.5; c.stroke();
        ribbon(c, -19, -95, 26, 6, 2, hc, time, 14, 4, 0.3); break;
      case 'tiara':
        c.beginPath(); c.moveTo(-6, -103); c.lineTo(-3, -114); c.lineTo(2, -106); c.lineTo(6, -118); c.lineTo(10, -106);
        c.lineTo(15, -114); c.lineTo(18, -103); c.closePath(); fs(c, lg(c, 0, -118, 0, -103, ['#fff6c0', '#e0b02a']), 2);
        c.save(); c.shadowColor = '#9ff0ff'; c.shadowBlur = 8; c.beginPath(); c.arc(6, -109, 3, 0, TAU); c.fillStyle = '#9ff0ff'; c.fill(); c.restore(); break;
      case 'wizard':
        c.save(); c.translate(4, -106); c.rotate(-0.18);
        c.beginPath(); c.moveTo(-18, 2); c.quadraticCurveTo(-6, -22, -24, -48); c.quadraticCurveTo(6, -30, 18, 2); c.closePath();
        fs(c, lg(c, 0, -48, 0, 2, [light(hc, 0.2), dark(hc)]));
        ell(c, 0, 2, 28, 6); fs(c, dark(hc, 0.1));
        star(c, 2, -16, 6, 2.6, 5, 0.2); fs(c, '#ffe14d', 1.5);
        star(c, -8, -30, 3.5, 1.5, 5, 0); c.fillStyle = '#ffe14d'; c.fill();
        c.restore(); break;
      case 'ears_fox': case 'ears_cat': {
        const col = a.head === 'ears_fox' ? a.hairCol[0] : hc;
        for (const [x, r] of [[-12, -0.35], [16, 0.3]]) {
          c.save(); c.translate(x, -102); c.rotate(r);
          c.beginPath(); c.moveTo(-9, 4); c.lineTo(0, -20); c.lineTo(9, 4); c.closePath(); fs(c, col, 2.5);
          c.beginPath(); c.moveTo(-4, 2); c.lineTo(0, -12); c.lineTo(4, 2); c.closePath(); c.fillStyle = a.head === 'ears_fox' ? '#fff' : '#ffc2d6'; c.fill();
          c.restore();
        }
        break;
      }
      case 'ears_bunny':
        for (const [x, r] of [[-8, -0.3], [12, 0.15]]) {
          c.save(); c.translate(x, -104); c.rotate(r + Math.sin(time * 5 + x) * 0.05);
          ell(c, 0, -20, 7, 22); fs(c, '#ffffff', 2.5); ell(c, 0, -18, 3.5, 15); c.fillStyle = '#ffc2d6'; c.fill();
          c.restore();
        }
        break;
      case 'ears_panda':
        for (const x of [-14, 18]) { c.beginPath(); c.arc(x, -104, 8, 0, TAU); fs(c, '#2a2a2a', 2.5); }
        break;
      case 'halo':
        c.save(); c.shadowColor = '#ffe14d'; c.shadowBlur = 16;
        ell(c, 4, -122 + Math.sin(time * 3) * 2, 18, 5); c.strokeStyle = '#ffe14d'; c.lineWidth = 4; c.stroke();
        c.restore(); break;
      case 'horns_devil':
        for (const s of [-1, 1]) {
          const x = s < 0 ? -10 : 16;
          c.beginPath(); c.moveTo(x - 5, -104); c.quadraticCurveTo(x + s * 4, -118, x + s * 10, -126); c.quadraticCurveTo(x + s * 2, -112, x + 5, -102); c.closePath();
          fs(c, lg(c, 0, -126, 0, -102, ['#ff6a8a', '#8a1a3a']), 2.5);
        }
        break;
      case 'horns_dragon':
        for (const x of [-10, 16]) {
          c.beginPath(); c.moveTo(x, -104); c.lineTo(x - 6, -124); c.moveTo(x - 3, -114); c.lineTo(x - 12, -118); c.moveTo(x - 5, -120); c.lineTo(x + 2, -130);
          c.strokeStyle = OL; c.lineWidth = 7; c.stroke(); c.strokeStyle = '#ffd24a'; c.lineWidth = 3.5; c.stroke();
        }
        break;
      case 'pirate':
        c.beginPath(); c.moveTo(-26, -100); c.quadraticCurveTo(4, -92, 32, -102); c.quadraticCurveTo(22, -112, 18, -122);
        c.quadraticCurveTo(4, -114, -10, -122); c.quadraticCurveTo(-14, -110, -26, -100); c.closePath();
        fs(c, lg(c, 0, -122, 0, -96, ['#3a3a4a', '#14141e']));
        c.beginPath(); c.moveTo(-22, -101); c.quadraticCurveTo(4, -94, 28, -103); c.strokeStyle = '#ffd24a'; c.lineWidth = 2; c.stroke();
        c.beginPath(); c.arc(4, -108, 4, 0, TAU); c.fillStyle = '#fff'; c.fill();
        break;
      case 'helmet_knight':
        c.beginPath(); c.moveTo(-22, -74); c.bezierCurveTo(-30, -118, 30, -124, 30, -86); c.lineTo(26, -90);
        c.quadraticCurveTo(10, -100, 2, -98); c.lineTo(2, -74); c.closePath();
        fs(c, lg(c, 0, -120, 0, -74, ['#f2f6ff', '#8a9cbe']));
        c.beginPath(); c.moveTo(4, -112); c.lineTo(4, -98); c.strokeStyle = '#6a7c98'; c.lineWidth = 2; c.stroke();
        ribbon(c, -2, -116, 30, 9, 3, '#e8424a', time, 10, 5, -0.2);
        break;
      case 'cap':
        c.beginPath(); c.moveTo(-21, -92); c.bezierCurveTo(-20, -118, 24, -118, 26, -94); c.closePath();
        fs(c, lg(c, 0, -116, 0, -92, [light(hc, 0.15), hc]));
        c.beginPath(); c.moveTo(14, -95); c.quadraticCurveTo(34, -96, 40, -90); c.lineTo(20, -90); c.closePath(); fs(c, dark(hc, 0.15), 2.5);
        c.beginPath(); c.arc(2, -116, 3, 0, TAU); c.fillStyle = '#fff'; c.fill();
        break;
      case 'cowboy':
        ell(c, 4, -100, 34, 7, -0.06); fs(c, '#8a5a2a');
        c.beginPath(); c.moveTo(-14, -101); c.quadraticCurveTo(-16, -128, 4, -124); c.quadraticCurveTo(22, -128, 22, -101); c.closePath();
        fs(c, lg(c, 0, -128, 0, -100, ['#c88a4a', '#8a5a2a']));
        c.fillStyle = '#5a3a1a'; c.fillRect(-14, -108, 36, 5);
        break;
      case 'space': break; // 头盔在 headTop 中绘制
      case 'tophat':
        ell(c, 4, -102, 24, 6, -0.08); fs(c, '#14141e');
        rr(c, -12, -138, 32, 36, 4); fs(c, lg(c, -12, 0, 20, 0, ['#3a3a4a', '#14141e']));
        c.fillStyle = '#ff3b4f'; c.fillRect(-11, -112, 30, 6);
        break;
      case 'flower':
        c.save(); c.translate(-12, -104); c.rotate(time);
        for (let i = 0; i < 5; i++) { c.rotate(TAU / 5); ell(c, 0, -7, 5, 7); fs(c, '#ff8ac8', 2); }
        c.restore(); c.beginPath(); c.arc(-12, -104, 4, 0, TAU); fs(c, '#ffe14d', 2);
        break;
      case 'crown_monkey':
        c.beginPath(); c.moveTo(-20, -94); c.quadraticCurveTo(5, -104, 28, -97);
        c.strokeStyle = OL; c.lineWidth = 8; c.stroke(); c.strokeStyle = '#ffcf3a'; c.lineWidth = 4.5; c.stroke();
        for (const x of [-20, 28]) { c.beginPath(); c.arc(x, -95, 4, 0, TAU); fs(c, '#ffcf3a', 2); }
        // 雉鸡翎
        for (const [x, r] of [[-6, -0.5], [10, -0.3]]) { c.save(); c.translate(x, -104); c.rotate(r + Math.sin(time * 4) * 0.08); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-30, -30, -60, -26); c.strokeStyle = OL; c.lineWidth = 5; c.stroke(); c.strokeStyle = '#ff8a1f'; c.lineWidth = 2.5; c.stroke(); c.restore(); }
        break;
    }
  }

  function backAcc(c, a, time, o) {
    const col = a.backCol || '#e8424a';
    const fl = Math.sin(time * 10);
    switch (a.back) {
      case 'cape':
        c.beginPath(); c.moveTo(-10, -62);
        c.quadraticCurveTo(-40, -50 + fl * 4, -50 + fl * 6, -20);
        c.lineTo(-30 + fl * 4, -14); c.lineTo(-20, -22); c.quadraticCurveTo(-8, -40, 10, -60); c.closePath();
        fs(c, lg(c, 0, -62, 0, -14, [col, dark(col, 0.35)])); break;
      case 'scarf':
        ribbon(c, -6, -62, 54, 10, 4, col, time, 13, 7, 0.12); break;
      case 'wings_angel': case 'wings_fairy': case 'wings_bat': {
        const flap = Math.sin(time * 8) * 0.35;
        for (const [k, s] of [[0.85, -0.25], [1, 0.1]]) {
          c.save(); c.translate(-6, -58); c.rotate(-0.4 + flap + s); c.scale(k, k);
          if (a.back === 'wings_bat') {
            c.beginPath(); c.moveTo(0, 0); c.lineTo(-20, -36); c.lineTo(-48, -30); c.quadraticCurveTo(-40, -18, -46, -6);
            c.quadraticCurveTo(-30, -8, -28, 2); c.quadraticCurveTo(-14, -2, 0, 0); c.closePath(); fs(c, lg(c, 0, -36, 0, 0, [light(col, 0.15), dark(col, 0.3)]));
          } else if (a.back === 'wings_fairy') {
            c.globalAlpha *= 0.85;
            ell(c, -20, -18, 22, 12, -0.6); fs(c, 'rgba(200,255,220,.75)', 2); ell(c, -16, 6, 14, 8, 0.4); fs(c, 'rgba(255,200,240,.75)', 2);
          } else {
            for (let i = 0; i < 4; i++) { ell(c, -14 - i * 8, -10 - i * 7, 16 - i * 2, 7, -0.8); fs(c, i % 2 ? '#ffffff' : '#f0f4ff', 2); }
          }
          c.restore();
        }
        break;
      }
      case 'tail_fox':
        for (let i = 0; i < 3; i++) {
          c.save(); c.translate(-12, -34); c.rotate(-0.5 - i * 0.35 + Math.sin(time * 5 + i) * 0.12);
          ell(c, -26, 0, 26, 10); fs(c, lg(c, -50, 0, 0, 0, ['#ffffff', col]), 2.5);
          c.restore();
        }
        break;
      case 'tail_cat':
        c.beginPath(); c.moveTo(-12, -34); c.quadraticCurveTo(-36, -30, -34, -54 + Math.sin(time * 6) * 6);
        c.strokeStyle = OL; c.lineWidth = 8; c.stroke(); c.strokeStyle = col; c.lineWidth = 4.5; c.stroke(); break;
      case 'jetpack':
        rr(c, -28, -66, 15, 32, 5); fs(c, lg(c, -28, 0, -13, 0, ['#c8d2e6', '#ffffff']), 2.5);
        c.fillStyle = '#ff8a1f'; c.fillRect(-26, -58, 11, 4);
        if (o.pose === 'jump' || o.pose === 'fly' || o.pose === 'fall') {
          const f = 14 + Math.sin(time * 40) * 4;
          c.beginPath(); c.moveTo(-26, -34); c.lineTo(-20.5, -34 + f); c.lineTo(-15, -34); c.closePath(); c.fillStyle = '#ffb03a'; c.fill();
        }
        break;
    }
  }

  function handItem(c, a, L, time) {
    const dx = Math.sin(L.b), dy = Math.cos(L.b);
    const stroke = (len, w, col, back) => {
      const bx = L.x2 - dx * (back || 0), by = L.y2 - dy * (back || 0);
      c.beginPath(); c.moveTo(bx, by); c.lineTo(L.x2 + dx * len, L.y2 + dy * len);
      c.lineCap = 'round'; c.strokeStyle = OL; c.lineWidth = w + 4; c.stroke(); c.strokeStyle = col; c.lineWidth = w; c.stroke();
    };
    switch (a.hand) {
      case 'katana': stroke(4, 4, '#3a2a2a', 6); stroke(34, 3, '#e8eef8'); break;
      case 'sword':
        stroke(4, 4, '#6a4a2a', 6); stroke(30, 6, '#e8eef8');
        c.beginPath(); c.moveTo(L.x2 - dy * 8, L.y2 + dx * 8); c.lineTo(L.x2 + dy * 8, L.y2 - dx * 8); c.strokeStyle = '#ffd24a'; c.lineWidth = 4; c.stroke(); break;
      case 'staff': case 'staff_gold':
        stroke(26, 3.5, a.hand === 'staff_gold' ? '#ffcf3a' : '#8a5a2a', a.hand === 'staff_gold' ? 26 : 8);
        if (a.hand === 'staff') {
          c.save(); c.shadowColor = a.handCol; c.shadowBlur = 14;
          c.beginPath(); c.arc(L.x2 + dx * 30, L.y2 + dy * 30, 7, 0, TAU); fs(c, rg(c, L.x2 + dx * 30, L.y2 + dy * 30, 1, 8, ['#ffffff', a.handCol]), 2);
          c.restore();
        }
        break;
      case 'wand': stroke(18, 3, '#14141e'); c.beginPath(); c.arc(L.x2 + dx * 18, L.y2 + dy * 18, 3, 0, TAU); c.fillStyle = '#fff'; c.fill(); break;
    }
  }

  A.defineChar = function (ch) {
    const a = ch.art, sk = SKINS[a.skin || 0];
    const D = {
      skin: sk[0], skin2: sk[1], eye: a.eye, eye2: light(a.eye, 0.45), mood: a.mood,
      pants: a.pants, pantsB: dark(a.pants), shoe: a.shoe, shoeB: dark(a.shoe),
      sleeve: a.sleeve, sleeveB: dark(a.sleeve), hand: sk[0], handB: sk[1]
    };
    D.back = (c, time, P, o) => { backAcc(c, a, time, o); backHair(c, a, time); };
    D.torso = (c) => {
      A._basicTorso(c, D, a.top);
      c.beginPath(); c.moveTo(-7, -63); c.quadraticCurveTo(2, -55, 13, -63); c.lineWidth = 2.5; c.strokeStyle = light(a.top[0], 0.5); c.stroke();
      rr(c, -15, -36, 32, 6, 3); fs(c, a.belt || '#2a2a2a', 2);
    };
    if (a.skirt) D.over = (c, time) => {
      const f = Math.sin(time * 9) * 1.5;
      c.beginPath(); c.moveTo(-15, -38); c.lineTo(17, -38); c.lineTo(24 + f, -22); c.quadraticCurveTo(2, -17, -21 + f, -22); c.closePath();
      fs(c, lg(c, 0, -38, 0, -20, [light(a.skirt, 0.2), a.skirt]));
    };
    D.head = (c, time) => {
      A._headBase(c, D);
      if (a.face === 'panda') { ell(c, 11, -82, 6, 8, 0.2); c.fillStyle = '#2a2a2a'; c.fill(); ell(c, 22, -82, 6, 8, -0.2); c.fill(); }
      A._eyes(c, D, time, a.mood);
      if (a.face === 'whiskers') {
        c.strokeStyle = OL; c.lineWidth = 1.5;
        for (const dy of [-2, 2]) { c.beginPath(); c.moveTo(24, -74 + dy); c.lineTo(32, -75 + dy * 1.6); c.stroke(); c.beginPath(); c.moveTo(6, -74 + dy); c.lineTo(-1, -75 + dy * 1.6); c.stroke(); }
      }
      if (a.face === 'eyepatch') {
        c.beginPath(); c.moveTo(-14, -96); c.lineTo(28, -78); c.strokeStyle = '#14141e'; c.lineWidth = 2.5; c.stroke();
        ell(c, 22, -83, 6, 7); fs(c, '#14141e', 2);
      }
      if (a.head === 'space') { frontHair(c, a); }
      else { frontHair(c, a); headwear(c, a, time); }
      if (a.head === 'space') {
        c.beginPath(); c.arc(3, -84, 32, 0, TAU);
        c.fillStyle = 'rgba(180,230,255,.25)'; c.fill(); c.lineWidth = 3.5; c.strokeStyle = OL; c.stroke();
        c.beginPath(); c.arc(3, -84, 28, -2.6, -1.8); c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 4; c.stroke();
        rr(c, -16, -58, 38, 8, 4); fs(c, '#c8d2e6', 2.5);
      }
    };
    if (a.hand) D.handItem = (c, L, time) => handItem(c, a, L, time);
    CH[ch.id] = D;
  };
  KP.CHARS.forEach(ch => { if (ch.art) A.defineChar(ch); });

  // ======================================================
  //                       新坐骑
  // ======================================================
  const MD = A.mountDraw, MS = A.mountSaddle;
  const stand = y => () => ({ x: 0, y, stand: true });

  // 平台类
  MD.skate = (c, o) => {
    const t = o.t || 0;
    for (const wx of [-20, 20]) { c.beginPath(); c.arc(wx, -5, 5.5, 0, TAU); fs(c, '#ffe14d', 2.5); c.save(); c.translate(wx, -5); c.rotate(t * 2); c.fillStyle = OL; c.fillRect(-1, -4, 2, 8); c.restore(); }
    c.beginPath(); c.moveTo(-34, -16); c.quadraticCurveTo(-38, -10, -30, -10); c.lineTo(30, -10); c.quadraticCurveTo(38, -10, 34, -18); c.lineTo(28, -15); c.lineTo(-28, -15); c.closePath();
    fs(c, lg(c, -34, 0, 34, 0, ['#ff5a8a', '#ffb03a', '#4ab8ff']), 2.5);
  };
  MS.skate = stand(-16);
  MD.rocket = (c, o) => {
    const time = o.time || 0, b = Math.sin(time * 6) * 2;
    c.translate(0, -8 + b);
    for (let i = 0; i < 3; i++) flame(c, -32, -12, -62 - i * 6 + Math.sin(time * 30 + i) * 6, -12 + (i - 1) * 6, 6 - i, '#ff3d17', '#ffe14d', true);
    rr(c, -36, -18, 72, 10, 5); fs(c, lg(c, 0, -18, 0, -8, ['#e8eef8', '#7f93b6']), 2.5);
    rr(c, -40, -22, 16, 14, 5); fs(c, '#ff3b4f', 2.5);
    c.save(); c.shadowColor = '#4ff0ff'; c.shadowBlur = 12; c.fillStyle = '#4ff0ff'; c.fillRect(-10, -10, 30, 3); c.restore();
  };
  MS.rocket = (o) => ({ x: 0, y: -26 + Math.sin((o.time || 0) * 6) * 2, stand: true });
  MD.cloud = (c, o) => {
    const time = o.time || 0, b = Math.sin(time * 4) * 3;
    c.translate(0, -16 + b);
    c.fillStyle = 'rgba(255,240,180,.5)';
    for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(-50 - i * 14, 4 + Math.sin(time * 6 + i) * 3, 9 - i * 2, 0, TAU); c.fill(); }
    const puffs = [[-26, 0, 15], [-8, -8, 19], [14, -6, 17], [32, 2, 13], [4, 6, 16]];
    c.beginPath(); for (const [x, y, r] of puffs) { c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU); }
    c.lineWidth = 6; c.strokeStyle = OL; c.stroke();
    c.fillStyle = lg(c, 0, -26, 0, 20, ['#fffbe8', '#ffd86a']); c.fill();
  };
  MS.cloud = (o) => ({ x: 0, y: -40 + Math.sin((o.time || 0) * 4) * 3, stand: true });
  MD.carpet = (c, o) => {
    const time = o.time || 0;
    c.translate(0, -14 + Math.sin(time * 4) * 2);
    const top = [], bot = [];
    for (let i = 0; i <= 10; i++) { const x = -44 + i * 8.8, w = Math.sin(time * 8 - i * 0.7) * 4; top.push([x, -8 + w]); bot.push([x, 2 + w]); }
    c.beginPath(); top.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); for (let i = 10; i >= 0; i--) c.lineTo(bot[i][0], bot[i][1]); c.closePath();
    fs(c, lg(c, -44, 0, 44, 0, ['#8a1f5a', '#c0392b', '#8a1f5a']), 2.5);
    c.strokeStyle = '#ffd24a'; c.lineWidth = 2; c.beginPath(); top.forEach(([x, y], i) => i ? c.lineTo(x, y + 3) : c.moveTo(x, y + 3)); c.stroke();
    for (const [x, y] of [top[0], bot[0]]) { c.beginPath(); c.moveTo(x, y); c.lineTo(x - 8, y + 3); c.strokeStyle = '#ffd24a'; c.lineWidth = 2; c.stroke(); }
  };
  MS.carpet = (o) => ({ x: 0, y: -22 + Math.sin((o.time || 0) * 4) * 2, stand: true });
  MD.duck = (c, o) => {
    const time = o.time || 0, t = o.t || 0, b = Math.abs(Math.sin(t)) * -3;
    if (o.slide) c.scale(1.05, 0.75);
    c.translate(0, b);
    ell(c, -4, -30, 36, 24); fs(c, lg(c, 0, -54, 0, -6, ['#fff27a', '#ffc61a']));
    c.beginPath(); c.moveTo(-38, -36); c.lineTo(-50, -48); c.lineTo(-34, -46); c.closePath(); fs(c, '#ffc61a', 2.5);
    ell(c, -8, -32, 14, 8, 0.3); fs(c, '#ffd84a', 2);
    c.beginPath(); c.arc(26, -62, 17, 0, TAU); fs(c, lg(c, 0, -80, 0, -45, ['#fff27a', '#ffc61a']));
    ell(c, 44, -58, 10, 5); fs(c, '#ff8a1f', 2.5);
    ell(c, 30, -66, 3.5, 4.5); c.fillStyle = OL; c.fill(); c.beginPath(); c.arc(29, -67.5, 1.3, 0, TAU); c.fillStyle = '#fff'; c.fill();
    for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(-30 + i * 22, -4, 6, 0, Math.PI); c.fillStyle = 'rgba(120,200,255,.6)'; c.fill(); }
  };
  MS.duck = (o, sl) => ({ x: -6, y: -54 * sl });
  MD.ufo = (c, o) => {
    const time = o.time || 0, b = Math.sin(time * 4) * 3;
    c.translate(0, -26 + b);
    c.save(); c.globalAlpha *= 0.25; c.fillStyle = '#9ff0ff';
    c.beginPath(); c.moveTo(-14, 6); c.lineTo(14, 6); c.lineTo(30, 30); c.lineTo(-30, 30); c.closePath(); c.fill(); c.restore();
    ell(c, 0, -2, 52, 13); fs(c, lg(c, 0, -14, 0, 12, ['#e8eef8', '#7f93b6']));
    ell(c, 0, -6, 30, 7); fs(c, '#c8d2e6', 2);
    for (let i = 0; i < 6; i++) {
      const on = Math.floor(time * 8 + i) % 3 === 0;
      c.beginPath(); c.arc(-40 + i * 16, 2, 3.5, 0, TAU); c.fillStyle = on ? '#ffe14d' : '#ff5a8a'; c.fill();
    }
  };
  MS.ufo = (o) => ({ x: 0, y: -38 + Math.sin((o.time || 0) * 4) * 3, stand: true });

  // 四足类（包含双足的迅猛龙）
  const QUAD = {
    horse: { body: ['#ff7a5a', '#c43a2a'], belly: '#ffb09a', mane: '#3a1a1a', leg: '#d84a3a', legB: '#a02a20', hoof: '#3a2a2a', head: 'horse' },
    lion: { body: ['#ffcf6a', '#e09a2a'], belly: '#ffe8b0', mane: '#c0501a', leg: '#f0b04a', legB: '#c88a2a', hoof: '#c88a2a', head: 'lion', fire: true },
    wolf: { body: ['#f0f6ff', '#a8bad6'], belly: '#ffffff', mane: '#c8d8f0', leg: '#e0eaf8', legB: '#a8bad6', hoof: '#8a9cbe', head: 'wolf' },
    tiger: { body: ['#ffae4a', '#e0761a'], belly: '#fff2dc', mane: '#2a1a1a', leg: '#f59a3a', legB: '#c8701a', hoof: '#fff2dc', head: 'tiger', stripes: true },
    deer: { body: ['#ffd9a0', '#d89a5a'], belly: '#fff4e0', mane: '#c88a4a', leg: '#e8b07a', legB: '#c08050', hoof: '#6a4a2a', head: 'deer', spots: true },
    pig: { body: ['#ffd0dc', '#ff9ab4'], belly: '#ffe6ee', mane: '#ff9ab4', leg: '#ffb6c8', legB: '#f08aa4', hoof: '#c8607a', head: 'pig', short: true },
    bear: { body: ['#ffffff', '#d6e2f0'], belly: '#ffffff', mane: '#e8f0fa', leg: '#f4f8ff', legB: '#c8d6ea', hoof: '#8a9cbe', head: 'bear', big: true },
    raptor: { body: ['#7ad84a', '#3a9a2a'], belly: '#d8f5a8', mane: '#ff8a1f', leg: '#5ac03a', legB: '#3a8a2a', hoof: '#2a4a1a', head: 'raptor', biped: true, stripes: true }
  };
  function drawQuad(c, o, q) {
    const t = o.t || 0, time = o.time || 0, air = o.air;
    if (o.slide) c.scale(1.08, 0.72);
    const hip = q.short ? -36 : -46, l1 = q.short ? 15 : 21, l2 = q.short ? 15 : 21;
    // 尾巴
    if (q.biped) ribbon(c, -30, -60, 52, 16, 3, q.body[1], time, 6, 6, -0.05);
    else if (q.head === 'pig') { c.beginPath(); c.moveTo(-36, -54); c.quadraticCurveTo(-48, -60, -44, -50); c.quadraticCurveTo(-40, -44, -48, -46); c.strokeStyle = OL; c.lineWidth = 4; c.stroke(); }
    else if (q.head === 'bear') { c.beginPath(); c.arc(-38, -56, 6, 0, TAU); fs(c, q.body[0], 2.5); }
    else ribbon(c, -36, -62, q.head === 'deer' ? 14 : 34, 10, q.head === 'lion' ? 9 : 3, q.mane, time, 9, 6, 0.4);
    const legs = q.biped ? [[-14, Math.PI, q.legB], [-6, 0, q.leg]] :
      [[-26, Math.PI + 0.5, q.legB], [20, 0.5, q.legB], [-16, Math.PI, q.leg], [28, 0, q.leg]];
    const drawLeg = ([lx, off, col]) => {
      const ph = t + off;
      const a = air ? (lx > 0 ? 0.9 : -0.7) : Math.sin(ph) * 0.65;
      const k = air ? 1.2 : 0.2 + Math.max(0, Math.cos(ph));
      const L = limb(c, lx, hip, a, q.biped ? 24 : l1, lx > 0 ? -k : k, q.biped ? 22 : l2, q.big ? 12 : q.biped ? 10 : 9, col);
      c.beginPath(); c.arc(L.x2, L.y2, q.big ? 6.5 : 5.5, 0, TAU); fs(c, q.hoof, 2);
    };
    legs.slice(0, q.biped ? 1 : 2).forEach(drawLeg);
    // 身体
    const bw = q.big ? 44 : q.short ? 38 : 40, bh = q.big ? 24 : q.short ? 22 : 20, by = q.short ? -46 : -54;
    ell(c, 0, by, bw, bh); fs(c, lg(c, 0, by - bh, 0, by + bh, q.body));
    c.save(); ell(c, 0, by, bw, bh); c.clip();
    ell(c, 0, by + bh * 0.7, bw * 0.8, bh * 0.5); c.fillStyle = q.belly; c.fill();
    if (q.stripes) { c.strokeStyle = 'rgba(40,20,20,.75)'; c.lineWidth = 4; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 13 - 4, by - bh); c.quadraticCurveTo(i * 13 + 4, by - bh * 0.3, i * 13 - 2, by + 2); c.stroke(); } }
    if (q.spots) { c.fillStyle = '#fff4e0'; for (const [x, y] of [[-18, -6], [-4, -10], [10, -4], [22, -10], [-10, 2]]) { c.beginPath(); c.arc(x, by + y, 3.5, 0, TAU); c.fill(); } }
    c.restore();
    legs.slice(q.biped ? 1 : 2).forEach(drawLeg);
    if (q.biped) { c.beginPath(); c.moveTo(26, -56); c.lineTo(34, -46); c.strokeStyle = OL; c.lineWidth = 6; c.stroke(); c.strokeStyle = q.leg; c.lineWidth = 3; c.stroke(); }
    drawQuadHead(c, q, time);
    // 鞍
    rr(c, -22, by - bh - 3, 32, 10, 5); fs(c, lg(c, 0, by - bh - 3, 0, by - bh + 7, ['#7a4a2a', '#4a2a1a']), 2.5);
    c.fillStyle = '#ffd24a'; c.fillRect(-20, by - bh + 4, 28, 2);
  }
  function eyeDot(c, x, y, r) { ell(c, x, y, r * 0.8, r); c.fillStyle = OL; c.fill(); c.beginPath(); c.arc(x - r * 0.3, y - r * 0.4, r * 0.35, 0, TAU); c.fillStyle = '#fff'; c.fill(); }
  function drawQuadHead(c, q, time) {
    const B = q.body;
    switch (q.head) {
      case 'horse': case 'deer': {
        c.beginPath(); c.moveTo(18, -68); c.lineTo(34, -98); c.lineTo(50, -94); c.lineTo(40, -58); c.closePath(); fs(c, lg(c, 0, -98, 0, -58, B));
        c.save(); c.translate(48, -98); c.rotate(0.45); ell(c, 0, 0, 18, 11.5); fs(c, B[0]); ell(c, 13, 2, 8, 8); fs(c, q.belly, 2.5); c.restore();
        c.beginPath(); c.moveTo(38, -108); c.lineTo(42, -122); c.lineTo(47, -106); c.closePath(); fs(c, B[1], 2.5);
        eyeDot(c, 49, -101, 3.8);
        if (q.head === 'deer') {
          for (const s of [0, 1]) { c.beginPath(); const x = 42 + s * 6; c.moveTo(x, -108); c.lineTo(x - 6, -130); c.moveTo(x - 3, -118); c.lineTo(x - 14, -124); c.moveTo(x - 5, -126); c.lineTo(x + 4, -136); c.strokeStyle = OL; c.lineWidth = 6; c.stroke(); c.strokeStyle = '#c88a4a'; c.lineWidth = 3; c.stroke(); }
          c.save(); c.shadowColor = '#ffb6f0'; c.shadowBlur = 10; for (let i = 0; i < 5; i++) { c.fillStyle = ['#ff5a6a', '#ffe14d', '#5ee07a', '#4ab8ff', '#a56bff'][i]; c.beginPath(); c.arc(-24 + i * 10, -76, 2.5, 0, TAU); c.fill(); } c.restore();
        } else {
          for (let i = 0; i < 4; i++) ribbon(c, 40 - i * 3.2, -110 + i * 6, 22, 7, 2, q.mane, time, 12, 4, 0.5, i * 0.6);
        }
        break;
      }
      case 'lion': case 'tiger': case 'bear': {
        const hx = 40, hy = -80;
        if (q.head === 'lion') {
          c.save(); c.translate(hx - 4, hy);
          c.beginPath(); for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, r = i % 2 ? 22 : 30; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath();
          fs(c, lg(c, 0, -30, 0, 30, ['#ff8a2a', '#b8401a'])); c.restore();
          for (let i = 0; i < 3; i++) flame(c, hx - 20, hy - 18 + i * 8, hx - 46 + Math.sin(time * 14 + i) * 4, hy - 30 + i * 10, 6, '#ff3d17', '#ffd34d', true);
        }
        const er = q.head === 'bear' ? 7 : 6;
        for (const ex of [-10, 10]) { c.beginPath(); c.arc(hx + ex, hy - 15, er, 0, TAU); fs(c, B[1], 2.5); }
        c.beginPath(); c.arc(hx, hy, 18, 0, TAU); fs(c, lg(c, 0, hy - 18, 0, hy + 18, B));
        if (q.head === 'tiger') { c.strokeStyle = 'rgba(40,20,20,.8)'; c.lineWidth = 3; for (const x of [-6, 0, 6]) { c.beginPath(); c.moveTo(hx + x, hy - 17); c.lineTo(hx + x, hy - 9); c.stroke(); } }
        ell(c, hx + 9, hy + 6, 10, 7); fs(c, q.belly, 2);
        c.beginPath(); c.moveTo(hx + 14, hy + 1); c.lineTo(hx + 20, hy + 1); c.lineTo(hx + 17, hy + 5); c.closePath(); c.fillStyle = OL; c.fill();
        eyeDot(c, hx + 4, hy - 4, 3.2); eyeDot(c, hx + 13, hy - 4, 3.2);
        break;
      }
      case 'wolf': {
        c.beginPath(); c.moveTo(22, -66); c.lineTo(32, -92); c.lineTo(48, -88); c.lineTo(40, -56); c.closePath(); fs(c, B[0]);
        for (const [x, s] of [[30, 0], [40, 1]]) { c.beginPath(); c.moveTo(x, -98); c.lineTo(x + 3, -118); c.lineTo(x + 10, -96); c.closePath(); fs(c, s ? B[0] : B[1], 2.5); }
        c.beginPath(); c.moveTo(26, -100); c.quadraticCurveTo(44, -108, 52, -92); c.lineTo(70, -86); c.lineTo(66, -78); c.lineTo(44, -76); c.quadraticCurveTo(28, -80, 26, -100); c.closePath();
        fs(c, lg(c, 0, -108, 0, -76, B));
        c.beginPath(); c.arc(69, -84, 3, 0, TAU); c.fillStyle = OL; c.fill();
        c.save(); c.shadowColor = '#4ff0ff'; c.shadowBlur = 8; ell(c, 46, -92, 3.5, 2.5, -0.2); c.fillStyle = '#4ff0ff'; c.fill(); c.restore();
        break;
      }
      case 'pig': {
        const hx = 38, hy = -66;
        for (const ex of [-8, 10]) { c.beginPath(); c.moveTo(hx + ex - 6, hy - 14); c.lineTo(hx + ex, hy - 26); c.lineTo(hx + ex + 6, hy - 12); c.closePath(); fs(c, B[1], 2.5); }
        c.beginPath(); c.arc(hx, hy, 18, 0, TAU); fs(c, lg(c, 0, hy - 18, 0, hy + 18, B));
        ell(c, hx + 16, hy + 3, 7, 8); fs(c, '#ffb6c8', 2.5);
        c.fillStyle = '#c8607a'; ell(c, hx + 15, hy + 1, 1.5, 2.5); c.fill(); ell(c, hx + 18, hy + 5, 1.5, 2.5); c.fill();
        eyeDot(c, hx + 4, hy - 4, 3); eyeDot(c, hx + 11, hy - 6, 2.6);
        c.save(); c.translate(hx - 12, hy - 34); c.rotate(Math.sin(time * 3) * 0.2);
        c.beginPath(); c.arc(0, 0, 9, 0, TAU); fs(c, lg(c, 0, -9, 0, 9, ['#fff3a0', '#e0a01a']), 2); c.fillStyle = '#a06a00'; c.font = 'bold 11px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('¥', 0, 1);
        c.restore();
        break;
      }
      case 'raptor': {
        c.beginPath(); c.moveTo(22, -62); c.lineTo(34, -90); c.lineTo(46, -86); c.lineTo(38, -56); c.closePath(); fs(c, B[0]);
        c.beginPath(); c.moveTo(28, -98); c.quadraticCurveTo(48, -106, 72, -94); c.lineTo(74, -86); c.lineTo(52, -84); c.lineTo(70, -80); c.lineTo(64, -74); c.lineTo(36, -78); c.quadraticCurveTo(26, -84, 28, -98); c.closePath();
        fs(c, lg(c, 0, -106, 0, -74, B));
        c.save(); c.shadowColor = '#ffe14d'; c.shadowBlur = 6; ell(c, 46, -94, 3.5, 2.5, -0.2); c.fillStyle = '#ffe14d'; c.fill(); c.restore();
        for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(14 - i * 10, -74 + i * 0); c.lineTo(10 - i * 10, -84); c.lineTo(6 - i * 10, -73); c.closePath(); fs(c, q.mane, 2); }
        break;
      }
    }
  }
  for (const id in QUAD) { const q = QUAD[id]; MD[id] = (c, o) => drawQuad(c, o, q); MS[id] = (o, sl) => ({ x: -6, y: (q.short ? -64 : q.big ? -76 : -72) * sl }); }

  // 飞禽类
  const BIRD = {
    phoenix: { body: ['#ff8a3a', '#d6301a'], wing: ['#ffd34d', '#ff5a1a'], beak: '#ffe14d', crest: '#ffe14d', fire: true },
    eagle: { body: ['#a0703a', '#5a3a1a'], wing: ['#8a5a2a', '#4a2a10'], beak: '#ffc61a', head: '#ffffff', crest: null }
  };
  function drawBird(c, o, q) {
    const time = o.time || 0, b = Math.sin(time * 5) * 3, flap = Math.sin(time * 9);
    if (o.slide) c.scale(1.05, 0.7);
    c.translate(0, b);
    if (q.fire) for (let i = 0; i < 5; i++) flame(c, -36, -56 + i * 4, -90 - i * 6 + Math.sin(time * 20 + i) * 8, -60 + i * 10, 6, '#ff3d17', '#ffe14d', true);
    // 尾羽
    for (let i = 0; i < 3; i++) ribbon(c, -34, -54 + i * 4, 40 + i * 6, 10, 3, i % 2 ? q.wing[0] : q.body[1], time, 8, 5, 0.1 + i * 0.12, i);
    const wing = (rot, k, col) => {
      c.save(); c.translate(-2, -66); c.rotate(rot); c.scale(k, k);
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-20, -50, -58, -52); c.lineTo(-46, -38); c.lineTo(-56, -30); c.lineTo(-42, -20); c.lineTo(-48, -10); c.quadraticCurveTo(-20, -6, 0, 0); c.closePath();
      fs(c, lg(c, 0, -52, 0, 0, col)); c.restore();
    };
    wing(-0.3 - flap * 0.45, 0.85, [q.wing[1], dark(q.wing[1], 0.2)]);
    ell(c, 0, -56, 36, 17); fs(c, lg(c, 0, -73, 0, -39, q.body));
    c.beginPath(); c.arc(38, -78, 15, 0, TAU); fs(c, q.head || q.body[0]);
    if (q.crest) for (let i = 0; i < 3; i++) flame(c, 32, -90, 20 - i * 8 + Math.sin(time * 10 + i) * 2, -112 + i * 4, 4, q.crest, '#fff2a0');
    c.beginPath(); c.moveTo(50, -82); c.quadraticCurveTo(66, -80, 60, -70); c.lineTo(50, -72); c.closePath(); fs(c, q.beak, 2.5);
    eyeDot(c, 43, -81, 3.2);
    wing(0.1 - flap * 0.5, 1, q.wing);
    for (const lx of [-8, 10]) { c.beginPath(); c.moveTo(lx, -40); c.lineTo(lx + 6, -30); c.strokeStyle = OL; c.lineWidth = 5; c.stroke(); c.strokeStyle = q.beak; c.lineWidth = 2.5; c.stroke(); }
    rr(c, -22, -76, 28, 9, 4); fs(c, '#7a4a2a', 2.5);
  }
  for (const id in BIRD) { const q = BIRD[id]; MD[id] = (c, o) => drawBird(c, o, q); MS[id] = (o, sl) => ({ x: -8, y: (-80 + Math.sin((o.time || 0) * 5) * 3) * sl }); }

  // ======================================================
  //                         宠物
  // ======================================================
  function face(c, x, y, s, eye) {
    ell(c, x - 4 * s, y, 2.4 * s, 3 * s); c.fillStyle = eye || OL; c.fill(); ell(c, x + 4 * s, y, 2.4 * s, 3 * s); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(x - 4.6 * s, y - 1 * s, 0.9 * s, 0, TAU); c.arc(x + 3.4 * s, y - 1 * s, 0.9 * s, 0, TAU); c.fill();
    c.beginPath(); c.arc(x, y + 3 * s, 1.8 * s, 0.15 * Math.PI, 0.85 * Math.PI); c.strokeStyle = OL; c.lineWidth = 1.5; c.stroke();
  }
  const PET = {};
  PET.bee = (c, t) => {
    const f = Math.sin(t * 40) * 0.5;
    for (const s of [-1, 1]) { c.save(); c.rotate(s * (0.4 + f)); ell(c, 0, -14, 6, 10); fs(c, 'rgba(220,240,255,.85)', 2); c.restore(); }
    ell(c, 0, 0, 15, 12); fs(c, lg(c, 0, -12, 0, 12, ['#ffe14d', '#ffb02e']));
    c.save(); ell(c, 0, 0, 15, 12); c.clip(); c.fillStyle = '#2a1a1a'; c.fillRect(-9, -12, 5, 24); c.fillRect(1, -12, 5, 24); c.restore();
    face(c, 9, -1, 0.8);
  };
  PET.fairy = (c, t) => {
    c.save(); c.shadowColor = '#9ffcff'; c.shadowBlur = 16;
    for (const s of [-1, 1]) { ell(c, s * 10, -6, 8, 12, s * 0.5 + Math.sin(t * 20) * 0.2); c.fillStyle = 'rgba(180,255,240,.6)'; c.fill(); }
    c.beginPath(); c.arc(0, 0, 11, 0, TAU); fs(c, rg(c, -3, -3, 1, 12, ['#ffffff', '#9ffcff']), 2); c.restore();
    face(c, 2, 0, 0.7, '#2a6a8a');
  };
  PET.owl = (c) => {
    ell(c, 0, 2, 14, 15); fs(c, lg(c, 0, -13, 0, 17, ['#c08a5a', '#7a4a2a']));
    ell(c, 0, 6, 9, 9); c.fillStyle = '#f0d6b0'; c.fill();
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 6, -10); c.lineTo(s * 12, -18); c.lineTo(s * 13, -8); c.closePath(); fs(c, '#7a4a2a', 2); c.beginPath(); c.arc(s * 5, -3, 5, 0, TAU); fs(c, '#fff', 1.5); c.beginPath(); c.arc(s * 5 + 1, -3, 2.5, 0, TAU); c.fillStyle = OL; c.fill(); }
    c.beginPath(); c.moveTo(-2, 2); c.lineTo(2, 2); c.lineTo(0, 6); c.closePath(); c.fillStyle = '#ffb02e'; c.fill();
  };
  PET.firedrake = (c, t) => {
    flame(c, -10, 4, -26 + Math.sin(t * 20) * 3, 10, 4, '#ff3d17', '#ffe14d', true);
    for (const s of [-1, 1]) { c.save(); c.rotate(-0.6 + s * 0.2 + Math.sin(t * 12) * 0.3); ell(c, -6, -12, 5, 10); fs(c, '#ff8a6a', 2); c.restore(); }
    ell(c, 0, 0, 14, 12); fs(c, lg(c, 0, -12, 0, 12, ['#ff6a4a', '#c8301a']));
    ell(c, 2, 5, 8, 5); c.fillStyle = '#ffd6a0'; c.fill();
    for (const x of [-4, 4]) { c.beginPath(); c.moveTo(x - 2, -10); c.lineTo(x, -17); c.lineTo(x + 2, -10); c.closePath(); fs(c, '#ffe14d', 1.5); }
    face(c, 5, -2, 0.75);
  };
  PET.starbaby = (c, t) => {
    c.save(); c.rotate(Math.sin(t * 3) * 0.2); c.shadowColor = '#ffe14d'; c.shadowBlur = 12;
    star(c, 0, 0, 17, 8, 5, 0); fs(c, lg(c, 0, -17, 0, 15, ['#fff6b0', '#ffc61a']), 2.5); c.restore();
    face(c, 0, 1, 0.8);
  };
  PET.ghost = (c, t) => {
    c.save(); c.globalAlpha *= 0.9;
    c.beginPath(); c.moveTo(-13, 12); c.lineTo(-13, -2); c.arc(0, -2, 13, Math.PI, 0); c.lineTo(13, 12);
    for (let i = 0; i < 4; i++) c.quadraticCurveTo(13 - i * 6.5 - 3.25, 12 + (i % 2 ? -5 : 5) + Math.sin(t * 8 + i) * 2, 13 - (i + 1) * 6.5, 12);
    c.closePath(); fs(c, 'rgba(240,246,255,.95)', 2.5); c.restore();
    face(c, 2, -2, 0.75);
  };
  PET.luckycat = (c, t) => {
    c.save(); c.translate(10, -8); c.rotate(Math.sin(t * 6) * 0.4); ell(c, 0, -6, 4.5, 7); fs(c, '#fff', 2); c.restore();
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 4, -10); c.lineTo(s * 11, -18); c.lineTo(s * 12, -6); c.closePath(); fs(c, '#fff', 2); }
    c.beginPath(); c.arc(0, 0, 13, 0, TAU); fs(c, '#ffffff');
    c.fillStyle = '#ffb02e'; c.beginPath(); c.arc(-6, -8, 4, 0, TAU); c.fill();
    c.fillStyle = '#e8424a'; c.fillRect(-10, 8, 20, 3); c.beginPath(); c.arc(0, 13, 3, 0, TAU); fs(c, '#ffe14d', 1.5);
    face(c, 0, -1, 0.75);
  };
  PET.robot = (c, t) => {
    c.save(); c.translate(0, -16); c.rotate(t * 20); c.fillStyle = '#9aa6c0'; c.fillRect(-12, -1.5, 24, 3); c.restore();
    c.beginPath(); c.moveTo(0, -16); c.lineTo(0, -12); c.strokeStyle = OL; c.lineWidth = 2; c.stroke();
    c.beginPath(); c.arc(0, 0, 13, 0, TAU); fs(c, rg(c, -4, -4, 1, 14, ['#ffffff', '#8a9cbe']));
    rr(c, -8, -5, 16, 8, 4); fs(c, '#1d2c46', 2);
    c.save(); c.shadowColor = '#4ff0ff'; c.shadowBlur = 8; c.fillStyle = '#9ffcff'; c.beginPath(); c.arc(-3, -1, 2, 0, TAU); c.arc(3, -1, 2, 0, TAU); c.fill(); c.restore();
  };
  PET.penguin = (c, t) => {
    for (const s of [-1, 1]) { c.save(); c.translate(s * 11, 2); c.rotate(s * (0.5 + Math.sin(t * 10) * 0.3)); ell(c, 0, 4, 3.5, 8); fs(c, '#2a2a3a', 2); c.restore(); }
    ell(c, 0, 0, 12, 15); fs(c, '#2a2a3a');
    ell(c, 0, 4, 8, 10); c.fillStyle = '#fff'; c.fill();
    face(c, 0, -5, 0.7, '#ffffff');
    c.beginPath(); c.moveTo(-3, -1); c.lineTo(3, -1); c.lineTo(0, 3); c.closePath(); c.fillStyle = '#ffb02e'; c.fill();
  };
  PET.gembunny = (c, t) => {
    for (const s of [-1, 1]) { c.save(); c.translate(s * 5, -10); c.rotate(s * 0.25 + Math.sin(t * 5) * 0.05); ell(c, 0, -10, 4.5, 11); fs(c, '#e8f6ff', 2); c.restore(); }
    ell(c, 0, 2, 13, 12); fs(c, lg(c, 0, -10, 0, 14, ['#ffffff', '#c8e8ff']));
    c.save(); c.shadowColor = '#4ff0ff'; c.shadowBlur = 10; A.drawGemShape(c, 0, -6, 5); c.restore();
    face(c, 0, 3, 0.7, '#3a6aff');
  };
  PET.butterfly = (c, t) => {
    const f = Math.abs(Math.sin(t * 12));
    for (const s of [-1, 1]) {
      c.save(); c.scale(s * (0.3 + f * 0.7), 1);
      ell(c, 9, -6, 10, 9, 0.4); fs(c, lg(c, 0, -15, 0, 3, ['#ff8ad8', '#a56bff']), 2);
      ell(c, 7, 7, 7, 6, -0.4); fs(c, lg(c, 0, 0, 0, 13, ['#ffe14d', '#ff8a1f']), 2);
      c.restore();
    }
    ell(c, 0, 0, 3, 11); fs(c, '#3a2a4a', 2);
  };
  PET.frog = (c, t) => {
    const j = Math.abs(Math.sin(t * 5)) * -4;
    c.translate(0, j);
    ell(c, 0, 3, 15, 11); fs(c, lg(c, 0, -8, 0, 14, ['#8af05a', '#3aa02a']));
    ell(c, 0, 7, 9, 5); c.fillStyle = '#e8ffc8'; c.fill();
    for (const s of [-1, 1]) { c.beginPath(); c.arc(s * 7, -7, 6, 0, TAU); fs(c, '#8af05a', 2); c.beginPath(); c.arc(s * 7, -7, 2.8, 0, TAU); c.fillStyle = OL; c.fill(); }
    c.beginPath(); c.arc(0, 3, 5, 0.15 * Math.PI, 0.85 * Math.PI); c.strokeStyle = OL; c.lineWidth = 1.8; c.stroke();
  };
  A.drawPet = function (c, id, x, y, time, scale) {
    const f = PET[id]; if (!f) return;
    c.save(); c.translate(x, y + Math.sin(time * 4) * 4); if (scale) c.scale(scale, scale);
    c.lineJoin = 'round'; f(c, time); c.restore();
  };

  // ======================================================
  //                         钻石
  // ======================================================
  A.drawGemShape = function (c, x, y, r) {
    c.beginPath(); c.moveTo(x - r, y - r * 0.4); c.lineTo(x - r * 0.5, y - r); c.lineTo(x + r * 0.5, y - r); c.lineTo(x + r, y - r * 0.4); c.lineTo(x, y + r); c.closePath();
    fs(c, lg(c, x - r, y - r, x + r, y + r, ['#e8fdff', '#5fe0ff', '#2a8fff']), Math.max(1.5, r / 6));
    c.beginPath(); c.moveTo(x - r, y - r * 0.4); c.lineTo(x + r, y - r * 0.4); c.moveTo(x - r * 0.3, y - r * 0.4); c.lineTo(x, y + r); c.lineTo(x + r * 0.3, y - r * 0.4);
    c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = Math.max(1, r / 10); c.stroke();
  };
  A.drawGem = function (c, x, y, time) {
    c.save(); c.shadowColor = '#5fe0ff'; c.shadowBlur = 14;
    A.drawGemShape(c, x, y + Math.sin(time * 4 + x * 0.02) * 3, 14); c.restore();
    if (Math.sin(time * 5 + x) > 0.8) { star(c, x + 8, y - 10, 5, 1.5, 4, 0); c.fillStyle = '#fff'; c.fill(); }
  };
})();
