import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import '@fontsource-variable/onest';
import './styles.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(<App />);

// Telefonda status panel rangini mavzuga moslash
if (Capacitor.isNativePlatform()) {
  import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = mq.matches;
      StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {});
      StatusBar.setBackgroundColor({ color: dark ? '#101318' : '#F1F3F6' }).catch(() => {});
    };
    apply();
    mq.addEventListener('change', apply);
  });
}
