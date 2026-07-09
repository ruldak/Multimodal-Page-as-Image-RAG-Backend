import { create } from 'zustand'
import type { Document, ChatSession } from '../types'

interface StoreState {
  documents: Document[]
  sessions: ChatSession[]
  activeSessionId: string | null
  setDocuments: (docs: Document[]) => void
  setSessions: (sessions: ChatSession[]) => void
  setActiveSessionId: (id: string | null) => void
}

export const useStore = create<StoreState>((set) => ({
  documents: [],
  sessions: [],
  activeSessionId: null,
  setDocuments: (documents) => set({ documents }),
  setSessions: (sessions) => set({ sessions }),
  setActiveSessionId: (activeSessionId) => set({ activeSessionId }),
}))