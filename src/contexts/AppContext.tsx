import { createContext, useContext, useState, ReactNode } from "react";

type AppContextType = {
  favorites: string[];
  toggleFavorite: (id: string) => void;
  currentStatus: string;
  setCurrentStatus: (status: string) => void;
  activeCommunity: string;
  setActiveCommunity: (community: string) => void;
  credits: number;
  spendCredits: (amount: number) => boolean;
  ownedItems: number[];
  addOwnedItem: (id: number) => void;
  tutoringAvailable: boolean;
  setTutoringAvailable: (v: boolean) => void;
  voiceRoom: string | null;
  setVoiceRoom: (room: string | null) => void;
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [currentStatus, setCurrentStatus] = useState("Studying Calculus II");
  const [activeCommunity, setActiveCommunity] = useState("informatics");
  const [credits, setCredits] = useState(1250);
  const [ownedItems, setOwnedItems] = useState<number[]>([]);
  const [tutoringAvailable, setTutoringAvailable] = useState(true);
  const [voiceRoom, setVoiceRoom] = useState<string | null>(null);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const spendCredits = (amount: number) => {
    if (credits >= amount) {
      setCredits((c) => c - amount);
      return true;
    }
    return false;
  };

  const addOwnedItem = (id: number) => {
    setOwnedItems((prev) => [...prev, id]);
  };

  return (
    <AppContext.Provider value={{
      favorites, toggleFavorite, currentStatus, setCurrentStatus,
      activeCommunity, setActiveCommunity, credits, spendCredits,
      ownedItems, addOwnedItem, tutoringAvailable, setTutoringAvailable,
      voiceRoom, setVoiceRoom,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
