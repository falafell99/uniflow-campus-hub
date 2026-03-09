import { createContext, useContext, useState, ReactNode } from "react";

type AppContextType = {
  favorites: string[];
  toggleFavorite: (id: string) => void;
  currentStatus: string;
  setCurrentStatus: (status: string) => void;
  activeCommunity: string;
  setActiveCommunity: (community: string) => void;
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [currentStatus, setCurrentStatus] = useState("Studying Calculus II");
  const [activeCommunity, setActiveCommunity] = useState("informatics");

  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  return (
    <AppContext.Provider value={{ favorites, toggleFavorite, currentStatus, setCurrentStatus, activeCommunity, setActiveCommunity }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
