
(function() {
  /**
   * Ace Editor Custom theme.
   */
  define('ace/theme/asi',['require','exports'], (require, exports) => {
    exports.isDark = true;
    exports.cssClass = 'ace-asi';
  })
  ///////////////////////////////////////

  const LOCAL_STORAGE_KEY = 'asi-snake';

  const CFG = {
    cellSize: 20,
    gridPadding: 5,
    snakeLength: 4,
    speed: 100,
  };

  const D = {
    UP: 'up',
    RIGHT: 'right',
    DOWN: 'down',
    LEFT: 'left',
  };

  const styleMap = {
    0: getCSSVar('cell-inactive-color'),
    1: getCSSVar('cell-snake-head-color'),
    2: getCSSVar('cell-snake-tail-color'),
    3: getCSSVar('cell-point-color'),
  };

  const initialContent = `/**
 * @description Function to return the moves to locate the next point.
 *
 * @param {Number} xMax Number of cells across the x axis.
 * @param {Number} yMax Number of cells across the y axis.
 * @param {Array} snake Array of [X,Y] coordinates of the current snake from head to tail.
 * @param {Array} point [X, Y] coordinates of where the point will be.
 * @param {Object} D Constant directions to be returned (UP, RIGHT, DOWN, LEFT)
 *
 * @return {Array} Moves for each cell i.e [D.UP, D.UP, D.RIGHT]
 */

function findPath(xMax, yMax, snake, point, D) {

   // Do your thing...

}`;

  let timeout;
  let running;

  const canvas = document.getElementById('js__canvas');
  const startButton = document.getElementById('js__start');
  const resetButton = document.getElementById('js__reset');
  const pointsEl = document.getElementById('js__points');
  const scoreEl = document.getElementById('js__score');
  const movesEl = document.getElementById('js__moves');
  const ideEl = document.getElementById('js__ide');
  const consoleEl = document.getElementById('js__console');

  const ctx = canvas.getContext('2d');

  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

  const xMax = Math.floor((canvas.width + CFG.gridPadding) / (CFG.cellSize + CFG.gridPadding));
  const yMax = Math.floor((canvas.height + CFG.gridPadding) / (CFG.cellSize + CFG.gridPadding));

  const xPadding = (canvas.width - (CFG.cellSize * xMax)) / (xMax - 1);
  const yPadding = (canvas.height - (CFG.cellSize * yMax)) / (yMax - 1);

  const editor = ace.edit(ideEl);

  editor.setShowPrintMargin(false);
  editor.setShowFoldWidgets(false);
  editor.setHighlightActiveLine(false);
  editor.$blockScrolling = Infinity;
  editor.setTheme('ace/theme/asi');
  editor.getSession().setMode('ace/mode/javascript');
  editor.session.setOptions({
    tabSize: 2,
    useSoftTabs: true,
  });

  editor.setValue(localStorage.getItem(LOCAL_STORAGE_KEY) || initialContent, 1);
  editor.on('change', handleEditorChange);

  startButton.addEventListener('click', handleStart);
  resetButton.addEventListener('click', handleReset);

  handleReset();

  function getCSSVar(variable) {
    return window
      .getComputedStyle(document.documentElement)
      .getPropertyValue(`--${variable}`)
      .trim();
  }

  function handleStart() {
    const snake = createSnake();
    const point = createPoint(snake);
    const points = 0;
    const moves =[];

    running = true;

    startButton.setAttribute('disabled', '');
    resetButton.removeAttribute('disabled');

    update({ points, point, snake, moves });
    redraw({ point, snake });
  }

  function handleReset() {
    clearTimeout(timeout);

    running = false;

    resetButton.setAttribute('disabled', '');
    startButton.removeAttribute('disabled');
    handleConsoleLog('');

    redraw({ snake: createSnake() });
  }

  function handleEditorChange() {
    localStorage.setItem(LOCAL_STORAGE_KEY, editor.getValue());
  }

  function handlePointIncrease(points, avgerage, score) {
    pointsEl.innerHTML = points;
    movesEl.innerHTML = Math.floor(avgerage);
    scoreEl.innerHTML = Math.floor(score);
  }

  function handleConsoleLog(message, error) {
    if (error) {
      consoleEl.classList.add('asi-console--error');
    } else {
      consoleEl.classList.remove('asi-console--error');
    }

    consoleEl.innerHTML = message;
  }

  function sandboxRequestMoves({ snake, point }, points, movesHistory, score) {
    let sandboxTimeout;
    let sandbox = new Worker('sandbox.js');

    function cleanSandbox() {
      clearTimeout(sandboxTimeout);
      sandbox.terminate();
      sandbox = null;
    }

    sandbox.onerror = (error) => {
      handleConsoleLog(error);
      cleanSandbox();
    }

    sandbox.onmessage = ({ data: { action, error, moves } }) => {
      switch (action) {
      case 'moves':
        update(
          { snake, point, moves },
          points,
          Array.isArray(moves) && moves.length > 0 ? movesHistory.concat([moves.length]) : movesHistory,
          score,
          true
        );
        break;
      case 'error':
        handleConsoleLog(error, true);
        break;
      }

      cleanSandbox();
    };

    sandbox.postMessage({
      action: 'request_moves',
      fn: editor.getValue(),
      args: [xMax, yMax, snake, point, D],
    });

    sandboxTimeout = setTimeout(() => {
      console.log('Sandbox time out');
      cleanSandbox();
      handleReset();
    }, 5000);
  }

  function createSnake(position) {
    return new Array(CFG.snakeLength).fill().map((v, i) => [
      Math.floor(xMax / 2) - i,
      Math.floor(yMax / 2)
    ]);
  }

  function createGrid({ snake, point }) {
    const grid = [];

    for (let y = 0; y < yMax; y++) {
      const row = [];

      for (let x = 0; x < xMax; x++) {
        row.push(0);
      }

      grid.push(row);
    }

    if (Array.isArray(snake)) {
      snake.forEach(([x, y], i) => grid[y][x] = i === 0 ? 1 : 2);
    }

    if (Array.isArray(point)) {
      grid[point[1]][point[0]] = 3;
    }

    return grid;
  }

  function createPoint(snake) {
    const x = Math.floor(Math.random() * xMax);
    const y = Math.floor(Math.random() * yMax);

    if (snake.some(([sX, sY]) => x === sX && y === sY)) {
      return createPoint(snake);
    }

    return [x, y];
  }


  function redraw({ point, snake } = {}) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    createGrid({ point, snake }).forEach((row, y) => {
      row.forEach((value, x) => {
        ctx.fillStyle = styleMap[value];
        ctx.fillRect(
          x * (CFG.cellSize + xPadding),
          y * (CFG.cellSize + yPadding),
          CFG.cellSize,
          CFG.cellSize);
      });
    });
  }

  function update({ snake, point, moves }, points = 0, movesHistory = [], score = 0, fromSandbox = false) {
    if (!running) {
      return;
    }

    if (Array.isArray(moves) && moves.length === 0 && !fromSandbox) {
      return sandboxRequestMoves({ snake, point }, points, movesHistory, score);
    }

    if (!Array.isArray(moves) || moves.length === 0) {
      return handleConsoleLog('You need to return some moves bruh 🙄');
    }

    const nextDirection = moves.shift();
    const nextPositionExtended = getNextPosition(snake, nextDirection);
    const nextPosition = nextPositionExtended.slice(0, -1);

    if (!nextDirection || !Object.values(D).includes(nextDirection)) {
      return handleConsoleLog('Looks like something in the returned array is not one of the constant directions (D).');
    }

    const didCollectPoint = willCollectPoint(point, nextPositionExtended);

    if (didCollectPoint) {
      const avg = calcMedian(movesHistory);

      snake = nextPositionExtended;
      point = createPoint(snake);
      points = points + 1;
      score = calcScore(score, avg, points);
      handlePointIncrease(points, avg, score);
    } else {
      snake = nextPosition;
    }

    if (!didCollectPoint && !validateNextPosition(nextPosition)) {
      return handleConsoleLog('The 🐍 crashed 💥');
    }

    redraw({ point, snake });

    timeout = setTimeout(() =>
      update({ snake, point, moves }, points, movesHistory, score, false),
      1000 / CFG.speed
    );
  }

  function getNextPosition(snake, direction) {
    return [shiftPosition(snake[0], direction)].concat(snake);
  }

  function shiftPosition([x, y], direction) {
    switch (direction) {
      case D.UP:    return [x, y - 1];
      case D.RIGHT: return [x + 1, y];
      case D.DOWN:  return [x, y + 1];
      case D.LEFT:  return [x - 1, y];
    }
  }

  function validateNextPosition(nextPosition) {
    return nextPosition.every(([x, y], i) =>
      x >= 0 && x < xMax && y >= 0 && y < yMax &&
      !nextPosition.find(([fX, fY], fI) => fI !== i && fX === x && fY === y)
    );
  }

  function willCollectPoint(point, nextPosition) {
    return point[0] === nextPosition[0][0] &&
      point[1] === nextPosition[0][1];
  }

  function calcMedian(moves) {
    moves = moves.slice(0).sort((a, b) => a - b);

    if (moves.length === 0) {
      avg = 0;
    } if (moves.length === 1) {
      avg = moves[0];
    } else if ((moves.length / 2) % 1) {
      avg = (moves[Math.floor(moves.length / 2)] +  moves[Math.ceil(moves.length / 2)]) / 2;
    } else {
      avg = moves[moves.length / 2];
    }

    return avg;
  }

  function calcScore(score, avg, points) {
    return score + (((avg / xMax) + (avg / yMax)) * points);
  }
})();
