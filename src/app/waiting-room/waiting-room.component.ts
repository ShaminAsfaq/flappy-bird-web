import { Component, OnInit } from '@angular/core';
import { MultiplayerService } from '../services/multiplayer.service';

@Component({
  selector: 'app-waiting-room',
  templateUrl: './waiting-room.component.html',
  styleUrls: ['./waiting-room.component.css']
})
export class WaitingRoomComponent implements OnInit {
  players: { id: string; name: string; ready: boolean }[] = [];
  playerName: string = '';
  isReady: boolean = false;
  isJoined: boolean = false;

  constructor(private multiplayerService: MultiplayerService) {}

  ngOnInit() {
    this.multiplayerService.players$.subscribe(players => {
      this.players = players;
    });

    this.multiplayerService.isReady$.subscribe(isReady => {
      this.isReady = isReady;
    });

    this.multiplayerService.isJoined$.subscribe(isJoined => {
      this.isJoined = isJoined;
    });
  }

  joinGame() {
    if (this.playerName.trim()) {
      this.multiplayerService.joinGame(this.playerName);
    }
  }

  setReady() {
    this.multiplayerService.setReady();
  }
} 