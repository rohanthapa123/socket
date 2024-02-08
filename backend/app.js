const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const Message = require("./userModel");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files (if needed)
app.use(express.static(__dirname + "/public"));
app.use(cors());

// Connect to MongoDB
mongoose
  .connect("mongodb://localhost:27017/chatapp", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });

// Handling socket connections
io.on("connection", (socket) => {
  console.log("User connected: " + socket.id);

  // Handle user and doctor messages
  socket.on("message", async (data) => {
    console.log("Received message", data);

    // Broadcast the message to all connected clients
    try {
      // Save the message to MongoDB
      const newMessage = new Message({
        sender: data.sender,
        receiver: data.receiver,
        content: data.message,
      });

      const savedMessage = await newMessage.save();

      // Emit the message to all connected clients
      io.emit("message", {
        user: savedMessage.sender,
        message: savedMessage.content,
      });
    } catch (error) {
      console.error("Error saving message:", error);
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected: " + socket.id);
  });
});

app.get("/messages", async (req, res) => {
  try {
    const { sender, receiver } = req.query;

    const messages = await Message.find({
      $or: [
        { sender, receiver },
        { sender: receiver, receiver: sender },
      ],
    }).sort({ createdAt: 1 }); // Correct the field name here

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error retrieving messages:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
