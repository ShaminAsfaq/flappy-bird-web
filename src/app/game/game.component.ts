import {Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, HostListener} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {BirdComponent} from '../bird/bird.component';
import {PipeComponent} from '../pipe/pipe.component';
import {MultiplayerService} from '../services/multiplayer.service';
import {Subscription} from 'rxjs';

interface Player {
	id: string;
	name: string;
	score: number;
	isReady: boolean;
	isFinished?: boolean;
}

interface Pipe {
	x: number;
	width: number;
	topHeight: number;
	gap: number;
	passed: boolean;
}

@Component({
	selector: 'app-game',
	standalone: true,
	imports: [CommonModule, FormsModule, BirdComponent, PipeComponent],
	templateUrl: './game.component.html',
	styleUrls: ['./game.component.css']
})
export class GameComponent implements AfterViewInit, OnDestroy {
	@ViewChild('gameCanvas') gameCanvas!: ElementRef<HTMLCanvasElement>;
	@ViewChild(BirdComponent) birdComponent!: BirdComponent;

	private ctx!: CanvasRenderingContext2D;
	private animationFrameId: number = 0;
	private subscriptions: Subscription[] = [];
	private lastTime: number = 0;
	private readonly GRAVITY = 0.07;
	private readonly FLAP_FORCE = -8;
	private readonly PIPE_SPEED = 2;
	private readonly PIPE_SPAWN_INTERVAL = 2500;
	private readonly PIPE_GAP = 250;
	private readonly GROUND_HEIGHT = 100;
	private readonly SKY_HEIGHT = 50;

	// Game state
	isGameStarted: boolean = false;
	isGameOver: boolean = false;
	showGameOver: boolean = false;
	showCountdown: boolean = false;
	countdownValue: number = 3;
	private countdownInterval: any;
	isGameRunning: boolean = false;
	score: number = 0;
	highScore: number = 0;
	pipes: Pipe[] = [];
	private lastPipeSpawn: number = 0;
	private readonly PIPE_WIDTH = 80;
	private readonly MIN_PIPE_HEIGHT = 50;
	private readonly MAX_PIPE_HEIGHT = 300;

	// Multiplayer state
	players: Player[] = [];
	localPlayerName: string = '';
	socketId: string = '';
	isWaitingForPlayers: boolean = false;
	isReady: boolean = false;

	// Add countdown properties
	restartCountdown: number = 3;
	private restartTimer: any;
	showRestartCountdown: boolean = false;

	constructor(private multiplayerService: MultiplayerService) {
	}

	ngOnInit(): void {
		this.setupMultiplayer();
	}

	ngAfterViewInit(): void {
		// Initialize canvas when view is ready
		if (this.gameCanvas?.nativeElement) {
			const canvas = this.gameCanvas.nativeElement;
			// Set canvas size to match viewport
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			this.ctx = canvas.getContext('2d')!;

			// Add resize handler
			window.addEventListener('resize', this.handleResize);
		}
	}

	@HostListener('window:keydown', ['$event'])
	onKeyDown(event: KeyboardEvent) {
		if (event.code === 'Space' && this.isGameStarted && !this.isGameOver) {
			event.preventDefault(); // Prevent page scroll
			if (this.birdComponent) {
				console.log('Jump!');
				this.birdComponent.jump();
			}
		}
	}

	@HostListener('window:mouseup', ['$event'])
	onMouseUp(event: MouseEvent) {
		if (event.button === 0 && this.isGameStarted && !this.isGameOver) { // Only respond to left mouse button
			if (this.birdComponent) {
				console.log('Jump!');
				this.birdComponent.jump();
			}
		}
	}

	@HostListener('window:touchstart', ['$event'])
	onTouchStart(event: TouchEvent) {
		event.preventDefault();
		if (this.isGameStarted && !this.isGameOver) {
			if (this.birdComponent) {
				console.log('Jump!');
				this.birdComponent.jump();
			}
		}
	}

	ngOnDestroy(): void {
		this.cleanup();
		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
		}
		// Remove resize handler
		window.removeEventListener('resize', this.handleResize);
	}

	private handleResize = () => {
		if (this.gameCanvas?.nativeElement) {
			const canvas = this.gameCanvas.nativeElement;
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
		}
	};

	private setupMultiplayer(): void {
		this.subscriptions.push(
			this.multiplayerService.socketId$.subscribe(id => {
				this.socketId = id;
				console.log('Socket ID received:', id);
			}),

			this.multiplayerService.players$.subscribe(players => {
				this.players = players;
				console.log('Players updated:', players);
				const allReady = players.every(p => p.isReady);
				console.log('All players ready:', allReady, 'Current game state:', {
					isGameStarted: this.isGameStarted,
					isWaitingForPlayers: this.isWaitingForPlayers,
					isGameOver: this.isGameOver
				});
			}),

			this.multiplayerService.gameStart$.subscribe(() => {
				console.log('Game start event received');
				this.resetGame();
				this.isGameStarted = true;
				this.isWaitingForPlayers = false;
				this.isGameOver = false;
				this.isReady = false;
				console.log('Game state updated:', {
					isGameStarted: this.isGameStarted,
					isWaitingForPlayers: this.isWaitingForPlayers,
					isGameOver: this.isGameOver
				});
				// Wait for next frame to ensure canvas is ready
				requestAnimationFrame(() => {
					this.initializeGame();
				});
			}),

			this.multiplayerService.gameEnd$.subscribe(players => {
				console.log('Game end event received:', players);
				this.endGame();
				if (Array.isArray(players)) {
					this.players = players;
				}
			})
		);
	}

	private initializeGame(): void {
		console.log('Initializing game...');
		if (!this.gameCanvas?.nativeElement) {
			console.error('Canvas not ready');
			return;
		}

		const canvas = this.gameCanvas.nativeElement;
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		this.ctx = canvas.getContext('2d')!;
		this.resetGame();

		// Start the game loop immediately to render everything
		this.lastTime = performance.now();
		this.animationFrameId = requestAnimationFrame(this.gameLoop);

		// Start countdown
		this.startCountdown();
	}

	private startCountdown(): void {
		this.countdownValue = 3;
		this.isGameRunning = false;

		this.countdownInterval = setInterval(() => {
			this.countdownValue--;
			if (this.countdownValue <= 0) {
				clearInterval(this.countdownInterval);
				this.isGameRunning = true;  // Start the game when countdown reaches 0
			}
		}, 1000);
	}

	private resetGame(): void {
		console.log('Resetting game...');
		this.score = 0;
		this.isGameOver = false;
		this.pipes = [];
		this.lastPipeSpawn = 0;
		if (this.birdComponent) {
			this.birdComponent.reset();
		}
	}

	private gameLoop = (timestamp: number) => {
		if (!this.lastTime) {
			this.lastTime = timestamp;
		}
		const deltaTime = timestamp - this.lastTime;
		this.lastTime = timestamp;

		// Always render the game state
		this.render();

		// Only update positions if game is running
		if (this.isGameRunning && !this.isGameOver && !this.showGameOver) {
			this.update(deltaTime);
		}

		this.animationFrameId = requestAnimationFrame(this.gameLoop);
	};

	private update(deltaTime: number): void {
		if (!this.birdComponent) {
			console.error('Bird component not found');
			return;
		}

		this.birdComponent.update();
		this.updatePipes(deltaTime);
		this.checkCollisions();
		this.updateScore();
	}

	private updatePipes(deltaTime: number): void {
		const now = performance.now();
		if (now - this.lastPipeSpawn > this.PIPE_SPAWN_INTERVAL) {
			this.spawnPipe();
			this.lastPipeSpawn = now;
		}

		this.pipes.forEach(pipe => {
			pipe.x -= this.PIPE_SPEED;
			if (pipe.x + pipe.width < 0) {
				pipe.passed = true;
			}
		});

		this.pipes = this.pipes.filter(pipe => pipe.x + pipe.width > 0);
	}

	private spawnPipe(): void {
		const topHeight = Math.random() * (this.MAX_PIPE_HEIGHT - this.MIN_PIPE_HEIGHT) + this.MIN_PIPE_HEIGHT;
		this.pipes.push({
			x: this.gameCanvas.nativeElement.width,
			width: this.PIPE_WIDTH,
			topHeight,
			gap: this.PIPE_GAP,
			passed: false
		});
	}

	private checkCollisions(): void {
		if (!this.birdComponent) return;

		const bird = this.birdComponent;
		const birdBox = {
			x: bird.x,
			y: bird.y,
			width: bird.width,
			height: bird.height
		};

		// Check ground collision
		if (birdBox.y + birdBox.height >= this.gameCanvas.nativeElement.height - this.GROUND_HEIGHT) {
			this.gameOver();
			return;
		}

		// Check ceiling collision
		if (birdBox.y <= this.SKY_HEIGHT) {
			this.gameOver();
			return;
		}

		// Check pipe collisions
		for (const pipe of this.pipes) {
			if (this.checkCollision(birdBox, {
				x: pipe.x,
				y: 0,
				width: pipe.width,
				height: pipe.topHeight
			}) || this.checkCollision(birdBox, {
				x: pipe.x,
				y: pipe.topHeight + pipe.gap,
				width: pipe.width,
				height: this.gameCanvas.nativeElement.height - (pipe.topHeight + pipe.gap)
			})) {
				this.gameOver();
				return;
			}
		}
	}

	private checkCollision(box1: { x: number; y: number; width: number; height: number },
						   box2: { x: number; y: number; width: number; height: number }): boolean {
		return box1.x < box2.x + box2.width &&
			box1.x + box1.width > box2.x &&
			box1.y < box2.y + box2.height &&
			box1.y + box1.height > box2.y;
	}

	private updateScore(): void {
		for (const pipe of this.pipes) {
			if (!pipe.passed && pipe.x + pipe.width < this.birdComponent.x) {
				pipe.passed = true;
				this.score++;
				this.multiplayerService.updateScore(this.score);
			}
		}
	}

	private render(): void {
		if (!this.ctx) return;

		// Clear canvas
		this.ctx.clearRect(0, 0, this.gameCanvas.nativeElement.width, this.gameCanvas.nativeElement.height);

		// Draw sky
		this.ctx.fillStyle = '#87CEEB';
		this.ctx.fillRect(0, 0, this.gameCanvas.nativeElement.width, this.gameCanvas.nativeElement.height);

		// Draw ground
		this.drawGround();

		// Draw pipes
		this.pipes.forEach(pipe => {
			this.drawPipe(pipe.x, 0, pipe.topHeight, true);
			this.drawPipe(pipe.x, pipe.topHeight + pipe.gap, this.gameCanvas.nativeElement.height - (pipe.topHeight + pipe.gap), false);
		});

		// Draw bird
		if (this.birdComponent) {
			this.birdComponent.draw(this.ctx);
		}

		// Draw score
		this.drawScore();
	}

	private drawPipe(x: number, y: number, height: number, isTop: boolean): void {
		// Draw pipe body
		this.ctx.fillStyle = '#02882d';
		this.ctx.fillRect(x, y, this.PIPE_WIDTH, height);

		// Draw pipe cap
		this.ctx.fillStyle = '#4CAF50';
		this.ctx.fillRect(x - 2, isTop ? y + height - 30 : y, this.PIPE_WIDTH + 4, 30);
	}

	private drawGround(): void {
		const groundY = this.gameCanvas.nativeElement.height - this.GROUND_HEIGHT;

		// Draw base ground
		this.ctx.fillStyle = '#8B4513';
		this.ctx.fillRect(0, groundY, this.gameCanvas.nativeElement.width, this.GROUND_HEIGHT);

		// Draw grass
		this.ctx.fillStyle = '#228B22';
		this.ctx.fillRect(0, groundY, this.gameCanvas.nativeElement.width, 20);
	}

	private drawScore(): void {
		this.ctx.fillStyle = '#FFFFFF';
		this.ctx.font = 'bold 36px Arial';
		this.ctx.textAlign = 'center';
		this.ctx.fillText(this.score.toString(), this.gameCanvas.nativeElement.width / 2, 50);
	}

	private gameOver(): void {
		this.isGameOver = true;
		this.isGameRunning = false;
		this.multiplayerService.updateScore(this.score);
		cancelAnimationFrame(this.animationFrameId);
		this.multiplayerService.gameOver();
	}

	private endGame(): void {
		// Don't reset game over state here
		this.isGameStarted = false;
		this.isGameRunning = false;
		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = 0;
		}
		if (this.countdownInterval) {
			clearInterval(this.countdownInterval);
		}
		// Clear any remaining game state
		this.pipes = [];
		this.score = 0;
		if (this.birdComponent) {
			this.birdComponent.reset();
		}
	}

	private cleanup(): void {
		this.subscriptions.forEach(sub => sub.unsubscribe());
		if (this.countdownInterval) {
			clearInterval(this.countdownInterval);
		}
		if (this.restartTimer) {
			clearInterval(this.restartTimer);
		}
	}

	joinGame(): void {
		if (this.localPlayerName.trim()) {
			this.multiplayerService.joinGame(this.localPlayerName);
			this.isWaitingForPlayers = true;
			this.isGameOver = false;  // Reset game over state when joining new game
			this.isGameStarted = false;
			this.showCountdown = false;
		}
	}

	setReady(): void {
		this.isReady = true;
		this.multiplayerService.setReady();
	}

	isCurrentPlayer(playerId: string): boolean {
		return playerId === this.socketId;
	}

	isPlayerReady(playerId: string): boolean {
		const player = this.players.find(p => p.id === playerId);
		return player ? player.isReady : false;
	}

	startGame(): void {
		console.log('Starting game...');
		this.isGameStarted = true;
		this.isGameOver = false;
	}

	startGameMovement(): void {
		console.log('Starting game movement...');
		this.isGameRunning = true;
	}

	// Add new method for restarting only for this player
	restartForPlayer(): void {
		this.resetGame();
		this.isGameOver = false;
		this.showGameOver = false;
		this.isGameStarted = true;
		this.initializeGame();
	}

	// Update areAllPlayersGameOver to start countdown
	areAllPlayersGameOver(): boolean {
		const allDone = this.players.every(player => player.score > 0);
		if (allDone && !this.showRestartCountdown) {
			this.showRestartCountdown = true;
			this.startRestartCountdown();
		}
		return allDone;
	}

	// Add countdown methods
	private startRestartCountdown(): void {
		this.restartCountdown = 3;
		this.restartTimer = setInterval(() => {
			this.restartCountdown--;
			if (this.restartCountdown <= 0) {
				clearInterval(this.restartTimer);
				this.showRestartCountdown = false;
				this.isGameOver = false;
				this.isGameStarted = false;
				this.isWaitingForPlayers = true;
				this.isReady = false;
				this.joinGame();
			}
		}, 1000);
	}

	// Add method to get sorted players by score
	getSortedPlayers(): Player[] {
		return [...this.players].sort((a, b) => b.score - a.score);
	}

	areAllPlayersFinished(): boolean {
		const allDone = this.players.length > 0 && this.players.every(p => p.isFinished === true);
		if (allDone && !this.showRestartCountdown) {
			this.showRestartCountdown = true;
			this.startRestartCountdown();
		}
		return allDone;
	}
}
