/** 游戏内部分辨率。显示可以缩放，坐标系始终是这块画布。 */
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

/**
 * 占位道士身长（像素）。正式精灵未就绪，先用这个尺寸的色块。
 * 身高约 64，避免大头 Q 版。
 */
export const PLAYER_BODY_HEIGHT = 64;
export const PLAYER_BODY_WIDTH = 36;

/** 描边外接圆半径。斜向时 40×68 的角不会伸出画布。 */
export const PLAYER_HALF_EXTENT = 40;

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

/** 小怪比玩家暗，赭石标记用来和朱砂、石绿分开。 */
export const COLOR_ENEMY_BODY = 0x3a3028;
export const COLOR_ENEMY_MARK = 0x8a5a32;

/** 狌狌身长，和玩家同级，不要做成大头。 */
export const COMPANION_BODY_HEIGHT = 64;
export const COMPANION_BODY_WIDTH = 34;
/** 跟在玩家朝向的反方向，像素。 */
export const COMPANION_FOLLOW_DISTANCE = 58;
/** 追上玩家的速度，像素/秒。比走路快，避免被甩开。 */
export const COMPANION_SPEED = 430;
/** 自动攻击距离，像素。只打范围内最近的一只。 */
export const COMPANION_ATTACK_RANGE = 220;
/** 两次藤鞭之间的间隔，毫秒。 */
export const COMPANION_ATTACK_INTERVAL_MS = 640;
export const COMPANION_DAMAGE = 1;
/** 藤鞭扫出的长度，像素。 */
export const WHIP_LENGTH = 132;
export const WHIP_DURATION_MS = 150;
export const WHIP_CAP = 4;

export const ENEMY_HP = 3;
/** 追玩家的速度，像素/秒。慢于玩家，方便走位。 */
export const ENEMY_SPEED = 108;
/** 碰到玩家的距离，像素。只触发闪烁，不扣血。 */
export const ENEMY_CONTACT_RADIUS = 58;
export const ENEMY_RADIUS = 22;
/** 每隔这么久从画面外刷一只。 */
export const ENEMY_SPAWN_INTERVAL_MS = 1200;
/** 每个间隔刷出的数量。 */
export const ENEMY_SPAWN_COUNT = 1;
export const ENEMY_CAP = 16;
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
export const ORB_CAP = 32;

/** 被妖物碰到时闪烁多久，毫秒。没有掉血。 */
export const PLAYER_HIT_FLASH_MS = 180;

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
