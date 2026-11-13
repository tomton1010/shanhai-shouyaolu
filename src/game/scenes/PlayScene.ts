import Phaser from 'phaser';
import {
  COLOR_AZURITE_STAIN,
  COLOR_HINT,
  COLOR_INK,
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
} from '../constants.ts';
import { createMotionState, stepMotion, type MotionState } from '../motion.ts';

/**
 * 任务 1.1 的唯一场景：暗色地面、一个占位道士、一句提示。
 * 移动和冲刺的数值在 constants.ts，位移规则在 motion.ts。
 */
export class PlayScene extends Phaser.Scene {
  private motion!: MotionState;
  private player!: Phaser.GameObjects.Container;
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

  constructor() {
    super('play');
  }

  create(): void {
    this.drawGround();
    this.motion = createMotionState(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    this.player = this.createPlayer(this.motion.x, this.motion.y);

    this.add
      .text(36, 28, HINT_TEXT, {
        fontFamily: HINT_FONT,
        fontSize: '26px',
        color: COLOR_HINT,
      })
      .setDepth(10);

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
    const rawX = (this.right.isDown || this.keyD.isDown ? 1 : 0) - (this.left.isDown || this.keyA.isDown ? 1 : 0);
    const rawY = (this.down.isDown || this.keyS.isDown ? 1 : 0) - (this.up.isDown || this.keyW.isDown ? 1 : 0);
    const fromX = this.motion.x;
    const fromY = this.motion.y;

    const step = stepMotion(
      this.motion,
      {
        x: rawX,
        y: rawY,
        dash: this.consumeDashPress(),
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
    player.setDepth(5);
    return player;
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
