// 剪纸风贴图：有贴图时替换矢量绘制，没有（或还没加载完）时自动回退到矢量画法
(function () {
  'use strict';
  const A = KP.art, META = KP.SPRITES || {}, IMG = {};
  for (const k in META) {
    const im = new Image();
    im.onload = () => { IMG[k] = im; };
    im.src = 'assets/sprites/' + k + '.webp';
  }
  A.sprite = k => IMG[k];

  // 显示尺寸（游戏坐标）
  const CHAR_H = 124, RIDE_H = 104, PET_S = 60;
  // 骑乘图里“屁股”所在位置（占图片宽高的比例），会对到坐骑鞍座上
  const SEAT = { def: [0.42, 0.6] };
  // 坐骑：[显示宽度, 鞍座 x 比例, 鞍座 y 比例(从上往下)]，站立类坐骑的 y 是脚踩的位置
  const MOUNT = {
    def: [160, 0.42, 0.32],
    wheel: [104, 0.5, 0.24], skate: [120, 0.5, 0.26], rocket: [140, 0.48, 0.38], cloud: [150, 0.5, 0.3],
    carpet: [150, 0.5, 0.45], ufo: [150, 0.5, 0.18], duck: [130, 0.42, 0.38],
    pig: [130, 0.42, 0.3], bear: [170, 0.42, 0.3], raptor: [160, 0.42, 0.34], deer: [160, 0.42, 0.38], wolf: [160, 0.4, 0.32],
    dragon: [180, 0.45, 0.36], phoenix: [180, 0.45, 0.4], eagle: [175, 0.45, 0.4]
  };
  const STAND = new Set(['wheel', 'skate', 'rocket', 'cloud', 'carpet', 'ufo']);
  const FLYER = new Set(['dragon', 'phoenix', 'eagle', 'ufo', 'cloud', 'carpet', 'rocket']);
  A.SPRITE_TUNE = { SEAT, MOUNT, CHAR_H, RIDE_H };

  // ---------- 角色 ----------
  const vecChar = A.drawChar;
  A.drawChar = function (c, id, x, y, o) {
    o = o || {};
    const pose = o.pose || 'idle';
    const ride = pose === 'ride';
    const key = ride && IMG[id + '_ride'] ? id + '_ride' : id + '_run';
    const im = IMG[key];
    if (!im) return vecChar(c, id, x, y, o);
    const t = o.t || 0, time = o.time || 0;
    const isRide = key.endsWith('_ride');
    const H = isRide ? RIDE_H : CHAR_H, W = H * im.width / im.height;
    c.save(); c.translate(x, y);
    if (o.scale) c.scale(o.scale, o.scale);
    if (o.alpha != null) c.globalAlpha *= o.alpha;
    if (isRide) {
      const [fx, fy] = SEAT[id] || SEAT.def;
      c.translate(0, -32 + Math.sin(t * 2) * 1.5);
      c.rotate(o.rot || 0);
      c.drawImage(im, -fx * W, -fy * H, W, H);
      c.restore(); return;
    }
    let rot = o.rot || 0, bob = 0, sx = 1, sy = 1, dy = 0;
    switch (pose) {
      case 'run': bob = -Math.abs(Math.sin(t)) * 7; rot += Math.sin(t * 2) * 0.04; sy = 1 + Math.cos(t * 2) * 0.035; sx = 1 / sy; break;
      case 'jump': rot += -0.14; sy = 1.06; sx = 0.95; break;
      case 'fall': rot += 0.12; break;
      case 'slide': rot += -1.2; dy = 22; break;
      case 'fly': rot += 0.8; dy = -6; break;
      case 'stand': bob = Math.sin(time * 9) * 1.5; break;
      case 'win': bob = -Math.abs(Math.sin(time * 6)) * 10; break;
      default: bob = Math.sin(time * 3) * 2;
    }
    const pivot = -H * 0.42; // 绕腰部旋转
    c.translate(0, bob + dy + pivot); c.rotate(rot); c.scale(sx, sy); c.translate(0, -pivot);
    c.drawImage(im, -W / 2, -H, W, H);
    c.restore();
  };

  // ---------- 坐骑 ----------
  function mountGeo(id, o) {
    const im = IMG[id];
    const [MW, fx, fy] = MOUNT[id] || MOUNT.def;
    const MH = MW * im.height / im.width * (o.slide ? 0.75 : 1);
    const time = o.time || 0, t = o.t || 0;
    let bob = 0, rot = 0;
    if (FLYER.has(id)) { bob = Math.sin(time * 4) * 4 - (STAND.has(id) ? 10 : 22); }
    else if (!o.air) { bob = -Math.abs(Math.sin(t)) * 5; rot = Math.sin(t * 2) * 0.03; }
    return { im, MW, MH, fx, fy, bob, rot };
  }
  const vecMount = A.drawMount, vecSaddle = A.saddle;
  A.drawMount = function (c, id, x, y, o) {
    o = o || {};
    if (!IMG[id]) return vecMount(c, id, x, y, o);
    const g = mountGeo(id, o);
    c.save(); c.translate(x, y + g.bob);
    if (o.scale) c.scale(o.scale, o.scale);
    if (o.alpha != null) c.globalAlpha *= o.alpha;
    c.rotate(g.rot);
    c.drawImage(g.im, -g.MW / 2, -g.MH, g.MW, g.MH);
    c.restore();
  };
  A.saddle = function (id, o) {
    o = o || {};
    if (!IMG[id]) return vecSaddle(id, o);
    const g = mountGeo(id, o);
    return { x: (g.fx - 0.5) * g.MW, y: -(1 - g.fy) * g.MH + g.bob, stand: STAND.has(id) };
  };

  // ---------- 宠物 ----------
  const vecPet = A.drawPet;
  A.drawPet = function (c, id, x, y, time, scale) {
    const im = IMG[id];
    if (!im) return vecPet(c, id, x, y, time, scale);
    const s = PET_S * (scale || 1), w = im.width >= im.height ? s : s * im.width / im.height, h = w * im.height / im.width;
    c.save(); c.translate(x, y + Math.sin(time * 4) * 4); c.rotate(Math.sin(time * 2.5) * 0.06);
    c.drawImage(im, -w / 2, -h / 2, w, h);
    c.restore();
  };
})();
