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
  
    console.log('Setting up chat listeners for:', roomId);
    socketRef.current.emit(ACTIONS.FETCH_MESSAGES, { roomId });
  
    const handleFetchedMessages = (data) => {
      console.log('Fetched messages:', data.messages);
      setMessages(data.messages || []); // Ensure it's an array
    };
  
    const handleNewMessage = (messageData) => {
      console.log('Received new message:', messageData);
      setMessages((prev) => [...prev, messageData]);
    };
  
    socketRef.current.on(ACTIONS.RECEIVE_MESSAGE, handleNewMessage);
    socketRef.current.on(ACTIONS.FETCH_MESSAGES, handleFetchedMessages); 
  
    return () => {
      socketRef.current.off(ACTIONS.RECEIVE_MESSAGE, handleNewMessage);
      socketRef.current.off(ACTIONS.FETCH_MESSAGES, handleFetchedMessages);
    };
  }, [roomId]);
  


  // Scroll to bottom when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!socketRef.current) {
      console.log('Cannot send message: Socket not initialized');
      return;
    }

    if (!socketRef.current.connected) {
      console.log('Cannot send message: Socket not connected');
      return;
    }

    if (newMessage.trim()) {
      const messageData = {
        roomId,
        message: newMessage.trim(),
        username,
      };
      
      console.log('Sending message:', messageData);
      
      try {
        socketRef.current.emit(ACTIONS.SEND_MESSAGE, messageData);
        setNewMessage('');
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="h-full flex flex-col bg-[#232329] text-white w-96 overflow-hidden border-r border-[#393E46]">
      <div className="p-2 flex-shrink-0">
        <p className="text-center text-lg text-[#bbb8ff] mb-0">Group Chat</p>
      </div>
      
      <div className="flex-1 overflow-y-auto m-2 space-y-4 bg-[#393E46] p-2 rounded-lg custom-scrollbar">
        {messages && messages.length > 0 ? (
          messages.map((message) => (
            <div 
              key={message.id || message.timestamp} 
              className={`rounded-lg p-3 ${
                message.username === username 
                  ? 'bg-[#232329] ml-auto' 
                  : 'bg-[#31353b]'
              } max-w-[85%]`}
            >
              <div className="flex justify-between items-start">
                <p className="text-sm font-semibold text-[#bbb8ff]">
                  {message.username === username ? 'You' : message.username}
                </p>
                <p className="text-xs text-gray-300 ml-2">
                  {formatTimestamp(message.timestamp)}
                </p>
              </div>
              <p className="text-gray-100 break-words mb-0">{message.message}</p>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-400">No messages yet</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-2 flex-shrink-0">
        <div className="flex items-center gap-1 ">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 min-w-0 bg-[#393E46] text-white rounded px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#bbb8ff]"
          />
          <button
            type="submit"
            disabled={!socketRef.current?.connected}
            className={`px-6 py-2.5 rounded transition-colors whitespace-nowrap flex-shrink-0 font-medium
              ${socketRef.current?.connected 
                ? 'bg-[#bbb8ff] text-black hover:bg-[#aaaaff]'
                : 'bg-gray-500 cursor-not-allowed text-gray-300'}`}
          >
            {socketRef.current?.connected ? 'Send' : 'Connecting...'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat; 