/// <reference path="./typings/index.d.ts" />
/// <reference path="./keycode.ts" />
var game;
var MAX_FPS = 60;
var FRAME_PER_MSEC = Math.floor((1 / MAX_FPS) * 1000);
var block_defs = [
    // I
    [
        [-2, 0], [-1, 0], [1, 0]
    ],
    // O
    [
        [-1, -1], [0, -1], [-1, 0]
    ],
    // S
    [
        [0, -1], [-1, 0], [1, -1]
    ],
    // Z
    [
        [0, -1], [1, 0], [-1, -1]
    ],
    // J
    [
        [-1, -1], [-1, 0], [1, 0]
    ],
    // L
    [
        [1, -1], [-1, 0], [1, 0]
    ],
    // T
    [
        [0, -1], [-1, 0], [1, 0]
    ]
];
var block_colors = [
    "#efefef",
    "#0072E8",
    "#FFFF00",
    "#64FE2E",
    "#FF0000",
    "#2E2EFE",
    "#FE9A2E",
    "#DF01D7",
    "#585858"
];
var Block = (function () {
    function Block(type, dir) {
        if (dir === void 0) { dir = 0; }
        this.type = type;
        this.dir = dir;
        this.data = new Array(25);
        if (type === undefined)
            throw "type is not undefined.";
        this.init();
    }
    Block.prototype.init = function () {
        this.update();
    };
    Block.prototype.rightRotate = function () {
        this.dir = (this.dir + 1) % 4;
        this.update();
    };
    Block.prototype.leftRotate = function () {
        this.dir = this.dir - 1 < 0 ? 3 : this.dir - 1;
        this.update();
    };
    Block.prototype.update = function () {
        var def = block_defs[this.type];
        var m = this.type != 1 ? this.dir : 0;
        //回転行列風のアルゴリズムを使って回転させる
        Block.decode(5, def, this.type, m, this.data);
    };
    Block.decode = function (size, blockDef, type, dir, buffer) {
        if (dir === void 0) { dir = 0; }
        if (buffer === void 0) { buffer = new Array(size * size); }
        for (var i = 0; i < buffer.length; ++i)
            buffer[i] = 0;
        var sin = dir == 1 ? 1 : dir == 3 ? -1 : 0;
        var cos = dir == 0 ? 1 : dir == 2 ? -1 : 0;
        var length = blockDef.length;
        for (var i = 0; i < length; ++i) {
            var x = blockDef[i][0];
            var y = blockDef[i][1];
            var nx = 2 + (x * cos - y * sin);
            var ny = 2 + (x * sin + y * cos);
            buffer[size * ny + nx] = type + 1;
        }
        buffer[Math.floor(buffer.length / 2)] = type + 1;
        return buffer;
    };
    return Block;
}());
var BlockFactory = (function () {
    function BlockFactory(size) {
        this.size = size;
        this.nextList = new Array();
        this.nextBuffer = new Array();
    }
    BlockFactory.prototype.next = function () {
        this.genList();
        var b = this.nextList[0];
        this.nextList.splice(0, 1);
        return b;
    };
    BlockFactory.prototype.genList = function () {
        while (this.nextList.length <= this.size) {
            if (this.nextBuffer.length <= 0) {
                this.nextBuffer = [0, 1, 2, 3, 4, 5, 6];
            }
            var i = Math.floor(Math.random() * this.nextBuffer.length);
            var type = this.nextBuffer[i];
            this.nextBuffer.splice(i, 1);
            this.nextList.push(new Block(type));
        }
    };
    return BlockFactory;
}());
var Canvas = (function () {
    function Canvas(target, height, width) {
        this.height = height;
        this.width = width;
        var canvas = document.getElementById(target);
        canvas.setAttribute("height", height + "px");
        canvas.setAttribute("width", width + "px");
        this.ctx = canvas.getContext('2d');
    }
    return Canvas;
}());
var Tetris = (function () {
    function Tetris(width, height, offsetX, offsetY, cellSize, setWall) {
        if (offsetX === void 0) { offsetX = 0; }
        if (offsetY === void 0) { offsetY = 0; }
        if (cellSize === void 0) { cellSize = 3; }
        if (setWall === void 0) { setWall = true; }
        this.width = width;
        this.height = height;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.cellSize = cellSize;
        this.init(setWall);
    }
    Tetris.prototype.init = function (setWall) {
        if (setWall === void 0) { setWall = true; }
        this.field = new Array(this.width * this.height);
        var height = this.height;
        var width = this.width;
        var field = this.field;
        for (var i = 0; i < height; ++i) {
            for (var j = 0; j < width; ++j) {
                if (setWall && (j == 0 || j == width - 1 || i == height - 1)) {
                    field[width * i + j] = 8;
                }
                else {
                    field[width * i + j] = 0;
                }
            }
        }
    };
    Tetris.prototype.putBlock = function (x, y, block, updateField) {
        if (updateField === void 0) { updateField = false; }
        if (block === null)
            return true;
        this.drawField = this.field.slice();
        for (var i = 0; i < 5; ++i) {
            if (i + y >= this.height) {
                return true;
            }
            for (var j = 0; j < 5 && j + x < this.width; ++j) {
                if (block.data[i * 5 + j] == 0) {
                    continue;
                }
                if (this.field[(y + i) * this.width + (x + j)] != 0) {
                    this.drawField = this.field.slice();
                    return false;
                }
                if (updateField)
                    this.field[(y + i) * this.width + (x + j)] = block.data[i * 5 + j];
                this.drawField[(y + i) * this.width + (x + j)] = block.data[i * 5 + j];
            }
        }
        return true;
    };
    Tetris.prototype.eraseLine = function () {
        var eraseLines = [];
        var height = this.height;
        var width = this.width;
        var field = this.field;
        for (var i = height - 2; i >= 1; --i) {
            var n = 0;
            for (var j = 1; j < width - 1; ++j) {
                if (field[width * i + j] != 0) {
                    ++n;
                }
                if (n == width - 2) {
                    for (var k = 1; k < width - 1; ++k) {
                        field[width * i + k] = 0;
                    }
                    eraseLines.push(i);
                }
            }
        }
        if (eraseLines.length != 0)
            return this.moveLine(eraseLines);
        else
            return 0;
    };
    Tetris.prototype.moveLine = function (lines) {
        var width = this.width;
        var height = this.height;
        var field = this.field;
        for (var y = lines.length - 1; y >= 0; --y) {
            var line = lines[y];
            console.log(line);
            for (var i = line; i >= 0; --i) {
                for (var j = 1; j < width - 1; ++j) {
                    if (i - 1 < 0) {
                        field[i * width + j] = 0;
                    }
                    else {
                        field[i * width + j] = field[(i - 1) * width + j];
                    }
                }
            }
        }
        return lines.length;
    };
    Tetris.prototype.draw = function (cvs) {
        var offsetX = this.offsetX;
        var offsetY = this.offsetY;
        var cellSize = this.cellSize;
        var width = this.width;
        var height = this.height;
        var drawField = this.drawField;
        var length = this.drawField.length;
        cvs.ctx.fillStyle = "#000";
        cvs.ctx.fillRect(offsetX - 1, offsetY - 1, cellSize * width, cellSize * height);
        for (var i = 0; i < length; ++i) {
            var x = i % width;
            var y = Math.floor(i / width);
            var color = block_colors[drawField[i]];
            cvs.ctx.fillStyle = color;
            cvs.ctx.fillRect(offsetX + x * cellSize, offsetY + y * cellSize, cellSize - 1, cellSize - 1);
            cvs.ctx.fillStyle = "#0ff";
        }
    };
    return Tetris;
}());
var Game = (function () {
    function Game() {
        this.frame = 0;
        this.blockX = 2;
        this.blockY = 0;
        this.fallBlock = null;
    }
    Game.prototype.init = function () {
        var _this = this;
        this.canvas = new Canvas("main", 640, 640);
        this.tetris = new Tetris(10, 20, 10, 10, 30);
        this.nexts = new Array(new Tetris(5, 5, 320, 10, 25, false), new Tetris(5, 5, 320, 135, 25, false), new Tetris(5, 5, 320, 260, 25, false), new Tetris(5, 5, 320, 375, 25, false), new Tetris(5, 5, 320, 500, 25, false));
        this.blockFactory = new BlockFactory(5);
        this.blockFactory.genList();
        this.keys = new Array(91);
        this.pressedKeys = new Array(91);
        for (var i = 0; i < this.keys.length; ++i) {
            this.keys[i] = 0;
            this.pressedKeys[i] = false;
        }
        for (var i = 0; i < this.nexts.length; ++i) {
            this.nexts[i].putBlock(0, 0, this.blockFactory.nextList[i], true);
        }
        document.onkeydown = function (e) {
            //キーリピート対策
            if (!_this.pressedKeys[e.which]) {
                _this.pressedKeys[e.which] = true;
            }
            e.preventDefault();
        };
        document.onkeyup = function (e) {
            _this.pressedKeys[e.which] = false;
            _this.keys[e.which] = 0;
        };
    };
    Game.prototype.updateKeys = function () {
        var _this = this;
        this.pressedKeys.forEach(function (v, i, a) {
            if (v) {
                _this.keys[i] += 1;
            }
        });
    };
    Game.prototype.isKeyPushed = function (keycode) {
        return this.keys[keycode];
    };
    Game.prototype.update = function () {
        var _this = this;
        if (this.frame % 20 == 0) {
            this.blockY++;
            if (!this.tetris.putBlock(this.blockX, this.blockY, this.fallBlock)) {
                this.tetris.putBlock(this.blockX, this.blockY - 1, this.fallBlock, true);
                this.fallBlock = null; //(Math.floor(Math.random() * block_defs.length));
                this.blockX = 2;
                this.blockY = 0;
                if (!this.tetris.putBlock(this.blockX, this.blockY, this.fallBlock)) {
                    this.init();
                }
            }
        }
        if (this.fallBlock == null) {
            this.fallBlock = this.blockFactory.next();
        }
        this.updateKeys();
        //Z
        if (this.keys[90] == 1) {
            this.fallBlock.rightRotate();
            if (!this.tetris.putBlock(this.blockX, this.blockY, this.fallBlock)) {
                this.fallBlock.leftRotate();
            }
        }
        else if (this.keys[88] == 1) {
            this.fallBlock.leftRotate();
            if (!this.tetris.putBlock(this.blockX, this.blockY, this.fallBlock)) {
                this.fallBlock.rightRotate();
            }
        }
        //RIGHT
        if (this.keys[39] == 1 || this.keys[39] >= 15) {
            var x = this.blockX + 1;
            if (this.tetris.putBlock(x, this.blockY, this.fallBlock)) {
                this.blockX++;
            }
        }
        else if (this.keys[37] == 1 || this.keys[37] >= 15) {
            var x = this.blockX - 1;
            if (this.tetris.putBlock(x, this.blockY, this.fallBlock)) {
                this.blockX = x;
            }
        }
        //DOWN 
        if (this.keys[40] == 1 || this.keys[40] >= 15) {
            var y = this.blockY + 1;
            if (this.tetris.putBlock(this.blockX, y, this.fallBlock)) {
                this.blockY = y;
            }
        }
        this.tetris.putBlock(this.blockX, this.blockY, this.fallBlock);
        this.tetris.eraseLine();
        setTimeout(function () {
            _this.tetris.draw(_this.canvas);
            for (var i = 0; i < _this.nexts.length; ++i) {
                _this.nexts[i].init(false);
                _this.nexts[i].putBlock(0, 0, _this.blockFactory.nextList[i], true);
                _this.nexts[i].draw(_this.canvas);
            }
        }, 0);
        ++this.frame;
    };
    return Game;
}());
var blocks = new Array();
var oldTime = 0;
var lastFpsUpdTime = 0;
var fps = 0;
var count = 0;
window.onload = function () {
    game = new Game();
    game.init();
    var task = function () {
        var st = new Date().getTime();
        game.update();
        var en = new Date().getTime();
        if (st - lastFpsUpdTime >= 500) {
            fps /= count;
            document.getElementById("fps").innerText = Math.round(fps * 10) / 10 + "fps";
            lastFpsUpdTime = st;
            count = 0;
            fps = 0;
        }
        fps += (FRAME_PER_MSEC - (en - st)) / FRAME_PER_MSEC * MAX_FPS;
        ++count;
        setTimeout(task, FRAME_PER_MSEC - (en - st));
    };
    setTimeout(task, 0);
};
//# sourceMappingURL=index.js.map