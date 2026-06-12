import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function Placeholder() {
  return null;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Placeholder />
  </StrictMode>,
);
