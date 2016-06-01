'use strict';

const RCBClient = (socket, anchor) => {

  const CANVAS_SIZE = $(document).innerHeight();

  const MOVING_CIRCLE_BORDER_SIZE = 4;
  const MOVING_CIRCLE_BORDER_COLOR = '#888';
  const MOVING_CIRCLE_RADIUS = Math.floor(CANVAS_SIZE / 2 - MOVING_CIRCLE_BORDER_SIZE * 2);

  const PLAYER_CIRCLE_BORDER_SIZE = 4;
  const PLAYER_CIRCLE_BORDER_COLOR = '#EEE';
  const PLAYER_CIRCLE_RADIUS = 20;

  const KEY_CODES = [ 37/*left*/, 39/*right*/ ];

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
    ctx.center = Math.floor(ctx.width / 2);
    return ctx;
  };

  const clearCanvas = canvas => canvas.clearRect(0, 0, canvas.width, canvas.width);

  const drawMovingCircle = canvas => {
    canvas.beginPath();
    canvas.arc(canvas.center, canvas.center, MOVING_CIRCLE_RADIUS, 0, 2 * Math.PI, 0);
    canvas.lineWidth = MOVING_CIRCLE_BORDER_SIZE;
    canvas.strokeStyle = MOVING_CIRCLE_BORDER_COLOR;
    canvas.stroke();
  };

  const degToRad = deg => deg * 2 * Math.PI / 360;
  const playerCirclePosition = deg => {
    const rad = degToRad(deg);
    return {
      x: MOVING_CIRCLE_RADIUS * Math.cos(rad) + MOVING_CIRCLE_RADIUS + PLAYER_CIRCLE_RADIUS / 2 - PLAYER_CIRCLE_BORDER_SIZE / 2,
      y: MOVING_CIRCLE_RADIUS * Math.sin(rad) + MOVING_CIRCLE_RADIUS + PLAYER_CIRCLE_RADIUS / 2 - PLAYER_CIRCLE_BORDER_SIZE / 2
    };
  };

  const drawPlayer = (canvas, player) => {
    const circlePosition = playerCirclePosition(player.angle);
    canvas.beginPath();
    canvas.arc(circlePosition.x, circlePosition.y, PLAYER_CIRCLE_RADIUS, 0, 2 * Math.PI, 0);
    canvas.lineWidth = PLAYER_CIRCLE_BORDER_SIZE;
    canvas.strokeStyle = PLAYER_CIRCLE_BORDER_COLOR;
    canvas.stroke();
  };

  const keyDownStream = $(window).asEventStream('keydown');
  //const keyUpStream = $(window).asEventStream('keyup');

  keyDownStream
    //.merge(keyUpStream)
    .map(event => event.keyCode)
    .filter(keyCode => KEY_CODES.indexOf(keyCode) > -1)
    .onValue(keyCode => socket.emit('keyPress', keyCode));

  const drawState = state => {
    const canvas = getCanvas(anchor);
    clearCanvas(canvas);
    drawMovingCircle(canvas);
    drawPlayer(canvas, state.player);
  };

  socket.on('compute', drawState);
};
