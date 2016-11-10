/// <reference path="../typings/index.d.ts" />
/// <reference path="./keycode.ts" />

var game : Game;
const MAX_FPS = 60;
const FRAME_PER_MSEC = Math.floor((1 / MAX_FPS) * 1000);

var block_defs: Array<any> = [
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
]
// ブロックを表現するクラス
class Block {
    public data = new Array(25);
    //dirはブロックの向き  
    constructor(public type: number, public dir: number = 0 ) {
        if(type === undefined) throw "type is not undefined.";
        this.init();
    }
    private init(){
        this.update();
    }

    public rightRotate() {
        this.dir = (this.dir + 1) % 4;
        this.update();
    }

    public leftRotate() {
        this.dir = this.dir - 1 < 0 ? 3 : this.dir - 1;
        this.update();
    }

    //ブロックをdir方向に回転させる
    private update() {
        let def: Array<any> = block_defs[this.type];
        let m = this.type != 1 ? this.dir : 0;
        Block.decode(5, def, this.type, m, this.data);
    }

    //回転行列風のアルゴリズムを使って回転させる
    static decode(size: number, blockDef: number[], type: number, dir: number = 0 ,buffer = new Array(size * size)){
        for(let i = 0; i < buffer.length; ++i) buffer[i] = 0;

        // sinθ, cosθの値は1か0しか取らないので、三項演算子で判定
        let sin = dir == 1 ? 1 : dir == 3 ? -1 : 0;
        let cos = dir == 0 ? 1 : dir == 2 ? -1 : 0; 
        let length = blockDef.length;
        for(let i = 0; i < length; ++i) {
            let x = blockDef[i][0];
            let y = blockDef[i][1];
            let nx = 2 + (x * cos - y * sin); // θ度回転させたあとの座標を求める
            let ny = 2 + (x * sin + y * cos); // (x = xcosθ - ysinθ, y = xsinθ + ycosθ)のアレ
            buffer[size * ny + nx] = type + 1;
        }
        buffer[Math.floor(buffer.length/2)] = type + 1; // 真ん中を埋める
        return buffer;
    }

}
// ブロックを出現法則に従って生成するクラス
class BlockFactory {
    public nextList: Block[] = new Array();
    private nextBuffer: number[] = new Array();
    constructor(public size: number) {
        
    }
    //次のブロックを取り出す
    public next() {
        this.genList();
        let b = this.nextList[0];
        this.nextList.splice(0, 1);
        return b;
    }
    //NEXTリストにブロックを補充する
    public genList(){
        while(this.nextList.length <= this.size) {
            if(this.nextBuffer.length <= 0) {
                this.nextBuffer = [0,1,2,3,4,5,6];
            }
            let i = Math.floor(Math.random() * this.nextBuffer.length);
            //NEXTバッファから一つずつ数字を取り出し、その値をブロックの種類としてNEXTリストに追加する
            let type = this.nextBuffer[i];
            this.nextBuffer.splice(i, 1);
            this.nextList.push(new Block(type));
        }
    }
}

class DrawBlocks {
    static draw(cvs: Canvas, blockList: Block[], offsetX: number, offsetY: number, cellSize: number) {
        let length = blockList.length;
        let list = blockList;
        let dataLen = list[0].data.length;
        let flameSize = cellSize / 2;
        cvs.ctx.fillStyle = "#000000";
        cvs.ctx.fillRect(offsetX - 1, offsetY + 9, 5 * cellSize + flameSize, 27.7 * cellSize );
        for(let n = 0; n < length; ++n) {
            for(let i = 0; i < dataLen; ++i) {
                let x = i % 5;
                let y = Math.floor(i / 5);
                cvs.ctx.fillStyle = block_colors[list[n].data[i]];
                cvs.ctx.fillRect (
                    x * cellSize + offsetX + flameSize / 2,
                    ((y + n * 5.5 ) * cellSize + 10) + offsetY + flameSize / 2,
                    cellSize - 1,
                    cellSize - 1
                );
            }
        }
    }
}

class KeyManager {
    public keys = new Array<number>(91);
    private pressedKeys = new Array<boolean>(91);
    
    constructor() {
        //キー入力情報の初期化
        for(let i = 0; i < this.keys.length; ++i) { 
            this.keys[i] = 0;
            this.pressedKeys[i] = false;
        }
        //キー入力を監視する
        //キー入力処理そのものはここでやらず、updateの中で行う
        document.onkeydown = (e) => {
            //キーリピート対策
            if(!this.pressedKeys[e.which]) {
                this.pressedKeys[e.which] = true;
            }
            e.preventDefault();
        }
        document.onkeyup = (e) => {
            this.pressedKeys[e.which] = false;
            this.keys[e.which] = 0;
        }
    }

    // キー入力状態を更新する 押されているキーは配列の値がtrueになっている
    // ため、そのキーがtrueならそのキーの押されているフレーム数を加算する
    public updateKeys() {
        this.pressedKeys.forEach((v, i, a)=> {
            if(v){
                this.keys[i] += 1;
            }
        });
    }

    public isKeyPushed(keycode: number) {
        return this.keys[keycode];
    }
}

//Canvasのヘルパクラス
class Canvas {
    public ctx: CanvasRenderingContext2D;
    constructor(target: string, public height: number, public width: number) {
        let canvas = document.getElementById(target);
        canvas.setAttribute("height",height + "px");
        canvas.setAttribute("width",width + "px");
        this.ctx = (<any>canvas).getContext('2d');
    }
}
// テトリスのシステムクラス
class Tetris {
    private field : Array<number>;
    private drawField: Array<number>;

    constructor(public width: number, public height: number, public setWall = true) {
        this.init();
    }
    public init() {
        this.field = new Array(this.width * this.height);
        let height = this.height;
        let width = this.width;
        let field = this.field;
        for(let i = 0; i < height; ++i) {
            for(let j = 0; j < width; ++j) {
                //壁を配置する
                if(this.setWall && (j == 0 || j == width - 1 || i == height - 1)) {
                    field[width * i + j] = 8;
                }
                else {
                    field[width * i + j] = 0;
                }
            }
        }
    }
    // ブロックの設置 updateFieldをtrueにしない限り、フィールドデータは更新されない
    // 戻り値がtrueで設置可能、falseで不可を表す
    public putBlock(x: number, y: number, block: Block, updateField = false) {
        if(block === null) return true;
        this.drawField = this.field.slice();
        let height = this.height;
        let width = this.width;

        for(var i = 0; i < 5; ++i) {
            if(i + y >= height) {
                return true;
            }
            for(var j = 0; j < 5 && j + x < width; ++j) {
                if(block.data[i * 5 + j] == 0) {
                    continue;
                }
                if(!updateField && this.field[(y + i) * width + (x + j)] != 0) {
                    this.drawField = this.field.slice();
                    return false;
                }
                if(updateField) 
                    this.field[(y + i) * width + (x + j)] = block.data[i * 5 + j];
                this.drawField[(y + i) * width + (x + j)] = block.data[i * 5 + j];
            }
        }
        return true;
    }
    //一列揃っている行を消去し、消去した行番号を値とした配列を返す
    public eraseLine() {
        let eraseLines:number[] = [];
        let height = this.height;
        let width = this.width;
        let field = this.field;

        for(let i = height - 2; i >= 1; --i) {
            let n = 0;
            let isFilled = true;
            for(let j = 1; j < width - 1; ++j) {
                if(field[width * i + j] == 0 ) {
                    isFilled = false;
                }
            }
            if(isFilled) {
                for(let k = 1; k < width - 1; ++k) {
                    field[width * i + k] = 0;
                }
                eraseLines.push(i);
            }
        }
        if(eraseLines.length != 0) 
            return this.moveLine(eraseLines);
        else
            return 0;
    }
    //配列で渡された行番号の行を一つ上の行で埋める
    //最上段の場合は空白行で埋める
    private moveLine(lines:number[]) {
        let width = this.width;
        let height = this.height;
        let field = this.field;

        for(let y = lines.length - 1; y >= 0 ; --y){
            let line = lines[y];
            console.log(line);
            for(let i = line; i >= 0; --i) {
                for(let j = 1; j < width - 1; ++j) {
                    if(i - 1 < 0) {
                        field[i * width + j] = 0;
                    }
                    else {
                        field[i * width + j] = field[(i - 1) * width + j];
                    }
                }
            }
        }
        return lines.length;
    }
    //フィールドの描画
    public draw(cvs: Canvas, offsetX: number = 0, offsetY:number = 0, cellSize: number = 3){
        let width = this.width;
        let height = this.height;
        let drawField = this.drawField;
        let length = this.drawField.length;
        cvs.ctx.fillStyle = "#000";
        cvs.ctx.fillRect(offsetX - 1 , offsetY - 1, cellSize * width + 1, cellSize * height + 1);
        for(let i = 0; i < length; ++i) {
            let x = i % width;
            let y = Math.floor(i / width);
            let color = block_colors[drawField[i]];
            cvs.ctx.fillStyle = color;
            cvs.ctx.fillRect(
                offsetX + x * cellSize,
                offsetY + y * cellSize,
                cellSize - 2 , // cellSize - n とすることで背景色が見えるようにし、枠線を表現する
                cellSize - 2 );
        }
    }
}


//ゲームの進行を管理・更新するクラス
class Game {

    static FIELD_SIZE_WIDTH = 10;
    static FIELD_SIZE_HEIGHT = 20;
    static CANVAS_WIDTH = 640;
    static CANVAS_HEIGHT = 640;
    static BLOCK_SIZE = 5;
    static OFFSET_X = 10;
    static OFFSET_Y = 10;

    constructor(){}
    private frame = 0; // ブロックが落下し始めてからのフレーム数
    private blockX: number = 2; // 現在落下中のブロックのX座標
    private blockY: number = -2; // 現在落下中のブロックのY座標
    private fallBlock: Block = null; // 現在落下中のブロック
    public canvas: Canvas; // 描画するcanvas
    private tetris: Tetris; // テトリスのシステム
    private fallIntervalFrames = 60; // 落下間隔
    private groundFrames = 0; // 地面に触れてからのフレーム数
    //private next: Tetris;  // NEXT表示用のテトリスフィールド

    private keyMng: KeyManager ;

    private blockFactory: BlockFactory;

    // private keys: Array<number>;
    // private pressedKeys: Array<boolean>;

    public init() {
        this.canvas = new Canvas("main", Game.CANVAS_WIDTH, Game.CANVAS_HEIGHT);
        this.tetris = new Tetris(Game.FIELD_SIZE_WIDTH, Game.FIELD_SIZE_HEIGHT);
        this.blockFactory = new BlockFactory(Game.BLOCK_SIZE);
        this.blockFactory.genList();

        this.keyMng = new KeyManager();
    }

    public update() {
        if(this.groundFrames >= 1) {
            this.groundFrames ++;
        }
        // nフレームに一回ブロックを1マス落下させる
        if(this.frame % this.fallIntervalFrames == 0 || this.groundFrames > this.fallIntervalFrames ) { 
            if(!this.tetris.putBlock(this.blockX, this.blockY + 1, this.fallBlock)) {
                ++this.groundFrames; // 設置するまでの遊びを加算
                if(this.groundFrames >= this.fallIntervalFrames) {
                    //落下後にもしそのマスにおけなかったら、その座標にブロックを設置する
                    this.tetris.putBlock(this.blockX, this.blockY, this.fallBlock, true);
                    this.fallBlock = null;
                    this.frame = 0;
                    this.blockX = 2;
                    this.blockY = -1;
                }
            }
            else {
                this.blockY++;
                this.groundFrames = 0;
            }
        }
        // 落下中ブロックがなかったらNEXTから取り出し
        if(this.fallBlock == null) {
            this.fallBlock = this.blockFactory.next();
            //ゲームオーバー処理     
            if(!this.tetris.putBlock(this.blockX, this.blockY, this.fallBlock)) {
                this.init();
            }        
        }
        this.keyMng.updateKeys();

        let keys = this.keyMng.keys;

        //Z
        if(keys[90] == 1) {
            this.fallBlock.rightRotate();
            if(!this.tetris.putBlock(this.blockX, this.blockY, this.fallBlock)) {
                this.fallBlock.leftRotate();
            }
        //X
        } else if(keys[88] == 1){
            this.fallBlock.leftRotate();
            if(!this.tetris.putBlock(this.blockX, this.blockY, this.fallBlock)) {
                this.fallBlock.rightRotate();
            }
        }

        //RIGHT
        if(keys[39] == 1 || keys[39] >= 15) {
            let x = this.blockX + 1;
            if(this.tetris.putBlock(x, this.blockY, this.fallBlock)) {
                this.blockX = x;
            }
        //LEFT
        } else if(keys[37] == 1 || keys[37] >= 15) {
            let x = this.blockX - 1;
            if(this.tetris.putBlock(x, this.blockY, this.fallBlock)) {
                this.blockX = x;
            }
        }
        //DOWN 
        if(keys[40] == 1 || keys[40] >= 15) {
            let y = this.blockY + 1;
            if(this.tetris.putBlock(this.blockX, y, this.fallBlock)) {
                this.blockY = y;
            }
            else if(keys[40] == 1) {
                this.groundFrames = this.fallIntervalFrames;
                console.log("put");
            }
        }
        // UP
        if(keys[38] == 1) {
            while(this.tetris.putBlock(this.blockX, this.blockY + 1, this.fallBlock)){
                this.blockY++;
            }
            this.groundFrames = this.fallIntervalFrames;
        }
        // 落下ブロックを表示
        this.tetris.putBlock(this.blockX, this.blockY, this.fallBlock)
        // eraseLineといいつつチェックも行っている
        this.tetris.eraseLine();
        setTimeout( () => { // 描画は負荷が高いので別スレッドで行う
            let cvs = this.canvas;
            cvs.ctx.clearRect(0, 0, cvs.width, cvs.height);
            this.tetris.draw(cvs, Game.OFFSET_X, Game.OFFSET_Y, 30);
            DrawBlocks.draw(cvs, this.blockFactory.nextList, Game.OFFSET_X + 300, 0, 15);
            cvs.ctx.font = "40px";
            cvs.ctx.fillStyle = "#000000"
            cvs.ctx.fillText(this.frame + "f", 500,10);
        }, 0);
        ++this.frame;
    }
}

// fps表示制御用
var oldTime = 0;
var lastFpsUpdTime = 0;
var fps = 0;
var count = 1;

window.onload = ()=> {
    game = new Game();
    game.init();
    let task = ()=> {
        let st = new Date().getTime();
        game.update();  
        let en = new Date().getTime();

        if(st - lastFpsUpdTime >= 500) {
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