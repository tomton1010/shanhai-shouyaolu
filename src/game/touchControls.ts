import Phaser from 'phaser';
import {
  COLOR_PLAYER_OUTLINE,
  COLOR_TALISMAN_COOLDOWN,
  COLOR_TALISMAN_DASH,
  COLOR_TALISMAN_READY,
  DASH_BUTTON_RADIUS,
  DASH_BUTTON_X,
  DASH_BUTTON_Y,
  DASH_COOLDOWN_MS,
  GAME_WIDTH,
  HINT_FONT,
  JOYSTICK_BASE_RADIUS,
  JOYSTICK_DEADZONE,
  JOYSTICK_KNOB_RADIUS,
  JOYSTICK_MAX_RADIUS,
  PORTRAIT_HINT_COLOR,
  PORTRAIT_HINT_TEXT,
} from './constants.ts';
import { hitsDashButton, isLeftHalf, joystickVector } from './joystick.ts';

const DASH_HIT_RADIUS = DASH_BUTTON_RADIUS + 16;

/**
 * 触控层。粗指针设备一开始就显示；桌面要等第一次真实触摸，避免按钮挡在键盘前面。
 * 左半屏按下生成摇杆，松手消失。右下角冲刺只在按下的那一下触发。
 */
export class TouchControls {
  private enabled: boolean;
  private joystickPointerId: number | null = null;
  private dashPointerId: number | null = null;
  private originX = 0;
  private originY = 0;
  private dashEdge = false;
  private axisXValue = 0;
  private axisYValue = 0;
  private readonly onResize: () => void;

  private readonly base: Phaser.GameObjects.Arc;
  private readonly knob: Phaser.GameObjects.Arc;
  private readonly dashGfx: Phaser.GameObjects.Graphics;
  private readonly portraitHint: Phaser.GameObjects.Text;

  constructor(private readonly scene: Phaser.Scene) {
    this.enabled = window.matchMedia('(pointer: coarse)').matches;

    this.base = scene.add
      .circle(0, 0, JOYSTICK_BASE_RADIUS, 0x141210, 0.5)
      .setStrokeStyle(3, COLOR_PLAYER_OUTLINE, 0.95)
      .setDepth(20)
      .setScrollFactor(0)
      .setVisible(false);
    this.knob = scene.add
      .circle(0, 0, JOYSTICK_KNOB_RADIUS, 0xd5c8b4, 0.92)
      .setStrokeStyle(2, COLOR_PLAYER_OUTLINE, 1)
      .setDepth(21)
      .setScrollFactor(0)
      .setVisible(false);
    this.dashGfx = scene.add.graphics().setDepth(22).setScrollFactor(0);
    this.portraitHint = scene.add
      .text(GAME_WIDTH / 2, 20, PORTRAIT_HINT_TEXT, {
        fontFamily: HINT_FONT,
        fontSize: '18px',
        color: PORTRAIT_HINT_COLOR,
      })
      .setOrigin(0.5, 0)
      .setDepth(30)
      .setScrollFactor(0)
      .setVisible(false);

    this.onResize = () => {
      this.refreshOrientation();
    };
  }

  attach(): void {
    this.scene.input.addPointer(2);
    this.scene.input.on('pointerdown', this.onPointerDown, this);
    this.scene.input.on('pointermove', this.onPointerMove, this);
    this.scene.input.on('pointerup', this.onPointerUp, this);
    this.scene.input.on('pointerupoutside', this.onPointerUp, this);
    window.addEventListener('resize', this.onResize);
    window.addEventListener('orientationchange', this.onResize);
    this.scene.events.once('shutdown', () => {
      window.removeEventListener('resize', this.onResize);
      window.removeEventListener('orientationchange', this.onResize);
    });
    this.refreshOrientation();
    this.redrawDash(true, false, 0);
  }

  get axisX(): number {
    return this.axisXValue;
  }

  get axisY(): number {
    return this.axisYValue;
  }

  /** 本帧是否有一次新的冲刺按下。按住不会重复。 */
  consumeDash(): boolean {
    const pressed = this.dashEdge;
    this.dashEdge = false;
    return pressed;
  }

  syncDash(ready: boolean, bursting: boolean, cooldownRemainingMs: number): void {
    this.redrawDash(ready, bursting, cooldownRemainingMs);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (!pointer.wasTouch) {
      return;
    }
    if (!this.enabled) {
      this.enabled = true;
      this.refreshOrientation();
    }

    if (this.dashPointerId === null && hitsDashButton(pointer.x, pointer.y, DASH_BUTTON_X, DASH_BUTTON_Y, DASH_HIT_RADIUS)) {
      this.dashPointerId = pointer.id;
      this.dashEdge = true;
      return;
    }

    if (this.joystickPointerId === null && isLeftHalf(pointer.x, GAME_WIDTH)) {
      this.joystickPointerId = pointer.id;
      this.originX = pointer.x;
      this.originY = pointer.y;
      this.base.setPosition(this.originX, this.originY).setVisible(true);
      this.knob.setPosition(this.originX, this.originY).setVisible(true);
      this.applyFinger(pointer.x, pointer.y);
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.joystickPointerId || !pointer.isDown) {
      return;
    }
    this.applyFinger(pointer.x, pointer.y);
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id === this.joystickPointerId) {
      this.releaseJoystick();
    }
    if (pointer.id === this.dashPointerId) {
      this.dashPointerId = null;
    }
  }

  private applyFinger(x: number, y: number): void {
    const dx = x - this.originX;
    const dy = y - this.originY;
    const length = Math.hypot(dx, dy);
    const clamped = Math.min(length, JOYSTICK_MAX_RADIUS);
    if (length === 0) {
      this.knob.setPosition(this.originX, this.originY);
    } else {
      this.knob.setPosition(this.originX + (dx / length) * clamped, this.originY + (dy / length) * clamped);
    }
    const axis = joystickVector(this.originX, this.originY, x, y, JOYSTICK_MAX_RADIUS, JOYSTICK_DEADZONE);
    this.axisXValue = axis.x;
    this.axisYValue = axis.y;
  }

  private releaseJoystick(): void {
    this.joystickPointerId = null;
    this.axisXValue = 0;
    this.axisYValue = 0;
    this.base.setVisible(false);
    this.knob.setVisible(false);
  }

  private refreshOrientation(): void {
    const portrait = window.innerHeight > window.innerWidth;
    this.portraitHint.setVisible(this.enabled && portrait);
  }

  private redrawDash(ready: boolean, bursting: boolean, cooldownRemainingMs: number): void {
    const gfx = this.dashGfx;
    gfx.clear();
    if (!this.enabled) {
      gfx.setVisible(false);
      return;
    }
    gfx.setVisible(true);

    const cx = DASH_BUTTON_X;
    const cy = DASH_BUTTON_Y;
    const fill = bursting ? COLOR_TALISMAN_DASH : ready ? COLOR_TALISMAN_READY : COLOR_TALISMAN_COOLDOWN;

    gfx.fillStyle(0x100e0c, 0.78);
    gfx.fillCircle(cx, cy, DASH_BUTTON_RADIUS);
    gfx.lineStyle(3, COLOR_PLAYER_OUTLINE, 1);
    gfx.strokeCircle(cx, cy, DASH_BUTTON_RADIUS);
    gfx.fillStyle(fill, 1);
    gfx.fillCircle(cx, cy, DASH_BUTTON_RADIUS * 0.62);

    gfx.lineStyle(4, 0x1a100e, 0.9);
    gfx.beginPath();
    gfx.moveTo(cx - 14, cy - 10);
    gfx.lineTo(cx + 8, cy);
    gfx.lineTo(cx - 14, cy + 10);
    gfx.strokePath();

    if (!ready) {
      const progress = 1 - Math.min(1, Math.max(0, cooldownRemainingMs / DASH_COOLDOWN_MS));
      gfx.lineStyle(7, COLOR_TALISMAN_READY, 0.95);
      gfx.beginPath();
      gfx.arc(cx, cy, DASH_BUTTON_RADIUS + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress, false);
      gfx.strokePath();
    }
  }
}
