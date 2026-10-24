// 全局命名空间与游戏数据
window.KP = window.KP || {};
KP.W = 1280; KP.H = 720; KP.G = 600; // 逻辑分辨率与地面高度

// 稀有度：价格（金币或钻石）、重复抽到时折算的金币
KP.RARITY = {
  N: { name: 'N', color: '#9aa6c0', glow: '#c8d2e6', coin: 3000, dupe: 300 },
  R: { name: 'R', color: '#4ab8ff', glow: '#9fe0ff', coin: 8000, dupe: 800 },
  SR: { name: 'SR', color: '#c46bff', glow: '#e4b8ff', dia: 300, dupe: 2500 },
  SSR: { name: 'SSR', color: '#ffb02e', glow: '#ffe08a', dia: 800, dupe: 6000 }
};

// 技能类型说明（时长秒）
KP.SKILLS = {
  dash: { dur: 5, desc: '秒超高速冲刺，无敌并撞碎障碍，坑洞如履平地' },
  starify: { dur: 7, desc: '秒内前方障碍化为星星金币，并开启超级磁铁' },
  shock: { dur: 0.8, desc: '释放冲击波清空全屏障碍，并获得一层护盾' },
  giant: { dur: 6, desc: '秒化身巨人，碾碎障碍，金币收益翻倍' },
  coinRain: { dur: 6, desc: '秒内天降金币雨，金币收益翻倍' },
  magnetStorm: { dur: 8, desc: '秒超级磁铁，吸取全屏金币和道具' },
  flight: { dur: 6, desc: '秒飞上天空，无敌并收集空中金币' },
  guard: { dur: 3, desc: '秒无敌，并获得两层护盾' }
};

// jumps：跳跃段数（2~4），glides：滑翔段数（0~3）
// art：绘制配置（前 4 位是专属手绘角色）
KP.CHARS = [
  { id: 'afei', name: '疾风·阿飞', title: '影之忍者', rarity: 'N', color: '#e8424a', jumps: 3, glides: 0, skill: { type: 'dash', name: '疾风冲刺' }, passive: '冲刺道具持续 +50%', free: true },
  { id: 'mengmeng', name: '星光·萌萌', title: '星辰魔法少女', rarity: 'SR', color: '#ff6fc0', jumps: 2, glides: 2, skill: { type: 'starify', name: '星辰魔法' }, passive: '磁铁道具持续 +50%' },
  { id: 'tiequan', name: '雷霆·铁拳', title: '机甲战士', rarity: 'SR', color: '#36a8ff', jumps: 2, glides: 1, skill: { type: 'shock', name: '雷霆冲击' }, passive: '开局自带一层护盾' },
  { id: 'xiaoyan', name: '焰灵·小炎', title: '火焰精灵', rarity: 'SR', color: '#ff8a1f', jumps: 3, glides: 0, skill: { type: 'giant', name: '烈焰巨人' }, passive: '浴火重生：每局复活一次' },
  {
    id: 'xiaoying', name: '樱花·小樱', title: '樱花剑士', rarity: 'N', color: '#ff8fb1', jumps: 3, glides: 1, skill: { type: 'dash', name: '樱吹雪' }, passive: '分数 +5%',
    art: { skin: 0, hair: 'pony', hairCol: ['#ffb3cc', '#ff6f9e'], eye: '#d6336c', top: ['#fff0f5', '#f7c8d8'], belt: '#d6336c', pants: '#5a2a3a', shoe: '#d6336c', sleeve: '#fff0f5', head: 'headband', headCol: '#d6336c', hand: 'katana', back: 'none', skirt: '#d6336c' }
  },
  {
    id: 'bingbing', name: '冰雪·冰冰', title: '冰雪公主', rarity: 'SR', color: '#7fd8ff', jumps: 2, glides: 2, skill: { type: 'starify', name: '冰晶世界' }, passive: '巨人道具持续 +50%',
    art: { skin: 1, hair: 'long', hairCol: ['#e8f8ff', '#9fd8f5'], eye: '#2a8fd8', top: ['#bfeaff', '#5ab0e8'], belt: '#ffffff', pants: '#e8f8ff', shoe: '#5ab0e8', sleeve: '#d8f3ff', head: 'tiara', hand: 'staff', handCol: '#bff4ff', back: 'cape', backCol: '#9fd8f5', skirt: '#5ab0e8' }
  },
  {
    id: 'leiming', name: '雷鸣', title: '雷电法师', rarity: 'R', color: '#ffd92e', jumps: 2, glides: 1, skill: { type: 'shock', name: '天雷落' }, passive: '技能充能 +15%',
    art: { skin: 0, hair: 'spiky', hairCol: ['#fff27a', '#f5b800'], eye: '#3a6aff', top: ['#3a3f9a', '#22266a'], belt: '#ffd92e', pants: '#22266a', shoe: '#ffd92e', sleeve: '#3a3f9a', head: 'wizard', headCol: '#3a3f9a', hand: 'staff', handCol: '#fff27a', back: 'cape', backCol: '#22266a' }
  },
  {
    id: 'ali', name: '九尾·阿狸', title: '九尾狐', rarity: 'SR', color: '#ff9a3a', jumps: 3, glides: 1, skill: { type: 'coinRain', name: '狐火金雨' }, passive: '金币 +10%',
    art: { skin: 1, hair: 'long', hairCol: ['#ffb36b', '#e8641a'], eye: '#c2185b', top: ['#ffffff', '#ffe3cc'], belt: '#e8641a', pants: '#8a2a1a', shoe: '#e8641a', sleeve: '#ffffff', head: 'ears_fox', back: 'tail_fox', backCol: '#ff9a3a', skirt: '#c2185b' }
  },
  {
    id: 'miaomiao', name: '喵喵', title: '猫耳少女', rarity: 'R', color: '#b48cff', jumps: 4, glides: 0, skill: { type: 'magnetStorm', name: '喵喵吸金' }, passive: '磁铁道具持续 +30%',
    art: { skin: 0, hair: 'bob', hairCol: ['#cdb4ff', '#8a5cf0'], eye: '#ffb02e', top: ['#ffe0f0', '#ffb6d9'], belt: '#8a5cf0', pants: '#4a3a7a', shoe: '#8a5cf0', sleeve: '#ffe0f0', head: 'ears_cat', headCol: '#8a5cf0', back: 'tail_cat', backCol: '#8a5cf0', face: 'whiskers' }
  },
  {
    id: 'langlang', name: '浪浪', title: '冲浪少年', rarity: 'N', color: '#2ad1c9', jumps: 2, glides: 1, skill: { type: 'flight', name: '冲上云霄' }, passive: '道具持续 +10%',
    art: { skin: 2, hair: 'short', hairCol: ['#4a3020', '#2a1a10'], eye: '#1a8a8a', top: ['#2ad1c9', '#168f8a'], belt: '#ffd24a', pants: '#ffb02e', shoe: '#ffffff', sleeve: '#2ad1c9', head: 'cap', headCol: '#ff5a4a', back: 'none' }
  },
  {
    id: 'tuantuan', name: '团团', title: '熊猫功夫', rarity: 'R', color: '#4ad46a', jumps: 2, glides: 0, skill: { type: 'giant', name: '熊猫铁山靠' }, passive: '开局一层护盾',
    art: { skin: 0, hair: 'short', hairCol: ['#2a2a2a', '#111111'], eye: '#2a2a2a', top: ['#4ad46a', '#2a9a44'], belt: '#ffd24a', pants: '#2a2a2a', shoe: '#2a2a2a', sleeve: '#4ad46a', head: 'ears_panda', back: 'none', face: 'panda' }
  },
  {
    id: 'luna', name: '天使·露娜', title: '光之天使', rarity: 'SSR', color: '#fff2a0', jumps: 2, glides: 3, skill: { type: 'flight', name: '圣光之翼' }, passive: '分数 +15%',
    art: { skin: 1, hair: 'long', hairCol: ['#fff6c8', '#f5d36b'], eye: '#4a9aff', top: ['#ffffff', '#e8eefc'], belt: '#f5c842', pants: '#ffffff', shoe: '#f5c842', sleeve: '#ffffff', head: 'halo', back: 'wings_angel', skirt: '#f5c842' }
  },
  {
    id: 'luxi', name: '恶魔·路西', title: '暗夜恶魔', rarity: 'SSR', color: '#d63a6a', jumps: 3, glides: 2, skill: { type: 'dash', name: '暗影突袭' }, passive: '撞碎障碍分数 ×3',
    art: { skin: 3, hair: 'spiky', hairCol: ['#5a2a6a', '#2a0a3a'], eye: '#ff2a4a', top: ['#3a1a4a', '#1a0a2a'], belt: '#d63a6a', pants: '#1a0a2a', shoe: '#d63a6a', sleeve: '#3a1a4a', head: 'horns_devil', back: 'wings_bat', backCol: '#3a1a4a', mood: 'cool' }
  },
  {
    id: 'jieke', name: '海盗·杰克', title: '海盗船长', rarity: 'R', color: '#c0392b', jumps: 3, glides: 0, skill: { type: 'coinRain', name: '金银财宝' }, passive: '金币 +15%',
    art: { skin: 2, hair: 'messy', hairCol: ['#6a3a1a', '#3a1a0a'], eye: '#2a2a2a', top: ['#c0392b', '#8a1f15'], belt: '#ffd24a', pants: '#2a2a3a', shoe: '#3a2a1a', sleeve: '#f0e6d0', head: 'pirate', hand: 'sword', face: 'eyepatch', mood: 'cool' }
  },
  {
    id: 'yase', name: '骑士·亚瑟', title: '圣剑骑士', rarity: 'SR', color: '#5a8aff', jumps: 2, glides: 1, skill: { type: 'guard', name: '圣盾守护' }, passive: '开局一层护盾',
    art: { skin: 0, hair: 'none', hairCol: ['#ffd24a', '#c8961a'], eye: '#3a6aff', top: ['#c8d6ee', '#7f93b6'], belt: '#5a8aff', pants: '#5d6f8c', shoe: '#5d6f8c', sleeve: '#c8d6ee', head: 'helmet_knight', hand: 'sword', back: 'cape', backCol: '#5a8aff' }
  },
  {
    id: 'tutu', name: '兔兔', title: '月兔', rarity: 'N', color: '#ffc2d6', jumps: 4, glides: 1, skill: { type: 'magnetStorm', name: '月光吸引' }, passive: '跳跃更轻盈',
    art: { skin: 1, hair: 'bob', hairCol: ['#ffffff', '#e8e0f0'], eye: '#ff4a7a', top: ['#ffc2d6', '#ff8fb1'], belt: '#ffffff', pants: '#ffffff', shoe: '#ff8fb1', sleeve: '#ffc2d6', head: 'ears_bunny', back: 'none', skirt: '#ff8fb1' }
  },
  {
    id: 'bili', name: '牛仔·比利', title: '西部牛仔', rarity: 'N', color: '#c8863a', jumps: 3, glides: 0, skill: { type: 'dash', name: '快马加鞭' }, passive: '冲刺道具持续 +30%',
    art: { skin: 2, hair: 'short', hairCol: ['#a0602a', '#6a3a1a'], eye: '#3a6a2a', top: ['#d84a3a', '#a02a20'], belt: '#5a3a1a', pants: '#3a5a9a', shoe: '#6a3a1a', sleeve: '#d84a3a', head: 'cowboy', back: 'scarf', backCol: '#ffd24a', mood: 'cool' }
  },
  {
    id: 'xingxing', name: '宇航员·星星', title: '星际探险家', rarity: 'SR', color: '#e8eefc', jumps: 2, glides: 2, skill: { type: 'flight', name: '火箭升空' }, passive: '炫飞模式分数 +20%',
    art: { skin: 0, hair: 'short', hairCol: ['#4a3020', '#2a1a10'], eye: '#3a6aff', top: ['#ffffff', '#c8d2e6'], belt: '#ff8a1f', pants: '#e8eefc', shoe: '#7f93b6', sleeve: '#ffffff', head: 'space', back: 'jetpack' }
  },
  {
    id: 'aoxiao', name: '龙王·敖小', title: '东海龙王', rarity: 'SSR', color: '#2ac4a8', jumps: 3, glides: 2, skill: { type: 'giant', name: '龙王降世' }, passive: '金币 +15% · 分数 +10%',
    art: { skin: 0, hair: 'long', hairCol: ['#3ad8b8', '#168f7a'], eye: '#ffb02e', top: ['#ffd24a', '#e0a01a'], belt: '#2ac4a8', pants: '#168f7a', shoe: '#ffd24a', sleeve: '#ffd24a', head: 'horns_dragon', back: 'cape', backCol: '#2ac4a8', mood: 'cool' }
  },
  {
    id: 'mosheng', name: '魔术师·莫笙', title: '奇幻魔术师', rarity: 'R', color: '#8a5cf0', jumps: 2, glides: 1, skill: { type: 'starify', name: '大变活币' }, passive: '道具出现率 +20%',
    art: { skin: 0, hair: 'short', hairCol: ['#3a2a4a', '#1a1020'], eye: '#8a5cf0', top: ['#2a2a3a', '#14141e'], belt: '#ff3b4f', pants: '#2a2a3a', shoe: '#14141e', sleeve: '#2a2a3a', head: 'tophat', hand: 'wand', back: 'cape', backCol: '#c0392b' }
  },
  {
    id: 'huahua', name: '花仙·花花', title: '花之精灵', rarity: 'R', color: '#7cd84a', jumps: 2, glides: 2, skill: { type: 'guard', name: '花之结界' }, passive: '每局复活一次',
    art: { skin: 1, hair: 'twin', hairCol: ['#a8f07a', '#5ac02a'], eye: '#ff6a9a', top: ['#ffd6ec', '#ff9ac8'], belt: '#5ac02a', pants: '#a8f07a', shoe: '#ff6a9a', sleeve: '#ffd6ec', head: 'flower', back: 'wings_fairy', skirt: '#5ac02a' }
  },
  {
    id: 'wukong', name: '齐天·小悟', title: '美猴王', rarity: 'SSR', color: '#ffcf3a', jumps: 4, glides: 1, skill: { type: 'dash', name: '筋斗云' }, passive: '冲刺道具持续 +50% · 分数 +10%',
    art: { skin: 1, hair: 'messy', hairCol: ['#c8863a', '#8a5a2a'], eye: '#ffb02e', top: ['#ffcf3a', '#e09a1a'], belt: '#c0392b', pants: '#c0392b', shoe: '#2a2a2a', sleeve: '#ffcf3a', head: 'crown_monkey', hand: 'staff_gold', back: 'cape', backCol: '#c0392b', mood: 'cool' }
  }
];

// 坐骑：bonus 分数加成；ability 特殊能力
KP.MOUNT_ABIL = {
  none: '无特殊能力',
  fire: '每 8 秒自动喷火摧毁前方障碍',
  magnet: '每 15 秒自动开启 4 秒磁铁',
  coin: '金币收益 +15%',
  shield: '每 25 秒自动获得护盾',
  energy: '技能充能 +25%',
  dash: '开局冲刺 3 秒',
  item: '道具持续 +30%',
  diamond: '钻石出现率翻倍'
};
KP.MOUNTS = [
  { id: 'none', name: '徒步', rarity: 'N', bonus: 0, ability: 'none', free: true },
  { id: 'wheel', name: '风火轮', rarity: 'N', bonus: 0.05, ability: 'dash', free: true },
  { id: 'skate', name: '炫彩滑板', rarity: 'N', bonus: 0.05, ability: 'coin' },
  { id: 'cloud', name: '筋斗云', rarity: 'R', bonus: 0.1, ability: 'item' },
  { id: 'carpet', name: '飞天魔毯', rarity: 'R', bonus: 0.1, ability: 'magnet' },
  { id: 'rocket', name: '火箭滑板', rarity: 'SR', bonus: 0.15, ability: 'dash' },
  { id: 'duck', name: '大黄鸭', rarity: 'N', bonus: 0.05, ability: 'shield' },
  { id: 'unicorn', name: '彩虹独角兽', rarity: 'SR', bonus: 0.15, ability: 'energy' },
  { id: 'horse', name: '赤兔宝马', rarity: 'R', bonus: 0.1, ability: 'dash' },
  { id: 'lion', name: '烈焰雄狮', rarity: 'SR', bonus: 0.15, ability: 'fire' },
  { id: 'wolf', name: '霜月雪狼', rarity: 'R', bonus: 0.1, ability: 'shield' },
  { id: 'tiger', name: '斑斓猛虎', rarity: 'R', bonus: 0.1, ability: 'coin' },
  { id: 'deer', name: '九色神鹿', rarity: 'SR', bonus: 0.15, ability: 'diamond' },
  { id: 'pig', name: '招财小猪', rarity: 'N', bonus: 0.05, ability: 'coin' },
  { id: 'bear', name: '北极熊', rarity: 'R', bonus: 0.1, ability: 'shield' },
  { id: 'raptor', name: '迅猛龙', rarity: 'SR', bonus: 0.15, ability: 'energy' },
  { id: 'dragon', name: '机甲飞龙', rarity: 'SSR', bonus: 0.25, ability: 'fire' },
  { id: 'phoenix', name: '涅槃凤凰', rarity: 'SSR', bonus: 0.25, ability: 'shield' },
  { id: 'eagle', name: '苍穹雄鹰', rarity: 'R', bonus: 0.1, ability: 'magnet' },
  { id: 'ufo', name: '星际飞碟', rarity: 'SSR', bonus: 0.25, ability: 'magnet' }
];

// 宠物：跟随角色，提供能力；jump/glide 可额外加段数
KP.PETS = [
  { id: 'none', name: '无', rarity: 'N', desc: '不携带宠物', free: true },
  { id: 'bee', name: '金币蜂', rarity: 'N', desc: '自动收集身边的金币', free: true },
  { id: 'fairy', name: '小精灵', rarity: 'R', desc: '技能充能 +30%' },
  { id: 'owl', name: '智慧猫头鹰', rarity: 'R', desc: '所有道具持续 +30%' },
  { id: 'firedrake', name: '小火龙', rarity: 'SR', desc: '每 12 秒喷火摧毁前方障碍' },
  { id: 'starbaby', name: '星星宝宝', rarity: 'N', desc: '分数 +10%' },
  { id: 'ghost', name: '小幽灵', rarity: 'R', desc: '每 30 秒获得一层护盾' },
  { id: 'luckycat', name: '招财猫', rarity: 'SR', desc: '金币 +20%' },
  { id: 'robot', name: '机械球', rarity: 'R', desc: '每 20 秒开启 4 秒磁铁' },
  { id: 'penguin', name: '小企鹅', rarity: 'N', desc: '开局冲刺 3 秒' },
  { id: 'gembunny', name: '钻石兔', rarity: 'SSR', desc: '钻石出现率翻倍，金币 +10%' },
  { id: 'butterfly', name: '蝴蝶仙子', rarity: 'SR', desc: '滑翔段数 +1（最多 3 段）', glide: 1 },
  { id: 'frog', name: '跳跳蛙', rarity: 'SSR', desc: '跳跃段数 +1（最多 4 段）', jump: 1 }
];

// 宝物：最多装备 3 件，可升到 5 级；vals 为各等级数值
KP.TREASURES = [
  { id: 'coinbag', name: '聚宝金袋', rarity: 'N', icon: '💰', key: 'coinPct', vals: [5, 8, 12, 16, 20], fmt: '金币 +{v}%' },
  { id: 'luckystar', name: '幸运之星', rarity: 'N', icon: '⭐', key: 'scorePct', vals: [5, 8, 12, 16, 20], fmt: '分数 +{v}%' },
  { id: 'crystal', name: '守护水晶', rarity: 'R', icon: '🔮', key: 'guardEvery', vals: [60, 50, 40, 32, 25], fmt: '每 {v} 秒自动获得护盾' },
  { id: 'hourglass', name: '时光沙漏', rarity: 'R', icon: '⏳', key: 'itemPct', vals: [10, 20, 30, 40, 50], fmt: '道具持续 +{v}%' },
  { id: 'boots', name: '疾风之靴', rarity: 'N', icon: '👢', key: 'dashStart', vals: [2, 3, 4, 5, 6], fmt: '开局冲刺 {v} 秒' },
  { id: 'battery', name: '能量电池', rarity: 'R', icon: '🔋', key: 'energyPct', vals: [10, 15, 20, 25, 30], fmt: '技能充能 +{v}%' },
  { id: 'core', name: '启动核心', rarity: 'N', icon: '⚡', key: 'startEnergy', vals: [20, 30, 40, 50, 60], fmt: '开局能量 {v}%' },
  { id: 'compass', name: '寻宝罗盘', rarity: 'SR', icon: '🧭', key: 'diamondPct', vals: [30, 60, 90, 120, 150], fmt: '钻石出现率 +{v}%' },
  { id: 'clover', name: '四叶草', rarity: 'R', icon: '🍀', key: 'itemRate', vals: [10, 20, 30, 40, 50], fmt: '道具出现率 +{v}%' },
  { id: 'feather', name: '不死鸟之羽', rarity: 'SSR', icon: '🪶', key: 'reviveChance', vals: [20, 30, 40, 50, 60], fmt: '死亡时 {v}% 概率复活（每局一次）' },
  { id: 'magnetstone', name: '磁力原石', rarity: 'N', icon: '🧲', key: 'magnetStart', vals: [3, 4, 5, 6, 8], fmt: '开局磁铁 {v} 秒' },
  { id: 'crown', name: '王者之冠', rarity: 'SSR', icon: '👑', key: 'allPct', vals: [5, 8, 10, 13, 16], fmt: '金币与分数 +{v}%' }
];
KP.TREASURE_UP = [0, 1000, 2500, 5000, 10000]; // 升到下一级的金币
KP.TREASURE_PRICE = { N: { coin: 1500 }, R: { coin: 4000 }, SR: { dia: 200 }, SSR: { dia: 500 } };
KP.PET_PRICE = { N: { coin: 2000 }, R: { coin: 6000 }, SR: { dia: 250 }, SSR: { dia: 600 } };

// 抽奖
KP.GACHA = {
  single: 100, ten: 900, // 钻石
  rates: { N: 50, R: 32, SR: 14, SSR: 4 },
  coinPrize: [500, 1000, 2000] // 抽中金币奖励时的数额
};
KP.SIGNIN = [{ dia: 30 }, { coin: 1000 }, { dia: 50 }, { coin: 2000 }, { dia: 80 }, { coin: 3000 }, { dia: 150 }];

KP.MODES = [
  { id: 'classic', name: '经典', icon: '🏃', desc: '无尽奔跑，挑战最远距离', theme: 'classic' },
  { id: 'speed', name: '极速', icon: '⚡', desc: '速度狂飙，分数 ×2', theme: 'speed' },
  { id: 'fly', name: '炫飞', icon: '🕊️', desc: '按住跳跃飞行，穿越水晶阵', theme: 'fly' },
  { id: 'race', name: '竞速', icon: '🏁', desc: '与 3 位对手竞速 2000 米', theme: 'race' }
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

KP.charOf = id => KP.CHARS.find(c => c.id === id) || KP.CHARS[0];
KP.mountOf = id => KP.MOUNTS.find(c => c.id === id) || KP.MOUNTS[0];
KP.petOf = id => KP.PETS.find(c => c.id === id) || KP.PETS[0];
KP.treasureOf = id => KP.TREASURES.find(c => c.id === id);
