// 全局命名空间与游戏数据
window.KP = window.KP || {};
KP.W = 1280; KP.H = 720; KP.G = 600; // 逻辑分辨率与地面高度

KP.CHARS = [
  {
    id: 'afei', name: '疾风·阿飞', title: '影之忍者', color: '#e8424a',
    skill: { name: '疾风冲刺', desc: '5 秒超高速冲刺，无敌并撞碎一切障碍，坑洞如履平地' },
    passive: '冲刺道具持续时间 +50%'
  },
  {
    id: 'mengmeng', name: '星光·萌萌', title: '星辰魔法少女', color: '#ff6fc0',
    skill: { name: '星辰魔法', desc: '7 秒内前方障碍全部化为星星金币，并开启超级磁铁' },
    passive: '磁铁道具持续时间 +50%'
  },
  {
    id: 'tiequan', name: '雷霆·铁拳', title: '机甲战士', color: '#36a8ff',
    skill: { name: '雷霆冲击', desc: '释放电磁冲击波清空全屏障碍，并获得雷电护盾' },
    passive: '开局自带一层护盾'
  },
  {
    id: 'xiaoyan', name: '焰灵·小炎', title: '火焰精灵', color: '#ff8a1f',
    skill: { name: '烈焰巨人', desc: '6 秒化身火焰巨人，碾碎障碍，金币收益翻倍' },
    passive: '浴火重生：每局可复活一次'
  }
];

KP.MOUNTS = [
  { id: 'none', name: '徒步', desc: '轻装上阵，不使用坐骑', bonus: 0 },
  { id: 'wheel', name: '风火轮', desc: '可三段跳 · 分数 +10%', bonus: 0.1 },
  { id: 'unicorn', name: '彩虹独角兽', desc: '空中按住跳跃可滑翔 · 分数 +15%', bonus: 0.15 },
  { id: 'dragon', name: '机甲飞龙', desc: '每 8 秒自动喷火摧毁前方障碍 · 分数 +20%', bonus: 0.2 }
];

KP.MODES = [
  { id: 'classic', name: '经典模式', icon: '🏃', desc: '无尽奔跑，挑战最远距离', theme: 'classic' },
  { id: 'speed', name: '极速模式', icon: '⚡', desc: '速度狂飙，分数 ×2', theme: 'speed' },
  { id: 'fly', name: '炫飞模式', icon: '🕊️', desc: '按住跳跃飞行，穿越云端水晶阵', theme: 'fly' },
  { id: 'race', name: '竞速模式', icon: '🏁', desc: '与 3 位对手竞速 2000 米', theme: 'race' }
];

KP.ITEMS = {
  magnet: { name: '磁铁', dur: 8 },
  shield: { name: '护盾', dur: 0 },
  dash: { name: '冲刺', dur: 3 },
  giant: { name: '巨人', dur: 5 },
  double: { name: '双倍金币', dur: 10 },
  flight: { name: '炫飞之翼', dur: 6 },
  mount: { name: '坐骑召回', dur: 0 }
};
