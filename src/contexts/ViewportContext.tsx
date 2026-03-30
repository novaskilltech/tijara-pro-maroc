import React, { createContext, useContext, useEffect, useState } from 'react';

type ViewportMode = 'mobile' | 'desktop';

interface ViewportContextType {
  mode: ViewportMode;
  toggleMode: () => void;
}

const ViewportContext = createContext<ViewportContextType | undefined>(undefined);

export function ViewportProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ViewportMode>(() => {
    try {
      const saved = localStorage.getItem('tijara-viewport-mode');
      if (saved === 'desktop' || saved === 'mobile') {
        return saved as ViewportMode;
      }
    } catch (e) {
      console.error('Failed to access localStorage', e);
    }
    return 'mobile';
  });

  const setMode = (newMode: ViewportMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem('tijara-viewport-mode', newMode);
    } catch (e) {
      console.error('Failed to set localStorage', e);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'mobile' ? 'desktop' : 'mobile');
  };

  useEffect(() => {
    // Find or create the viewport meta tag
    let metaTag = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
    
    if (!metaTag) {
      metaTag = document.createElement('meta');
      metaTag.name = 'viewport';
      document.head.appendChild(metaTag);
    }

    if (mode === 'desktop') {
      // Forcing a standard desktop width allows the mobile browser to zoom out
      metaTag.content = 'width=1280, initial-scale=1.0, maximum-scale=5.0';
      // Adding a class to body just in case we need CSS overrides (like hiding some mobile-only stuff)
      document.body.classList.add('force-desktop-view');
    } else {
      // Standard responsive mobile view
      metaTag.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0';
      document.body.classList.remove('force-desktop-view');
    }
  }, [mode]);

  return (
    <ViewportContext.Provider value={{ mode, toggleMode }}>
      {children}
    </ViewportContext.Provider>
  );
}

export function useViewport() {
  const context = useContext(ViewportContext);
  if (context === undefined) {
    throw new Error('useViewport must be used within a ViewportProvider');
  }
  return context;
}
