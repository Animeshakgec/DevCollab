import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useParams, useLocation, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Client from './Client';
import Editor from './Editor';
import Chat from './Chat';
import Run from './Run';
import { initSocket } from '../Socket';

const ACTIONS = {
    JOIN: "join",
    JOINED: "joined",
    DISCONNECTED: "disconnected",
    SYNC_CODE: "sync-code",
};

const EditorPage = () => {
    const { roomId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    
    // Extract username from location state
    const username = location.state?.username;
    
    const [clients, setClients] = useState([]);
    const [sidebarContent, setSidebarContent] = useState('clients');
    const [currentCode, setCurrentCode] = useState('');
    const [currentLanguage, setCurrentLanguage] = useState('javascript');
    const socketRef = useRef(null);
    const codeRef = useRef("");

    useEffect(() => {
            try {
                socketRef.current = initSocket();

                socketRef.current.on('connect_error', handleError);
                socketRef.current.on('connect_failed', handleError);

                function handleError(err) {
                    console.error('Socket connection error:', err);
                    toast.error('Socket connection failed.');
                    navigate('/');
                }

                socketRef.current.emit(ACTIONS.JOIN, { roomId, username });

                socketRef.current.on(ACTIONS.JOINED, ({ clients, socketId }) => {
                    setClients(clients);
                    if (socketId !== socketRef.current.id) {
                        socketRef.current.emit(ACTIONS.SYNC_CODE, {
                            code: codeRef.current,
                            socketId,
                        });
                    }
                });

                socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
                    toast.success(`${username} left the room.`);
                    setClients((prev) => prev.filter(client => client.socketId !== socketId));
                });

            } catch (err) {
                console.error('Socket initialization error:', err);
                toast.error('Could not connect to the server.');
                navigate('/');
            }
        return () => {
            if (socketRef.current) {
                socketRef.current.off(ACTIONS.JOINED);
                socketRef.current.off(ACTIONS.DISCONNECTED);
                socketRef.current.off(ACTIONS.SYNC_CODE);
            }
        };
    }, [roomId, username, navigate]);

    const copyRoomId = async () => {
        try {
            await navigator.clipboard.writeText(roomId);
            toast.success('Room ID copied.');
        } catch {
            toast.error('Could not copy Room ID.');
        }
    };

    const handleCodeChange = (code) => {
        codeRef.current = code;
        setCurrentCode(code);
    };

    const handleLanguageChange = (language) => {
        setCurrentLanguage(language);
    };

    if (!username) return <Navigate to="/" />;

    const renderMainContent = () => {
        switch (sidebarContent) {
            case 'chat':
                return (
                    <>
                        <Chat socketRef={socketRef} roomId={roomId} username={username} />
                        <div className="flex-1">
                            <Editor 
                                socketRef={socketRef} 
                                roomId={roomId} 
                                onCodeChange={handleCodeChange}
                                onLanguageChange={handleLanguageChange}
                            />
                        </div>
                    </>
                );
            case 'run':
                return (
                    <>
                        <Run code={currentCode} language={currentLanguage} />
                        <div className="flex-1">
                            <Editor 
                                socketRef={socketRef} 
                                roomId={roomId} 
                                onCodeChange={handleCodeChange}
                                onLanguageChange={handleLanguageChange}
                            />
                        </div>
                    </>
                );
            default:
                return (
                    <>
                        <Client clients={clients} currentUsername={username} onCopyRoomId={copyRoomId} onLeaveRoom={() => navigate('/')} />
                        <div className="flex-1">
                            <Editor 
                                socketRef={socketRef} 
                                roomId={roomId} 
                                onCodeChange={handleCodeChange}
                                onLanguageChange={handleLanguageChange}
                            />
                        </div>
                    </>
                );
        }
    };

    return (
        <div className="flex h-screen">
            <Sidebar onToggle={setSidebarContent} />
            {renderMainContent()}
        </div>
    );
};

export default EditorPage;
