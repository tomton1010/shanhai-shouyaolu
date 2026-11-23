/**
 * 道士和狌狌的朝向只影响画面。冲刺、藤鞭、接触和拾取仍用原来的方向和坐标。
 * 贴图锚在中心，水平翻转不会把外框挪走；再用这个偏移把躯干放回容器原点。
 */
export function torsoLocalOffset(
  originX: number,
  originY: number,
  displaySize: number,
  flipX: boolean,
): { x: number; y: number } {
  const dx = (originX - 0.5) * displaySize;
  const dy = (originY - 0.5) * displaySize;
  return { x: flipX ? dx : -dx, y: -dy };
}

/**
 * 原画朝右（artFacing > 0）时，往左走才翻转。水平分量太小则保持当前朝向。
 * artFacing 为 0 时不翻，留给正面角色。
 */
export function actorFlipX(dirX: number, artFacing: number, deadzone: number, currentFlip: boolean): boolean {
  if (artFacing === 0 || Math.abs(dirX) < deadzone) {
    return currentFlip;
  }
  const artFacesRight = artFacing > 0;
  return (dirX > 0) !== artFacesRight;
}
