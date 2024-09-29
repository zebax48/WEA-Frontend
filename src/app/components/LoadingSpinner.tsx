import React from 'react';
import styles from '../styles/LoadingSpinner.module.css';

const LoadingSpinner: React.FC = () => {
  return (
    <div className={styles.spinnerContainer}>
      <div className={styles.spinner}></div>
      <p className={styles.loadingText}>Loading...</p>
    </div>
  );
};

export default LoadingSpinner;
