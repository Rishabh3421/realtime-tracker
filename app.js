const express = require("express");
const app = express();
const socketio = require("socket.io");
const http = require("http");
const path = require("path");
const ejs = require("ejs");

const server = http.createServer(app);
const io = socketio(server);

// Set up the view engine and views directory
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
    console.log("User connected");

    // Listen for "send-location" events and broadcast the location to all clients
    socket.on("send-location", (data) => {
        io.emit("receive-location", { id: socket.id, ...data });
    });

    // Notify all clients when a user disconnects
    socket.on("disconnect", function(){
        console.log("User disconnected");
        io.emit("user-disconnected", socket.id);  // Broadcast the disconnected user's ID to all clients
    })
});

// Render the index.ejs file for the root route
app.get("/", (req, res) => {
    res.render("index");
});

// Start the server
server.listen(3000, () => {
    console.log("Server is running on port 3000");
});
