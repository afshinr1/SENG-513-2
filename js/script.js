"use strict";

//Stopwatch

let timeField = document.getElementById("time"),
  start = document.getElementById("start"),
  stop = document.getElementById("stop"),
  clear = document.getElementById("clear"),
  seconds = 0,
  minutes = 0,
  hours = 0,
  t;

function add() {
  seconds++;
  if (seconds >= 60) {
    seconds = 0;
    minutes++;
    if (minutes >= 60) {
      minutes = 0;
      hours++;
    }
  }

  timeField.textContent =
    (hours ? (hours > 9 ? hours : "0" + hours) : "00") +
    ":" +
    (minutes ? (minutes > 9 ? minutes : "0" + minutes) : "00") +
    ":" +
    (seconds > 9 ? seconds : "0" + seconds);

  timer();
}
function timer() {
  t = setTimeout(add, 1000);
}

let MSGame = (function () {
  // private constants
  const grid = document.querySelector(".grid");
  const STATE_HIDDEN = "hidden";
  const STATE_SHOWN = "shown";
  const STATE_MARKED = "marked";

  function array2d(nrows, ncols, val) {
    const res = [];
    for (let row = 0; row < nrows; row++) {
      const grid_row = document.createElement("div");
      grid_row.setAttribute("id", `${row}`);
      grid_row.classList.add(grid_size === 'easy' ? "row-div-sm" : 'row-div-md');
      res[row] = [];
      for (let col = 0; col < ncols; col++) {
        res[row][col] = val(row, col);

        const square = document.createElement("div");
        square.setAttribute("id", `${row} ${col}`);
        square.classList.add(grid_size === 'easy' ? "grid-col-sm" : 'grid-col-md');
        $(square).on("taphold", handleTap).on("click", handleClick);

        grid_row.appendChild(square);
      }
      grid.appendChild(grid_row);
    }
    return res;
  }

  // returns random integer in range [min, max]
  function rndInt(min, max) {
    [min, max] = [Math.ceil(min), Math.floor(max)];
    return min + Math.floor(Math.random() * (max - min + 1));
  }
  function handleTap(e) {
    const arr = e.target.id.split(" ");
    console.log(arr);
    let row = parseInt(arr[0]);
    let col = parseInt(arr[1]);
    game.mark(row, col);
    game.drawBoard(game.getRendering());
    updateGame(game.getStatus());
  }
  function handleClick(e) {
    const arr = e.target.id.split(" ");
    let row = parseInt(arr[0]);
    let col = parseInt(arr[1]);
    game.uncover(row, col);
    game.drawBoard(game.getRendering());
    updateGame(game.getStatus());
  }
  function updateGame(status) {
    console.log(status);
    if (status.done === true) {
      clearTimeout(t);
      game.endGame(game.getRendering());
    }
    if (status.nuncovered === status.nrows * status.ncols - status.nmines) {
      clearTimeout(t);
      game.wonGame();
    }
  }

  class _MSGame {
    constructor() {}

    validCoord(row, col) {
      return row >= 0 && row < this.nrows && col >= 0 && col < this.ncols;
    }

    init(nrows, ncols, nmines) {
      console.log(grid);
      this.nrows = nrows;
      this.ncols = ncols;
      this.nmines = nmines;
      this.nmarked = 0;
      this.nuncovered = 0;
      this.exploded = false;
      // create an array
      this.arr = array2d(nrows, ncols, () => ({
        mine: false,
        state: STATE_HIDDEN,
        count: 0,
      }));
    }

    clear() {
      while (grid.firstChild) {
        grid.removeChild(grid.firstChild);
      }
    }

    count(row, col) {
      const c = (r, c) =>
        this.validCoord(r, c) && this.arr[r][c].mine ? 1 : 0;
      let res = 0;
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) res += c(row + dr, col + dc);
      return res;
    }
    sprinkleMines(row, col) {
      // prepare a list of allowed coordinates for mine placement
      let allowed = [];
      for (let r = 0; r < this.nrows; r++) {
        for (let c = 0; c < this.ncols; c++) {
          if (Math.abs(row - r) > 2 || Math.abs(col - c) > 2)
            allowed.push([r, c]);
        }
      }
      this.nmines = Math.min(this.nmines, allowed.length);
      for (let i = 0; i < this.nmines; i++) {
        let j = rndInt(i, allowed.length - 1);
        [allowed[i], allowed[j]] = [allowed[j], allowed[i]];
        let [r, c] = allowed[i];
        this.arr[r][c].mine = true;
      }
      // erase any marks (in case user placed them) and update counts
      for (let r = 0; r < this.nrows; r++) {
        for (let c = 0; c < this.ncols; c++) {
          if (this.arr[r][c].state == STATE_MARKED)
            this.arr[r][c].state = STATE_HIDDEN;
          this.arr[r][c].count = this.count(r, c);
        }
      }

      let mines = [];
      let counts = [];
      for (let row = 0; row < this.nrows; row++) {
        let s = "";
        for (let col = 0; col < this.ncols; col++) {
          s += this.arr[row][col].mine ? "B" : ".";
        }
        s += "  |  ";
        for (let col = 0; col < this.ncols; col++) {
          s += this.arr[row][col].count.toString();
        }
        mines[row] = s;
      }
      console.log("Mines and counts after sprinkling:");
      console.log(mines.join("\n"), "\n");
    }
    // puts a flag on a cell
    // this is the 'right-click' or 'long-tap' functionality
    uncover(row, col) {
      console.log("uncover", row, col);
      // if coordinates invalid, refuse this request
      if (!this.validCoord(row, col)) return false;
      // if this is the very first move, populate the mines, but make
      // sure the current cell does not get a mine
      if (this.nuncovered === 0) {
        this.sprinkleMines(row, col);
        timer();
      }
      // if cell is not hidden, ignore this move
      if (this.arr[row][col].state !== STATE_HIDDEN) return false;
      // floodfill all 0-count cells
      const ff = (r, c) => {
        if (!this.validCoord(r, c)) return;
        if (this.arr[r][c].state !== STATE_HIDDEN) return;
        this.arr[r][c].state = STATE_SHOWN;
        this.nuncovered++;
        if (this.arr[r][c].count !== 0) return;
        ff(r - 1, c - 1);
        ff(r - 1, c);
        ff(r - 1, c + 1);
        ff(r, c - 1);
        ff(r, c + 1);
        ff(r + 1, c - 1);
        ff(r + 1, c);
        ff(r + 1, c + 1);
      };
      ff(row, col);
      // have we hit a mine?
      if (this.arr[row][col].mine) {
        this.exploded = true;
      }

      return true;
    }
    // uncovers a cell at a given coordinate
    // this is the 'left-click' functionality
    mark(row, col) {
      console.log("mark", row, col);
      // if coordinates invalid, refuse this request
      if (!this.validCoord(row, col)) return false;
      // if cell already uncovered, refuse this
      console.log("marking previous state=", this.arr[row][col].state);
      if (this.arr[row][col].state === STATE_SHOWN) return false;

      //if too many mines placed refuse;
      if (mines.innerText == 0 && this.arr[row][col].state == STATE_HIDDEN) {
        alert("Too many Flags placed");
        return false;
      }

      // accept the move and flip the marked status
      this.nmarked += this.arr[row][col].state == STATE_MARKED ? -1 : 1;
      this.arr[row][col].state =
        this.arr[row][col].state == STATE_MARKED ? STATE_HIDDEN : STATE_MARKED;
      return true;
    }
    // returns array of strings representing the rendering of the board
    //      "H" = hidden cell - no bomb
    //      "F" = hidden cell with a mark / flag
    //      "M" = uncovered mine (game should be over now)
    // '0'..'9' = number of mines in adjacent cells
    getRendering() {
      const res = [];
      for (let row = 0; row < this.nrows; row++) {
        let s = "";
        for (let col = 0; col < this.ncols; col++) {
          let a = this.arr[row][col];
          if (this.exploded && a.mine) s += "M";
          else if (a.state === STATE_HIDDEN) s += "H";
          else if (a.state === STATE_MARKED) s += "F";
          else if (a.mine) s += "M";
          else s += a.count.toString();
        }
        res[row] = s;
      }
      return res;
    }

    endGame() {
      message.innerText = "Game Over!";
      message.classList.add("error");
      this.drawBoard(this.getRendering(), "END");
    }
    wonGame() {
      message.innerText = "You won, Congrats!";
      message.classList.add("success");
      this.drawBoard(this.getRendering(), "WON");
    }

    getStatus() {
      let done =
        this.exploded ||
        this.nuncovered === this.nrows * this.ncols - this.nmines;
      return {
        done: done,
        exploded: this.exploded,
        nrows: this.nrows,
        ncols: this.ncols,
        nmarked: this.nmarked,
        nuncovered: this.nuncovered,
        nmines: this.nmines,
      };
    }
    drawBoard(gameRender, state) {
      this.clear();

      for (let row = 0; row < this.nrows; row++) {
        const grid_row = document.createElement("div");
        grid_row.setAttribute("id", `${row}`);
        grid_row.classList.add(grid_size === 'easy' ? "row-div-sm" : 'row-div-md');
        for (let col = 0; col < this.ncols; col++) {
          const square = document.createElement("div");
          square.setAttribute("id", `${row} ${col}`);
          square.classList.add(grid_size === 'easy' ? "grid-col-sm" : 'grid-col-md');
          if (state !== "END" && state !== "WON") {
            $(square).on("taphold", handleTap).on("click", handleClick);
          }

          if (gameRender[row][col] === "M"){
            square.classList.add("bomb");
            square.innerHTML = '<i class="fa fa-bomb" aria-hidden="true"></i>';

          } 
         else if (gameRender[row][col] === "F"){
           square.classList.add("flag");
           let icon = document.createElement('i');
           icon.classList.add('fa');
           icon.classList.add('fa-flag');
           icon.classList.add('disabled');
           square.appendChild(icon);

         } 

       else if (
            gameRender[row][col] !== "M" &&
            gameRender[row][col] !== "H" &&
            gameRender[row][col] !== "F"
          ){
            square.classList.add("seen");
            square.innerText = gameRender[row][col];

          }

          grid_row.appendChild(square);
        }
        mines.innerText = game.getStatus().nmines - game.getStatus().nmarked;
        grid.appendChild(grid_row);
      }
    }
  }

  return _MSGame;
})();

let game = new MSGame();

const mines = document.querySelector("#mines");
const message = document.querySelector(".message");
const grid_size_element = document.querySelector(".grid-size");
const reset_btn = document.querySelector("#reset");

reset_btn.addEventListener("click", resetGrid);

function resetGrid() {
  game.clear();
  InitAndReset();
}

let grid_size = "";
grid_size_element.addEventListener("change", (event) => {
  grid_size = event.target.value;
  InitAndReset();
});

function InitAndReset() {
  message.classList.remove("error");
  message.classList.remove("success");
  clearTimeout(t);
  timeField.textContent = "00:00:00";
  seconds = 0;
  minutes = 0;
  hours = 0;
  message.innerText = "";
  if (grid_size === "easy") {
    console.log(game.getStatus().nmines);
    mines.innerText = 10;
    game.clear();
    game.init(8, 10, 10);
  } else if (grid_size === "medium") {
    mines.innerText = 40;
    game.clear();
    game.init(14, 18, 40);
  } else {
    mines.innerText = "";
    game.clear();
  }
  console.log(game.getRendering().join("\n"));
  console.log(game.getStatus());
}

