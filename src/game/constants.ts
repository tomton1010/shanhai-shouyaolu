/** 游戏内部分辨率。显示可以缩放，坐标系始终是这块画布。 */
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

/**
 * 道士身高（像素）。待机图按这个身高显示，见 ACTOR_SPRITE_DISPLAY_SIZE。
 * 画面边缘仍用 PLAYER_HALF_EXTENT，不跟着袍摆外框变。
 */
export const PLAYER_BODY_HEIGHT = 64;
export const PLAYER_BODY_WIDTH = 36;

/** 描边外接圆半径。斜向时 40×68 的角不会伸出画布。 */
export const PLAYER_HALF_EXTENT = 40;

/**
 * 道士、狌狌待机图在画面上的边长，像素。源图是 256×256 透明 PNG，
 * 引擎里最近邻缩放到这个尺寸，不走线性过滤。
 * 人物几乎铺满贴图，70 时身高约 64，和原来的色块身长一致。
 * 接触、拾取仍用原来的坐标，不按袍摆、毛发或耳朵的外框算。
 */
export const ACTOR_SPRITE_DISPLAY_SIZE = 70;

/**
 * 朝向的水平分量小于这个值时不翻面。
 * 大约正上、正下 20 度以内，避免贴着上下走时来回闪。
 */
export const ACTOR_FACING_DEADZONE = 0.35;

/**
 * 原画都是略俯视的 3/4，面朝右下。facing 为 1：往右走不翻转，往左走水平翻转。
 * originX/Y 是躯干在贴图上的位置（0–1）。画面锚在这里，不锚在袍摆、耳朵或手脚上。
 */
export const PLAYER_LOOK = {
  name: '道士',
  texture: 'actor-taoist',
  file: 'art/player/taoist_idle.png',
  facing: 1,
  originX: 0.48,
  originY: 0.55,
} as const;

export const COMPANION_LOOK = {
  name: '狌狌',
  texture: 'actor-xingxing',
  file: 'art/companion/xingxing_idle.png',
  facing: 1,
  originX: 0.44,
  originY: 0.45,
} as const;

/** 胸口朱砂符，相对躯干。翻面时水平镜像，仍贴在身前。只表示冲刺冷却，不改冲刺。 */
export const TALISMAN_OFFSET_X = 4;
export const TALISMAN_OFFSET_Y = -8;
export const TALISMAN_WIDTH = 6;
export const TALISMAN_HEIGHT = 10;

/** 招摇之山地面，和画布一样大。中间石板比原图略提亮，边角没有抬。 */
export const GROUND_LOOK = {
  texture: 'ground-zhaoyao',
  file: 'art/ground/zhaoyao.png',
} as const;

/**
 * 藤鞭贴图只负责画面。扇面张角、半径、伤害和间隔仍走原来的常量。
 * 藤根锚在狌狌身上，主藤转到扇面中线，再缩到这一下的半径。
 */
export const WHIP_VINE_LOOK = {
  texture: 'fx-whip-vine',
  file: 'art/fx/whip_vine.png',
  frameWidth: 935,
  frameHeight: 886,
  originX: 158 / 935,
  originY: 762 / 886,
  /** 主藤中段相对藤根的方向，屏幕坐标，弧度。 */
  tipAngle: (-57.4 * Math.PI) / 180,
  /** 藤根到藤身外沿，像素。显示时缩放到扇面半径。 */
  tipRadius: 840,
} as const;

/** 冲刺斩刀光。沿实际走过的路径旋转、拉长。判定半径仍是 DASH_SLASH_RANGE。 */
export const DASH_SLASH_LOOK = {
  texture: 'fx-dash-slash',
  file: 'art/fx/dash_slash.png',
  frameWidth: 1173,
  frameHeight: 277,
} as const;

/** 灵气画面直径。原来的圆半径是 7，直径 14。拾取半径不看这个数。 */
export const ORB_LOOK = {
  texture: 'fx-lingqi',
  file: 'art/fx/lingqi_orb.png',
} as const;
export const ORB_DISPLAY_SIZE = 14;

/** 走路速度，像素/秒。斜向会先归一化，因此不会更快。 */
export const PLAYER_MOVE_SPEED = 320;

/** 冲刺位移长度，像素。沿单位方向一次走完。 */
export const DASH_DISTANCE = 140;

/** 冲刺位移耗时，毫秒。 */
export const DASH_DURATION_MS = 110;

/**
 * 冲刺冷却，毫秒，从冲刺开始的那一帧算起（含冲刺本身的耗时）。
 * 冷却结束前不能再次冲刺。
 */
export const DASH_COOLDOWN_MS = 750;

/**
 * 单帧最多推进的模拟时间。浏览器卡顿时避免一帧滑过整张图，
 * 也避免一次大的 delta 把冷却直接扣完。
 */
export const MAX_FRAME_MS = 64;

/** 冲刺残影淡出时间，毫秒。 */
export const TRAIL_FADE_MS = 180;

/**
 * 冲刺键是空格。触控时右下角按钮走同一套冷却。
 * 不绑定 Shift，避免和以后的其他操作撞车。
 */
export const DASH_KEY_LABEL = '空格';

/** 摇杆可拖动的最大半径，像素。超出后方向不变、速度封顶。 */
export const JOYSTICK_MAX_RADIUS = 72;

/** 小于这个比例视为没推动。按半径的比例，不是像素。 */
export const JOYSTICK_DEADZONE = 0.18;

export const JOYSTICK_BASE_RADIUS = 78;
export const JOYSTICK_KNOB_RADIUS = 26;

/** 右下角冲刺按钮。 */
export const DASH_BUTTON_RADIUS = 54;
export const DASH_BUTTON_MARGIN = 36;
export const DASH_BUTTON_X = GAME_WIDTH - DASH_BUTTON_MARGIN - DASH_BUTTON_RADIUS;
export const DASH_BUTTON_Y = GAME_HEIGHT - DASH_BUTTON_MARGIN - DASH_BUTTON_RADIUS;

/** 玩法提示只有这一句。竖屏另有一条不挡操作的设备提示。 */
export const HINT_TEXT = '走位即可';
export const PORTRAIT_HINT_TEXT = '横屏体验更好';

/** 只在粗指针（手机）上出现。文字是点下去之后的布局，不是当前这一屏。 */
export const ORIENT_BUTTON_MIN_WIDTH = 72;
export const ORIENT_BUTTON_MIN_HEIGHT = 44;
export const ORIENT_BUTTON_MARGIN = 12;
export const ORIENT_GO_LANDSCAPE = '横屏';
export const ORIENT_GO_PORTRAIT = '竖屏';
export const ORIENT_GO_LANDSCAPE_ARIA = '切换到横屏';
export const ORIENT_GO_PORTRAIT_ARIA = '切换到竖屏';

export const HINT_FONT =
  '"WenQuanYi Micro Hei", "Noto Sans SC", "Source Han Sans SC", "PingFang SC", "Microsoft YaHei", "Heiti SC", sans-serif';

/**
 * 墨黑色板。背景保持低饱和，角色用骨白和下方朱砂把轮廓从地上分开。
 * 背景色的饱和度要低于朱砂符纸。
 */
export const COLOR_INK = 0x0e0d0c;
export const COLOR_TILE_A = 0x141311;
export const COLOR_TILE_B = 0x1b1916;
/** 很暗的石青污迹，只给地面一点冷色，不和角色抢饱和度。 */
export const COLOR_AZURITE_STAIN = 0x1c2a2e;
/** 很暗的赭石污迹。 */
export const COLOR_OCHRE_STAIN = 0x2a2418;

export const COLOR_PLAYER_OUTLINE = 0x070605;
export const COLOR_PLAYER_ROBE = 0x4a433c;
export const COLOR_PLAYER_HOOD = 0x161310;
export const COLOR_PLAYER_HEM = 0x2e2925;
export const COLOR_PLAYER_FACE = 0xd5c8b4;
/** 朱砂。这是画面里饱和度最高的颜色，用来标出玩家。 */
export const COLOR_TALISMAN_READY = 0xc44536;
export const COLOR_TALISMAN_COOLDOWN = 0x5c342e;
export const COLOR_TALISMAN_DASH = 0xeadcc8;

export const COLOR_HINT = '#cbbfaa';
export const PORTRAIT_HINT_COLOR = '#a39886';

/** 木行石绿。只用于狌狌、藤鞭和灵气，饱和度高于背景。 */
export const COLOR_MALACHITE = 0x3d8f62;
export const COLOR_MALACHITE_DEEP = 0x1b4630;
export const COLOR_COMPANION_FUR = 0x241f1c;
export const COLOR_COMPANION_EAR = 0xe6dcc8;

export const ENEMY_KIND_COUNT = 3;

/**
 * 三种小怪待机图在画面上的边长，像素。源图是 256×256 透明 PNG，
 * 引擎里用最近邻缩放到这个尺寸，不走线性过滤。
 * 设计稿建议小怪 48–64。这三张细节多，64 会糊，80 仍明显小于精英（96）和 Boss，
 * 躯干也小于玩家和狌狌的 64 身高。
 */
export const ENEMY_SPRITE_DISPLAY_SIZE = 80;

/** 水平距离小于这个值时不翻面，避免贴身上下走时来回闪。 */
export const ENEMY_FACING_DEADZONE = 12;

/**
 * 和 ENEMY_PROFILES 下标对齐。
 * facing：原画朝向，-1 面朝左，1 面朝右，0 正面、不翻转。
 * originX/Y：躯干在贴图上的位置（0–1）。逻辑坐标、接触圆、掉落都钉在这里，不钉在翅膀或长尾的外框上。
 * 接触圆半径仍是下面的 ENEMY_CONTACT_RADIUS 那一组，没有把受击范围放大到整张图。
 */
export const ENEMY_LOOKS = [
  {
    name: '窫窳',
    texture: 'enemy-yayu',
    file: 'art/enemies/yayu_idle.png',
    facing: -1,
    originX: 0.39,
    originY: 0.56,
  },
  {
    name: '九尾狐',
    texture: 'enemy-jiuweihu',
    file: 'art/enemies/jiuweihu_idle.png',
    facing: 1,
    originX: 0.74,
    originY: 0.6,
  },
  {
    name: '帝江',
    texture: 'enemy-dijiang',
    file: 'art/enemies/dijiang_idle.png',
    facing: 0,
    originX: 0.5,
    originY: 0.56,
  },
] as const;

/** 狌狌身长，和玩家同级。待机图按这个身高显示，不要做成大头。 */
export const COMPANION_BODY_HEIGHT = 64;
export const COMPANION_BODY_WIDTH = 34;
/** 跟在玩家朝向的反方向，像素。 */
export const COMPANION_FOLLOW_DISTANCE = 58;
/** 追上玩家的速度，像素/秒。比走路快，避免被甩开。 */
export const COMPANION_SPEED = 430;
/**
 * 藤鞭扇面。圆心在狌狌，朝向最近的一只，张角居中。
 * 半径和张角都随长鞭增加。最近的一只只决定挥不挥、朝哪边，圆心里这一侧的扇面里每只都吃伤害。
 */
export const COMPANION_ATTACK_RANGE = 220;
export const WHIP_SECTOR_DEGREES = 65;
export const WHIP_SECTOR_STACK_DEGREES = 8;
/** 两次藤鞭之间的间隔，毫秒。 */
export const COMPANION_ATTACK_INTERVAL_MS = 640;
export const COMPANION_DAMAGE = 1;

/**
 * 冲刺斩是沿实际走过的路径的一条带子。
 * 妖物中心到这段路径的距离不超过 DASH_SLASH_RANGE 就吃到这一刀，同一只在同一次冲刺里只吃一次。
 * 刀光按这个半径把整段带子涂出来。
 */
export const DASH_SLASH_DAMAGE = 2;
export const DASH_SLASH_RANGE = 78;
/** 刀光停留时间，毫秒。盖过冲刺本身，松手后还能看见这一刀。 */
export const DASH_SLASH_DURATION_MS = 180;
/** 扇面从一侧挥到另一侧的时间，毫秒。挥满后短停再消失。攻击间隔仍是 640。 */
export const WHIP_SWEEP_MS = 160;
export const WHIP_DURATION_MS = 240;
export const WHIP_CAP = 4;

/**
 * 窫窳是基准，和之前的宽兽手感一样。九尾狐更快但脆，帝江慢、少见、多 1 点血。
 * 冲刺斩是 2 点：窫窳和九尾狐一刀收掉，帝江留下 1 点。
 */
export const ENEMY_HP = 2;
export const ENEMY_SPEED = 108;
/** 玩家中心到妖物躯干的接触距离。不是贴图外框，翅膀和长尾不另外加一圈。 */
export const ENEMY_CONTACT_RADIUS = 58;
export const ENEMY_TALL_HP = 1;
export const ENEMY_TALL_SPEED = 150;
export const ENEMY_TALL_CONTACT_RADIUS = 40;
export const ENEMY_ROUND_HP = 3;
export const ENEMY_ROUND_SPEED = 64;
export const ENEMY_ROUND_CONTACT_RADIUS = 72;
/** 刷新权重。窫窳最多，帝江最少。 */
export const ENEMY_KIND_WEIGHTS = [4, 2, 1] as const;

export const ENEMY_PROFILES = [
  { hp: ENEMY_HP, speed: ENEMY_SPEED, contactRadius: ENEMY_CONTACT_RADIUS, weight: ENEMY_KIND_WEIGHTS[0] },
  { hp: ENEMY_TALL_HP, speed: ENEMY_TALL_SPEED, contactRadius: ENEMY_TALL_CONTACT_RADIUS, weight: ENEMY_KIND_WEIGHTS[1] },
  {
    hp: ENEMY_ROUND_HP,
    speed: ENEMY_ROUND_SPEED,
    contactRadius: ENEMY_ROUND_CONTACT_RADIUS,
    weight: ENEMY_KIND_WEIGHTS[2],
  },
] as const;
export const ENEMY_RADIUS = 22;
/** 每隔这么久从画面外刷一只。 */
export const ENEMY_SPAWN_INTERVAL_MS = 1200;
/** 每个间隔刷出的数量。 */
export const ENEMY_SPAWN_COUNT = 1;
/** 开局过了这段时间后，每次多刷一只，后半局才会在屏上堆到几十只。 */
export const ENEMY_SPAWN_RAMP_MS = 40_000;
export const ENEMY_SPAWN_COUNT_LATE = 2;
/** 同屏上限。要够「几十只」，又不要把接触伤害做成按只数叠加。 */
export const ENEMY_CAP = 32;
/** 出生点在画面外多少像素。 */
export const ENEMY_SPAWN_MARGIN = 56;
export const ENEMY_HIT_FLASH_MS = 90;

/** 一颗灵气值多少经验。 */
export const ORB_VALUE = 1;
/** 走到这个距离内会被吸走，像素。玩家和狌狌都算。 */
export const ORB_PICKUP_RADIUS = 52;
/** 开始被吸向人的距离，像素。 */
export const ORB_MAGNET_RADIUS = 148;
export const ORB_MAGNET_SPEED = 480;
export const ORB_CAP = 48;

export const MAP_NAME = '招摇之山';
export const MAP_LABEL_COLOR = '#6e675e';

/** 伤害数字。先不按五行上色。 */
export const DAMAGE_NUMBER_MS = 520;
export const DAMAGE_NUMBER_RISE = 40;
export const DAMAGE_NUMBER_COLOR = '#eadcc8';
export const DAMAGE_NUMBER_CAP = 28;

/** 被妖物碰到时闪烁多久，毫秒。 */
export const PLAYER_HIT_FLASH_MS = 180;

/** 一局时长，毫秒。撑满算守住，血量归零提前结束。选符箓时不计时。 */
export const RUN_DURATION_MS = 3 * 60 * 1000;

export const PLAYER_MAX_HP = 100;
/** 接触伤害。重叠期间按冷却跳，避免一帧扣光。 */
export const ENEMY_CONTACT_DAMAGE = 8;
export const ENEMY_CONTACT_COOLDOWN_MS = 450;

/**
 * 升到下一级要的灵气。下标 0 是 1 级升 2 级。
 * 站着让狌狌清怪时，大约 60 秒能拿到 24 点以上灵气，所以 6+8+9 落在这一段里。
 * 之后的间隔更长；表用完后按 LEVEL_XP_GROWTH 继续加。
 */
export const LEVEL_XP_COSTS = [6, 8, 9, 14, 20, 28, 38];
export const LEVEL_XP_GROWTH = 1.35;

/** 每张属性符最多叠这么多层。 */
export const CARD_STACK_CAP = 5;
/** 每局可重画当前三张的次数。不做焚符、封印。 */
export const REROLLS_PER_RUN = 1;

export const CARD_DAMAGE_BONUS = 1;
export const CARD_ATTACK_INTERVAL_DELTA_MS = 90;
export const ATTACK_INTERVAL_MIN_MS = 200;
export const CARD_RANGE_BONUS = 36;
export const CARD_MOVE_SPEED_BONUS = 48;
export const CARD_PICKUP_BONUS = 22;
export const CARD_MAGNET_RADIUS_BONUS = 28;
export const CARD_MAGNET_SPEED_BONUS = 140;
export const CARD_DASH_COOLDOWN_DELTA_MS = 80;
export const DASH_COOLDOWN_MIN_MS = 320;
export const CARD_DASH_DISTANCE_BONUS = 28;
