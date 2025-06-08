import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-bird',
  standalone: true,
  imports: [CommonModule],
  template: '',
  styles: []
})
export class BirdComponent {
  @Input() x: number = 250;
  @Input() y: number = 300;
  @Input() width: number = 40;
  @Input() height: number = 30;
  @Input() velocity: number = 0;

  readonly GRAVITY = 0.08;
  readonly JUMP_FORCE = -2.5;
  readonly MAX_VELOCITY = 10;

  jump(): void {
    this.velocity = this.JUMP_FORCE;
  }

  update(): void {
    this.velocity += this.GRAVITY;
    this.velocity = Math.min(this.velocity, this.MAX_VELOCITY);
    this.y += this.velocity;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    // Draw bird body
    ctx.fillStyle = '#FFD700'; // Gold color
    ctx.beginPath();
    ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw bird eye
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(this.x + this.width * 0.7, this.y + this.height * 0.3, this.width * 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Draw bird beak
    ctx.fillStyle = '#FF4500'; // Orange-red
    ctx.beginPath();
    ctx.moveTo(this.x + this.width * 0.8, this.y + this.height * 0.5);
    ctx.lineTo(this.x + this.width * 1.2, this.y + this.height * 0.5);
    ctx.lineTo(this.x + this.width * 0.8, this.y + this.height * 0.6);
    ctx.closePath();
    ctx.fill();
  }

  reset(): void {
    this.y = 300;
    this.velocity = 0;
    this.x = 250;
  }
}
