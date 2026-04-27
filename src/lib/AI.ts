import { Fighter } from './Fighter';
import { FighterState } from '../constants';

export class AIController {
  fighter: Fighter;
  opponent: Fighter;
  decisionTimer: number = 0;

  constructor(fighter: Fighter, opponent: Fighter) {
    this.fighter = fighter;
    this.opponent = opponent;
  }

  update() {
    if (this.fighter.health <= 0 || this.opponent.health <= 0) return;
    if (this.fighter.stateTimer > 0) return;

    this.decisionTimer--;

    if (this.decisionTimer <= 0) {
      this.makeDecision();
      this.decisionTimer = 30 + Math.random() * 40;
    }
  }

  makeDecision() {
    const dist = Math.abs(this.fighter.x - this.opponent.x);
    const inRange = dist < 120;
    
    // Check if opponent is attacking
    const opponentAttacking = [FighterState.PUNCH, FighterState.KICK, FighterState.SPECIAL].includes(this.opponent.state);

    if (opponentAttacking && inRange && Math.random() > 0.4) {
      this.fighter.block(true);
      return;
    }

    if (inRange) {
      this.fighter.block(false);
      const rand = Math.random();
      if (rand < 0.4) {
        this.fighter.punch();
      } else if (rand < 0.7) {
        this.fighter.kick();
      } else if (rand < 0.8 && this.fighter.specialPower >= 100) {
        this.fighter.specialMove();
      } else {
        // Move slightly away or just idle
        this.fighter.move(this.fighter.x < this.opponent.x ? -1 : 1);
      }
    } else {
      // Approach
      this.fighter.block(false);
      const dir = this.fighter.x < this.opponent.x ? 1 : -1;
      this.fighter.move(dir);
    }
  }
}
