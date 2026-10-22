import './back-close';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Theme } from '@astryxdesign/core/theme';
import { LayerProvider } from '@astryxdesign/core/Layer';
import { InternationalizationProvider } from '@astryxdesign/core/i18n';
import koKR from '@astryxdesign/core/locales/ko-KR.json';
import { stoneTheme } from '@astryxdesign/theme-stone/built';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { queryClient } from './model/query-client';
import { router } from './router/router';
import './styles/index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Application root was not found.');

createRoot(root).render(
  <StrictMode>
    <Theme theme={stoneTheme} mode="system">
      <InternationalizationProvider locale="ko-KR" messages={{ 'ko-KR': koKR }}>
        <LayerProvider>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </LayerProvider>
      </InternationalizationProvider>
    </Theme>
  </StrictMode>,
);
