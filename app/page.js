// app/page.js
'use client';
import { useState, useEffect } from 'react';
import styles from '../styles/page.module.css';
import Sidebar from './components/layout/Sidebar';
import ChatInterface from './components/ChatInterface';

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  
  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  // Toggle theme
  const toggleTheme = () => {
    setDarkMode(!darkMode);
    document.body.className = darkMode ? '' : 'dark-theme';
  };
  
  // Apply theme on initial load and changes
  useEffect(() => {
    document.body.className = darkMode ? 'dark-theme' : '';
  }, [darkMode]);

  return (
    <main className={`${styles.main} ${darkMode ? styles.dark : ''}`}>
      <div className={styles.container}>
        <Sidebar 
          isOpen={sidebarOpen} 
          toggleSidebar={toggleSidebar}
          darkMode={darkMode}
          toggleTheme={toggleTheme}
        />
        <ChatInterface
          sidebarOpen={sidebarOpen}
          darkMode={darkMode}
        />
      </div>
    </main>
  );
}