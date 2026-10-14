import React from 'react';
import ReactDOM from 'react-dom/client';
import { PublicApp } from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PublicApp />
  </React.StrictMode>
);

// Register Service Worker for Public Menu PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.log('Public SW registration failed:', err);
    });
  });
}
