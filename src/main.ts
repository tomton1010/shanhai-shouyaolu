import Phaser from 'phaser';
import { COLOR_INK, GAME_HEIGHT, GAME_WIDTH } from './game/constants.ts';
import { PlayScene } from './game/scenes/PlayScene.ts';

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
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [PlayScene],
});

void game;
