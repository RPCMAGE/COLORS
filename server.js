const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer();
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Room storage: roomCode -> { players, state, timer }
const rooms = new Map();

// Generate random 6-digit code
function generateRoomCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Clean up empty rooms
function cleanupRoom(roomCode) {
    const room = rooms.get(roomCode);
    if (room && room.players.length === 0) {
        rooms.delete(roomCode);
    }
}

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    // Create room
    socket.on('createRoom', () => {
        const roomCode = generateRoomCode();
        rooms.set(roomCode, {
            players: [{ id: socket.id, name: 'Player', ready: false }],
            state: 'waiting', // waiting, betting, rolling, results
            timer: null,
            timeLeft: 60,
            diceResults: null,
            round: 0
        });
        
        socket.join(roomCode);
        socket.emit('roomCreated', roomCode);
        io.to(roomCode).emit('roomUpdate', rooms.get(roomCode));
    });

    // Join room
    socket.on('joinRoom', (roomCode) => {
        const room = rooms.get(roomCode);
        if (!room) {
            socket.emit('joinError', 'Room not found');
            return;
        }

        if (room.players.length >= 6) {
            socket.emit('joinError', 'Room is full');
            return;
        }

        socket.join(roomCode);
        room.players.push({ id: socket.id, name: 'Player', ready: false });
        socket.emit('roomJoined', roomCode);
        io.to(roomCode).emit('roomUpdate', room);
    });

    // Update player bet status
    socket.on('playerReady', (roomCode, playerData) => {
        const room = rooms.get(roomCode);
        if (!room) return;

        const player = room.players.find(p => p.id === socket.id);
        if (player) {
            player.ready = true;
            player.betData = playerData; // Store for results display
        }

        // Check if all players ready
        const allReady = room.players.every(p => p.ready || p.id !== socket.id);
        if (allReady && room.state === 'betting') {
            startRoll(roomCode);
        } else {
            io.to(roomCode).emit('roomUpdate', room);
        }
    });

    // Start betting phase
    socket.on('startGame', (roomCode) => {
        const room = rooms.get(roomCode);
        if (!room || room.players.length < 1) return;

        room.state = 'betting';
        room.timeLeft = 60;
        room.players.forEach(p => p.ready = false);

        // Start timer
        startBettingTimer(roomCode);
        io.to(roomCode).emit('gameStarted', room);
    });

    // Start roll (when timer ends or all ready)
    function startRoll(roomCode) {
        const room = rooms.get(roomCode);
        if (!room || room.state !== 'betting') return;

        // Generate dice results (same for everyone)
        const colors = ['yellow', 'orange', 'pink', 'blue', 'green', 'red'];
        room.diceResults = [
            colors[Math.floor(Math.random() * colors.length)],
            colors[Math.floor(Math.random() * colors.length)],
            colors[Math.floor(Math.random() * colors.length)]
        ];

        room.state = 'results';
        room.round++;

        if (room.timer) {
            clearInterval(room.timer);
            room.timer = null;
        }

        io.to(roomCode).emit('diceRolled', room.diceResults, room);
    }

    // Betting timer
    function startBettingTimer(roomCode) {
        const room = rooms.get(roomCode);
        if (!room) return;

        if (room.timer) clearInterval(room.timer);

        room.timer = setInterval(() => {
            room.timeLeft--;
            io.to(roomCode).emit('timerUpdate', room.timeLeft);

            if (room.timeLeft <= 0) {
                startRoll(roomCode);
            }
        }, 1000);
    }

    // Leave room
    socket.on('leaveRoom', (roomCode) => {
        const room = rooms.get(roomCode);
        if (room) {
            const index = room.players.findIndex(p => p.id === socket.id);
            if (index > -1) {
                room.players.splice(index, 1);
                socket.leave(roomCode);
                io.to(roomCode).emit('roomUpdate', room);
                cleanupRoom(roomCode);
            }
        }
    });

    // Disconnect
    socket.on('disconnect', () => {
        rooms.forEach((room, code) => {
            const index = room.players.findIndex(p => p.id === socket.id);
            if (index > -1) {
                room.players.splice(index, 1);
                io.to(code).emit('roomUpdate', room);
                cleanupRoom(code);
            }
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

