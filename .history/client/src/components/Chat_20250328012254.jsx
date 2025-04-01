import React, { useState, useEffect, useRef } from 'react';

const ACTIONS = {
  JOIN: "join",
  JOINED: "joined",
  DISCONNECTED: "disconnected",
  CODE_CHANGE: "code-change",
  SYNC_CODE: "sync-code",
  LEAVE: "leave",
  SEND_MESSAGE: "send-message",
  RECEIVE_MESSAGE: "receive-message",
  FETCH_MESSAGES: "fetch-messages",
  GET_MESSAGES: "get-messages",
};

const Chat = ({ socketRef, roomId, username }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!socketRef.current || !socketRef.current.connected) return;

    socketRef.current.emit(ACTIONS.FETCH_MESSAGES, { roomId });

    const handleFetchedMessages = (data) => {
      setMessages(data.messages || []);
    };

    const handleNewMessage = (messageData) => {
      setMessages((prev) => [...prev, messageData]);
    };

    socketRef.current.on(ACTIONS.RECEIVE_MESSAGE, handleNewMessage);
    socketRef.current.on(ACTIONS.FETCH_MESSAGES, handleFetchedMessages);

    return () => {
      socketRef.current.off(ACTIONS.RECEIVE_MESSAGE, handleNewMessage);
      socketRef.current.off(ACTIONS.FETCH_MESSAGES, handleFetchedMessages);
    };
  }, [roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!socketRef.current || !socketRef.current.connected || !newMessage.trim()) return;

    const messageData = {
      roomId,
      message: newMessage.trim(),
      username,
    };

    try {
      socketRef.current.emit(ACTIONS.SEND_MESSAGE, messageData);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white w-96 overflow-hidden border-r border-gray-700">
      {/* Header */}
      <div className="p-3 border-b border-gray-700 bg-gray-800">
        <p className="text-center text-lg font-semibold text-indigo-400">Group Chat</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {messages.length > 0 ? (
          messages.map((message) => (
            <div
              key={message.id || message.timestamp}
              className={`p-3 rounded-lg shadow-md ${
                message.username === username
                  ? 'bg-indigo-500 text-white ml-auto'
                  : 'bg-gray-700 text-gray-200'
              } max-w-[85%]`}
            >
              <div className="flex justify-between items-center mb-1">
                <p className="text-sm font-medium">
                  {message.username === username ? 'You' : message.username}
                </p>
                <p className="text-xs text-gray-400">{formatTimestamp(message.timestamp)}</p>
              </div>
              <p className="text-sm">{message.message}</p>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500">No messages yet</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-700 bg-gray-800">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            type="submit"
            disabled={!socketRef.current?.connected}
            className={`px-5 py-2 rounded-lg transition-all font-medium ${
              socketRef.current?.connected
                ? 'bg-indigo-500 text-white hover:bg-indigo-400'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {socketRef.current?.connected ? 'Send' : 'Connecting...'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;
