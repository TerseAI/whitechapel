import React from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { App } from './App';
import { sanitizeAnalyticsEvent } from './analytics';
import './style.css';
import './briefing.css';
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    {import.meta.env.PROD && <Analytics beforeSend={sanitizeAnalyticsEvent} />}
  </React.StrictMode>,
);
