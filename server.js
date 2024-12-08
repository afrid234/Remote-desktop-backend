const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve a basic route
app.get('/', (req, res) => {
  res.send('WebRTC Signaling Server is running with room support.');
});

// Handle WebRTC signaling with room-based logic
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Join a room
  socket.on('join-room', (roomId) => {
    console.log(`${socket.id} joined room: ${roomId}`);
    socket.join(roomId);
    socket.roomId = roomId; // Save the room ID for this socket
  });

  // Relay signaling messages within the room
  socket.on('offer', (data) => {
    console.log('Offer received:', data);
    socket.to(socket.roomId).emit('offer', data); // Broadcast to room
  });

  socket.on('answer', (data) => {
    console.log('Answer received:', data);
    socket.to(socket.roomId).emit('answer', data); // Broadcast to room
  });

  socket.on('candidate', (data) => {
    console.log('ICE Candidate received:', data);
    socket.to(socket.roomId).emit('candidate', data); // Broadcast to room
  });

  // Handle receiving the H.264 encoded frame
  socket.on('frame', (data) => {
    console.log('Received H.264 frame, size:', data.length);

    // Optionally, save the frame for debugging
    fs.appendFileSync('frames.h264', data);  // Save the frame to a file for testing

    // Broadcast to other clients in the room
    socket.to(socket.roomId).emit('frame', data);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

