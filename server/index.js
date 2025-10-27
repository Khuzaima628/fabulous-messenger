const http = require('http')
const express = require("express")
const cors = require("cors")
const socketIO = require("socket.io")
const app = express()
const port = process.env.PORT || 4500;
const server = http.createServer(app)

app.use(cors())

const io = socketIO(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
})

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

app.get('/', (req, res) => {
  res.send('Server is running!');
});

const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("A user connected");

  // When user joins
  socket.on("join_user", (data) => {
    socket.username = data.name;
    onlineUsers.set(socket.id, data.name);

    // Send updated list to all users
    io.emit("online_users_list", Array.from(onlineUsers.values()));


    socket.broadcast.emit("message", data);
    console.log(`${data.name} joined the chat`);
  });

  // When message is sent
  socket.on("message", (messageData) => {
    io.emit("message", messageData);

  });

  // When typing
  socket.on("typing", (typing) => {
    socket.broadcast.emit("typing", typing);
  });

  // Voice message
  socket.on("voice_message", (data) => {
    io.emit("receive_voice", data);
  });

  // When user disconnects
  socket.on("disconnect", () => {
    if (socket.username) {
      onlineUsers.delete(socket.id);

      // Send updated list again
      io.emit("online_users_list", Array.from(onlineUsers.values()));

      console.log(`${socket.username} disconnected`);
    }
  });
});