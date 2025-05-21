// components/ChatInterface.js
'use client';
import { useState, useRef, useEffect } from 'react';
import styles from '../../styles/ChatInterface.module.css';
import WelcomeScreen from './WelcomeScreen';
import ChatMessage from './ChatMessage';
import { BsPaperclip, BsX } from 'react-icons/bs';
import { IoSend } from 'react-icons/io5';

const DUMMY_CHATS = [
  { id: 1, messages: [] }
];

export default function ChatInterface({ sidebarOpen, darkMode }) {
  const [chats, setChats] = useState(DUMMY_CHATS);
  const [currentChat, setCurrentChat] = useState(1);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [files, setFiles] = useState([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  // Handle file selection
  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  // Open file selector
  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  // Remove a file
  const removeFile = (fileToRemove) => {
    setFiles(files.filter(file => file !== fileToRemove));
  };

  // Handle sending a message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() && files.length === 0) return;

    // Add user message
    const userMessage = {
      role: 'user',
      content: input,
      files: files.length > 0 ? [...files] : undefined
    };
    
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setFiles([]);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    // Simulate bot typing
    setIsTyping(true);
    
    // Simulate response (replace with actual API call later)
    setTimeout(() => {
      setIsTyping(false);
      setMessages([
        ...newMessages,
        { 
          role: 'assistant', 
          content: `Hello from X-Gaming AI! You said: "${input}"${files.length > 0 ? ` And you uploaded ${files.length} file(s).` : ''}` 
        }
      ]);
    }, 1000);
  };

  // Handle textarea key press (for shift+enter)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  return (
    <div className={`${styles.chatInterface} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
      {messages.length === 0 ? (
        <WelcomeScreen darkMode={darkMode} />
      ) : (
        <div className={styles.chatContainer}>
          <div className={styles.messagesContainer}>
            {messages.map((message, index) => (
              <ChatMessage 
                key={index} 
                role={message.role} 
                content={message.content}
                files={message.files}
                darkMode={darkMode}
              />
            ))}
            {isTyping && (
              <div className={styles.typingIndicator}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}
      
      <div className={styles.inputContainer}>
        {files.length > 0 && (
          <div className={styles.filePreviewContainer}>
            {files.map((file, index) => (
              <div key={index} className={styles.filePreview}>
                <span className={styles.fileName}>{file.name}</span>
                <button 
                  className={styles.removeFileBtn}
                  onClick={() => removeFile(file)}
                  aria-label="Remove file"
                >
                  <BsX />
                </button>
              </div>
            ))}
          </div>
        )}
        
        <form className={styles.inputForm} onSubmit={handleSendMessage}>
          <button 
            type="button" 
            className={styles.fileButton}
            onClick={openFileSelector}
            aria-label="Attach files"
          >
            <BsPaperclip className={styles.fileIcon} />
          </button>
          
          <textarea
            ref={textareaRef}
            rows="1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message X-Gaming AI..."
            className={styles.chatInput}
          />
          
          <button 
            type="submit" 
            className={`${styles.sendButton} ${!input.trim() && files.length === 0 ? styles.disabled : ''}`}
            disabled={!input.trim() && files.length === 0}
          >
            <IoSend className={styles.sendIcon} />
          </button>
          
          <input 
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            multiple
          />
        </form>
      </div>
    </div>
  );
}