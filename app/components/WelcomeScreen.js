// components/WelcomeScreen.js
import { useState, useEffect } from 'react';
import styles from '../../styles/WelcomeScreen.module.css';

export default function WelcomeScreen({ darkMode }) {
  const [showText, setShowText] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  useEffect(() => {
    // Animated entrance for main text
    setTimeout(() => setShowText(true), 300);
    
    // Show suggestions with delay
    setTimeout(() => setShowSuggestions(true), 800);
  }, []);
  
  const suggestions = [
    "Help me design a game level",
    "Suggest multiplayer game mechanics",
    "How to balance player progression?",
    "Ideas for in-game rewards"
  ];

  return (
    <div className={`${styles.welcomeScreen} ${darkMode ? styles.dark : ''}`}>
      <div className={`${styles.welcomeText} ${showText ? styles.visible : ''}`}>
        <h1>What can I help with?</h1>
      </div>
      
      {showSuggestions && (
        <div className={styles.suggestionsContainer}>
          <div className={styles.suggestions}>
            {suggestions.map((suggestion, index) => (
              <button 
                key={index} 
                className={styles.suggestionButton}
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}