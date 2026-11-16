import { DASH_SLASH_BOW_PX, WHIP_BEND_PX } from './constants.ts';

export interface StrokePoint {
  x: number;
  y: number;
}

/** 一根藤，尖端落在这一下的攻击距离上。 */
export function whipStroke(x: number, y: number, angle: number, reach: number): StrokePoint[] {
  const aheadX = Math.cos(angle);
  const aheadY = Math.sin(angle);
  const sideX = -aheadY;
  const sideY = aheadX;
  return [
    { x, y },
    {
      x: x + aheadX * reach * 0.42 + sideX * WHIP_BEND_PX,
      y: y + aheadY * reach * 0.42 + sideY * WHIP_BEND_PX,
    },
    { x: x + aheadX * reach, y: y + aheadY * reach },
  ];
}

/** 沿冲刺路径的一刀。两端就是这一帧实际走过的线段。 */
export function slashStroke(x1: number, y1: number, x2: number, y2: number): StrokePoint[] {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  const sideX = length > 0.001 ? -dy / length : 0;
  const sideY = length > 0.001 ? dx / length : 1;
  return [
    { x: x1, y: y1 },
    {
      x: (x1 + x2) / 2 + sideX * DASH_SLASH_BOW_PX,
      y: (y1 + y2) / 2 + sideY * DASH_SLASH_BOW_PX,
    },
    { x: x2, y: y2 },
  ];
}
