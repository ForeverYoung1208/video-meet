import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import '@livekit/components-styles';
import App from './App.tsx';

const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} else {
  console.error("Could not find root element to mount the application.");
}
