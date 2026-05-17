const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

let masterSocketId = null;

app.get('/', (req, res) => {
    res.send('LinkPulse Cloud Server Running Successfully!');
});

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Identify role
    socket.on('register', (role) => {
        if (role === 'master') {
            masterSocketId = socket.id;
            console.log('Master registered:', socket.id);
            socket.broadcast.emit('master-status', { status: 'online' });
        } else if (role === 'slave') {
            console.log('Slave registered:', socket.id);
            if (masterSocketId) {
                socket.emit('master-status', { status: 'online' });
            }
        }
    });

    // Master commands forwarded to slaves
    socket.on('master-command', (data) => {
        if (socket.id === masterSocketId) {
            socket.broadcast.emit('slave-command', data);
        }
    });

    // Slave status/responses forwarded back to Master
    socket.on('slave-response', (data) => {
        if (masterSocketId) {
            io.to(masterSocketId).emit('master-display', data);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        if (socket.id === masterSocketId) {
            masterSocketId = null;
            console.log('Master went offline');
            socket.broadcast.emit('master-status', { status: 'offline' });
        }
    });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
