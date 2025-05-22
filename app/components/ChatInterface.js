// components/ChatInterface.js
'use client';
import { useState, useRef, useEffect } from 'react';
import styles from '../../styles/ChatInterface.module.css';
import WelcomeScreen from './WelcomeScreen';
import ChatMessage from './ChatMessage';
import { BsPaperclip, BsX } from 'react-icons/bs';
import { IoSend } from 'react-icons/io5';

export default function ChatInterface({ sidebarOpen, darkMode }) {
  // State for user input and chat messages
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false); // Shows "AI is thinking..." indicator
  const [files, setFiles] = useState([]); // Uploaded files before sending
  
  // Refs for DOM elements
  const messagesEndRef = useRef(null); // For auto-scrolling to bottom
  const fileInputRef = useRef(null); // For file upload input
  const textareaRef = useRef(null); // For auto-resizing textarea

  // Auto-scroll to bottom when new messages are added
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

  // Handle file selection from file input
  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  // Open file selector dialog
  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  // Remove a file from the upload list
  const removeFile = (fileToRemove) => {
    setFiles(files.filter(file => file !== fileToRemove));
  };

  // MAIN FUNCTION: Handle sending message with STREAMING support
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    // Don't send if no input and no files, or if already processing
    if (!input.trim() && files.length === 0) return;
    if (isTyping) return;

    const userMessage = input.trim();
    
    // Create user message object
    const userMessageObj = {
      role: 'user',
      content: userMessage,
      files: files.length > 0 ? [...files] : undefined
    };
    
    // Add user message to chat immediately
    const newMessages = [...messages, userMessageObj];
    setMessages(newMessages);
    
    // Clear input and files
    setInput('');
    setFiles([]);
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    // Show typing indicator
    setIsTyping(true);
    
    // Create empty assistant message that will be filled during streaming
    const assistantMessageIndex = newMessages.length;
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: '', // Start with empty content
      streaming: true, // Mark as currently streaming
      images: [] // Will be filled if AI generates images
    }]);

    try {
      // STEP 1: Prepare form data for API call
      const formData = new FormData();
      formData.append('message', userMessage);
      formData.append('userId', 'default');
      
      // Add all files with unique keys
      if (files.length > 0) {
        files.forEach((file, index) => {
          formData.append(`file${index + 1}`, file);
        });
      }
      
      // STEP 2: Call the streaming API endpoint
      console.log("📤 Sending request to /api/chat with streaming...");
      const response = await fetch('/api/chat', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // STEP 3: Handle streaming response (NEW - this is the magic!)
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      console.log("📡 Starting to read stream...");
      
      // Read the stream chunk by chunk
      while (true) {
        const { done, value } = await reader.read();
        
        // If stream is finished, break the loop
        if (done) {
          console.log("🏁 Stream finished");
          break;
        }
        
        // Decode the chunk from bytes to text
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        // Process each line in the chunk
        for (const line of lines) {
          // Skip empty lines
          if (!line.trim()) continue;
          
          // Process Server-Sent Event data lines
          if (line.startsWith('data: ')) {
            try {
              // Parse the JSON data
              const data = JSON.parse(line.slice(6));
              
              // Handle different types of streaming data
              if (data.type === 'text') {
                // FIX: Prevent duplicate appending of text chunks by using a ref to track the last content
                setMessages(prev => {
                  const updated = [...prev];
                  // Find the last assistant message that is still streaming
                  const lastAssistantIdx = updated.map((m, i) => ({...m, i})).reverse().find(m => m.role === 'assistant' && m.streaming)?.i;
                  if (lastAssistantIdx !== undefined) {
                    // Only append if the new chunk is not already present at the end
                    const currentContent = updated[lastAssistantIdx].content;
                    const newContent = data.content;
                    if (!currentContent.endsWith(newContent)) {
                      updated[lastAssistantIdx].content += newContent;
                    }
                  }
                  return updated;
                });
              }
              
              else if (data.type === 'images') {
                // IMAGES: Add any generated charts/images
                console.log("🖼️ Received images:", data.images.length);
                setMessages(prev => {
                  const updated = [...prev];
                  updated[assistantMessageIndex].images = data.images;
                  return updated;
                });
              }
              
              else if (data.type === 'done') {
                // COMPLETION: Mark streaming as finished
                console.log("✅ Streaming completed");
                setMessages(prev => {
                  const updated = [...prev];
                  updated[assistantMessageIndex].streaming = false;
                  return updated;
                });
              }
              
              else if (data.type === 'error') {
                // ERROR: Handle streaming errors
                console.error("❌ Stream error:", data.message);
                setMessages(prev => {
                  const updated = [...prev];
                  updated[assistantMessageIndex].content = 'Sorry, an error occurred while processing your request.';
                  updated[assistantMessageIndex].streaming = false;
                  updated[assistantMessageIndex].error = true;
                  return updated;
                });
              }
              
            } catch (parseError) {
              // Skip invalid JSON lines
              console.warn("⚠️ Failed to parse stream data:", line);
            }
          }
        }
      }
      
    } catch (error) {
      console.error('❌ Error in streaming chat:', error);
      
      // Update the assistant message with error
      setMessages(prev => {
        const updated = [...prev];
        updated[assistantMessageIndex].content = 'Sorry, I encountered an error processing your request. Please try again.';
        updated[assistantMessageIndex].streaming = false;
        updated[assistantMessageIndex].error = true;
        return updated;
      });
    } finally {
      // Always hide typing indicator when done
      setIsTyping(false);
    }
  };

  // Handle textarea key press (Enter to send, Shift+Enter for new line)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  return (
    <div className={`${styles.chatInterface} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
      {/* Show welcome screen if no messages, otherwise show chat */}
      {messages.length === 0 ? (
        <WelcomeScreen darkMode={darkMode} />
      ) : (
        <div className={styles.chatContainer}>
          <div className={styles.messagesContainer}>
            {/* Render all chat messages */}
            {messages.map((message, index) => (
              <ChatMessage 
                key={index} 
                role={message.role} 
                content={message.content}
                files={message.files}
                images={message.images} // Pass images to ChatMessage
                darkMode={darkMode}
                error={message.error}
                streaming={message.streaming} // Pass streaming state
              />
            ))}
            
            {/* Typing indicator (shows while waiting for first response) */}
            {isTyping && messages.length > 0 && !messages[messages.length - 1]?.streaming && (
              <div className={styles.typingIndicator}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            )}
            
            {/* Invisible element for auto-scrolling */}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}
      
      {/* Input area at bottom */}
      <div className={styles.inputContainer}>
        {/* File preview area (shows selected files before sending) */}
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
        
        {/* Input form */}
        <form className={styles.inputForm} onSubmit={handleSendMessage}>
          {/* File upload button */}
          <button 
            type="button" 
            className={styles.fileButton}
            onClick={openFileSelector}
            aria-label="Attach files"
            disabled={isTyping}
          >
            <BsPaperclip className={styles.fileIcon} />
          </button>
          
          {/* Text input area */}
          <textarea
            ref={textareaRef}
            rows="1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message X-Gaming AI..."
            className={styles.chatInput}
            disabled={isTyping}
          />
          
          {/* Send button */}
          <button 
            type="submit" 
            className={`${styles.sendButton} ${!input.trim() && files.length === 0 ? styles.disabled : ''}`}
            disabled={(!input.trim() && files.length === 0) || isTyping}
          >
            <IoSend className={styles.sendIcon} />
          </button>
          
          {/* Hidden file input */}
          <input 
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            multiple
            accept=".csv,.pdf,.txt,.json"
          />
        </form>
      </div>
    </div>
  );
}