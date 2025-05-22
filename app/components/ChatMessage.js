// components/ChatMessage.js
import styles from '../../styles/ChatMessage.module.css';
import { BsFileEarmark, BsExclamationTriangle } from 'react-icons/bs';

export default function ChatMessage({ role, content, files = [], images = [], darkMode, error = false }) {
  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`${styles.messageContainer} ${styles[role]}`}>
      <div className={`${styles.message} ${darkMode ? styles.dark : ''} ${error ? styles.error : ''}`}>
        {role === 'assistant' && (
          <div className={styles.avatar}>
            {error ? <BsExclamationTriangle /> : <span>XG</span>}
          </div>
        )}
        
        <div className={styles.content}>
          {content && (
            <div className={styles.textContent}>
              {content.split('\n').map((line, i) => (
                <span key={i}>
                  {line}
                  {i < content.split('\n').length - 1 && <br />}
                </span>
              ))}
            </div>
          )}
          
          {files && files.length > 0 && (
            <div className={styles.filesContainer}>
              {files.map((file, index) => (
                <div key={index} className={styles.fileItem}>
                  <BsFileEarmark className={styles.fileIcon} />
                  <div className={styles.fileDetails}>
                    <div className={styles.fileName}>{file.name}</div>
                    <div className={styles.fileSize}>{formatFileSize(file.size)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* NEW: Display images from AI responses */}
          {images && images.length > 0 && (
            <div className={styles.imagesContainer}>
              {images.map((imageSrc, index) => (
                <div key={index} className={styles.imageWrapper}>
                  <img
                    src={imageSrc}
                    alt={`Generated chart ${index + 1}`}
                    className={styles.messageImage}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      console.error('Failed to load image:', imageSrc);
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        
        {role === 'user' && (
          <div className={styles.avatar}>
            <span>You</span>
          </div>
        )}
      </div>
    </div>
  );
}