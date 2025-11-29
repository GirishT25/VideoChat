const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

const PORT = 5000;

io.on("connection", (socket) => {
  console.log("User connected: " + socket.id);

  socket.on("join-room", (roomID, userID) => {
    socket.join(roomID);
    socket.to(roomID).emit("user-connected", userID);

    socket.on("disconnect", () => {
      socket.to(roomID).emit("user-disconnected", userID);
    });

    socket.on("signal", (data) => {
      io.to(data.target).emit("signal", {
        signal: data.signal,
        sender: socket.id,
      });
    });
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
