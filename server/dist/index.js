"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
// Serve static files from the Angular dist directory
app.use(express_1.default.static(path_1.default.join(__dirname, '../../dist/flappy-bird-web/browser')));
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: process.env.NODE_ENV === 'production' ? false : "http://localhost:4200",
        methods: ["GET", "POST"]
    }
});
const players = new Map();
let gameStarted = false;
io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);
    socket.on('joinGame', (data) => {
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
    socket.on('updateScore', (data) => {
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
// Handle Angular routing
app.get('*', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../../dist/flappy-bird-web/browser/index.html'));
});
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
