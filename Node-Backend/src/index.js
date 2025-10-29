/** @format */

import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";
import http from "http";
import { Server } from "socket.io";
import { handleNewChatMessage } from "./Controllers/chat.controller.js"; // Assuming you create this

dotenv.config({ path: "./.env" });

const PORT = process.env.PORT || 8000;
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  pingTimeout: 60000,
  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",")
      : ["http://localhost:5173"],
    credentials: true,
  },
});
app.set("io", io);

io.on("connection", (socket) => {
  console.log("✅ A user connected:", socket.id);

  socket.on("joinConversation", (conversationId) => {
    socket.join(conversationId);
    console.log(`User ${socket.id} joined conversation ${conversationId}`);
  });

  socket.on("sendMessage", (data) => {
    console.log("called");
    handleNewChatMessage(socket, data);
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

// --- Start the Server ---
connectDB()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server is running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MONGO db connection failed !!! ", err);
  });
