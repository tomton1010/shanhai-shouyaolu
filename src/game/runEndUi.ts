export type RunOutcome = 'win' | 'loss';

/**
 * 一局结束的结算层。和选符箓一样盖住全屏，方便手机点「再来一局」。
 */
export class RunEndOverlay {
  private readonly root: HTMLElement;
  private readonly title: HTMLElement;
  private readonly detail: HTMLElement;
  private readonly again: HTMLButtonElement;
  private onAgain: () => void = () => {};

  constructor() {
    const root = document.getElementById('run-end');
    const title = document.getElementById('run-end-title');
    const detail = document.getElementById('run-end-detail');
    const again = document.getElementById('run-end-again');
    if (
      !(root instanceof HTMLElement) ||
      !(title instanceof HTMLElement) ||
      !(detail instanceof HTMLElement) ||
      !(again instanceof HTMLButtonElement)
    ) {
      throw new Error('缺少结算界面');
    }
    this.root = root;
    this.title = title;
    this.detail = detail;
    this.again = again;
    for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel', 'mousedown', 'mouseup'] as const) {
      this.root.addEventListener(type, (event) => {
        event.stopPropagation();
      });
    }
    const restart = () => {
      const again = this.onAgain;
      this.onAgain = () => {};
      again();
    };
    this.again.addEventListener('click', restart);
    this.again.addEventListener('pointerup', restart);
    window.addEventListener('keydown', (event) => {
      if (this.root.hidden || event.repeat || event.code !== 'Enter') {
        return;
      }
      event.preventDefault();
      this.onAgain();
    });
  }

  show(outcome: RunOutcome, kills: number, onAgain: () => void): void {
    this.onAgain = onAgain;
    this.title.textContent = outcome === 'win' ? '守住了' : '阵亡';
    this.detail.textContent = `击杀 ${kills}`;
    this.root.hidden = false;
  }

  hide(): void {
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && this.root.contains(focused)) {
      focused.blur();
    }
    this.root.hidden = true;
  }
}
