import React, { useEffect, useRef, useState } from 'react';
import Codemirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/material.css';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/python/python';
import 'codemirror/mode/xml/xml';
import 'codemirror/mode/css/css';
import 'codemirror/mode/clike/clike';
import 'codemirror/addon/edit/closetag';
import 'codemirror/addon/edit/closebrackets';
import { FiDownload, FiChevronDown } from 'react-icons/fi';

const ACTIONS = {
  JOIN: "join",
  JOINED: "joined",
  DISCONNECTED: "disconnected",
  CODE_CHANGE: "code-change",
  SYNC_CODE: "sync-code",
  LEAVE: "leave",
};

const Editor = ({ socketRef, roomId, onCodeChange, onLanguageChange }) => {
    const editorRef = useRef(null);
    const [language, setLanguage] = useState('javascript');
    const [code, setCode] = useState('');
    
    const languages = [
        { value: 'javascript', label: 'JavaScript' },
        { value: 'python', label: 'Python' },
        { value: 'java', label: 'Java' },
        { value: 'cpp', label: 'C++' }
    ];

    const getModeForLanguage = (lang) => {
        switch (lang) {
            case 'javascript':
                return { name: 'javascript', json: true };
            case 'python':
                return { name: 'python' };
            case 'java':
            case 'cpp':
                return { name: 'text/x-c++src' };
            default:
                return { name: 'javascript', json: true };
        }
    };
    
    const getFileExtension = (lang) => {
        const extensions = {
            'javascript': '.js',
            'python': '.py',
            'java': '.java',
            'cpp': '.cpp',
        };
        return extensions[lang] || '.txt';
    };

    const handleDownload = () => {
        const content = editorRef.current?.getValue() || '';
        const extension = getFileExtension(language);
        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `code${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    useEffect(() => {
        if (!socketRef.current) return;

        async function init() {
            editorRef.current = Codemirror.fromTextArea(
                document.getElementById('realtimeEditor'),
                {
                    mode: getModeForLanguage(language),
                    theme: 'material',
                    autoCloseTags: true,
                    autoCloseBrackets: true,
                    lineNumbers: true,
                    lineWrapping: false,
                    scrollbarStyle: 'native',
                    tabSize: 4,
                    indentUnit: 4,
                }
            );

            // Set editor size to fill container
            editorRef.current.setSize('100%', '100%');

            // Listen for code changes from other users
            socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
                if (code !== null && editorRef.current && code !== editorRef.current.getValue()) {
                    editorRef.current.setValue(code);
                    setCode(code);
                }
            });

            // Handle code changes
            editorRef.current.on('change', (instance, changes) => {
                const { origin } = changes;
                const code = instance.getValue();
                setCode(code);
                onCodeChange(code);
                if (origin !== 'setValue') {
                    socketRef.current.emit(ACTIONS.CODE_CHANGE, {
                        roomId,
                        code,
                    });
                }
            });

            // Request initial code sync
            socketRef.current.emit(ACTIONS.SYNC_CODE, {
                socketId: socketRef.current.id,
                roomId,
                code: editorRef.current.getValue()
            });
        }
        
        init();

        return () => {
            // Cleanup
            socketRef.current?.off(ACTIONS.CODE_CHANGE);
            if (editorRef.current) {
                editorRef.current.toTextArea();
                editorRef.current = null;
            }
        };
    }, [socketRef.current, roomId, language]);

    const handleLanguageChange = (e) => {
        const newLang = e.target.value;
        setLanguage(newLang);
        if (editorRef.current) {
            editorRef.current.setOption('mode', getModeForLanguage(newLang));
            editorRef.current.refresh();
        }
        onLanguageChange?.(newLang);
    };

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] min-w-0">
            <div className="flex items-center justify-between p-2 bg-[#1e1e1e] border-b border-[#333]">
                <div className="relative inline-block">
                    <select
                        value={language}
                        onChange={handleLanguageChange}
                        className="appearance-none bg-[#2d2d2d] text-white rounded px-4 py-2 pr-10 focus:outline-none focus:ring-1 focus:ring-[#EEEEEE] focus:border-transparent hover:bg-[#3d3d3d] transition-colors duration-200 text-sm min-w-[140px]"
                    >
                        {languages.map((lang) => (
                            <option 
                                key={lang.value} 
                                value={lang.value}
                                className="bg-[#2d2d2d] hover:bg-[#3d3d3d] py-2"
                            >
                                {lang.label}
                            </option>
                        ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white">
                        <FiChevronDown className="h-4 w-4" />
                    </div>
                </div>
                <span className="text-[#bbb8ff] text-lg">
                    Code Together
                </span>
                <button
                    onClick={handleDownload}
                    className="bg-[#2d2d2d] text-white rounded px-4 py-2 hover:bg-[#3d3d3d] focus:outline-none focus:ring-1 focus:ring-[#EEEEEE] focus:border-transparent transition-colors duration-200 text-sm flex items-center gap-2"
                >
                    <FiDownload className="h-4 w-4" />
                    Download
                </button>
            </div>
            <div className="flex-1 h-[calc(100vh-6rem)] relative">
                <div className="absolute inset-0">
                    <textarea id="realtimeEditor"></textarea>
                    <style jsx global>{`
                        .CodeMirror {
                            position: absolute;
                            top: 0;
                            right: 0;
                            bottom: 0;
                            left: 0;
                            height: 100% !important;
                            width: 100% !important;
                            font-size: 16px;
                            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                            background: #1e1e1e !important;
                            color: #d4d4d4;
                        }
                        .CodeMirror-scroll {
                            overflow-x: auto !important;
                            overflow-y: auto !important;
                        }
                        .CodeMirror-gutters {
                            background: #1e1e1e !important;
                            border-right: 1px solid #333 !important;
                        }
                        .CodeMirror-linenumber {
                            color: #858585 !important;
                            padding: 0 8px !important;
                        }
                        .CodeMirror-cursor {
                            border-left: 2px solid #a6a6a6 !important;
                        }
                        .CodeMirror-selected {
                            background: #264f78 !important;
                        }
                        .CodeMirror-line {
                            padding: 0 8px !important;
                        }
                        /* VS Code-like syntax highlighting */
                        .cm-keyword { color: #569cd6 !important; }         /* blue */
                        .cm-operator { color: #d4d4d4 !important; }       /* light gray */
                        .cm-variable { color: #9cdcfe !important; }       /* light blue */
                        .cm-variable-2 { color: #9cdcfe !important; }     /* light blue */
                        .cm-variable-3 { color: #9cdcfe !important; }     /* light blue */
                        .cm-builtin { color: #4ec9b0 !important; }        /* teal */
                        .cm-atom { color: #569cd6 !important; }           /* blue */
                        .cm-number { color: #b5cea8 !important; }         /* light green */
                        .cm-def { color: #9cdcfe !important; }           /* light blue */
                        .cm-string { color: #ce9178 !important; }         /* brown-orange */
                        .cm-string-2 { color: #ce9178 !important; }       /* brown-orange */
                        .cm-comment { color: #6a9955 !important; }        /* green */
                        .cm-tag { color: #569cd6 !important; }            /* blue */
                        .cm-attribute { color: #9cdcfe !important; }      /* light blue */
                        .cm-property { color: #9cdcfe !important; }       /* light blue */
                        .cm-qualifier { color: #9cdcfe !important; }      /* light blue */
                        .cm-meta { color: #569cd6 !important; }           /* blue */
                        .cm-header { color: #569cd6 !important; }         /* blue */
                        .cm-bracket { color: #808080 !important; }        /* gray */
                        .cm-link { color: #569cd6 !important; }           /* blue */
                        .cm-error { color: #f44747 !important; }          /* red */

                        /* Active line highlight */
                        .CodeMirror-activeline-background {
                            background: #2c2c2c !important;
                        }
                        .CodeMirror-matchingbracket {
                            color: #fff !important;
                            border-bottom: 1px solid #569cd6 !important;
                            background: transparent !important;
                        }
                        
                        /* Scrollbar styling */
                        .CodeMirror-hscrollbar {
                            height: 12px !important;
                        }
                        .CodeMirror-vscrollbar {
                            width: 12px !important;
                        }
                        .CodeMirror-scrollbar-filler {
                            background: #1e1e1e !important;
                        }
                        .CodeMirror-hscrollbar::-webkit-scrollbar,
                        .CodeMirror-vscrollbar::-webkit-scrollbar {
                            width: 12px;
                            height: 12px;
                            background-color: #1e1e1e;
                        }
                        .CodeMirror-hscrollbar::-webkit-scrollbar-thumb,
                        .CodeMirror-vscrollbar::-webkit-scrollbar-thumb {
                            background-color: #424242;
                            border-radius: 6px;
                            border: 2px solid #1e1e1e;
                        }
                        .CodeMirror-hscrollbar::-webkit-scrollbar-track,
                        .CodeMirror-vscrollbar::-webkit-scrollbar-track {
                            background-color: #1e1e1e;
                        }
                        
                        /* Selection color */
                        ::selection {
                            background: #264f78 !important;
                        }
                    `}</style>
                </div>
            </div>
        </div>
    );
};

export default Editor; 