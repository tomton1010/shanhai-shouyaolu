import {
  ORIENT_GO_LANDSCAPE,
  ORIENT_GO_LANDSCAPE_ARIA,
  ORIENT_GO_PORTRAIT,
  ORIENT_GO_PORTRAIT_ARIA,
} from './constants.ts';

export type Presentation = 'landscape' | 'portrait';

export interface Viewport {
  width: number;
  height: number;
}

export interface StageLayout {
  presented: Presentation;
  stageWidth: number;
  stageHeight: number;
  /** 0 表示不旋转。90 是顺时针，-90 是逆时针。变换原点是舞台左上角。 */
  rotateDeg: 0 | 90 | -90;
  /** 先旋转，再平移，把舞台送回视口里。 */
  translateX: number;
  translateY: number;
}

export function physicalOrientation(viewport: Viewport): Presentation {
  return viewport.width >= viewport.height ? 'landscape' : 'portrait';
}

export function oppositePresentation(current: Presentation): Presentation {
  return current === 'landscape' ? 'portrait' : 'landscape';
}

export function orientButtonText(presented: Presentation): string {
  return presented === 'landscape' ? ORIENT_GO_PORTRAIT : ORIENT_GO_LANDSCAPE;
}

export function orientButtonAria(presented: Presentation): string {
  return presented === 'landscape' ? ORIENT_GO_PORTRAIT_ARIA : ORIENT_GO_LANDSCAPE_ARIA;
}

/**
 * 想要的布局和设备方向一致时不旋转。
 * 竖屏设备要横屏：舞台改成横的，顺时针转 90 度再向右平移。
 * 横屏设备要竖屏：舞台改成竖的，逆时针转 90 度再向下平移。
 */
export function stageLayout(viewport: Viewport, presented: Presentation): StageLayout {
  const width = Math.max(0, viewport.width);
  const height = Math.max(0, viewport.height);
  if (physicalOrientation(viewport) === presented) {
    return {
      presented,
      stageWidth: width,
      stageHeight: height,
      rotateDeg: 0,
      translateX: 0,
      translateY: 0,
    };
  }
  if (presented === 'landscape') {
    return {
      presented,
      stageWidth: height,
      stageHeight: width,
      rotateDeg: 90,
      translateX: width,
      translateY: 0,
    };
  }
  return {
    presented,
    stageWidth: height,
    stageHeight: width,
    rotateDeg: -90,
    translateX: 0,
    translateY: height,
  };
}

export function stageToClient(stageX: number, stageY: number, layout: StageLayout): { x: number; y: number } {
  if (layout.rotateDeg === 90) {
    return { x: -stageY + layout.translateX, y: stageX + layout.translateY };
  }
  if (layout.rotateDeg === -90) {
    return { x: stageY + layout.translateX, y: -stageX + layout.translateY };
  }
  return { x: stageX, y: stageY };
}

export function clientToStage(clientX: number, clientY: number, layout: StageLayout): { x: number; y: number } {
  if (layout.rotateDeg === 90) {
    return { x: clientY - layout.translateY, y: layout.translateX - clientX };
  }
  if (layout.rotateDeg === -90) {
    return { x: layout.translateY - clientY, y: clientX - layout.translateX };
  }
  return { x: clientX, y: clientY };
}

export interface CanvasFit {
  canvasLeft: number;
  canvasTop: number;
  canvasWidth: number;
  canvasHeight: number;
  gameWidth: number;
  gameHeight: number;
}

/** 舞台坐标换成游戏坐标。画布在舞台里居中时，用画布自己的偏移。 */
export function stageToGame(stageX: number, stageY: number, fit: CanvasFit): { x: number; y: number } {
  const scaleX = fit.canvasWidth === 0 ? 1 : fit.gameWidth / fit.canvasWidth;
  const scaleY = fit.canvasHeight === 0 ? 1 : fit.gameHeight / fit.canvasHeight;
  return {
    x: (stageX - fit.canvasLeft) * scaleX,
    y: (stageY - fit.canvasTop) * scaleY,
  };
}

/** 锁定成功而且视口已经变成目标方向，才算设备真的转了。否则用页面里的旋转。 */
export function useDeviceLock(lockResolved: boolean, physical: Presentation, desired: Presentation): boolean {
  return lockResolved && physical === desired;
}
