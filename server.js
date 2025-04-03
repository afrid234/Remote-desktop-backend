const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

require('dotenv').config(); // For environment variables

const isValidToken = (token) => {
    const validTokens = process.env.TOKEN; // Replace with your valid tokens
    return validTokens.includes(token);
};



io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
        console.error('Connection rejected: No token provided');
        return next(new Error('Authentication error: No token provided'));
    }

    if (!isValidToken(token)) {
        console.error('Connection rejected: Invalid token');
        return next(new Error('Authentication error: Invalid token'));
    }

    console.log('Authentication successful for token:', token);
    next();
});

// Handle WebRTC signaling with room-based logic
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Join a room
  socket.on('join-room', (roomId) => {
    console.log(`${socket.id} joined room: ${roomId}`);
    socket.join(roomId);
    socket.roomId = roomId; // Save the room ID for this socket

     // Get room size
            const roomSize = io.sockets.adapter.rooms.get(roomId)?.size || 0;

    // Emit the room size to all clients in the room
    io.to(roomId).emit("roomSize", roomSize);

  });


      socket.on('destroy', () => {
     
        // Broadcast to other clients in the room
        socket.to(socket.roomId).emit('destroy', "Destroy");
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

   socket.on('input-event', (data) => {
    console.log('Received input event:', data);
    // Broadcast the event to all connected clients
    socket.broadcast.emit('input-event', data);
  });

  // Handle receiving the H.264 encoded frame
  socket.on('frame', (data) => {
    console.log('Received , size:', data);


    // Broadcast to other clients in the room
    socket.to(socket.roomId).emit('frame', data);
  });



  // Handle disconnection
  socket.on('disconnect', () => {

     const roomId = socket.roomId;

    if (roomId) {
        // Leave the room
        socket.leave(roomId);

        // Get the updated room size
        const roomSize = io.sockets.adapter.rooms.get(roomId)?.size || 0;

        // Emit the updated room size to all clients in the room
        io.to(roomId).emit("roomSize", roomSize);
        io.to(roomId).emit("lost", roomSize);

        console.log(`User ${socket.id} disconnected from room ${roomId}. Room size: ${roomSize}`);
    }

   // console.log('A user disconnected:', socket.id);

  });


});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

