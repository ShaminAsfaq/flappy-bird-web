import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
import { BirdComponent } from '../bird/bird';

@Component({
	selector: 'app-game',
	standalone: true,
	imports: [BirdComponent],
	templateUrl: './game.html',
	styleUrls: ['./game.css']
})
export class GameComponent implements AfterViewInit, OnDestroy {
	@ViewChild('gameCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
	private ctx!: CanvasRenderingContext2D;
	private animationFrameId: number = 0;
	private readonly GAME_SPEED = 2; // Speed for pipes and bird when game is running
	private readonly GROUND_SPEED = 2; // Constant speed for ground regardless of game state
	private pipes: { x: number; gapY: number; scored: boolean }[] = [];
	private readonly PIPE_SPACING = 300;
	private readonly PIPE_GAP = 150;
	private readonly PIPE_WIDTH = 80; // Increased from 52 to 80
	private readonly PIPE_CAP_HEIGHT = 30;
	private readonly PIPE_EDGE_WIDTH = 2;
	private isPaused: boolean = false;
	private hasGameStarted: boolean = false;
	private isGameOver: boolean = false;
	private score: number = 0;
	private highScore: number = 0;
	private readonly SCORE_FONT = 'bold 36px Ubuntu';
	private readonly SCORE_COLOR = '#FFFFFF';
	private readonly SCORE_SHADOW_COLOR = '#000000';
	private readonly HIGH_SCORE_FONT = 'bold 24px Ubuntu';
	private readonly HIGH_SCORE_FONT_SMALL = 'bold 20px Ubuntu';
	private readonly HIGH_SCORE_FONT_LARGE = 'bold 28px Ubuntu';

	// Ground properties
	private groundOffset: number = 0;
	private readonly GROUND_HEIGHT = 100;
	private readonly GROUND_SEGMENT_WIDTH = 50;
	private readonly GROUND_COLOR = '#8B4513'; // Brown color for ground
	private readonly GROUND_GRASS_COLOR = '#228B22'; // Forest green for grass
	private readonly GROUND_GRASS_HEIGHT = 20;

	// Text styling constants
	private readonly START_TEXT_FONT = 'bold 48px Poppins';
	private readonly START_TEXT_COLOR = '#800000';
	private readonly START_TEXT_SHADOW_COLOR = 'rgb(243, 243, 243)';
	private readonly START_TEXT_SHADOW_OFFSET = 2;
	private readonly START_TEXT_VERTICAL_OFFSET = 250;
	private readonly START_TEXT_UNDERLINE_WIDTH = 0;
	private readonly START_TEXT_UNDERLINE_THICKNESS = 5;
	private readonly START_TEXT_UNDERLINE_OFFSET = this.START_TEXT_VERTICAL_OFFSET - 18;

	// Bird instance
	private bird: BirdComponent;

	// Pipe colors
	private readonly PIPE_COLOR = '#02882d'; // Light green
	private readonly PIPE_EDGE_COLOR = '#66BB6A'; // Lighter green for edges
	private readonly PIPE_CAP_COLOR = '#4CAF50'; // Light green for caps
	private readonly PIPE_CAP_EDGE_COLOR = '#02882d'; // Lighter green for cap edges

	// Collision effect properties
	private collisionEffect: { x: number, y: number, radius: number, alpha: number } | null = null;
	private readonly COLLISION_EFFECT_DURATION = 500; // 500ms
	private collisionEffectStartTime: number = 0;

	constructor() {
		this.bird = new BirdComponent();
		this.bird.x = 0;
		this.bird.y = 0;
		this.bird.width = 58;
		this.bird.height = 45;
		this.bird.gravity = 0.00;
		this.bird.jumpForce = -2;
		this.bird.gameStart.subscribe(() => this.onGameStart());
	}

	@HostListener('window:resize')
	onResize() {
		this.resizeCanvas();
	}

	@HostListener('window:keydown', ['$event'])
	onKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			if (this.isGameOver) {
				this.resetGame();
				if (!this.animationFrameId) {
					this.gameLoop();
				}
			} else {
				this.isPaused = !this.isPaused;
			}
		}
	}

	@HostListener('window:mouseup', ['$event'])
	onMouseUp(event: MouseEvent) {
		if (event.button === 0) { // Only respond to left mouse button
			this.bird.performJump();
		}
	}

	private togglePause() {
		this.isPaused = !this.isPaused;
		if (this.isPaused) {
			if (this.animationFrameId) {
				cancelAnimationFrame(this.animationFrameId);
				this.animationFrameId = 0;
			}
		} else {
			if (!this.animationFrameId) {
				this.gameLoop();
			}
		}
	}

	private onGameStart() {
		this.hasGameStarted = true;
	}

	ngAfterViewInit() {
		this.canvasRef.nativeElement.width = window.innerWidth;
		this.canvasRef.nativeElement.height = window.innerHeight;
		this.ctx = this.canvasRef.nativeElement.getContext('2d')!;

		// Load high score from localStorage
		const savedHighScore = localStorage.getItem('flappyBirdHighScore');
		this.highScore = savedHighScore ? parseInt(savedHighScore, 10) : 0;

		this.bird = new BirdComponent();
		this.bird.x = window.innerWidth / 4;
		this.bird.y = window.innerHeight / 2;
		this.bird.width = 58;
		this.bird.height = 45;
		this.bird.gravity = 0.07;
		this.bird.jumpForce = -2.5;
		this.bird.gameStart.subscribe(() => this.onGameStart());

		// Initialize first pipe
		this.pipes.push({
			x: window.innerWidth,
			gapY: Math.random() * (window.innerHeight - this.GROUND_HEIGHT - this.GROUND_GRASS_HEIGHT - this.PIPE_GAP - 50) + 100,
			scored: false
		});

		this.gameLoop();
	}

	private resizeCanvas() {
		const canvas = this.canvasRef.nativeElement;
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
	}

	ngOnDestroy() {
		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
		}
	}

	private gameLoop() {
		if (!this.isPaused) {
			this.update();
			this.draw();
		}
		this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
	}

	private calculateMaxAchievableHeight(): number {
		// Using physics formula: h = (v²)/(2g) where v is initial velocity (jumpForce) and g is gravity
		const maxHeight = Math.abs(this.bird.jumpForce * this.bird.jumpForce) / (2 * this.bird.gravity);
		// Add some buffer to account for timing and control
		return maxHeight * 0.8; // 80% of theoretical maximum to ensure it's achievable
	}

	private generatePipeGap(): number {
		const maxHeight = this.calculateMaxAchievableHeight();
		const minGapY = 100; // Minimum distance from top
		const maxGapY = window.innerHeight - this.GROUND_HEIGHT - this.GROUND_GRASS_HEIGHT - this.PIPE_GAP - 50;
		
		// Calculate the maximum possible gap position that's still achievable
		const achievableMaxGapY = Math.min(
			maxGapY,
			window.innerHeight / 2 + maxHeight / 2
		);
		
		// Generate a random gap position within achievable range
		return Math.random() * (achievableMaxGapY - minGapY) + minGapY;
	}

	private update() {
		// Update bird
		this.bird.isPaused = this.isPaused;
		this.bird.update();

		// Check for ground collision
		const birdBottom = this.bird.y + this.bird.height;
		const groundLevel = window.innerHeight - this.GROUND_HEIGHT;
		if (birdBottom >= groundLevel) {
			// Calculate exact collision point with ground
			const collisionX = this.bird.x + this.bird.width / 2;
			const collisionY = groundLevel;
			this.endGame(collisionX, collisionY);
			return;
		}

		// Check for pipe collisions
		if (this.hasGameStarted && !this.isPaused && !this.isGameOver) {
			for (const pipe of this.pipes) {
				// Check if bird is horizontally aligned with pipe
				if (this.bird.x + this.bird.width > pipe.x && this.bird.x < pipe.x + this.PIPE_WIDTH) {
					// Check if bird hits top pipe
					if (this.bird.y < pipe.gapY) {
						// Calculate exact collision point with top pipe
						const collisionX = pipe.x;
						const collisionY = this.bird.y + this.bird.height;
						this.endGame(collisionX, collisionY);
						return;
					}
					// Check if bird hits bottom pipe
					if (this.bird.y + this.bird.height > pipe.gapY + this.PIPE_GAP) {
						// Calculate exact collision point with bottom pipe
						const collisionX = pipe.x;
						const collisionY = this.bird.y;
						this.endGame(collisionX, collisionY);
						return;
					}
					// Check if bird hits the pipe's hat
					if (this.bird.x + this.bird.width > pipe.x && this.bird.x < pipe.x + this.PIPE_WIDTH) {
						// If bird is at the same height as the gap edges
						if (Math.abs(this.bird.y - pipe.gapY) < 5 || Math.abs(this.bird.y + this.bird.height - (pipe.gapY + this.PIPE_GAP)) < 5) {
							const collisionX = this.bird.x + this.bird.width;
							const collisionY = this.bird.y + this.bird.height / 2;
							this.endGame(collisionX, collisionY);
							return;
						}
					}
				}
			}
		}

		// Update ground position at constant speed regardless of game state
		this.groundOffset = (this.groundOffset - this.GROUND_SPEED) % this.GROUND_SEGMENT_WIDTH;

		// Only move pipes if game has started and not paused
		if (this.hasGameStarted && !this.isPaused && !this.isGameOver) {
			// Move pipes
			this.pipes.forEach(pipe => {
				pipe.x -= this.GAME_SPEED;
				// Check if bird has passed a pipe
				if (pipe.x + this.PIPE_WIDTH < this.bird.x && !pipe.scored) {
					this.score++;
					pipe.scored = true;
				}
			});

			// Remove pipes that are off screen and add new ones
			this.pipes = this.pipes.filter(pipe => pipe.x > -this.PIPE_WIDTH);
			if (this.pipes[this.pipes.length - 1].x < window.innerWidth - this.PIPE_SPACING) {
				this.pipes.push({
					x: window.innerWidth,
					gapY: this.generatePipeGap(),
					scored: false
				});
			}
		}
	}

	private drawPipe(x: number, y: number, height: number, isTop: boolean) {
		const ctx = this.ctx;

		// Draw pipe body
		ctx.fillStyle = this.PIPE_COLOR;
		ctx.fillRect(x, y, this.PIPE_WIDTH, height);

		// Draw pipe edge
		ctx.fillStyle = this.PIPE_EDGE_COLOR;
		ctx.fillRect(x, y, this.PIPE_EDGE_WIDTH, height);
		ctx.fillRect(x + this.PIPE_WIDTH - this.PIPE_EDGE_WIDTH, y, this.PIPE_EDGE_WIDTH, height);

		// Draw pipe cap
		if (isTop) {
			// Top pipe cap
			ctx.fillStyle = this.PIPE_CAP_COLOR;
			ctx.fillRect(x - 2, y + height - this.PIPE_CAP_HEIGHT, this.PIPE_WIDTH + 4, this.PIPE_CAP_HEIGHT);

			// Cap edge
			ctx.fillStyle = this.PIPE_CAP_EDGE_COLOR;
			ctx.fillRect(x - 2, y + height - this.PIPE_CAP_HEIGHT, this.PIPE_WIDTH + 4, this.PIPE_EDGE_WIDTH);
			ctx.fillRect(x - 2, y + height - this.PIPE_EDGE_WIDTH, this.PIPE_WIDTH + 4, this.PIPE_EDGE_WIDTH);
		} else {
			// Bottom pipe cap
			ctx.fillStyle = this.PIPE_CAP_COLOR;
			ctx.fillRect(x - 2, y, this.PIPE_WIDTH + 4, this.PIPE_CAP_HEIGHT);

			// Cap edge
			ctx.fillStyle = this.PIPE_CAP_EDGE_COLOR;
			ctx.fillRect(x - 2, y, this.PIPE_WIDTH + 4, this.PIPE_EDGE_WIDTH);
			ctx.fillRect(x - 2, y + this.PIPE_CAP_HEIGHT - this.PIPE_EDGE_WIDTH, this.PIPE_WIDTH + 4, this.PIPE_EDGE_WIDTH);
		}
	}

	private drawGround() {
		const canvas = this.canvasRef.nativeElement;
		const groundY = canvas.height - this.GROUND_HEIGHT;

		// Draw base ground
		this.ctx.fillStyle = this.GROUND_COLOR;
		this.ctx.fillRect(0, groundY, canvas.width, this.GROUND_HEIGHT);

		// Draw grass segments
		this.ctx.fillStyle = this.GROUND_GRASS_COLOR;
		for (let x = this.groundOffset; x < canvas.width; x += this.GROUND_SEGMENT_WIDTH) {
			// Draw grass tuft
			this.ctx.beginPath();
			this.ctx.moveTo(x, groundY);
			this.ctx.lineTo(x + this.GROUND_SEGMENT_WIDTH/2, groundY - this.GROUND_GRASS_HEIGHT);
			this.ctx.lineTo(x + this.GROUND_SEGMENT_WIDTH, groundY);
			this.ctx.fill();
		}
	}

	private drawCollisionEffect() {
		if (this.collisionEffect) {
			const elapsed = Date.now() - this.collisionEffectStartTime;
			const progress = Math.min(elapsed / this.COLLISION_EFFECT_DURATION, 1);
			
			// Fade out and expand
			this.collisionEffect.alpha = 1 - progress;
			this.collisionEffect.radius = 30 + (progress * 20);

			// Draw cloud effect
			this.ctx.save();
			this.ctx.globalAlpha = this.collisionEffect.alpha;
			this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
			
			// Draw multiple circles to create cloud effect
			for (let i = 0; i < 5; i++) {
				const angle = (i / 5) * Math.PI * 2;
				const offsetX = Math.cos(angle) * (this.collisionEffect.radius * 0.3);
				const offsetY = Math.sin(angle) * (this.collisionEffect.radius * 0.3);
				
				this.ctx.beginPath();
				this.ctx.arc(
					this.collisionEffect.x + offsetX,
					this.collisionEffect.y + offsetY,
					this.collisionEffect.radius * 0.4,
					0,
					Math.PI * 2
				);
				this.ctx.fill();
			}

			this.ctx.restore();

			// Remove effect when animation is complete
			if (progress >= 1) {
				this.collisionEffect = null;
			}
		}
	}

	private draw() {
		// Clear canvas
		this.ctx.clearRect(0, 0, this.canvasRef.nativeElement.width, this.canvasRef.nativeElement.height);

		// Draw background
		this.ctx.fillStyle = '#87CEEB'; // Sky blue
		this.ctx.fillRect(0, 0, this.canvasRef.nativeElement.width, this.canvasRef.nativeElement.height);

		// Draw pipes
		this.pipes.forEach(pipe => {
			// Top pipe
			this.drawPipe(pipe.x, 0, pipe.gapY, true);

			// Bottom pipe
			this.drawPipe(
				pipe.x,
				pipe.gapY + this.PIPE_GAP,
				this.canvasRef.nativeElement.height - (pipe.gapY + this.PIPE_GAP),
				false
			);
		});

		// Draw ground
		this.drawGround();

		// Draw bird
		this.bird.draw(this.ctx);

		// Draw collision effect
		this.drawCollisionEffect();

		// Draw score
		this.drawScore();

		// Draw start text above bird if game hasn't started
		if (!this.hasGameStarted) {
			// Draw text shadow
			this.ctx.fillStyle = this.START_TEXT_SHADOW_COLOR;
			this.ctx.font = this.START_TEXT_FONT;
			this.ctx.textAlign = 'center';
			this.ctx.fillText('CLICK ANYWHERE TO START',
				this.bird.x + this.START_TEXT_SHADOW_OFFSET,
				this.bird.y - this.START_TEXT_VERTICAL_OFFSET
			);

			// Draw main text
			this.ctx.fillStyle = this.START_TEXT_COLOR;
			this.ctx.font = this.START_TEXT_FONT;
			this.ctx.textAlign = 'center';
			this.ctx.fillText('CLICK ANYWHERE TO START',
				this.bird.x,
				this.bird.y - this.START_TEXT_VERTICAL_OFFSET
			);

			// Draw decorative underline
			this.ctx.strokeStyle = this.START_TEXT_COLOR;
			this.ctx.lineWidth = this.START_TEXT_UNDERLINE_THICKNESS;
			this.ctx.beginPath();
			this.ctx.moveTo(
				this.bird.x - this.START_TEXT_UNDERLINE_WIDTH / 2,
				this.bird.y - this.START_TEXT_UNDERLINE_OFFSET
			);
			this.ctx.lineTo(
				this.bird.x + this.START_TEXT_UNDERLINE_WIDTH / 2,
				this.bird.y - this.START_TEXT_UNDERLINE_OFFSET
			);
			this.ctx.stroke();
		}

		// Draw pause overlay if game is paused
		if (this.isPaused) {
			this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
			this.ctx.fillRect(0, 0, this.canvasRef.nativeElement.width, this.canvasRef.nativeElement.height);
			this.ctx.fillStyle = '#FFFFFF';
			this.ctx.font = '48px Arial';
			this.ctx.textAlign = 'center';
			this.ctx.fillText('ROUND END', this.canvasRef.nativeElement.width / 2, this.canvasRef.nativeElement.height / 2);
			this.ctx.font = '24px Arial';
			this.ctx.fillText('Press ESC to resume', this.canvasRef.nativeElement.width / 2, this.canvasRef.nativeElement.height / 2 + 40);

			// Draw START AGAIN button
			const buttonWidth = 200;
			const buttonHeight = 50;
			const buttonX = this.canvasRef.nativeElement.width / 2 - buttonWidth / 2;
			const buttonY = this.canvasRef.nativeElement.height / 2 + 80;

			// Button background
			this.ctx.fillStyle = '#4CAF50'; // Green color
			this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

			// Button text
			this.ctx.fillStyle = '#FFFFFF';
			this.ctx.font = 'bold 24px Arial';
			this.ctx.textAlign = 'center';
			this.ctx.textBaseline = 'middle';
			this.ctx.fillText('START AGAIN', this.canvasRef.nativeElement.width / 2, buttonY + buttonHeight / 2);

			// Set cursor to pointer when over the button
			this.canvasRef.nativeElement.style.cursor = 'pointer';
		} else {
			// Reset cursor to default when not over the button
			this.canvasRef.nativeElement.style.cursor = 'default';
		}
	}

	private drawScore() {
		this.ctx.save();
		// Draw top score with dynamic font size
		const topScoreDigits = this.highScore.toString().length;
		const topScoreFont = topScoreDigits > 3 ? this.HIGH_SCORE_FONT_SMALL :
							topScoreDigits > 2 ? this.HIGH_SCORE_FONT :
							this.HIGH_SCORE_FONT_SMALL;

		this.ctx.font = topScoreFont;
		this.ctx.fillStyle = this.SCORE_SHADOW_COLOR;
		this.ctx.fillText(`Top: ${this.highScore}`, this.canvasRef.nativeElement.width / 2 + 1, 50);
		this.ctx.fillStyle = this.SCORE_COLOR;
		this.ctx.fillText(`Top: ${this.highScore}`, this.canvasRef.nativeElement.width / 2, 50);

		// Draw current score below top score
		this.ctx.font = this.SCORE_FONT;
		this.ctx.fillStyle = this.SCORE_SHADOW_COLOR;
		this.ctx.fillText(this.score.toString(), this.canvasRef.nativeElement.width / 2 + 1, 90);
		this.ctx.fillStyle = this.SCORE_COLOR;
		this.ctx.fillText(this.score.toString(), this.canvasRef.nativeElement.width / 2, 90);
		this.ctx.restore();
	}

	private endGame(collisionX: number, collisionY: number) {
		this.isGameOver = true;
		this.isPaused = true;

		// Create collision effect at the exact collision point
		this.collisionEffect = {
			x: collisionX,
			y: collisionY,
			radius: 30,
			alpha: 1
		};
		this.collisionEffectStartTime = Date.now();

		// Update high score if current score is higher
		if (this.score > this.highScore) {
			this.highScore = this.score;
			localStorage.setItem('flappyBirdHighScore', this.highScore.toString());
		}
	}

	private resetGame() {
		this.isGameOver = false;
		this.isPaused = false;
		this.hasGameStarted = false;
		this.pipes = [];
		this.score = 0;
		// Reset bird to initial position in the middle of the screen
		this.bird.y = window.innerHeight / 2;
		this.bird.reset();
		// Initialize first pipe
		this.pipes.push({
			x: window.innerWidth,
			gapY: this.generatePipeGap(),
			scored: false
		});
	}

	@HostListener('click', ['$event'])
	onClick(event: MouseEvent) {
		if (this.isPaused) {
			const buttonWidth = 200;
			const buttonHeight = 50;
			const buttonX = this.canvasRef.nativeElement.width / 2 - buttonWidth / 2;
			const buttonY = this.canvasRef.nativeElement.height / 2 + 80;

			// Check if click is within button bounds
			if (event.clientX >= buttonX &&
				event.clientX <= buttonX + buttonWidth &&
				event.clientY >= buttonY &&
				event.clientY <= buttonY + buttonHeight) {
				this.resetGame();
				if (!this.animationFrameId) {
					this.gameLoop();
				}
			}
		}
	}
}
