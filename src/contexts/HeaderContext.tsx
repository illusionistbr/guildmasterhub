
"use client";

import React, { createContext, useState, useContext, ReactNode, Dispatch, SetStateAction } from 'react';

interface HeaderContextType {
  headerTitle: string | null;
  setHeaderTitle: Dispatch<SetStateAction<string | null>>;
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined);

export const HeaderProvider = ({ children }: { children: ReactNode }) => {
  const [headerTitle, setHeaderTitle] = useState<string | null>(null);
  return (
    <HeaderContext.Provider value={{ headerTitle, setHeaderTitle }}>
      {children}
    </HeaderContext.Provider>
  );
};

export const useHeader = () => {
  const context = useContext(HeaderContext);
  if (context === undefined) {
    throw new Error('useHeader must be used within a HeaderProvider');
  }
  return context;
};
