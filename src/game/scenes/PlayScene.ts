import Phaser from 'phaser';
import {
  emptyStacks,
  levelProgress,
  modifiersFrom,
  rollCards,
  xpToNextLevel,
  type CardId,
  type CardStacks,
} from '../cards.ts';
import { applyDashSlash, createHuntState, stepHunt, whipSectorRadians, type EnemySlot, type HuntState } from '../combat.ts';
import { actorFlipX, torsoLocalOffset } from '../actorFacing.ts';
import {
  ACTOR_FACING_DEADZONE,
  ACTOR_SPRITE_DISPLAY_SIZE,
  COLOR_HINT,
  COLOR_MALACHITE,
  COLOR_TALISMAN_COOLDOWN,
  COLOR_TALISMAN_DASH,
  COLOR_TALISMAN_READY,
  COMPANION_LOOK,
  DASH_SLASH_LOOK,
  GROUND_LOOK,
  ORB_DISPLAY_SIZE,
  ORB_LOOK,
  DAMAGE_NUMBER_CAP,
  DAMAGE_NUMBER_COLOR,
  DAMAGE_NUMBER_MS,
  DAMAGE_NUMBER_RISE,
  DASH_SLASH_DURATION_MS,
  ENEMY_FACING_DEADZONE,
  ENEMY_LOOKS,
  ENEMY_SPRITE_DISPLAY_SIZE,
  GAME_HEIGHT,
  GAME_WIDTH,
  HINT_FONT,
  HINT_TEXT,
  MAP_LABEL_COLOR,
  MAP_NAME,
  MAX_FRAME_MS,
  PLAYER_LOOK,
  PLAYER_MAX_HP,
  REROLLS_PER_RUN,
  RUN_DURATION_MS,
  TALISMAN_HEIGHT,
  TALISMAN_OFFSET_X,
  TALISMAN_OFFSET_Y,
  TALISMAN_WIDTH,
  TRAIL_FADE_MS,
  WHIP_CAP,
  WHIP_DURATION_MS,
  WHIP_SWEEP_MS,
  WHIP_VINE_LOOK,
} from '../constants.ts';
import { LevelUpOverlay } from '../levelUpUi.ts';
import { createMotionState, stepMotion, type MotionState } from '../motion.ts';
import { advanceRunClock, formatRunClock } from '../runClock.ts';
import { RunEndOverlay, type RunOutcome } from '../runEndUi.ts';
import { TouchControls } from '../touchControls.ts';

/**
 * 俯视角场景：走位、冲刺、狌狌自动攻击、灵气拾取、三分钟一局。
 * 数值在 constants.ts，位移在 motion.ts，战斗在 combat.ts。
 */
export class PlayScene extends Phaser.Scene {
  private motion!: MotionState;
  private hunt!: HuntState;
  private player!: Phaser.GameObjects.Container;
  private companion!: Phaser.GameObjects.Container;
  private enemyViews: Phaser.GameObjects.Container[] = [];
  private enemySprites: Phaser.GameObjects.Sprite[] = [];
  private enemyKindDrawn: number[] = [];
  private floaters: { text: Phaser.GameObjects.Text; lifeMs: number; x: number; y: number }[] = [];
  private orbViews: Phaser.GameObjects.Sprite[] = [];
  private whipSprites: Phaser.GameObjects.Sprite[] = [];
  private whipMasks: Phaser.GameObjects.Graphics[] = [];
  private slashSprite!: Phaser.GameObjects.Sprite;
  private slashHit = new Set<EnemySlot>();
  private xpText!: Phaser.GameObjects.Text;
  private xpBar!: Phaser.GameObjects.Graphics;
  private clockText!: Phaser.GameObjects.Text;
  private hpText!: Phaser.GameObjects.Text;
  private hpBar!: Phaser.GameObjects.Graphics;
  private overlay!: LevelUpOverlay;
  private endOverlay!: RunEndOverlay;
  private stacks: CardStacks = emptyStacks();
  private levelsTaken = 0;
  private xpSpent = 0;
  private rerollsLeft = REROLLS_PER_RUN;
  private runElapsedMs = 0;
  private outcome: RunOutcome | null = null;
  private offer: CardId[] | null = null;
  private playerSprite!: Phaser.GameObjects.Sprite;
  private companionSprite!: Phaser.GameObjects.Sprite;
  private talisman!: Phaser.GameObjects.Rectangle;
  private up!: Phaser.Input.Keyboard.Key;
  private down!: Phaser.Input.Keyboard.Key;
  private left!: Phaser.Input.Keyboard.Key;
  private right!: Phaser.Input.Keyboard.Key;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  /** 冲刺键：空格。 */
  private keySpace!: Phaser.Input.Keyboard.Key;
  /** 空格按下时记下，下一帧消费。避免极短点按在 JustDown 被读到之前就松开。 */
  private dashQueued = false;
  private touch!: TouchControls;

  constructor() {
    super('play');
  }

  preload(): void {
    const base = import.meta.env.BASE_URL;
    this.load.image(PLAYER_LOOK.texture, `${base}${PLAYER_LOOK.file}`);
    this.load.image(COMPANION_LOOK.texture, `${base}${COMPANION_LOOK.file}`);
    this.load.image(GROUND_LOOK.texture, `${base}${GROUND_LOOK.file}`);
    this.load.image(WHIP_VINE_LOOK.texture, `${base}${WHIP_VINE_LOOK.file}`);
    this.load.image(DASH_SLASH_LOOK.texture, `${base}${DASH_SLASH_LOOK.file}`);
    this.load.image(ORB_LOOK.texture, `${base}${ORB_LOOK.file}`);
    for (const look of ENEMY_LOOKS) {
      this.load.image(look.texture, `${base}${look.file}`);
    }
  }

  create(): void {
    for (const look of ENEMY_LOOKS) {
      this.textures.get(look.texture).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    this.drawGround();
    this.motion = createMotionState(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    this.hunt = createHuntState(this.motion.x, this.motion.y);
    this.player = this.createPlayer(this.motion.x, this.motion.y);
    this.companion = this.createCompanion(this.hunt.companionX, this.hunt.companionY);
    this.createEnemyViews();
    this.createOrbViews();
    this.createWhipViews();
    this.textures.get(DASH_SLASH_LOOK.texture).setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.slashSprite = this.add.sprite(0, 0, DASH_SLASH_LOOK.texture).setDepth(11).setVisible(false);

    this.add
      .text(36, 28, HINT_TEXT, {
        fontFamily: HINT_FONT,
        fontSize: '26px',
        color: COLOR_HINT,
      })
      .setDepth(30)
      .setScrollFactor(0);
    this.xpText = this.add
      .text(GAME_WIDTH - 36, 28, '', {
        fontFamily: HINT_FONT,
        fontSize: '26px',
        color: COLOR_HINT,
      })
      .setOrigin(1, 0)
      .setDepth(30)
      .setScrollFactor(0);
    this.xpBar = this.add.graphics().setDepth(30).setScrollFactor(0);
    this.clockText = this.add
      .text(GAME_WIDTH / 2, 24, '', {
        fontFamily: HINT_FONT,
        fontSize: '28px',
        color: '#c44536',
      })
      .setOrigin(0.5, 0)
      .setDepth(30)
      .setScrollFactor(0);
    this.hpText = this.add
      .text(36, 68, '', {
        fontFamily: HINT_FONT,
        fontSize: '20px',
        color: COLOR_HINT,
      })
      .setDepth(30)
      .setScrollFactor(0);
    this.hpBar = this.add.graphics().setDepth(30).setScrollFactor(0);
    this.overlay = new LevelUpOverlay();
    this.endOverlay = new RunEndOverlay();
    this.refreshHud();

    this.touch = new TouchControls(this);
    this.touch.attach();

    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('当前环境没有键盘输入');
    }

    const cursors = keyboard.createCursorKeys();
    this.up = this.requireKey(cursors.up, 'Up');
    this.down = this.requireKey(cursors.down, 'Down');
    this.left = this.requireKey(cursors.left, 'Left');
    this.right = this.requireKey(cursors.right, 'Right');
    this.keySpace = this.requireKey(cursors.space, 'Space');
    this.keyW = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    this.keySpace.on('down', () => {
      this.dashQueued = true;
    });

    keyboard.addCapture([
      Phaser.Input.Keyboard.KeyCodes.W,
      Phaser.Input.Keyboard.KeyCodes.A,
      Phaser.Input.Keyboard.KeyCodes.S,
      Phaser.Input.Keyboard.KeyCodes.D,
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    ]);
  }

  update(time: number, delta: number): void {
    void time;
    const frameMs = Math.min(Math.max(delta, 0), MAX_FRAME_MS);
    this.tickFloaters(frameMs);
    if (this.outcome || this.offer) {
      this.consumeDashPress();
      this.touch.consumeDash();
      return;
    }
    const clock = advanceRunClock(this.runElapsedMs, frameMs);
    this.runElapsedMs = clock.elapsedMs;
    const mods = modifiersFrom(this.stacks);
    const keyboardX = (this.right.isDown || this.keyD.isDown ? 1 : 0) - (this.left.isDown || this.keyA.isDown ? 1 : 0);
    const keyboardY = (this.down.isDown || this.keyS.isDown ? 1 : 0) - (this.up.isDown || this.keyW.isDown ? 1 : 0);
    const usingKeyboard = keyboardX !== 0 || keyboardY !== 0;
    const rawX = usingKeyboard ? keyboardX : this.touch.axisX;
    const rawY = usingKeyboard ? keyboardY : this.touch.axisY;
    const fromX = this.motion.x;
    const fromY = this.motion.y;

    const keyboardDash = this.consumeDashPress();
    const touchDash = this.touch.consumeDash();
    const step = stepMotion(
      this.motion,
      {
        x: rawX,
        y: rawY,
        dash: keyboardDash || touchDash,
        moveSpeed: mods.moveSpeed,
        dashDistance: mods.dashDistance,
        dashCooldownMs: mods.dashCooldownMs,
      },
      frameMs,
    );
    if (step.dashStarted) {
      this.slashHit.clear();
    }
    this.motion = step.state;
    this.player.setPosition(Math.round(this.motion.x), Math.round(this.motion.y));
    this.player.setRotation(0);

    const aimX = step.bursting ? this.motion.dashDirX : this.motion.facingX;
    this.faceActor(this.playerSprite, PLAYER_LOOK, aimX, this.talisman);

    if (step.bursting) {
      this.talisman.setFillStyle(COLOR_TALISMAN_DASH);
      this.leaveTrail(fromX, fromY);
    } else if (step.dashReady) {
      this.talisman.setFillStyle(COLOR_TALISMAN_READY);
    } else {
      this.talisman.setFillStyle(COLOR_TALISMAN_COOLDOWN);
    }
    this.touch.syncDash(step.dashReady, step.bursting, this.motion.cooldownRemainingMs);

    stepHunt(
      this.hunt,
      {
        x: this.motion.x,
        y: this.motion.y,
        facingX: this.motion.facingX,
        facingY: this.motion.facingY,
      },
      frameMs,
      Math.random,
      mods.hunt,
    );
    if (step.bursting) {
      applyDashSlash(this.hunt, fromX, fromY, this.motion.x, this.motion.y, this.slashHit, step.dashStarted);
    }
    this.syncHunt();
    if (this.hunt.playerHp <= 0) {
      this.finishRun('loss');
      return;
    }
    if (clock.finished) {
      this.finishRun('win');
      return;
    }
    if (this.hunt.xp - this.xpSpent >= xpToNextLevel(this.levelsTaken + 1)) {
      this.openOffer();
    }
  }

  private drawGround(): void {
    this.textures.get(GROUND_LOOK.texture).setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.add.image(0, 0, GROUND_LOOK.texture).setOrigin(0, 0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setDepth(0);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 18, MAP_NAME, {
        fontFamily: HINT_FONT,
        fontSize: '18px',
        color: MAP_LABEL_COLOR,
      })
      .setOrigin(0.5, 1)
      .setDepth(2)
      .setScrollFactor(0);
  }

  private createPlayer(x: number, y: number): Phaser.GameObjects.Container {
    this.textures.get(PLAYER_LOOK.texture).setFilter(Phaser.Textures.FilterMode.NEAREST);
    const sprite = this.add.sprite(0, 0, PLAYER_LOOK.texture);
    this.playerSprite = sprite;
    this.placeActorSprite(sprite, PLAYER_LOOK, false);
    this.talisman = this.add.rectangle(
      TALISMAN_OFFSET_X,
      TALISMAN_OFFSET_Y,
      TALISMAN_WIDTH,
      TALISMAN_HEIGHT,
      COLOR_TALISMAN_READY,
    );
    const player = this.add.container(x, y, [sprite, this.talisman]);
    player.setDepth(8);
    return player;
  }

  private createCompanion(x: number, y: number): Phaser.GameObjects.Container {
    this.textures.get(COMPANION_LOOK.texture).setFilter(Phaser.Textures.FilterMode.NEAREST);
    const sprite = this.add.sprite(0, 0, COMPANION_LOOK.texture);
    this.companionSprite = sprite;
    this.placeActorSprite(sprite, COMPANION_LOOK, false);
    const companion = this.add.container(x, y, [sprite]);
    companion.setDepth(7);
    return companion;
  }

  /** 贴图中心为原点，再把躯干挪到容器原点。翻转时镜像这个偏移，躯干不跳。 */
  private placeActorSprite(
    sprite: Phaser.GameObjects.Sprite,
    look: { originX: number; originY: number },
    flipX: boolean,
  ): void {
    sprite.setOrigin(0.5, 0.5);
    sprite.setDisplaySize(ACTOR_SPRITE_DISPLAY_SIZE, ACTOR_SPRITE_DISPLAY_SIZE);
    sprite.setFlipX(flipX);
    const offset = torsoLocalOffset(look.originX, look.originY, ACTOR_SPRITE_DISPLAY_SIZE, flipX);
    sprite.setPosition(offset.x, offset.y);
  }

  private faceActor(
    sprite: Phaser.GameObjects.Sprite,
    look: { originX: number; originY: number; facing: number },
    dirX: number,
    accent?: Phaser.GameObjects.Rectangle,
  ): void {
    const flip = actorFlipX(dirX, look.facing, ACTOR_FACING_DEADZONE, sprite.flipX);
    if (flip === sprite.flipX) {
      return;
    }
    this.placeActorSprite(sprite, look, flip);
    if (accent) {
      accent.setX(flip ? -TALISMAN_OFFSET_X : TALISMAN_OFFSET_X);
    }
  }

  private createEnemyViews(): void {
    const first = ENEMY_LOOKS[0];
    for (let index = 0; index < this.hunt.enemies.length; index += 1) {
      const sprite = this.add.sprite(0, 0, first.texture);
      this.applyEnemyLook(sprite, first);
      const view = this.add.container(0, 0, [sprite]);
      view.setDepth(4);
      view.setVisible(false);
      this.enemySprites.push(sprite);
      this.enemyKindDrawn.push(-1);
      this.enemyViews.push(view);
    }
  }

  /** 贴图锚在躯干上，显示尺寸固定，最近邻由贴图过滤保证。 */
  private applyEnemyLook(
    sprite: Phaser.GameObjects.Sprite,
    look: (typeof ENEMY_LOOKS)[number],
  ): void {
    sprite.setTexture(look.texture);
    sprite.setOrigin(look.originX, look.originY);
    sprite.setDisplaySize(ENEMY_SPRITE_DISPLAY_SIZE, ENEMY_SPRITE_DISPLAY_SIZE);
    sprite.setFlipX(false);
  }

  /** 侧面原画按移动方向水平翻转。帝江是正面，不翻。 */
  private faceEnemy(
    sprite: Phaser.GameObjects.Sprite,
    look: (typeof ENEMY_LOOKS)[number],
    enemyX: number,
  ): void {
    if (look.facing === 0) {
      return;
    }
    const dx = this.motion.x - enemyX;
    if (Math.abs(dx) < ENEMY_FACING_DEADZONE) {
      return;
    }
    const artFacesRight = look.facing > 0;
    sprite.setFlipX((dx > 0) !== artFacesRight);
  }

  private createOrbViews(): void {
    this.textures.get(ORB_LOOK.texture).setFilter(Phaser.Textures.FilterMode.NEAREST);
    for (let index = 0; index < this.hunt.orbs.length; index += 1) {
      const orb = this.add.sprite(0, 0, ORB_LOOK.texture);
      orb.setDisplaySize(ORB_DISPLAY_SIZE, ORB_DISPLAY_SIZE);
      orb.setDepth(6);
      orb.setVisible(false);
      this.orbViews.push(orb);
    }
  }

  private createWhipViews(): void {
    this.textures.get(WHIP_VINE_LOOK.texture).setFilter(Phaser.Textures.FilterMode.NEAREST);
    for (let index = 0; index < WHIP_CAP; index += 1) {
      const maskGfx = this.make.graphics({}, false);
      const sprite = this.add.sprite(0, 0, WHIP_VINE_LOOK.texture);
      sprite.setOrigin(WHIP_VINE_LOOK.originX, WHIP_VINE_LOOK.originY);
      sprite.setMask(maskGfx.createGeometryMask());
      sprite.setDepth(10);
      sprite.setVisible(false);
      this.whipMasks.push(maskGfx);
      this.whipSprites.push(sprite);
    }
  }

  private syncHunt(): void {
    this.companion.setPosition(Math.round(this.hunt.companionX), Math.round(this.hunt.companionY));
    this.companion.setRotation(0);
    this.faceActor(this.companionSprite, COMPANION_LOOK, Math.cos(this.hunt.companionAngle));
    this.player.setDepth(7 + this.motion.y / GAME_HEIGHT);
    this.companion.setDepth(7 + this.hunt.companionY / GAME_HEIGHT);
    const playerFlashing = this.hunt.playerFlashMs > 0 && Math.floor(this.hunt.timeMs / 50) % 2 === 0;
    this.player.setAlpha(playerFlashing ? 0.35 : 1);

    for (let index = 0; index < this.hunt.enemies.length; index += 1) {
      const enemy = this.hunt.enemies[index];
      const view = this.enemyViews[index];
      view.setVisible(enemy.active);
      if (!enemy.active) {
        continue;
      }
      const look = ENEMY_LOOKS[enemy.kind] ?? ENEMY_LOOKS[0];
      const sprite = this.enemySprites[index];
      if (this.enemyKindDrawn[index] !== enemy.kind) {
        this.applyEnemyLook(sprite, look);
        this.enemyKindDrawn[index] = enemy.kind;
      }
      view.setPosition(Math.round(enemy.x), Math.round(enemy.y));
      view.setDepth(4 + enemy.y / (GAME_HEIGHT * 4));
      this.faceEnemy(sprite, look, enemy.x);
      view.setAlpha(enemy.hitFlashMs > 0 ? 0.45 : 1);
    }

    for (let index = 0; index < this.hunt.orbs.length; index += 1) {
      const orb = this.hunt.orbs[index];
      const view = this.orbViews[index];
      view.setVisible(orb.active);
      if (orb.active) {
        view.setPosition(orb.x, orb.y);
      }
    }

    this.syncWhips();
    this.drawSlash();
    this.drainPopups();

    this.refreshHud();
  }

  private drainPopups(): void {
    for (const popup of this.hunt.popups) {
      this.spawnFloater(popup.x, popup.y, popup.amount);
    }
    this.hunt.popups.length = 0;
  }

  private spawnFloater(x: number, y: number, amount: number): void {
    let slot = this.floaters.find((floater) => floater.lifeMs <= 0);
    if (!slot) {
      if (this.floaters.length >= DAMAGE_NUMBER_CAP) {
        slot = this.floaters.reduce((older, floater) => (floater.lifeMs < older.lifeMs ? floater : older));
      } else {
        const text = this.add
          .text(0, 0, '', {
            fontFamily: HINT_FONT,
            fontSize: '22px',
            color: DAMAGE_NUMBER_COLOR,
          })
          .setOrigin(0.5, 1)
          .setDepth(12)
          .setScrollFactor(0);
        slot = { text, lifeMs: 0, x: 0, y: 0 };
        this.floaters.push(slot);
      }
    }
    slot.lifeMs = DAMAGE_NUMBER_MS;
    slot.x = x;
    slot.y = y - 16;
    slot.text.setText(String(amount));
    slot.text.setPosition(slot.x, slot.y);
    slot.text.setAlpha(1);
    slot.text.setVisible(true);
  }

  private tickFloaters(deltaMs: number): void {
    for (const floater of this.floaters) {
      if (floater.lifeMs <= 0) {
        continue;
      }
      floater.lifeMs -= deltaMs;
      const remaining = Math.max(0, floater.lifeMs);
      const progress = 1 - remaining / DAMAGE_NUMBER_MS;
      floater.text.setPosition(floater.x, floater.y - DAMAGE_NUMBER_RISE * progress);
      floater.text.setAlpha(1 - progress);
      if (floater.lifeMs <= 0) {
        floater.text.setVisible(false);
      }
    }
  }

  private clearFloaters(): void {
    for (const floater of this.floaters) {
      floater.lifeMs = 0;
      floater.text.setVisible(false);
    }
  }

  private refreshHud(): void {
    const progress = levelProgress(this.hunt.xp, this.levelsTaken, this.xpSpent);
    this.xpText.setText(`等级 ${progress.level}  ${progress.into}/${progress.need}`);
    const width = 168;
    const height = 6;
    const x = GAME_WIDTH - 36 - width;
    const y = 64;
    this.xpBar.clear();
    this.xpBar.fillStyle(0x241f1c, 1);
    this.xpBar.fillRect(x, y, width, height);
    const filled = progress.need > 0 ? width * (progress.into / progress.need) : 0;
    this.xpBar.fillStyle(COLOR_MALACHITE, 1);
    this.xpBar.fillRect(x, y, Math.max(0, filled), height);

    const hp = Math.max(0, this.hunt.playerHp);
    this.clockText.setText(formatRunClock(RUN_DURATION_MS - this.runElapsedMs));
    this.hpText.setText(`生命 ${hp}`);
    const hpWidth = 140;
    const hpX = 36;
    const hpY = 98;
    this.hpBar.clear();
    this.hpBar.fillStyle(0x241f1c, 1);
    this.hpBar.fillRect(hpX, hpY, hpWidth, height);
    this.hpBar.fillStyle(COLOR_TALISMAN_READY, 1);
    this.hpBar.fillRect(hpX, hpY, hpWidth * (hp / PLAYER_MAX_HP), height);
  }

  private finishRun(outcome: RunOutcome): void {
    if (this.outcome) {
      return;
    }
    this.outcome = outcome;
    this.offer = null;
    this.overlay.hide();
    this.touch.setSuspended(true);
    this.endOverlay.show(outcome, this.hunt.kills, () => {
      this.restartRun();
    });
  }

  private restartRun(): void {
    this.endOverlay.hide();
    this.overlay.hide();
    this.outcome = null;
    this.offer = null;
    this.stacks = emptyStacks();
    this.levelsTaken = 0;
    this.xpSpent = 0;
    this.rerollsLeft = REROLLS_PER_RUN;
    this.runElapsedMs = 0;
    const x = GAME_WIDTH / 2;
    const y = GAME_HEIGHT / 2;
    this.motion = createMotionState(x, y);
    this.hunt = createHuntState(x, y);
    this.player.setPosition(x, y);
    this.player.setAlpha(1);
    this.player.setRotation(0);
    this.placeActorSprite(this.playerSprite, PLAYER_LOOK, false);
    this.talisman.setPosition(TALISMAN_OFFSET_X, TALISMAN_OFFSET_Y);
    this.talisman.setFillStyle(COLOR_TALISMAN_READY);
    this.placeActorSprite(this.companionSprite, COMPANION_LOOK, false);
    this.slashHit.clear();
    this.clearFloaters();
    this.touch.setSuspended(false);
    this.syncHunt();
  }

  /** 藤鞭贴图跟着原来的扇面扫开。判定不看贴图。 */
  private syncWhips(): void {
    for (let index = 0; index < this.hunt.whips.length; index += 1) {
      const whip = this.hunt.whips[index];
      const sprite = this.whipSprites[index];
      const maskGfx = this.whipMasks[index];
      if (!whip.active) {
        sprite.setVisible(false);
        continue;
      }
      const span = whipSectorRadians(whip.reach);
      const elapsed = WHIP_DURATION_MS - whip.lifeMs;
      const swept = Math.min(1, Math.max(0, elapsed / WHIP_SWEEP_MS));
      if (swept <= 0.001) {
        sprite.setVisible(false);
        continue;
      }
      const hold = Math.max(1, WHIP_DURATION_MS - WHIP_SWEEP_MS);
      const fade = Math.min(1, whip.lifeMs / hold);
      const scale = whip.reach / WHIP_VINE_LOOK.tipRadius;
      sprite.setVisible(true);
      sprite.setPosition(whip.x, whip.y);
      sprite.setRotation(whip.angle - WHIP_VINE_LOOK.tipAngle);
      sprite.setDisplaySize(WHIP_VINE_LOOK.frameWidth * scale, WHIP_VINE_LOOK.frameHeight * scale);
      sprite.setAlpha(Math.max(0.25, fade));
      const start = whip.angle - span / 2;
      const end = start + span * swept;
      maskGfx.clear();
      maskGfx.fillStyle(0xffffff, 1);
      maskGfx.beginPath();
      maskGfx.moveTo(whip.x, whip.y);
      maskGfx.arc(whip.x, whip.y, whip.reach + 6, start, end, false);
      maskGfx.closePath();
      maskGfx.fillPath();
    }
  }

  private drawSlash(): void {
    const slash = this.hunt.slash;
    if (!slash.active) {
      this.slashSprite.setVisible(false);
      return;
    }
    const dx = slash.x2 - slash.x1;
    const dy = slash.y2 - slash.y1;
    const length = Math.hypot(dx, dy);
    if (length <= 0.001) {
      this.slashSprite.setVisible(false);
      return;
    }
    const alpha = Math.max(0.35, slash.lifeMs / DASH_SLASH_DURATION_MS);
    this.slashSprite.setVisible(true);
    this.slashSprite.setPosition((slash.x1 + slash.x2) / 2, (slash.y1 + slash.y2) / 2);
    this.slashSprite.setRotation(Math.atan2(dy, dx));
    this.slashSprite.setDisplaySize(length, length * (DASH_SLASH_LOOK.frameHeight / DASH_SLASH_LOOK.frameWidth));
    this.slashSprite.setAlpha(alpha);
  }

  private openOffer(): void {
    const ids = rollCards(this.stacks, 3, Math.random);
    if (ids.length === 0) {
      this.xpSpent += xpToNextLevel(this.levelsTaken + 1);
      this.levelsTaken += 1;
      this.refreshHud();
      return;
    }
    this.offer = ids;
    this.touch.setSuspended(true);
    this.overlay.show(ids, this.stacks, this.rerollsLeft, {
      onChoose: (index) => {
        this.choose(index);
      },
      onReroll: () => {
        this.reroll();
      },
    });
  }

  private choose(index: number): void {
    if (!this.offer || index < 0 || index >= this.offer.length) {
      return;
    }
    const id = this.offer[index];
    this.stacks[id] += 1;
    this.xpSpent += xpToNextLevel(this.levelsTaken + 1);
    this.levelsTaken += 1;
    this.offer = null;
    this.touch.setSuspended(false);
    this.overlay.hide();
    this.refreshHud();
  }

  private reroll(): void {
    if (!this.offer || this.rerollsLeft <= 0) {
      return;
    }
    this.rerollsLeft -= 1;
    const next = rollCards(this.stacks, 3, Math.random, this.offer);
    if (next.length > 0) {
      this.offer = next;
    }
    this.overlay.show(this.offer, this.stacks, this.rerollsLeft, {
      onChoose: (index) => {
        this.choose(index);
      },
      onReroll: () => {
        this.reroll();
      },
    });
  }

  private consumeDashPress(): boolean {
    const pressed = this.dashQueued;
    this.dashQueued = false;
    return pressed;
  }

  private leaveTrail(x: number, y: number): void {
    const flip = this.playerSprite.flipX;
    const offset = torsoLocalOffset(PLAYER_LOOK.originX, PLAYER_LOOK.originY, ACTOR_SPRITE_DISPLAY_SIZE, flip);
    const trail = this.add.sprite(Math.round(x) + offset.x, Math.round(y) + offset.y, PLAYER_LOOK.texture);
    trail.setOrigin(0.5, 0.5);
    trail.setDisplaySize(ACTOR_SPRITE_DISPLAY_SIZE, ACTOR_SPRITE_DISPLAY_SIZE);
    trail.setFlipX(flip);
    trail.setAlpha(0.28);
    trail.setDepth(5);
    this.tweens.add({
      targets: trail,
      alpha: 0,
      duration: TRAIL_FADE_MS,
      onComplete: () => {
        trail.destroy();
      },
    });
  }

  private requireKey(key: Phaser.Input.Keyboard.Key | undefined, name: string): Phaser.Input.Keyboard.Key {
    if (!key) {
      throw new Error(`缺少按键 ${name}`);
    }
    return key;
  }
}
