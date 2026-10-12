/// <reference types="vite/client" />

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import '@fontsource-variable/public-sans/wght.css';
import './index.css';
import './design-system/tokens.css';
import './design-system/reset.css';
import './design-system/typography.css';
import './design-system/motion.css';
import './design-system/components.css';
import './styles.css';
import { queryClient } from './app/query-client';
import { router } from './app/router';
import { onSessionExpired } from './api/session';
import { Toaster } from './components/ui/sonner';
import { TooltipProvider } from './components/ui/tooltip';

const container = document.getElementById('root');
if (container === null) throw new Error('Pilot-SD root element is missing.');
const root = createRoot(container);

onSessionExpired(() => {
  const returnPath = `${window.location.pathname}${window.location.search}`;
  queryClient.clear();
  void router.navigate(`/login?return_path=${encodeURIComponent(returnPath)}`, { replace: true });
});

root.render(
  <StrictMode>
    <TooltipProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster theme="light" />
      </QueryClientProvider>
    </TooltipProvider>
  </StrictMode>,
);
