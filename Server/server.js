const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});


// store room sizes
const rooms = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", ({ room }) => {
    socket.join(room);

    if (!rooms[room]) rooms[room] = 0;
    rooms[room]++;

    console.log(`User ${socket.id} joined room ${room}. Count: ${rooms[room]}`);

    if (rooms[room] === 2) {
      io.to(room).emit("ready");
    }
  });

  socket.on("offer", (payload) => {
    socket.to(payload.room).emit("offer", payload);
  });

  socket.on("answer", (payload) => {
    socket.to(payload.room).emit("answer", payload);
  });

  socket.on("ice-candidate", (payload) => {
    socket.to(payload.room).emit("ice-candidate", payload);
  });

  socket.on("chat", (payload) => {
    io.to(payload.room).emit("chat", payload);
  });

  socket.on("leave", ({ room }) => {
    socket.leave(room);
    if (rooms[room]) rooms[room]--;
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

server.listen(5000, () => {
  console.log("Signaling Server running on port 5000");
});
