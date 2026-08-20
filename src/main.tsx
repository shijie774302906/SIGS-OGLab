import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AssistantConnectionProvider } from './features/assistant/AssistantConnectionProvider';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AssistantConnectionProvider>
      <App />
    </AssistantConnectionProvider>
  </StrictMode>,
);
