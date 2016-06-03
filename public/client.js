'use strict';

const RCB = (() => {

  const TO_RAD = Math.PI/180;

  const createImage = src => {
    const image = new Image;
    image.src = src;
    return image;
  };

  const Config = function (args) {

    this.update = _args => {
      if (!_args) return new Config;
      for (let i in _args) args[i] = _args[i];
      return new Config(args);
    };

    this.defaultAnchor = () => document.body;
    this.defaultCanvasSize = () => window.innerHeight;

    this.defaultRobotSrc = () => 'public/robot.png';

    this.defaultBoss1Src = () => 'public/boss1.png';
    this.defaultBoss2Src = () => 'public/boss2.png';
    this.defaultBoss3Src = () => 'public/boss3.png';

    this.escapeKeyCode = 27;
    this.spaceKeyCode = 32;

    this.leftKeyCode = 37;
    this.rightKeyCode = 39;
    this.movingKeyCodes = [
      this.leftKeyCode,
      this.rightKeyCode
    ];

    this.definedKeyCodes = [
      this.escapeKeyCode,
      this.spaceKeyCode
    ].concat(this.movingKeyCodes);

    args = args || {};

    this.anchor = args.anchor || this.defaultAnchor();
    this.canvasSize = args.canvasSize || this.defaultCanvasSize();

    this.robotImage = createImage(args.robotSrc || this.defaultRobotSrc());

    this.boss1Image = createImage(args.boss1Src || this.defaultBoss1Src());
    this.boss2Image = createImage(args.boss2Src || this.defaultBoss2Src());
    this.boss3Image = createImage(args.boss3Src || this.defaultBoss3Src());

    this.movingCircleRadius = this.canvasSize/2 - this.robotImage.width;

    this.textMargin = args.textMargin || 20;

    this.server = {
      KEY_CODE_ESCAPE: this.escapeKeyCode,
      KEY_CODE_SPACE: this.spaceKeyCode,
      KEY_CODE_LEFT: this.leftKeyCode,
      KEY_CODE_RIGHT: this.rightKeyCode,
      MOVING_KEY_CODES: this.movingKeyCodes,
      TO_RAD: TO_RAD,
      dimmensions: {
        robot: { width: this.robotImage.width, height: this.robotImage.height },
        boss1: { width: this.boss1Image.width, height: this.boss1Image.height },
        boss2: { width: this.boss2Image.width, height: this.boss2Image.height },
        boss3: { width: this.boss3Image.width, height: this.boss3Image.height }
      }
    };
  };

  const Client = function (config, socket, eventSource) {

    const getContext = anchor => {
      const anchorNode = typeof(anchor) === 'string' ? document.querySelector(anchor) : anchor;
      const existing = anchorNode.querySelector('canvas');
      if (existing)
        return canvasCtx(existing);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = config.canvasSize;
      canvas.center = canvas.width/2;
      anchorNode.appendChild(canvas);
      return getContext(anchor);
    };

    const canvasCtx = canvas => canvas.getContext('2d');

    const clearCtx = ctx => ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.width);

    const writeDebugInformations = (ctx, infos) => {
      let textIndex = 0;
      const write = str => ctx.fillText(str, 10, ++textIndex * config.textMargin);
      ctx.fillStyle = '#FFF';
      infos.forEach(write);
    };

    const drawDebugVector = (ctx, fromx, fromy, tox, toy) => {
      const headLength = 20;
      const angle = Math.atan2(toy - fromy, tox - fromx);
      const cosHead = sign => Math.cos(angle - Math.PI * sign/6);
      const sinHead = sign => Math.sin(angle - Math.PI * sign/6);
      ctx.beginPath();
      ctx.moveTo(fromx, fromy);
      ctx.lineTo(tox, toy);
      ctx.moveTo(tox, toy);
      ctx.lineTo(tox - headLength * cosHead(-1), toy - headLength * sinHead(-1));
      ctx.moveTo(tox, toy);
      ctx.lineTo(tox - headLength * cosHead(+1), toy - headLength * sinHead(+1));
      ctx.stroke();
    };

    const drawMovingCircle = ctx => {
      ctx.beginPath();
      ctx.arc(ctx.canvas.center, ctx.canvas.center, config.movingCircleRadius, 0, 2 * Math.PI, 0);
      ctx.fillStyle = 'rgba(250, 250, 250, 0.1)';
      ctx.fill();
    };

    const setPlayerAbsolutePosition = player => {
      player.x = config.movingCircleRadius * (player.x + 1) + config.robotImage.width;
      player.y = config.movingCircleRadius * (player.y + 1) + config.robotImage.width;
    };

    const relRotation = (ctx, image, rad, refX, refY) => {
      const relX = x => (x || 0) - image.width/2;
      const relY = y => (y || 0) - image.height/2;
      ctx.save();
      ctx.translate(refX, refY);
      ctx.rotate(rad);
      ctx.drawImage(image, relX(), relY());
      ctx.rotate(-rad);
      ctx.translate(relX(refX), relY(refY));
      ctx.restore();
    };

    const drawPlayer = (ctx, player) => {
      const imageX = x => (x || 0) - config.robotImage.width/2;
      const imageY = y => (y || 0) - config.robotImage.height/2;
      relRotation(ctx, config.robotImage, player.angleRd, player.x, player.y);
    };

    const drawBoss = (ctx, boss) => {
      const image = config[`boss${boss.level}Image`];
      const x = image.width * (boss.x + 1) + image.width;
      const y = image.width * (boss.y + 1) + image.width;
      ctx.beginPath();
      ctx.arc(ctx.canvas.center, ctx.canvas.center, 30, 0, 2 * Math.PI, 0);
      ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, 15, 0, 2 * Math.PI, 0);
      ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
      ctx.fill();
      relRotation(ctx, image, boss.angleRd, ctx.canvas.center, ctx.canvas.center);
    };

    const isDefinedKeyCode = keyCode => config.definedKeyCodes.indexOf(keyCode) > -1;

    const sendEvents = events => () => {
      const _events = events.splice(0, events.length);
      socket.emit('keysPress', _events);
    };

    const emitKeyPress = events => (socket, source, eventName) => source
      .asEventStream(eventName)
      .map(event => event.keyCode)
      .filter(isDefinedKeyCode)
      .onValue(keyCode => events.push([ eventName, keyCode ]));

    const drawState = (socketId, state) => {

      const startedAt = performance.now();

      const ctx = getContext(config.anchor);
      clearCtx(ctx);

      const player = state.player;
      const boss = state.boss;
      setPlayerAbsolutePosition(player);

      drawMovingCircle(ctx);

      drawPlayer(ctx, player);
      drawBoss(ctx, boss);

      drawDebugVector(ctx, player.x, player.y, ctx.canvas.center, ctx.canvas.center);

      writeDebugInformations(ctx, [
        `SKID ${socketId}`,
        `Frame ${state.frame}`,
        `Player ${player.angleDg}° (${player.x}, ${player.y}) --> ${player.moves.join(',')}`,
        `Boss ${boss.angleDg}° (${boss.x}, ${boss.y}) --> ${boss.moves.join(',')}`,
        `Level ${boss.level}`,
        `Server FR ${state.ctime}μs`,
        `Client FR ${performance.now() - startedAt}μs`
      ]);
    };

    //const updateConfig = config => socket.emit('updateConfig', config.server);

    const start = () => {
      socket.emit('init', config.server);
      socket.on('initialized', config => {
        socket.id = config.socketId;
        const events = [];
        emitKeyPress(events)(socket, eventSource, 'keydown');
        emitKeyPress(events)(socket, eventSource, 'keyup');
        setInterval(sendEvents(events), Math.floor(config.COMPUTE_DELAY/2));
        socket.on('compute', state => drawState(socket.id, state));
      });
    };

    return {
      //updateConfig: updateConfig,
      start: start
    };

  };

  return { Config: Config, Client: Client }

})();
