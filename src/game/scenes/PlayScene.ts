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
import { createHuntState, stepHunt, type HuntState } from '../combat.ts';
import {
  COLOR_AZURITE_STAIN,
  COLOR_COMPANION_EAR,
  COLOR_COMPANION_FUR,
  COLOR_ENEMY_BODY,
  COLOR_ENEMY_MARK,
  COLOR_HINT,
  COLOR_INK,
  COLOR_MALACHITE,
  COLOR_MALACHITE_DEEP,
  COLOR_OCHRE_STAIN,
  COLOR_PLAYER_FACE,
  COLOR_PLAYER_HEM,
  COLOR_PLAYER_HOOD,
  COLOR_PLAYER_OUTLINE,
  COLOR_PLAYER_ROBE,
  COLOR_TALISMAN_COOLDOWN,
  COLOR_TALISMAN_DASH,
  COLOR_TALISMAN_READY,
  COLOR_TILE_A,
  COLOR_TILE_B,
  GAME_HEIGHT,
  GAME_WIDTH,
  HINT_FONT,
  HINT_TEXT,
  MAX_FRAME_MS,
  TRAIL_FADE_MS,
  WHIP_DURATION_MS,
  WHIP_LENGTH,
} from '../constants.ts';
import { LevelUpOverlay } from '../levelUpUi.ts';
import { createMotionState, stepMotion, type MotionState } from '../motion.ts';
import { TouchControls } from '../touchControls.ts';
import { REROLLS_PER_RUN } from '../constants.ts';

/**
 * 俯视角场景：走位、冲刺、狌狌自动攻击、灵气拾取。
 * 数值在 constants.ts，位移在 motion.ts，战斗在 combat.ts。
 */
export class PlayScene extends Phaser.Scene {
  private motion!: MotionState;
  private hunt!: HuntState;
  private player!: Phaser.GameObjects.Container;
  private companion!: Phaser.GameObjects.Container;
  private enemyViews: Phaser.GameObjects.Container[] = [];
  private orbViews: Phaser.GameObjects.Arc[] = [];
  private whipGfx!: Phaser.GameObjects.Graphics;
  private xpText!: Phaser.GameObjects.Text;
  private xpBar!: Phaser.GameObjects.Graphics;
  private overlay!: LevelUpOverlay;
  private stacks: CardStacks = emptyStacks();
  private levelsTaken = 0;
  private xpSpent = 0;
  private rerollsLeft = REROLLS_PER_RUN;
  private offer: CardId[] | null = null;
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

  create(): void {
    this.drawGround();
    this.motion = createMotionState(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    this.hunt = createHuntState(this.motion.x, this.motion.y);
    this.player = this.createPlayer(this.motion.x, this.motion.y);
    this.companion = this.createCompanion(this.hunt.companionX, this.hunt.companionY);
    this.createEnemyViews();
    this.createOrbViews();
    this.whipGfx = this.add.graphics().setDepth(10);

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
    this.overlay = new LevelUpOverlay();
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
    if (this.offer) {
      this.consumeDashPress();
      this.touch.consumeDash();
      return;
    }
    const frameMs = Math.min(Math.max(delta, 0), MAX_FRAME_MS);
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
    this.motion = step.state;
    this.player.setPosition(this.motion.x, this.motion.y);

    const aimX = step.bursting ? this.motion.dashDirX : this.motion.facingX;
    const aimY = step.bursting ? this.motion.dashDirY : this.motion.facingY;
    this.player.setRotation(Math.atan2(aimY, aimX) + Math.PI / 2);

    if (step.bursting) {
      this.talisman.setFillStyle(COLOR_TALISMAN_DASH);
      this.leaveTrail(fromX, fromY, this.player.rotation);
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
    this.syncHunt();
    if (!this.offer && this.hunt.xp - this.xpSpent >= xpToNextLevel(this.levelsTaken + 1)) {
      this.openOffer();
    }
  }

  private drawGround(): void {
    const ground = this.add.graphics();
    ground.fillStyle(COLOR_INK, 1);
    ground.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const tile = 80;
    for (let y = 0; y < GAME_HEIGHT; y += tile) {
      for (let x = 0; x < GAME_WIDTH; x += tile) {
        const checker = (x / tile + y / tile) % 2 === 0;
        ground.fillStyle(checker ? COLOR_TILE_A : COLOR_TILE_B, 1);
        ground.fillRect(x, y, tile, tile);
      }
    }

    ground.fillStyle(COLOR_AZURITE_STAIN, 1);
    ground.fillEllipse(300, 190, 280, 120);
    ground.fillEllipse(860, 250, 180, 80);
    ground.fillStyle(COLOR_OCHRE_STAIN, 1);
    ground.fillEllipse(980, 540, 320, 140);
    ground.fillEllipse(420, 560, 200, 90);
    ground.setDepth(0);
  }

  private createPlayer(x: number, y: number): Phaser.GameObjects.Container {
    const body = this.add.graphics();
    body.fillStyle(COLOR_PLAYER_OUTLINE, 1);
    body.fillRect(-20, -34, 40, 68);
    body.fillStyle(COLOR_PLAYER_ROBE, 1);
    body.fillRect(-18, -32, 36, 64);
    body.fillStyle(COLOR_PLAYER_HEM, 1);
    body.fillRect(-18, 18, 36, 14);
    body.fillStyle(COLOR_PLAYER_HOOD, 1);
    body.fillRect(-15, -32, 30, 26);
    body.fillStyle(COLOR_PLAYER_FACE, 1);
    body.fillRect(-5, -12, 10, 4);

    this.talisman = this.add.rectangle(0, 8, 6, 18, COLOR_TALISMAN_READY);

    const player = this.add.container(x, y, [body, this.talisman]);
    player.setDepth(8);
    return player;
  }

  private createCompanion(x: number, y: number): Phaser.GameObjects.Container {
    const body = this.add.graphics();
    body.fillStyle(COLOR_PLAYER_OUTLINE, 1);
    body.fillRect(-19, -34, 38, 68);
    body.fillStyle(COLOR_COMPANION_FUR, 1);
    body.fillRect(-17, -32, 34, 64);
    body.fillStyle(0x161310, 1);
    body.fillRect(-12, -32, 24, 16);
    body.fillStyle(COLOR_COMPANION_EAR, 1);
    body.fillRect(-20, -30, 8, 6);
    body.fillRect(12, -30, 8, 6);
    body.fillStyle(COLOR_MALACHITE, 1);
    body.fillRect(-3, -8, 6, 26);
    const companion = this.add.container(x, y, [body]);
    companion.setDepth(7);
    return companion;
  }

  private createEnemyViews(): void {
    for (let index = 0; index < this.hunt.enemies.length; index += 1) {
      const body = this.add.graphics();
      body.fillStyle(COLOR_PLAYER_OUTLINE, 1);
      body.fillRoundedRect(-26, -16, 52, 32, 2);
      body.fillStyle(COLOR_ENEMY_BODY, 1);
      body.fillRoundedRect(-24, -14, 48, 28, 2);
      body.fillStyle(COLOR_ENEMY_MARK, 1);
      body.fillRect(-6, -6, 16, 8);
      const view = this.add.container(0, 0, [body]);
      view.setDepth(4);
      view.setVisible(false);
      this.enemyViews.push(view);
    }
  }

  private createOrbViews(): void {
    for (let index = 0; index < this.hunt.orbs.length; index += 1) {
      const orb = this.add.circle(0, 0, 7, COLOR_MALACHITE, 0.95);
      orb.setStrokeStyle(2, COLOR_MALACHITE_DEEP, 1);
      orb.setDepth(6);
      orb.setVisible(false);
      this.orbViews.push(orb);
    }
  }

  private syncHunt(): void {
    this.companion.setPosition(this.hunt.companionX, this.hunt.companionY);
    this.companion.setRotation(this.hunt.companionAngle + Math.PI / 2);
    const playerFlashing = this.hunt.playerFlashMs > 0 && Math.floor(this.hunt.timeMs / 50) % 2 === 0;
    this.player.setAlpha(playerFlashing ? 0.35 : 1);

    for (let index = 0; index < this.hunt.enemies.length; index += 1) {
      const enemy = this.hunt.enemies[index];
      const view = this.enemyViews[index];
      view.setVisible(enemy.active);
      if (!enemy.active) {
        continue;
      }
      view.setPosition(enemy.x, enemy.y);
      view.setRotation(Math.atan2(this.motion.y - enemy.y, this.motion.x - enemy.x));
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

    this.whipGfx.clear();
    for (const whip of this.hunt.whips) {
      if (!whip.active) {
        continue;
      }
      const alpha = Math.max(0.2, whip.lifeMs / WHIP_DURATION_MS);
      const reachX = whip.x + Math.cos(whip.angle) * WHIP_LENGTH;
      const reachY = whip.y + Math.sin(whip.angle) * WHIP_LENGTH;
      const sweep = 0.7;
      const sideX = whip.x + Math.cos(whip.angle + sweep) * (WHIP_LENGTH * 0.82);
      const sideY = whip.y + Math.sin(whip.angle + sweep) * (WHIP_LENGTH * 0.82);
      this.whipGfx.lineStyle(6, COLOR_MALACHITE, alpha);
      this.whipGfx.lineBetween(whip.x, whip.y, reachX, reachY);
      this.whipGfx.lineStyle(3, COLOR_MALACHITE_DEEP, alpha);
      this.whipGfx.lineBetween(whip.x, whip.y, sideX, sideY);
    }

    this.refreshHud();
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

  private leaveTrail(x: number, y: number, rotation: number): void {
    const trail = this.add.rectangle(x, y, 28, 52, COLOR_TALISMAN_READY, 0.28);
    trail.setRotation(rotation);
    trail.setDepth(4);
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
