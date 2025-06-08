# Flappy Bird Multiplayer

A multiplayer version of the classic Flappy Bird game built with Angular and Socket.IO.

## Features

- Real-time multiplayer gameplay
- Player lobby with ready system
- Score tracking
- Responsive design
- Touch and keyboard controls

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/flappy-bird-web.git
cd flappy-bird-web
```

2. Install client dependencies:
```bash
npm install
```

3. Install server dependencies:
```bash
cd server
npm install
cd ..
```

## Running the Application

1. Start the server:
```bash
cd server
npm run dev
```

2. In a new terminal, start the client:
```bash
npm start
```

3. Open your browser and navigate to `http://localhost:4200`

## How to Play

1. Enter your name and click "Join Game"
2. Wait for other players to join
3. Click "I'm Ready" when you want to start
4. Use spacebar, mouse click, or touch to make the bird jump
5. Avoid pipes and try to get the highest score

## Development

- Client code is in the `src` directory
- Server code is in the `server` directory
- The game uses HTML5 Canvas for rendering
- Socket.IO handles real-time communication

## Technologies Used

- Angular 17
- TypeScript
- Socket.IO
- HTML5 Canvas
- Express.js
- Node.js

## License

MIT
