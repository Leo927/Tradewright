import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.js';
import { boot } from './state/store.js';
import './styles.css';

void boot();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
