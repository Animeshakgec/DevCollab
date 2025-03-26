const express = require("express");
const app = express();
const http = require("http");
const cors = require("cors");
const server = http.createServer(app);
const { initializeSocket } = require("./socket");
require("dotenv").config();

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Initialize socket.io
initializeSocket(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
