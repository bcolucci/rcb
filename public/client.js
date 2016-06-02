'use strict';

const RCBClient = (socket, anchor) => {

  const CANVAS_SIZE = $(document).innerHeight();

  const PLAYER_CIRCLE_RADIUS = 20;
  const BOSS_CIRCLE_RADIUS = CANVAS_SIZE/4;

  const MOVING_CIRCLE_RADIUS = CANVAS_SIZE/2 - PLAYER_CIRCLE_RADIUS;

  const KEY_CODES = [ 37/*left*/, 39/*right*/ ];

  const TEXT_MARGIN = 20;

  const createImage = src => {
    var img = new Image();
    img.src = `public/images/${src}`;
    return img;
  };

  const robotImage = createImage('robot.png');

  const getCanvas = anchor => {
    const anchorNode = document.querySelector(anchor);
    const existing = anchorNode.querySelector('canvas');
    if (existing)
      return canvasContext(existing);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = CANVAS_SIZE;
    anchorNode.appendChild(canvas);
    return getCanvas(anchor);
  };

  const canvasContext = canvas => {
    const ctx = canvas.getContext('2d');
    ctx.width = ctx.height = canvas.width;
    ctx.center = ctx.width/2;
    return ctx;
  };

  const clearCanvas = canvas => canvas.clearRect(0, 0, canvas.width, canvas.width);

  const writeDebugInformations = (canvas, infos) => {
    let textIndex = 0;
    const write = str => canvas.fillText(str, 10, textIndex++ * TEXT_MARGIN);
    canvas.fillStyle = '#FFF';
    infos.forEach(write);
  };

  const drawDebugVector = (canvas, fromx, fromy, tox, toy, color) => {
    const headLength = 20;
    const angle = Math.atan2(toy - fromy, tox - fromx);
    const cosHead = sign => Math.cos(angle - Math.PI * sign/6);
    const sinHead = sign => Math.sin(angle - Math.PI * sign/6);
    canvas.beginPath();
    canvas.moveTo(fromx, fromy);
    canvas.lineTo(tox, toy);
    canvas.moveTo(tox, toy);
    canvas.lineTo(tox - headLength * cosHead(-1), toy - headLength * sinHead(-1));
    canvas.moveTo(tox, toy);
    canvas.lineTo(tox - headLength * cosHead(+1), toy - headLength * sinHead(+1));
    if (color) canvas.strokeStyle = color;
    canvas.stroke();
  };

  const drawMovingCircle = canvas => {
    canvas.beginPath();
    canvas.arc(canvas.center, canvas.center, MOVING_CIRCLE_RADIUS, 0, 2 * Math.PI, 0);
    canvas.fillStyle = 'rgba(250, 250, 250, 0.1)';
    canvas.fill();
  };

  const setPlayerAbsolutePosition = player => {
    player.x = MOVING_CIRCLE_RADIUS * (player.x + 1) + PLAYER_CIRCLE_RADIUS;
    player.y = MOVING_CIRCLE_RADIUS * (player.y + 1) + PLAYER_CIRCLE_RADIUS;
  };

  const drawPlayer = (canvas, player) => {
    canvas.beginPath();
    canvas.arc(player.x, player.y, PLAYER_CIRCLE_RADIUS, 0, 2 * Math.PI, 0);
    canvas.fillStyle = 'rgba(250, 250, 250, 0.6)';
    canvas.fill();
    canvas.drawImage(robotImage, player.x - PLAYER_CIRCLE_RADIUS, player.y - PLAYER_CIRCLE_RADIUS, PLAYER_CIRCLE_RADIUS*2, PLAYER_CIRCLE_RADIUS*2);
  };

  const drawBoss = (canvas, boss) => {
    const x = BOSS_CIRCLE_RADIUS * (boss.x + 1) + BOSS_CIRCLE_RADIUS;
    const y = BOSS_CIRCLE_RADIUS * (boss.y + 1) + BOSS_CIRCLE_RADIUS;
    console.log()
    canvas.beginPath();
    canvas.arc(canvas.center, canvas.center, BOSS_CIRCLE_RADIUS, 0, 2 * Math.PI, 0);
    canvas.fillStyle = 'rgba(0, 0, 0, 0.8)';
    canvas.fill();
    canvas.beginPath();
    canvas.arc(x, y, 15, 0, 2 * Math.PI, 0);
    canvas.fillStyle = 'rgba(255, 0, 0, 0.7)';
    canvas.fill();
  };

  const emitKeyPress = (type, stream) => stream.map(event => event.keyCode)
    .filter(keyCode => KEY_CODES.indexOf(keyCode) > -1)
    .onValue(keyCode => socket.emit(type, keyCode));

  emitKeyPress('keyDownPress', $(window).asEventStream('keydown'));
  emitKeyPress('keyUpPress', $(window).asEventStream('keyup'));

  const drawState = state => {
    const startedAt = performance.now();
    const canvas = getCanvas(anchor);
    const player = state.player;
    const boss = state.boss;
    setPlayerAbsolutePosition(player);
    clearCanvas(canvas);
    drawMovingCircle(canvas);
    drawPlayer(canvas, player);
    drawBoss(canvas, boss);
    drawDebugVector(canvas, player.x, player.y, canvas.center, canvas.center, 'yellow');
    writeDebugInformations(canvas, [
      `Frame ${state.frame}`,
      `Player ${player.angle}° (${player.x}, ${player.y})`,
      `Boss ${boss.angle}° (${boss.x}, ${boss.y})`,
      `CFR ${Math.floor((performance.now() - startedAt) * 1000)}μs`
    ]);
  };

  socket.on('compute', drawState);
};
