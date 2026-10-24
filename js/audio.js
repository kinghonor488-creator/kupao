// 合成音效与背景音乐（WebAudio，无需音频文件）
(function () {
  'use strict';
  const S = KP.audio = { ctx: null, muted: false };
  let master, musicGain, sfxGain, noiseBuf, timer = null, step = 0, nextT = 0, tempo = 150;

  S.init = function () {
    if (S.ctx) { if (S.ctx.state === 'suspended') S.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      S.ctx = new AC();
      master = S.ctx.createGain(); master.gain.value = S.muted ? 0 : 0.8; master.connect(S.ctx.destination);
      musicGain = S.ctx.createGain(); musicGain.gain.value = 0.13; musicGain.connect(master);
      sfxGain = S.ctx.createGain(); sfxGain.gain.value = 0.45; sfxGain.connect(master);
      noiseBuf = S.ctx.createBuffer(1, S.ctx.sampleRate * 0.5, S.ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { S.ctx = null; }
  };

  S.setMuted = function (m) {
    S.muted = m;
    if (master) master.gain.value = m ? 0 : 0.8;
  };

  function tone(f, dur, type, vol, f2, when, dest) {
    const c = S.ctx; if (!c) return;
    const t = when || c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest || sfxGain);
    o.start(t); o.stop(t + dur + 0.03);
  }

  function noise(dur, vol, freq, when, dest) {
    const c = S.ctx; if (!c) return;
    const t = when || c.currentTime;
    const src = c.createBufferSource(); src.buffer = noiseBuf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 1200; f.Q.value = 0.8;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(dest || sfxGain);
    src.start(t); src.stop(t + dur + 0.03);
  }

  S.sfx = function (name, arg) {
    if (!S.ctx || S.muted) return;
    const t = S.ctx.currentTime;
    switch (name) {
      case 'jump': tone(380, 0.16, 'square', 0.16, 760); break;
      case 'jump2': tone(520, 0.2, 'square', 0.16, 1250); break;
      case 'slide': noise(0.22, 0.25, 900); break;
      case 'coin': {
        const f = [1047, 1175, 1319, 1397, 1568, 1760][(arg || 0) % 6];
        tone(f, 0.07, 'square', 0.09); tone(f * 1.5, 0.12, 'square', 0.07, null, t + 0.05);
        break;
      }
      case 'item': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, 'triangle', 0.22, null, t + i * 0.06)); break;
      case 'shield': tone(300, 0.3, 'sine', 0.3, 900); noise(0.2, 0.15, 3000); break;
      case 'hit': tone(200, 0.3, 'sawtooth', 0.25, 60); noise(0.25, 0.35, 500); break;
      case 'smash': noise(0.18, 0.35, 700); tone(160, 0.15, 'square', 0.12, 80); break;
      case 'die': tone(520, 0.6, 'square', 0.2, 80); noise(0.4, 0.3, 400); break;
      case 'skill':
        [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.16, 'square', 0.14, null, t + i * 0.045));
        noise(0.5, 0.2, 2500, t + 0.1); break;
      case 'fire': noise(0.45, 0.3, 600); tone(120, 0.4, 'sawtooth', 0.12, 60); break;
      case 'win':
        [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.2, 'square', 0.15, null, t + i * 0.11)); break;
      case 'click': tone(880, 0.06, 'square', 0.12); break;
    }
  };

  // 简易芯片音乐：C - Am - F - G 进行
  const BASS = [48, 45, 41, 43];
  const MEL = [
    72, null, 76, 79, 84, null, 79, 76,
    81, null, 84, 81, 76, null, 81, null,
    77, null, 81, 84, 89, null, 84, 81,
    79, null, 83, 86, 91, 88, 86, 83
  ];
  const midi = m => 440 * Math.pow(2, (m - 69) / 12);

  function playStep(i, t) {
    const bar = Math.floor(i / 8) % 4, pos = i % 8;
    const spb = 60 / tempo / 2;
    if (pos % 2 === 0) tone(midi(BASS[bar] + (pos === 4 ? 12 : 0)), spb * 1.8, 'triangle', 0.5, null, t, musicGain);
    const m = MEL[i % 32];
    if (m) tone(midi(m), spb * 0.9, 'square', 0.18, null, t, musicGain);
    noise(0.03, pos % 2 ? 0.12 : 0.22, 7000, t, musicGain);
    if (pos === 0 || pos === 4) tone(110, 0.12, 'sine', 0.6, 40, t, musicGain);
  }

  function sched() {
    const c = S.ctx; if (!c) return;
    const spb = 60 / tempo / 2;
    while (nextT < c.currentTime + 0.12) { playStep(step, nextT); nextT += spb; step++; }
  }

  S.music = function (mode) {
    S.stopMusic();
    if (!S.ctx) return;
    tempo = { speed: 176, fly: 140, race: 164 }[mode] || 150;
    step = 0; nextT = S.ctx.currentTime + 0.1;
    timer = setInterval(sched, 25);
  };
  S.stopMusic = function () { if (timer) clearInterval(timer); timer = null; };
  S.pause = function () { if (S.ctx && S.ctx.state === 'running') S.ctx.suspend(); };
  S.resume = function () { if (S.ctx && S.ctx.state === 'suspended') S.ctx.resume(); };
})();
