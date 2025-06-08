import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

interface Player {
  id: string;
  name: string;
  score: number;
  isReady: boolean;
  isFinished: boolean;
}

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:4200",
    methods: ["GET", "POST"]
  }
});

const players = new Map<string, Player>();
let gameStarted = false;

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('joinGame', (data: { name: string }) => {
    console.log('Player joined:', data.name);
    players.set(socket.id, {
      id: socket.id,
      name: data.name,
      score: 0,
      isReady: false,
      isFinished: false
    });
    io.emit('players', Array.from(players.values()));
  });

  socket.on('playerReady', () => {
    console.log('Player ready:', socket.id);
    const player = players.get(socket.id);
    if (player) {
      player.isReady = true;
      io.emit('players', Array.from(players.values()));

      // Check if all players are ready
      const allReady = Array.from(players.values()).every(p => p.isReady);
      if (allReady) {
        console.log('All players ready, starting game');
        gameStarted = true;
        io.emit('gameStart');
      }
    }
  });

  socket.on('updateScore', (data: { score: number }) => {
    console.log('Score update:', socket.id, data.score);
    const player = players.get(socket.id);
    if (player) {
      player.score = data.score;
      io.emit('players', Array.from(players.values()));
    }
  });

  socket.on('gameOver', () => {
    console.log('Game over for player:', socket.id);
    const player = players.get(socket.id);
    if (player) {
      player.isFinished = true;
      io.emit('players', Array.from(players.values()));

      // Check if all players are done
      const allDone = Array.from(players.values()).every(p => p.isFinished);
      if (allDone) {
        console.log('All players done, ending game');
        gameStarted = false;
        io.emit('gameEnd', Array.from(players.values()));
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    players.delete(socket.id);
    io.emit('players', Array.from(players.values()));

    // If no players left, reset game state
    if (players.size === 0) {
      gameStarted = false;
    }
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 