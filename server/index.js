const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const { v4: uuidv4 } = require("uuid");
const cors = require("cors");

app.use(express.json());

const db = {
  users: [],
  rooms: {},
};

app.use(cors());

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.get("/users", (req, res) => {
  res.json(db.users);
});

app.get("/users/search", (req, res) => {
  const { query, page, limit } = req.query;
  let results = db.users;

  console.log(query, page, limit);

  // Apply search query
  if (query) {
    results = db.users.filter((user) =>
      user.name.toLowerCase().includes(query.toLowerCase())
    );
  }

  console.log(results);
  // Apply pagination
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedResults = results.slice(startIndex, endIndex);
  console.log(paginatedResults);

  res.json({
    totalResults: results.length,
    totalPages: Math.ceil(results.length / limit),
    currentPage: page,
    users: paginatedResults,
  });
});

app.post("/signup", (req, res) => {
  if (db.users.find((user) => user.email === req.body.email)) {
    console.log(db.users);
    return res.status(400).json({ message: "User already exists" });
  }

  const newUser = {
    id: req.body.id,
    name: req.body.name,
    email: req.body.email,
    image: req.body.image,
  };

  db.users.push(newUser);
  console.log(db.users);
  res.json(newUser);
});

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("join_room", (data) => {
    const { sender, receiver } = data;

    if (db.rooms) {
      for (const room in db.rooms) {
        if (
          db.rooms[room].includes(sender) &&
          db.rooms[room].includes(receiver)
        ) {
          socket.join(room);
          console.log(db.rooms[room]);
          socket.emit("joined_room", room);
          return;
        }
      }
    }

    const roomId = uuidv4();
    db.rooms[roomId] = [sender, receiver];

    socket.join(roomId);
    console.log(db.rooms[roomId]);
    socket.emit("joined_room", roomId);
  });

  socket.on("send_message", (data) => {
    console.log(data);
    socket.to(data.room).emit("receive_message", data);
  });
});

server.listen(4000, () => {
  console.log("listening on *:4000");
});
