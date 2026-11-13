import { cardById, type CardId, type CardStacks } from './cards.ts';
import { CARD_STACK_CAP } from './constants.ts';

export interface LevelUpHandlers {
  onChoose: (index: number) => void;
  onReroll: () => void;
}

/**
 * 暂停时盖在画面上的符箓选择。用页面元素而不是画布文字，
 * 竖屏时字号才够点。
 */
export class LevelUpOverlay {
  private readonly root: HTMLElement;
  private readonly cards: HTMLElement;
  private readonly reroll: HTMLButtonElement;
  private handlers: LevelUpHandlers = {
    onChoose: () => {},
    onReroll: () => {},
  };

  constructor() {
    const root = document.getElementById('level-up');
    const cards = document.getElementById('level-up-cards');
    const reroll = document.getElementById('level-up-reroll');
    if (!(root instanceof HTMLElement) || !(cards instanceof HTMLElement) || !(reroll instanceof HTMLButtonElement)) {
      throw new Error('缺少符箓选择界面');
    }
    this.root = root;
    this.cards = cards;
    this.reroll = reroll;
    const pressReroll = () => {
      this.handlers.onReroll();
    };
    this.reroll.addEventListener('click', pressReroll);
    this.reroll.addEventListener('pointerup', pressReroll);
    window.addEventListener('keydown', (event) => {
      if (this.root.hidden || event.repeat) {
        return;
      }
      const index = cardIndexFromKey(event.code);
      if (index !== null) {
        event.preventDefault();
        this.handlers.onChoose(index);
        return;
      }
      if (event.code === 'KeyR') {
        event.preventDefault();
        this.handlers.onReroll();
      }
    });
  }

  show(offer: CardId[], stacks: CardStacks, rerollsLeft: number, handlers: LevelUpHandlers): void {
    this.handlers = handlers;
    this.cards.replaceChildren();
    offer.forEach((id, index) => {
      const card = cardById(id);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'card';
      const choose = () => {
        this.handlers.onChoose(index);
      };
      button.addEventListener('click', choose);
      button.addEventListener('pointerup', choose);

      const key = document.createElement('span');
      key.className = 'card-key';
      key.textContent = String(index + 1);

      const name = document.createElement('span');
      name.className = 'card-name';
      name.textContent = card.name;

      const detail = document.createElement('span');
      detail.className = 'card-detail';
      detail.textContent = card.detail;

      const stack = document.createElement('span');
      stack.className = 'card-stack';
      stack.textContent = `已有 ${stacks[id]}/${CARD_STACK_CAP}`;

      button.append(key, name, detail, stack);
      this.cards.append(button);
    });

    this.reroll.disabled = rerollsLeft <= 0;
    this.reroll.textContent = rerollsLeft > 0 ? `重画（剩 ${rerollsLeft}）` : '重画已用';
    this.root.hidden = false;
  }

  hide(): void {
    this.root.hidden = true;
    this.cards.replaceChildren();
  }
}

function cardIndexFromKey(code: string): number | null {
  if (code === 'Digit1' || code === 'Numpad1') {
    return 0;
  }
  if (code === 'Digit2' || code === 'Numpad2') {
    return 1;
  }
  if (code === 'Digit3' || code === 'Numpad3') {
    return 2;
  }
  return null;
}
