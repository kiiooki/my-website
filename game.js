"use strict";

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- 全局配置与状态 ---
const CELL_SIZE = 50;
const cols = canvas.width / CELL_SIZE;
const rows = canvas.height / CELL_SIZE;

let gameState = 'START'; // 'START', 'PLAYING', 'GAMEOVER'
let gold = 150;
let lives = 5;
let wave = 1;
let frames = 0;

let enemies = [];
let turrets = [];
let projectiles = [];
let grid = []; // 存储地图网格的二维数组
let hoverGridX = -1; // 记录鼠标悬停的网格X
let hoverGridY = -1; // 记录鼠标悬停的网格Y
let particles = [];
let floatingTexts = [];

// 简单的寻路路径 (网格坐标)
const path = [
    { x: 0, y: 2 }, { x: 4, y: 2 }, 
    { x: 4, y: 5 }, { x: 2, y: 5 }, { x: 2, y: 8 }, // 增加了一个 S 形弯道
    { x: 8, y: 8 }, { x: 8, y: 3 }, 
    { x: 12, y: 3 }, { x: 12, y: 7 }, { x: 15, y: 7 }
];
// --- 新增：网格初始化系统 ---
function initMapGrid() {
    grid = [];
    // 1. 初始化全为 0 (空地)
    for (let y = 0; y < rows; y++) {
        let row = [];
        for (let x = 0; x < cols; x++) {
            row.push(0);
        }
        grid.push(row);
    }

    // 2. 将道路标记为 1
    for (let i = 0; i < path.length - 1; i++) {
        let p1 = path[i];
        let p2 = path[i + 1];
        
        let minX = Math.min(p1.x, p2.x);
        let maxX = Math.max(p1.x, p2.x);
        let minY = Math.min(p1.y, p2.y);
        let maxY = Math.max(p1.y, p2.y);

        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                if (grid[y] && grid[y][x] !== undefined) {
                    grid[y][x] = 1; 
                }
            }
        }
    }
}

// --- 基础类定义 ---
// ==================== 1. 敌人基类与派生类 ====================
class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.pathIndex = 0;
        this.slowTimer = 0; 
        
        // 基础属性 (子类会覆盖这些)
        this.baseSpeed = 1.0;
        this.speed = this.baseSpeed;
        this.maxHealth = 80;
        this.health = this.maxHealth;
        this.value = 15;     // 击杀金币
        this.radius = 15;    // 绘制大小
        this.color = '#e74c3c'; // 默认红色
    }

    applySlow(factor, duration) {
        this.speed = this.baseSpeed * factor;
        this.slowTimer = duration;
    }

    update() {
        if (this.slowTimer > 0) {
            this.slowTimer--;
            if (this.slowTimer <= 0) this.speed = this.baseSpeed;
        }

        const target = path[this.pathIndex + 1];
        if (!target) return;

        const targetX = target.x * CELL_SIZE + CELL_SIZE / 2;
        const targetY = target.y * CELL_SIZE + CELL_SIZE / 2;
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.hypot(dx, dy);

        if (distance < this.speed) {
            this.x = targetX;
            this.y = targetY;
            this.pathIndex++;
            if (this.pathIndex >= path.length - 1) {
                lives--;
                updateUI();
                this.health = 0; 
            }
        } else {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y); // 把坐标系原点移动到怪物中心

        // 调用各个子类自己定义的绘制形状方法
        this.drawShape(); 
        
        ctx.restore(); // 恢复坐标系

        // 绘制血条 (根据半径动态调整位置)
        const barWidth = this.radius * 2;
        const barY = this.y - this.radius - 10;
        ctx.fillStyle = 'black';
        ctx.fillRect(this.x - this.radius, barY, barWidth, 4);
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(this.x - this.radius, barY, barWidth * (Math.max(0, this.health) / this.maxHealth), 4);
    }

    // 基础怪：带眼睛的史莱姆圆球
    drawShape() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'white';
        ctx.beginPath(); ctx.arc(-5, -4, 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(5, -4, 3, 0, Math.PI*2); ctx.fill();

        ctx.fillStyle = 'black';
        ctx.beginPath(); ctx.arc(-5, -4, 1.5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(5, -4, 1.5, 0, Math.PI*2); ctx.fill();
    }
}

// 派生类：敏捷型敌人 (移速极快，血少)
class FastEnemy extends Enemy {
    constructor(x, y, waveMultiplier) {
        super(x, y);
        this.baseSpeed = 2.5; 
        this.speed = this.baseSpeed;
        this.maxHealth = 50 * waveMultiplier; 
        this.health = this.maxHealth;
        this.value = 5;
        this.radius = 15; // 体型较小
        this.color = '#f1c40f'; // 黄色
    }

    drawShape() {
        ctx.fillStyle = this.color;
        ctx.beginPath();

        ctx.moveTo(0, -this.radius); 
        ctx.lineTo(this.radius, this.radius);
        ctx.lineTo(0, this.radius - 4); // 尾部凹进去
        ctx.lineTo(-this.radius, this.radius);
        ctx.closePath();
        ctx.fill();
    }
}

// 派生类：重装型敌人 (移速慢，血极厚，稍微抵抗减速)
class TankEnemy extends Enemy {
    constructor(x, y, waveMultiplier) {
        super(x, y);
        this.baseSpeed = 0.8; 
        this.speed = this.baseSpeed;
        this.maxHealth = 300 * waveMultiplier; 
        this.health = this.maxHealth;
        this.value = 30;
        this.radius = 20; // 体型较大
        this.color = '#7f8c8d'; // 灰色
    }

    drawShape() {
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.radius, -this.radius, this.radius*2, this.radius*2);
    
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 4;
        ctx.strokeRect(-this.radius, -this.radius, this.radius*2, this.radius*2);
        
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(-5, -5, 10, 10);
    }

    // 重写减速逻辑：坦克对冰冻有一定的抗性 (持续时间减半)
    applySlow(factor, duration) {
        super.applySlow(factor, Math.floor(duration / 2));
    }
}

// 派生类：Boss (综合极强)
class BossEnemy extends Enemy {
    constructor(x, y, waveMultiplier) {
        super(x, y);
        this.baseSpeed = 1.0; 
        this.speed = this.baseSpeed;
        this.maxHealth = 1000 * waveMultiplier; 
        this.health = this.maxHealth;
        this.value = 80;
        this.radius = 30; // 巨大体型
        this.color = '#8e44ad'; // 深紫色
    }

    drawShape() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        const points = 8;
        for (let i = 0; i < points * 2; i++) {
            let angle = (i * Math.PI) / points;
            // 奇数点在内圈，偶数点在外圈
            let r = (i % 2 === 0) ? this.radius : this.radius * 0.5;
            let px = Math.cos(angle) * r;
            let py = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        
        // Boss的发光核心
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ==================== 2. 防御塔基类 ====================
class Turret {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.level = 1;
        this.maxLevel = 3;
        this.name = "基础塔";
        
        // 基础属性 (子类会覆盖)
        this.range = 120;
        this.damage = 25;
        this.cooldown = 60;
        this.timer = 0;
        
        // 经济属性
        this.cost = 50;
        this.upgradeCost = 50;
        this.sellPrice = 25;
        
        this.color = '#3498db'; // 蓝色
    }

    update() {
        this.timer++;
        if (this.timer >= this.cooldown) {
            let target = this.findTarget();
            if (target) {
                this.shoot(target);
                this.timer = 0;
            }
        }
    }

    findTarget() {
        // 优先攻击距离终点最近的敌人 (这里简单用距离塔最近做演示)
        let closest = null;
        let minFist = this.range;
        for (let e of enemies) {
            let dist = Math.hypot(e.x - this.x, e.y - this.y);
            if (dist <= minFist) {
                minFist = dist;
                closest = e;
            }
        }
        return closest;
    }

    shoot(target) {
        projectiles.push(new Projectile(this.x, this.y, target, this.damage, 'normal'));
    }

    upgrade() {
        if (this.level < this.maxLevel && gold >= this.upgradeCost) {
            gold -= this.upgradeCost;
            this.level++;
            this.damage += 15;
            this.range += 10;
            this.sellPrice += Math.floor(this.upgradeCost * 0.5);
            this.upgradeCost = Math.floor(this.upgradeCost * 1.5);
            return true;
        }
        return false;
    }

    draw(isHovered, isSelected) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - 20, this.y - 20, 40, 40);
        
        // 画等级标记
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText("Lv." + this.level, this.x - 12, this.y + 4);

        // 如果被鼠标悬停或被选中，显示攻击范围
        if (isHovered || isSelected) {
            ctx.strokeStyle = isSelected ? 'rgba(46, 204, 113, 0.5)' : 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
            ctx.stroke();
            ctx.lineWidth = 1;
        }
    }
}

// ==================== 3. 派生类：狙击塔 ====================
class SniperTurret extends Turret {
    constructor(x, y) {
        super(x, y); // 调用父类构造函数
        this.name = "狙击塔";
        this.range = 250;     // 射程极远
        this.damage = 80;     // 伤害极高
        this.cooldown = 120;  // 攻速很慢
        
        this.cost = 100;
        this.upgradeCost = 100;
        this.sellPrice = 50;
        this.color = '#9b59b6'; // 紫色
    }

    upgrade() {
        if (super.upgrade()) {
            this.damage += 40; // 狙击塔升级加巨量伤害
            this.range += 30;
            return true;
        }
        return false;
    }
}

// ==================== 4. 派生类：冰冻塔 ====================
class FrostTurret extends Turret {
    constructor(x, y) {
        super(x, y);
        this.name = "冰冻塔";
        this.range = 100;
        this.damage = 5;      // 几乎无伤害
        this.cooldown = 30;   // 攻击极快，保持减速
        
        this.cost = 80;
        this.upgradeCost = 60;
        this.sellPrice = 40;
        this.color = '#00cec9'; // 青蓝色
    }

    shoot(target) {
        // 发射类型为 'frost' 的子弹
        projectiles.push(new Projectile(this.x, this.y, target, this.damage, 'frost'));
    }

    upgrade() {
        if (super.upgrade()) {
            this.range += 20; // 冰冻塔升级主要加范围
            return true;
        }
        return false;
    }
}

class Projectile {
    constructor(x, y, target, damage, type = 'normal') {
        this.x = x;
        this.y = y;
        this.target = target;
        this.damage = damage;
        this.speed = 5;
        this.active = true;
        this.type = type; // 【新增】保存当前子弹的类型
    }

    update() {
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const distance = Math.hypot(dx, dy);

        if (distance < this.speed) {
            this.target.health -= this.damage;
            let textColor = this.damage > 50 ? '#ff9f43' : '#e74c3c'; // 暴击(狙击塔)显示橙色，普通显示红色
            floatingTexts.push(new FloatingText(this.target.x, this.target.y, `-${this.damage}`, textColor));

            for(let p = 0; p < 8; p++) {
                particles.push(new Particle(this.target.x, this.target.y, this.target.color));
            }

            if (this.type === 'frost') {
                this.target.applySlow(0.5, 60); // 速度减半，持续 60 帧
            }
            this.active = false;
        } else {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }
    }

    draw() {
        ctx.fillStyle = this.type === 'frost' ? '#00cec9' : 'yellow';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ==================== 2. 波次管理器 ====================
class WaveManager {
    constructor() {
        this.currentWaveIndex = 0;
        this.spawnQueue = []; // 当前波次等待生成的敌人队列
        this.framesSinceLastSpawn = 0;
        this.isWaveActive = false;
        this.waveDelayTimer = 90; // 波次之间的休息时间 (180帧 ≈ 3秒)

        // 【波次配置字典】 游戏关卡难度设计
        // type: 敌人类型; count: 数量; interval: 生成间隔(帧，60帧约等于1秒)
        this.wavesConfig = [
            { // 第一关：操作练习。只有4个走得极慢的普通怪
        enemies: [{ type: 'basic', count: 4, interval: 100 }]
    },
    { // 第二关：基本阵线。普通怪增加，加入少量快跑怪
        enemies: [
            { type: 'basic', count: 8, interval: 60 },
            { type: 'fast', count: 3, interval: 80 }
        ]
    },
    { // 第三关：肉盾初现。引入坦克怪，必须建造狙击塔或升级基础塔
        enemies: [
            { type: 'basic', count: 6, interval: 50 },
            { type: 'tank', count: 2, interval: 120 }
        ]
    },
    { // 第四关：速度挑战。大量快跑怪冲锋，必须配合冰冻塔减速
        enemies: [
            { type: 'fast', count: 15, interval: 35 },
            { type: 'basic', count: 5, interval: 50 }
        ]
    },
    { // 第五关：混合攻势。高密度敌人，考验防线综合火力
        enemies: [
            { type: 'tank', count: 5, interval: 80 },
            { type: 'fast', count: 10, interval: 40 },
            { type: 'basic', count: 10, interval: 40 }
        ]
    },
    { // 第六关：最终决战。BOSS带着大军压境
        enemies: [
            { type: 'boss', count: 1, interval: 0 },
            { type: 'tank', count: 4, interval: 100 },
            { type: 'fast', count: 15, interval: 30 }
        ]
    }
        ];
    }

    // 解析当前波次配置，装载到生成队列中
    startWave() {
        if (this.currentWaveIndex >= this.wavesConfig.length) {
            return; // 已经通关了
        }

        const config = this.wavesConfig[this.currentWaveIndex];
        this.spawnQueue = [];
        
        // 将配置转化为一维队列
        for (let group of config.enemies) {
            for (let i = 0; i < group.count; i++) {
                this.spawnQueue.push({
                    type: group.type,
                    interval: group.interval
                });
            }
        }
        
        this.isWaveActive = true;
        this.framesSinceLastSpawn = 9999;
        
        // 同步更新全局变量和 UI
        wave = this.currentWaveIndex + 1;
        updateUI();
    }

    update() {
        // 如果当前波次没开始，处理波次间歇的倒计时
        if (!this.isWaveActive) {
            // 只有当场上没怪了，才开始倒计时
            if (enemies.length === 0) {
                this.waveDelayTimer--;
                if (this.waveDelayTimer <= 0) {
                    this.startWave();
                    this.waveDelayTimer = 180; // 重置休息时间供下一波使用
                }
            }
            return;
        }

        // 如果队列里还有怪要出
        if (this.spawnQueue.length > 0) {
            this.framesSinceLastSpawn++;
            let nextSpawn = this.spawnQueue[0];

            if (this.framesSinceLastSpawn >= nextSpawn.interval) {
                this.spawnEnemy(nextSpawn.type);
                this.spawnQueue.shift(); // 移除已生成的怪
                this.framesSinceLastSpawn = 0;
            }
        } 
        // 如果队列空了，且场上的怪都被清光了，说明当前波次结束
        else if (enemies.length === 0) {
            this.isWaveActive = false;
            this.currentWaveIndex++;
            gold += 100; // 过关奖励
            
            // 检查是否通关
            if (this.currentWaveIndex >= this.wavesConfig.length) {
                gameState = 'VICTORY';
                document.getElementById('game-over-title').innerText = "你赢了！防守成功！";
                document.getElementById('final-wave').innerText = "全部";
                document.getElementById('game-over-menu').classList.add('active');
            }
        }
    }

    spawnEnemy(type) {
        const startX = path[0].x * CELL_SIZE + CELL_SIZE / 2;
        const startY = path[0].y * CELL_SIZE + CELL_SIZE / 2;
        const waveMultiplier = 1 + (this.currentWaveIndex * 0.4); // 怪物血量随波次膨胀

        let newEnemy;
        switch(type) {
            case 'fast': newEnemy = new FastEnemy(startX, startY, waveMultiplier); break;
            case 'tank': newEnemy = new TankEnemy(startX, startY, waveMultiplier); break;
            case 'boss': newEnemy = new BossEnemy(startX, startY, waveMultiplier); break;
            default: newEnemy = new Enemy(startX, startY); 
                     newEnemy.maxHealth = 100 * waveMultiplier;
                     newEnemy.health = newEnemy.maxHealth;
                     break;
        }
        enemies.push(newEnemy);
    }
}

    // ==================== 粒子系统 ====================
// 1. 碎片粒子类
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        // 随机爆炸方向和速度
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = 1.0; // 生命周期 1.0 到 0
        this.decay = Math.random() * 0.03 + 0.02; // 衰减速度
        this.size = Math.random() * 4 + 2; // 随机大小
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life); // 透明度逐渐降低
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.restore();
    }
}

// 2. 伤害数字漂浮类
class FloatingText {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 1.0;
        this.vy = -1; // 向上漂浮
    }
    update() {
        this.y += this.vy;
        this.life -= 0.02;
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.font = 'bold 16px Arial';
        // 添加文字黑边让数字更清晰
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.strokeText(this.text, this.x - 10, this.y);
        ctx.fillText(this.text, this.x - 10, this.y);
        ctx.restore();
    }
}

// ==================== 成就系统 ====================
class AchievementManager {
    constructor() {
        this.achievements = [
            { id: 'first_blood', title: "第一滴血", desc: "击杀你的第一个敌人", condition: () => this.stats.kills >= 1, unlocked: false },
            { id: 'tower_builder', title: "基建狂魔", desc: "在一局游戏中建造 8 座防御塔", condition: () => this.stats.towersBuilt >= 8, unlocked: false },
            { id: 'rich_man', title: "大富翁", desc: "累计获得 600 金币", condition: () => this.stats.totalGold >= 600, unlocked: false },
            { id: 'boss_killer', title: "斩首行动", desc: "成功击杀一只 Boss 怪", condition: () => this.stats.bossKills >= 1, unlocked: false }
        ];
        this.stats = { kills: 0, towersBuilt: 0, totalGold: 150, bossKills: 0 };
        this.toastQueue = []; // 待显示的成就提示队列
        this.currentToast = null;
        this.toastTimer = 0;
    }

    // 记录各种数据的方法（供其他类调用）
    addKill(enemyType) {
        this.stats.kills++;
        if (enemyType === 'boss') this.stats.bossKills++;
        this.checkAchievements();
    }

    addGold(amount) {
        this.stats.totalGold += amount;
        this.checkAchievements();
    }

    addTower() {
        this.stats.towersBuilt++;
        this.checkAchievements();
    }

    checkAchievements() {
        for (let a of this.achievements) {
            if (!a.unlocked && a.condition()) {
                a.unlocked = true;
                this.toastQueue.push(a);
            }
        }
    }

    update() {
        if (!this.currentToast && this.toastQueue.length > 0) {
            this.currentToast = this.toastQueue.shift();
            this.toastTimer = 420; // 提示框显示 3 秒 (180帧)
            this.toastY = -60; // 从屏幕外往下滑的初始位置
        }

        if (this.currentToast) {
            this.toastTimer--;
            // 进场动画
            if (this.toastTimer > 390 && this.toastY < 20) this.toastY += 5;
            // 退场动画
            if (this.toastTimer < 30) this.toastY -= 5;
            
            if (this.toastTimer <= 0) {
                this.currentToast = null;
            }
        }
    }

    draw() {
        if (this.currentToast) {
            ctx.save();

            // 画弹窗背景
            const boxWidth = 300;
            const boxHeight = 60;
            const startX = canvas.width / 2 - boxWidth / 2;
            ctx.fillStyle = '#f39c12';
            ctx.beginPath();
            ctx.roundRect(startX, this.toastY, boxWidth, boxHeight, 10); // 需要较新的浏览器支持 roundRect
            ctx.fill();

            // 画文字
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.font = 'bold 18px Arial';
            ctx.fillText("🏆 达成成就: " + this.currentToast.title, canvas.width / 2, this.toastY + 25);
            ctx.font = '14px Arial';
            ctx.fillText(this.currentToast.desc, canvas.width / 2, this.toastY + 45);
            ctx.restore();
        }
    }
}

// 实例化全局管理器 addEventListener
let waveManager = new WaveManager();
let achievementManager = new AchievementManager();

// --- 游戏核心逻辑 ---
function drawPath() {
    ctx.strokeStyle = '#bdc3c7';
    ctx.lineWidth = CELL_SIZE;
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';
    ctx.beginPath();
    for (let i = 0; i < path.length; i++) {
        let px = path[i].x * CELL_SIZE + CELL_SIZE / 2;
        let py = path[i].y * CELL_SIZE + CELL_SIZE / 2;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.lineWidth = 1; // 恢复
}

function handleEnemies() {

    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].update();
        enemies[i].draw();

        if (enemies[i].health <= 0) {
            if (enemies[i].pathIndex < path.length - 1) {
                gold += enemies[i].value; 
                let enemyType = (enemies[i] instanceof BossEnemy) ? 'boss' : 'normal';
                achievementManager.addKill(enemyType);
                achievementManager.addGold(enemies[i].value); // 顺便把累积金币成就也加上
                updateUI();
            }
            enemies.splice(i, 1);
        }
    }
}

function handleTurrets() {
    turrets.forEach(turret => {
        turret.update();
        turret.draw();
    });
}

function handleProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        projectiles[i].update();
        projectiles[i].draw();
        if (!projectiles[i].active) {
            projectiles.splice(i, 1);
        }
    }
}

function checkGameOver() {
    if (lives <= 0) {
        gameState = 'GAMEOVER';
        document.getElementById('final-wave').innerText = wave;
        document.getElementById('game-over-title').innerText = "战败：基地已沦陷";
        showUIPanel('game-over-menu'); // 弹出结算界面
    }
}

// --- 3. 出售功能与网格释放 ---
function handleSell() {
    if (selectedTurret) {
        // 1. 退钱 (全额退款)
        gold += selectedTurret.cost; 
        
        // 2. 释放网格：将坐标转换回网格索引，设为 0
        const gx = Math.floor(selectedTurret.x / CELL_SIZE);
        const gy = Math.floor(selectedTurret.y / CELL_SIZE);
        grid[gy][gx] = 0; 

        // 3. 从数组中移除这座塔
        turrets = turrets.filter(t => t !== selectedTurret);
        
        // 4. 清理 UI
        selectedTurret = null;
        document.getElementById('turret-panel').style.display = 'none';
        updateUI();
    }
}

// --- 全局交互状态 ---
let hoveredTurret = null;
let selectedTurret = null;
let currentBuildType = 'basic'; // 'basic', 'sniper', 'frost'

const turretPanel = document.getElementById('turret-panel');

// 1. 建造类型选择
document.querySelectorAll('.build-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.build-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentBuildType = e.target.id.split('-')[1]; // 取出 'basic', 'sniper' 或 'frost'
    });
});

// 2. 鼠标移动：检测悬停 (Hover) 与 网格预览
canvas.addEventListener('mousemove', (e) => {
    if (gameState !== 'PLAYING') return;
    const { x, y } = getMousePos(canvas, e);

    hoveredTurret = null; 
    
    for (let turret of turrets) {
        if (x > turret.x - 20 && x < turret.x + 20 && 
            y > turret.y - 20 && y < turret.y + 20) {
            hoveredTurret = turret;
            break;
        }
    }

    // 【新增】如果鼠标没有悬停在现有的塔上，则计算悬停的网格坐标
    if (!hoveredTurret) {
        hoverGridX = Math.floor(x / CELL_SIZE);
        hoverGridY = Math.floor(y / CELL_SIZE);
    } else {
        hoverGridX = -1;
        hoverGridY = -1;
    }
});

// 获取准确的鼠标 Canvas 坐标
function getMousePos(canvas, evt) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

// 3. 鼠标点击：选中/取消选中 或 建造
canvas.addEventListener('click', (e) => {
    if (gameState !== 'PLAYING') return;
    const { x, y } = getMousePos(canvas, e);

    // 情况 A：鼠标悬停在某座塔上 -> 选中它，弹出面板
    if (hoveredTurret) {
        selectedTurret = hoveredTurret;
        showTurretPanel(selectedTurret, e.clientX, e.clientY);
        return; // 【关键】直接返回，绝不执行下面的建造逻辑
    }

    if (selectedTurret) {
        selectedTurret = null;
        document.getElementById('turret-panel').style.display = 'none';
        return;
    }

    // 情况 C：建造逻辑 (只有在没点中塔的情况下才会走到这里)
    const gridX = Math.floor(x / CELL_SIZE);
    const gridY = Math.floor(y / CELL_SIZE);

    if (gridX < 0 || gridX >= cols || gridY < 0 || gridY >= rows) return;
    if (grid[gridY][gridX] !== 0) return; // 不是空地不能建

    let cost = currentBuildType === 'sniper' ? 100 : (currentBuildType === 'frost' ? 80 : 50);
    if (gold >= cost) {
        gold -= cost;
        const centerPosX = gridX * CELL_SIZE + CELL_SIZE / 2;
        const centerPosY = gridY * CELL_SIZE + CELL_SIZE / 2;
        
        if (currentBuildType === 'sniper') turrets.push(new SniperTurret(centerPosX, centerPosY));
        else if (currentBuildType === 'frost') turrets.push(new FrostTurret(centerPosX, centerPosY));
        else turrets.push(new Turret(centerPosX, centerPosY));

        grid[gridY][gridX] = 2; // 标记被占用

        achievementManager.addTower();
        updateUI();
    }
});

// 4. 更新面板信息
// 智能弹出面板：自动判断边界，防止跑到屏幕外面
function showTurretPanel(turret) { // 【注意】去掉了 mouseX 和 mouseY 参数
    turretPanel.style.display = 'block';

    // 基础位置：塔的正上方
    let panelX = turret.x;
    let panelY = turret.y - 70;

    // 【智能边界保护】：假设画布是 800x600，面板宽度约150px
    if (panelX < 100) panelX = 100; // 防止太靠左被切掉
    if (panelX > 700) panelX = 700; // 防止太靠右被切掉
    
    if (panelY < 80) {
        // 如果塔建在最顶部的边缘，正上方放不下，就把面板弹到塔的“正下方”
        panelY = turret.y + 70;
    }

    // 设置面板位置（相对于画布容器）
    turretPanel.style.left = panelX + 'px';
    turretPanel.style.top = panelY + 'px';

    // 更新面板上的文字内容
    document.getElementById('tp-title').innerText = turret.name;
    document.getElementById('tp-level').innerText = turret.level === turret.maxLevel ? "MAX" : turret.level;
    document.getElementById('tp-sell-price').innerText = turret.sellPrice;
    
    // 满级按钮禁用逻辑
    const btnUp = document.getElementById('btn-upgrade');
    if (turret.level >= turret.maxLevel) {
        btnUp.disabled = true;
        btnUp.innerText = "已满级";
    } else {
        btnUp.disabled = false;
        btnUp.innerHTML = `升级 (<span id="tp-up-cost">${turret.upgradeCost}</span>g)`;
    }
}

// 5. 面板按钮绑定
document.getElementById('btn-upgrade').addEventListener('click', () => {
    if (selectedTurret && selectedTurret.upgrade()) {
        updateUI();
        // 刷新面板数据
        showTurretPanel(selectedTurret, parseInt(turretPanel.style.left), parseInt(turretPanel.style.top));
    }
});

// 【新增】绘制网格预览的方法
function drawBuildPreview() {
    // 确保鼠标在画布范围内
    if (hoverGridX >= 0 && hoverGridX < cols && hoverGridY >= 0 && hoverGridY < rows) {
        const cellValue = grid[hoverGridY][hoverGridX];
        
        // 0是空地(绿)，1是路/2是塔(红)
        ctx.fillStyle = (cellValue === 0) ? 'rgba(46, 204, 113, 0.4)' : 'rgba(231, 76, 60, 0.4)';
        ctx.fillRect(hoverGridX * CELL_SIZE, hoverGridY * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        
        // 画个边框更好看
        ctx.strokeStyle = (cellValue === 0) ? '#2ecc71' : '#e74c3c';
        ctx.strokeRect(hoverGridX * CELL_SIZE, hoverGridY * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
}

// ==================== 6. 修改 draw 循环 ====================
function handleTurrets() {
    turrets.forEach(turret => {
        turret.update();
        // 传入是否被悬停、是否被选中
        turret.draw(turret === hoveredTurret, turret === selectedTurret);
    });
}

// --- UI 与循环 ---
function updateUI() {
    document.getElementById('gold-display').innerText = gold;
    document.getElementById('lives-display').innerText = lives;
    document.getElementById('wave-display').innerText = wave;
}

function resetGame() {
    gold = 150; 
    lives = 5;
    wave = 1;
    frames = 0;
    enemies = [];
    turrets = [];
    projectiles = [];
    initMapGrid();
    waveManager = new WaveManager(); 

    particles = [];
    floatingTexts = []
    
    gameState = 'PLAYING';
    updateUI();
    showUIPanel(null);
    document.getElementById('top-bar').style.display = 'flex';
    document.getElementById('build-menu').style.display = 'flex';
}

function hardReset() {
    // 1. 停止动画循环
    cancelAnimationFrame(animationId);
    particles = [];
    floatingTexts = []

    // 2. 清空所有数组
    enemies = [];
    turrets = [];
    projectiles = [];
    grid = [];
    
    // 3. 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 4. 重置数值
    gold = 150;
    lives = 5;
    wave = 1;
    
    // 5. 初始化网格和UI
    initMapGrid();
    updateUI();
    
    // 6. 隐藏不该出现的UI
    document.getElementById('top-bar').style.display = 'none';
    document.getElementById('build-menu').style.display = 'none';

    achievementManager = new AchievementManager();
}

let animationId; // 新增：用于记录动画的 ID，方便在关闭弹窗时停止游戏

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (gameState === 'PLAYING') {
        drawPath();
        drawBuildPreview();
        handleTurrets();
        handleEnemies();
        handleProjectiles();

        // 【新增】更新并绘制特效
        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            particles[i].draw();
            if (particles[i].life <= 0) particles.splice(i, 1);
        }
        for (let i = floatingTexts.length - 1; i >= 0; i--) {
            floatingTexts[i].update();
            floatingTexts[i].draw();
            if (floatingTexts[i].life <= 0) floatingTexts.splice(i, 1);
        }

        waveManager.update();    
        checkGameOver();
        achievementManager.update();
        achievementManager.draw();
        radarMap.update();
        radarMap.draw();

        frames++;
    }
    
    animationId = requestAnimationFrame(animate);
}

// --- 新增：网页与游戏整合的弹窗交互逻辑 ---
const gameOverlay = document.getElementById('game-modal-overlay');
const btnOpenGame = document.getElementById('btn-open-game'); // 原网页上触发游戏的按钮
const btnCloseGame = document.getElementById('btn-close-game'); // 游戏左上角的关闭按钮

function showUIPanel(panelId) {
    // 隐藏所有面板
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    // 如果传入了具体的 ID，则显示它
    if (panelId) {
        document.getElementById(panelId).classList.add('active');
    }
}

// 1. 在网页点击“玩游戏” -> 打开弹窗
btnOpenGame.addEventListener('click', () => {
    gameOverlay.style.display = 'flex'; // 显示遮罩层
    gameState = 'START'; // 确保进入时是菜单状态
    document.getElementById('start-menu').classList.add('active');
    document.getElementById('game-over-menu').classList.remove('active');
});

// 2. 在弹窗里点击“开始游戏” -> 启动游戏循环
document.getElementById('btn-start').addEventListener('click', () => {
    resetGame();
    showUIPanel(null);
    cancelAnimationFrame(animationId); // 先清理可能存在的旧循环，防止加速
    animate(); // 正式启动游戏画面
});

// 3. 在弹窗里点击“重新开始”
document.getElementById('btn-restart').addEventListener('click', () => {
    resetGame();
    showUIPanel(null);
});

// 4. 点击“关闭游戏” -> 隐藏弹窗并彻底暂停游戏
btnCloseGame.addEventListener('click', () => {
    gameOverlay.style.display = 'none'; // 隐藏遮罩层
    cancelAnimationFrame(animationId); // 停止 Canvas 渲染循环，把电脑性能还给网页
    gameState = 'START'; // 重置为初始状态
    showUIPanel('start-menu');
});

document.getElementById('btn-sell').addEventListener('click', () => {
    if (selectedTurret) {
        // 退钱
        gold += selectedTurret.sellPrice;
        // 释放网格
        const gridX = Math.floor(selectedTurret.x / CELL_SIZE);
        const gridY = Math.floor(selectedTurret.y / CELL_SIZE);
        grid[gridY][gridX] = 0;
        // 移除塔
        turrets = turrets.filter(t => t !== selectedTurret);
        // 清理UI状态
        selectedTurret = null;
        turretPanel.style.display = 'none';
        updateUI();
    }
});

document.getElementById('btn-sell').addEventListener('click', handleSell);

// 新增：点击“结束游戏”，清空画布并返回初始规则界面
document.getElementById('btn-back-to-menu').addEventListener('click', () => {
    // 彻底重置数据，防止后台还在跑
    enemies = [];
    turrets = [];
    projectiles = [];
    cancelAnimationFrame(animationId); 
    ctx.clearRect(0, 0, canvas.width, canvas.height); // 清空游戏画面

    document.getElementById('top-bar').style.display = 'none';
    document.getElementById('build-menu').style.display = 'none';
    
    gameState = 'START';
    showUIPanel('start-menu'); // 显示简报面板
});

document.getElementById('btn-open-game').addEventListener('click', () => {
    hardReset(); // 【关键】进入前先彻底打扫干净
    gameOverlay.style.display = 'flex';
    showUIPanel('start-menu');
});

// ==================== 战术全息雷达系统 ====================
class RadarMinimap {
    constructor() {
        this.width = 160;
        this.height = 120;
        // 将雷达放置在画布的右下角
        this.x = canvas.width - this.width - 20; 
        this.y = canvas.height - this.height - 20; 
        // 坐标映射比例 (将 800x600 缩小到 160x120)
        this.scaleX = this.width / canvas.width;
        this.scaleY = this.height / canvas.height;
        this.scanAngle = 0; // 扫描线当前角度
    }

    update() {
        this.scanAngle += 0.03; // 雷达扫描线旋转速度
        if (this.scanAngle > Math.PI * 2) this.scanAngle = 0;
    }

    draw() {
        ctx.save();
        
        // 1. 画出雷达的半透明科技感底座
        ctx.fillStyle = 'rgba(255, 197, 197, 0.7)';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeStyle = '#fca3ced1'; 
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        // 2. 【高级技巧：区域剪裁】确保雷达里的内容不会画到框外面
        ctx.beginPath();
        ctx.rect(this.x, this.y, this.width, this.height);
        ctx.clip();

        // 3. 映射并画出敌人的行进道路
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.69)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < path.length; i++) {
            // 将真实坐标乘以 scale 转换为雷达上的微缩坐标
            let mapX = this.x + (path[i].x * CELL_SIZE + CELL_SIZE / 2) * this.scaleX;
            let mapY = this.y + (path[i].y * CELL_SIZE + CELL_SIZE / 2) * this.scaleY;
            if (i === 0) ctx.moveTo(mapX, mapY);
            else ctx.lineTo(mapX, mapY);
        }
        ctx.stroke();

        // 4. 画出防御塔 (青色小方块)
        ctx.fillStyle = '#ff79b8';
        for (let t of turrets) {
            let mapX = this.x + t.x * this.scaleX;
            let mapY = this.y + t.y * this.scaleY;
            ctx.fillRect(mapX - 2, mapY - 2, 4, 4);
        }

        // 5. 画出敌人 (红色圆点，并利用 Math.sin 让其产生呼吸闪烁效果)
        let alpha = 0.5 + Math.abs(Math.sin(frames * 0.1)) * 0.5;
        ctx.fillStyle = `rgba(255, 50, 50, ${alpha})`;
        for (let e of enemies) {
            let mapX = this.x + e.x * this.scaleX;
            let mapY = this.y + e.y * this.scaleY;
            ctx.beginPath();
            ctx.arc(mapX, mapY, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // 6. 画出雷达的扇形扫描光束
        let centerX = this.x + this.width / 2;
        let centerY = this.y + this.height / 2;
        let scanRadius = Math.max(this.width, this.height);
        
        // 扫描光束渐变色
        let gradient = ctx.createLinearGradient(
            centerX, centerY, 
            centerX + Math.cos(this.scanAngle) * scanRadius, 
            centerY + Math.sin(this.scanAngle) * scanRadius
        );
        gradient.addColorStop(0, 'rgba(0, 255, 204, 0)');
        gradient.addColorStop(1, 'rgba(255, 23, 185, 0.3)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        // 画出一个约 30 度的扇形
        ctx.arc(centerX, centerY, scanRadius, this.scanAngle - 0.5, this.scanAngle);
        ctx.closePath();
        ctx.fill();

        ctx.restore(); // 结束剪裁和样式重置
    }
}
let radarMap = new RadarMinimap();