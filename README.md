# COLORS - Arcade Betting Game

A multiplayer dice betting game with synchronized gameplay.

## Setup

### Install Dependencies
```bash
npm install
```

### Run Server
```bash
npm start
```

The server will run on port 3000 (or PORT environment variable).

### Run Client
Open `index.html` in a browser, or serve it with:
```bash
python -m http.server 8080
```

Then navigate to `http://localhost:8080`

## Multiplayer Mode

1. Click "Multiplayer" button
2. Create a room (host) or join with a 6-digit code
3. Host starts the game
4. All players place bets within 60 seconds
5. Dice roll automatically when timer ends or all players ready
6. Results are synchronized for all players

## Game Modes

- **Normal**: Standard betting with 5% house edge
- **Time Attack**: Fast-paced with 3% house edge
- **Multiplayer**: Synchronized gameplay with friends

