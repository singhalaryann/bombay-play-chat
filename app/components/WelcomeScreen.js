// components/WelcomeScreen.js
import { useState, useEffect } from 'react';
import styles from '../../styles/WelcomeScreen.module.css';

export default function WelcomeScreen({ darkMode }) {
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    setTimeout(() => setShowText(true), 200);
  }, []);

  return (
    <div className={`${styles.welcomeScreen} ${darkMode ? styles.dark : ''}`}>
      <div className={`${styles.welcomeText} ${showText ? styles.visible : ''}`}>
        <h1>What can I help with?</h1>
        <p>I can analyze your gaming data, provide insights, and help with game development questions.</p>
      </div>
    </div>
  );
}