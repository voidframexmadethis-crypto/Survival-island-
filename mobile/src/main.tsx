import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CoasterStudioClient } from '@/components/coaster/CoasterStudioClient';
import { SurvivalGameClient } from '@/components/game/SurvivalGameClient';
import './mobile.css';
import './mobileConfig';
import { setupMobileBridge } from './mobileBridge';

function currentRoute(): string {
  const hash = window.location.hash.replace(/^#/, '');
  return hash || '/';
}

function MobileApp() {
  const [route, setRoute] = useState(currentRoute);

  useEffect(() => {
    const onHashChange = () => setRoute(currentRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (route.startsWith('/coaster-studio')) {
    return <CoasterStudioClient />;
  }

  return <SurvivalGameClient />;
}

void setupMobileBridge();

const container = document.getElementById('root');
if (!container) {
  throw new Error('Mobile root element was not found.');
}

createRoot(container).render(<MobileApp />);
