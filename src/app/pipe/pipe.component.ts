import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pipe',
  standalone: true,
  imports: [CommonModule],
  template: '',
  styles: []
})
export class PipeComponent {
  @Input() x: number = 0;
  @Input() width: number = 80;
  @Input() topHeight: number = 0;
  @Input() gap: number = 150;
  @Input() passed: boolean = false;

  draw(ctx: CanvasRenderingContext2D, canvasHeight: number): void {
    // Draw top pipe
    this.drawPipe(ctx, this.x, 0, this.topHeight, true);

    // Draw bottom pipe
    this.drawPipe(
      ctx,
      this.x,
      this.topHeight + this.gap,
      canvasHeight - (this.topHeight + this.gap),
      false
    );
  }

  private drawPipe(ctx: CanvasRenderingContext2D, x: number, y: number, height: number, isTop: boolean): void {
    // Draw pipe body
    ctx.fillStyle = '#02882d';
    ctx.fillRect(x, y, this.width, height);

    // Draw pipe cap
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(x - 2, isTop ? y + height - 30 : y, this.width + 4, 30);
  }
} 