// components/Sidebar.js
'use client';
import { useState } from 'react';
import styles from '../../../styles/Sidebar.module.css';
import Image from 'next/image';
// React icons import
import { RiCloseLine, RiMenuLine } from 'react-icons/ri'; // Better menu icons
import { IoSunnyOutline, IoMoonOutline } from 'react-icons/io5'; // Better theme icons
import { IoAddOutline } from 'react-icons/io5'; // Better plus icon

const DUMMY_CHAT_HISTORY = [
  { id: 1, title: "Game Strategy Discussion", date: "2025-05-18" },
  { id: 2, title: "Multiplayer Design Ideas", date: "2025-05-15" },
  { id: 3, title: "UI Animation Feedback", date: "2025-05-10" }
];

export default function Sidebar({ isOpen, toggleSidebar, darkMode, toggleTheme }) {
  const [chatHistory, setChatHistory] = useState(DUMMY_CHAT_HISTORY);

  return (
    <>
      {!isOpen && (
        <button
          className={styles.toggleButton}
          onClick={toggleSidebar}
          aria-label="Open sidebar"
        >
          <RiMenuLine size={24} />
        </button>
      )}
      
      {/* Overlay that closes sidebar when clicked */}
      {isOpen && (
        <div 
          className={styles.overlay}
          onClick={toggleSidebar}
          aria-label="Close sidebar"
        />
      )}
      
      <div className={`${styles.sidebar} ${isOpen ? styles.open : ''} ${darkMode ? styles.dark : ''}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logoContainer}>
            <Image
              src="/X-gaming-logo.png"
              alt="X-Gaming Logo"
              width={70}
              height={70}
              className={styles.logo}
              priority
            />
          </div>
          
          <div className={styles.headerControls}>
            <button
              className={styles.themeToggle}
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {darkMode ? <IoSunnyOutline size={20} /> : <IoMoonOutline size={20} />}
            </button>
            
            <button
              className={styles.closeButton}
              onClick={toggleSidebar}
              aria-label="Close sidebar"
            >
              <RiCloseLine size={22} />
            </button>
          </div>
        </div>
        
        <button className={styles.newChatButton}>
          <IoAddOutline size={20} className={styles.plusIcon} />
          <span>New Chat</span>
        </button>
        
        <div className={styles.historyContainer}>
          <h3>CHAT HISTORY</h3>
          <ul className={styles.chatList}>
            {chatHistory.map(chat => (
              <li key={chat.id} className={styles.chatItem}>
                <span>{chat.title}</span>
                <small>{chat.date}</small>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}