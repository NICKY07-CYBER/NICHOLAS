import { FighterState, GROUND_Y, GRAVITY, FighterConfig, CANVAS_WIDTH } from '../constants';

export interface Hitbox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class Fighter {
  x: number;
  y: number;
  width: number = 60;
  height: number = 130;
  velocityX: number = 0;
  velocityY: number = 0;
  health: number;
  maxHealth: number;
  state: FighterState = FighterState.IDLE;
  isGrounded: boolean = false;
  facing: 'left' | 'right' = 'right';
  config: FighterConfig;
  
  animationFrame: number = 0;
  animationTimer: number = 0;
  stateTimer: number = 0;
  
  specialPower: number = 0;
  maxSpecialPower: number = 100;
  
  lastHurtTime: number = 0;
  isBlocking: boolean = false;
  
  attackHitbox: Hitbox | null = null;
  hasHitInCurrentState: boolean = false;

  constructor(x: number, config: FighterConfig, facing: 'left' | 'right' = 'right') {
    this.x = x;
    this.y = GROUND_Y - this.height;
    this.config = config;
    this.health = config.health;
    this.maxHealth = config.health;
    this.facing = facing;
  }

  update(opponentX: number) {
    // Basic physics
    this.velocityY += GRAVITY;
    this.y += this.velocityY;
    this.x += this.velocityX;

    // Ground collision
    if (this.y + this.height > GROUND_Y) {
      this.y = GROUND_Y - this.height;
      this.velocityY = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }

    // Wall collision
    if (this.x < 0) this.x = 0;
    if (this.x + this.width > CANVAS_WIDTH) this.x = CANVAS_WIDTH - this.width;

    // State logic
    if (this.stateTimer > 0) {
      this.stateTimer--;
      if (this.stateTimer === 0) {
        this.state = this.isGrounded ? FighterState.IDLE : FighterState.JUMP;
        this.attackHitbox = null;
        this.hasHitInCurrentState = false;
      }
    }

    // Auto-face opponent if idle or moving
    if ([FighterState.IDLE, FighterState.WALK, FighterState.JUMP].includes(this.state)) {
      this.facing = this.x < opponentX ? 'right' : 'left';
    }

    // Friction
    if (this.isGrounded && this.state !== FighterState.WALK) {
      this.velocityX *= 0.8;
    }

    this.animationTimer++;
  }

  move(dir: number) {
    if ([FighterState.IDLE, FighterState.WALK, FighterState.JUMP].includes(this.state)) {
      this.velocityX = dir * this.config.speed;
      if (this.isGrounded && dir !== 0) {
        this.state = FighterState.WALK;
      } else if (this.isGrounded && dir === 0) {
        this.state = FighterState.IDLE;
      }
    }
  }

  jump() {
    if (this.isGrounded && this.state !== FighterState.BLOCK) {
      this.velocityY = -16;
      this.state = FighterState.JUMP;
      this.isGrounded = false;
    }
  }

  block(isBlocking: boolean) {
    if (this.isGrounded && [FighterState.IDLE, FighterState.WALK, FighterState.BLOCK].includes(this.state)) {
      this.isBlocking = isBlocking;
      this.state = isBlocking ? FighterState.BLOCK : FighterState.IDLE;
      if (isBlocking) this.velocityX = 0;
    }
  }

  punch() {
    if (this.canAttack()) {
      this.state = FighterState.PUNCH;
      this.stateTimer = 20;
      this.velocityX = this.facing === 'right' ? 2 : -2;
      this.setupAttackHitbox(40, 30, 40, 20);
    }
  }

  kick() {
    if (this.canAttack()) {
      this.state = FighterState.KICK;
      this.stateTimer = 25;
      this.velocityX = this.facing === 'right' ? 3 : -3;
      this.setupAttackHitbox(50, 60, 45, 20);
    }
  }
  
  specialMove() {
     if (this.specialPower >= 100 && this.canAttack()) {
        this.specialPower = 0;
        this.state = FighterState.SPECIAL;
        this.stateTimer = 40;
        this.velocityX = this.facing === 'right' ? 10 : -10;
        this.setupAttackHitbox(60, 40, 60, 50);
     }
  }

  canAttack() {
    return [FighterState.IDLE, FighterState.WALK, FighterState.JUMP].includes(this.state);
  }

  setupAttackHitbox(w: number, h: number, offsetX: number, offsetY: number) {
    const rx = this.facing === 'right' ? this.x + this.width + offsetX - w : this.x - offsetX;
    this.attackHitbox = {
      x: rx,
      y: this.y + offsetY,
      width: w,
      height: h,
    };
  }

  takeDamage(amount: number, knockback: number) {
    if (this.isBlocking) {
      this.health -= amount * 0.2;
      this.velocityX = this.facing === 'right' ? -knockback * 0.5 : knockback * 0.5;
    } else {
      this.health -= amount;
      this.state = FighterState.HIT;
      this.stateTimer = 15;
      this.velocityX = this.facing === 'right' ? -knockback : knockback;
      this.specialPower = Math.min(100, this.specialPower + 5);
    }
    
    if (this.health < 0) this.health = 0;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const { x, y, width, height, facing, state, config } = this;
    
    ctx.save();
    
    // Shadow Glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = config.accent;
    
    // Body (Simplified Stickman/Shadow Ninja style)
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = config.accent;
    ctx.lineWidth = 2;

    // Translate for facing
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    
    // Head
    ctx.beginPath();
    ctx.arc(centerX, y + 20, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Torso
    ctx.beginPath();
    ctx.moveTo(centerX, y + 35);
    ctx.lineTo(centerX, y + 80);
    ctx.stroke();

    // Dynamic Limbs based on state
    const t = this.animationTimer * 0.15;
    
    // Arms & Legs
    if (state === FighterState.PUNCH) {
      const reach = facing === 'right' ? 40 : -40;
      this.drawLimb(ctx, centerX, y + 45, centerX + reach, y + 45); // Punching arm
    } else if (state === FighterState.KICK) {
      const reach = facing === 'right' ? 50 : -50;
      this.drawLimb(ctx, centerX, y + 80, centerX + reach, y + 60); // Kicking leg
    } else if (state === FighterState.WALK) {
      const swing = Math.sin(t) * 20;
      this.drawLimb(ctx, centerX, y + 80, centerX + swing, y + 130);
      this.drawLimb(ctx, centerX, y + 80, centerX - swing, y + 130);
    } else {
      // Idle
      ctx.beginPath();
      ctx.moveTo(centerX, y + 80);
      ctx.lineTo(centerX - 15, y + 130);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(centerX, y + 80);
      ctx.lineTo(centerX + 15, y + 130);
      ctx.stroke();
    }

    ctx.restore();
    
    // Debug hitboxes (optional)
    /*
    if (this.attackHitbox) {
      ctx.strokeStyle = 'red';
      ctx.strokeRect(this.attackHitbox.x, this.attackHitbox.y, this.attackHitbox.width, this.attackHitbox.height);
    }
    */
  }

  drawLimb(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
}
