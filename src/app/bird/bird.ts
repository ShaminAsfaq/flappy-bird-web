import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-bird',
  standalone: true,
  template: '',
  styles: []
})
export class BirdComponent {
  @Input() x: number = 0;
  @Input() y: number = 0;
  @Input() width: number = 34;
  @Input() height: number = 24;
  @Input() gravity: number = 0.15;
  @Input() jumpForce: number = -4;
  @Input() isPaused: boolean = false;
  @Output() gameStart = new EventEmitter<void>();

  private velocity: number = 0;
  private hasStarted: boolean = false;
  private wingAngle: number = 0;
  private wingDirection: number = 1;
  private readonly WING_SPEED = 0.15;
  private readonly MAX_WING_ANGLE = Math.PI / 6;

  // Bird colors
  private readonly BIRD_COLOR = '#FFD700'; // Gold color for bird
  private readonly BIRD_EYE_COLOR = '#000000'; // Black for eye
  private readonly BIRD_BEAK_COLOR = '#FF4500'; // Orange-red for beak
  private readonly BIRD_WING_COLOR = '#FFA500'; // Orange color for wings
  private readonly BIRD_WING_EDGE_COLOR = '#FF8C00'; // Darker orange for wing edges

  update() {
    // Update wing animation regardless of game state
    this.wingAngle += this.WING_SPEED * this.wingDirection;
    if (Math.abs(this.wingAngle) > this.MAX_WING_ANGLE) {
      this.wingDirection *= -1;
    }

    // Only update position if game is not paused and has started
    if (!this.isPaused && this.hasStarted) {
      this.velocity += this.gravity;
      this.y += this.velocity;
    }
  }

  performJump() {
    if (!this.hasStarted) {
      this.hasStarted = true;
      this.gameStart.emit();
    }
    this.velocity = this.jumpForce;
  }

  reset() {
    this.velocity = 0;
    this.hasStarted = false;
    this.wingAngle = 0;
    this.wingDirection = 1;
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Draw bird body
    ctx.fillStyle = this.BIRD_COLOR;
    ctx.beginPath();
    ctx.ellipse(this.x + this.width/2, this.y + this.height/2, this.width/2, this.height/2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw left wing
    ctx.save();
    ctx.translate(this.x + this.width * 0.3, this.y + this.height * 0.5);
    ctx.rotate(this.wingAngle);
    
    // Wing shadow/edge
    ctx.fillStyle = this.BIRD_WING_EDGE_COLOR;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.width * 0.25, this.height * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Main wing
    ctx.fillStyle = this.BIRD_WING_COLOR;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.width * 0.22, this.height * 0.17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw eye
    ctx.fillStyle = this.BIRD_EYE_COLOR;
    ctx.beginPath();
    ctx.arc(this.x + this.width * 0.7, this.y + this.height * 0.3, this.height * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Draw beak
    ctx.fillStyle = this.BIRD_BEAK_COLOR;
    ctx.beginPath();
    ctx.moveTo(this.x + this.width * 0.8, this.y + this.height * 0.4);
    ctx.lineTo(this.x + this.width * 1.2, this.y + this.height * 0.5);
    ctx.lineTo(this.x + this.width * 0.8, this.y + this.height * 0.6);
    ctx.fill();
  }
}
