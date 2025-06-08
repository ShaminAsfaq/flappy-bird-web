import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, Observable } from 'rxjs';

interface Player {
  id: string;
  name: string;
  score: number;
  isReady: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MultiplayerService {
  private socket: Socket | null = null;
  private socketIdSubject = new BehaviorSubject<string>('');
  private playersSubject = new BehaviorSubject<Player[]>([]);
  private gameStartSubject = new BehaviorSubject<boolean>(false);
  private gameEndSubject = new BehaviorSubject<Player[]>([]);

  socketId$ = this.socketIdSubject.asObservable();
  players$ = this.playersSubject.asObservable();
  gameStart$ = this.gameStartSubject.asObservable();
  gameEnd$ = this.gameEndSubject.asObservable();

  constructor() {
    this.initializeSocket();
  }

  private initializeSocket(): void {
    this.socket = io('http://localhost:3000');

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.socketIdSubject.next(this.socket?.id || '');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.socketIdSubject.next('');
    });

    this.socket.on('players', (players: Player[]) => {
      console.log('Players updated:', players);
      this.playersSubject.next(players);
    });

    this.socket.on('gameStart', () => {
      console.log('Game start event received');
      this.gameStartSubject.next(true);
    });

    this.socket.on('gameEnd', (players: Player[]) => {
      console.log('Game end event received:', players);
      this.gameEndSubject.next(players);
    });
  }

  joinGame(name: string): void {
    if (this.socket) {
      console.log('Joining game with name:', name);
      this.socket.emit('joinGame', { name });
    }
  }

  setReady(): void {
    if (this.socket) {
      console.log('Setting ready state');
      this.socket.emit('playerReady');
    }
  }

  updateScore(score: number): void {
    if (this.socket) {
      console.log('Updating score:', score);
      this.socket.emit('updateScore', { score });
    }
  }

  gameOver(): void {
    if (this.socket) {
      console.log('Game over event emitted');
      this.socket.emit('gameOver');
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
} 