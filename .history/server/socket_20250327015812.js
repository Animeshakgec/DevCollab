const { Server } = require("socket.io");
const ACTIONS = require("./Actions"); // Import action types

// Stores mappings of socket IDs to usernames
const userSocketMap = {};
// Stores the latest code for each room
const roomCodeMap = {};
// Tracks users in each room
const roomUsers = {};
// Stores chat messages for each room
const roomMessages = {};

/**
 * Returns a list of unique users connected to a given room.
 * @param {object} io - The socket.io instance
 * @param {string} roomId - The room ID
 * @returns {Array} - Array of users [{ socketId, username }]
 */
function getAllConnectedClients(io, roomId) {
    const uniqueUsers = new Map();
    Array.from(io.sockets.adapter.rooms.get(roomId) || []).forEach((socketId) => {
        const username = userSocketMap[socketId];
        if (username) {
            uniqueUsers.set(username, { socketId, username });
        }
    });
    return Array.from(uniqueUsers.values());
}

/**
 * Initializes the WebSocket server and handles real-time events.
 * @param {object} server - The HTTP server instance
 * @returns {object} - The Socket.IO server instance
 */
function initializeSocket(server) {
    const io = new Server(server, {
        cors: { origin: "*", methods: ["GET", "POST"] },
    });

    io.on("connection", (socket) => {
        console.log("Socket connected:", socket.id);

        // User joins a room
        socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
            console.log("User joined:", { roomId, username, socketId: socket.id });
            
            // Remove previous connection if the same user rejoins
            const existingSockets = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
            existingSockets.forEach((existingSocketId) => {
                if (userSocketMap[existingSocketId] === username) {
                    const existingSocket = io.sockets.sockets.get(existingSocketId);
                    if (existingSocket && existingSocket.id !== socket.id) {
                        existingSocket.leave(roomId);
                        delete userSocketMap[existingSocketId];
                    }
                }
            });

            userSocketMap[socket.id] = username;
            socket.join(roomId);
            
            if (!roomUsers[roomId]) roomUsers[roomId] = new Set();
            roomUsers[roomId].add(username);

            // Notify all clients in the room about the new user
            const clients = getAllConnectedClients(io, roomId);
            io.to(roomId).emit(ACTIONS.JOINED, { clients, username, socketId: socket.id });

            // Send the latest code to the new user
            if (roomCodeMap[roomId]) {
                socket.emit(ACTIONS.CODE_CHANGE, { code: roomCodeMap[roomId] });
            }

            if (!roomMessages[roomId]) {
                roomMessages[roomId] = [];
            }
        });

        // Broadcast code changes to all users except the sender
        socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
            roomCodeMap[roomId] = code;
            socket.to(roomId).emit(ACTIONS.CODE_CHANGE, { code });
        });

        // Sync latest code for new users
        socket.on(ACTIONS.SYNC_CODE, ({ socketId, roomId, code }) => {
            if (code !== undefined) {
                roomCodeMap[roomId] = code;
            }
            if (roomCodeMap[roomId]) {
                io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code: roomCodeMap[roomId] });
            }
        });

        // Handle user messages
        socket.on(ACTIONS.SEND_MESSAGE, ({ roomId, message, username }) => {
            console.log("Server received message:", { roomId, message, username });
            const messageData = { id: Date.now(), username, message, timestamp: new Date().toISOString() };

            if (!roomMessages[roomId]) roomMessages[roomId] = [];
            roomMessages[roomId].push(messageData);
            if (roomMessages[roomId].length > 100) {
                roomMessages[roomId] = roomMessages[roomId].slice(-100);
            }

            io.to(roomId).emit(ACTIONS.RECEIVE_MESSAGE, messageData);
        });

        // Fetch previous messages for a room
        socket.on(ACTIONS.FETCH_MESSAGES, ({ roomId }) => {
            console.log("Fetching messages for room:", roomId);
            const messages = roomMessages[roomId] || [];
            socket.emit(ACTIONS.FETCH_MESSAGES, { messages });
        });

        // Handle user disconnection and cleanup
        socket.on("disconnecting", () => {
            const rooms = Array.from(socket.rooms);
            rooms.forEach((roomId) => {
                if (roomId !== socket.id) {
                    const username = userSocketMap[socket.id];
                    const hasOtherConnections = Array.from(io.sockets.adapter.rooms.get(roomId) || [])
                        .some((sid) => sid !== socket.id && userSocketMap[sid] === username);

                    if (!hasOtherConnections) {
                        socket.to(roomId).emit(ACTIONS.DISCONNECTED, { socketId: socket.id, username });
                        if (roomUsers[roomId]) {
                            roomUsers[roomId].delete(username);
                            if (roomUsers[roomId].size === 0) {
                                delete roomUsers[roomId];
                                delete roomCodeMap[roomId];
                                delete roomMessages[roomId];
                            }
                        }
                    }
                }
            });
            delete userSocketMap[socket.id];
        });
    });

    return io;
}

module.exports = { initializeSocket };
