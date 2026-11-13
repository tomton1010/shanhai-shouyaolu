import Phaser from 'phaser';
import { COLOR_INK, GAME_HEIGHT, GAME_WIDTH } from './game/constants.ts';
import { PlayScene } from './game/scenes/PlayScene.ts';

installViewportGuards();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: COLOR_INK,
  banner: false,
  disableContextMenu: true,
  audio: {
    noAudio: true,
  },
  input: {
    activePointers: 3,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [PlayScene],
});

void game;

function installViewportGuards(): void {
  const block = (event: Event) => {
    event.preventDefault();
  };
  document.addEventListener('gesturestart', block);
  document.addEventListener('gesturechange', block);
  document.addEventListener('touchmove', block, { passive: false });
  document.addEventListener('dblclick', block);
}
