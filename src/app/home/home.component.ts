import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  constructor(private router: Router) {}

  startGame(mode: 'single-player' | 'multiplayer') {
    this.router.navigate([`/${mode}`]);
  }

  showInstructions() {
    alert('Press SPACE or click to make the bird fly. Avoid the pipes!');
  }
}
