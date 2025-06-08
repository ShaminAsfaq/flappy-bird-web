import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { GameComponent } from './game/game.component';
import {SinglePlayerGameComponent} from './single-player-game/single-player-game.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'multiplayer', component: GameComponent },
  { path: 'single-player', component: SinglePlayerGameComponent },
  { path: '**', redirectTo: '' }
];
