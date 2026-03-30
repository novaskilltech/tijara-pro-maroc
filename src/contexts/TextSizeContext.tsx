import React, { createContext, useContext, useEffect, useState } from 'react';

type TextSize = 'normal' | 'large' | 'xlarge';

interface TextSizeContextType {
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
  cycleTextSize: () => void;
}

const TextSizeContext = createContext<TextSizeContextType | undefined>(undefined);

const TEXT_SIZES: Record<TextSize, string> = {
  normal: '16px',
  large: '18px',
  xlarge: '20px',
};

export function TextSizeProvider({ children }: { children: React.ReactNode }) {
  const [textSize, setTextSizeState] = useState<TextSize>(() => {
    try {
      const saved = localStorage.getItem('tijara-text-size');
      if (saved === 'large' || saved === 'xlarge' || saved === 'normal') {
        return saved as TextSize;
      }
    } catch (e) {
      console.error('Failed to access localStorage', e);
    }
    return 'normal';
  });

  const setTextSize = (size: TextSize) => {
    setTextSizeState(size);
    try {
      localStorage.setItem('tijara-text-size', size);
    } catch (e) {
      console.error('Failed to set localStorage', e);
    }
  };

  const cycleTextSize = () => {
    setTextSize((current) => {
      if (current === 'normal') return 'large';
      if (current === 'large') return 'xlarge';
      return 'normal';
    });
  };

  useEffect(() => {
    const root = document.documentElement;
    root.style.fontSize = TEXT_SIZES[textSize];
  }, [textSize]);

  return (
    <TextSizeContext.Provider value={{ textSize, setTextSize, cycleTextSize }}>
      {children}
    </TextSizeContext.Provider>
  );
}

export function useTextSize() {
  const context = useContext(TextSizeContext);
  if (context === undefined) {
    throw new Error('useTextSize must be used within a TextSizeProvider');
  }
  return context;
}
