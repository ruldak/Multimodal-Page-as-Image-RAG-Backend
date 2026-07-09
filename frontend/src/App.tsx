import { Routes, Route } from 'react-router-dom'
import { useState } from 'react'
import Sidebar from './components/layout/Sidebar'
import TopBar from './components/layout/TopBar'
import DocumentsPage from './pages/DocumentsPage'
import ChatPage from './pages/ChatPage'
import HealthPage from './pages/HealthPage'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar isOpen={sidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<DocumentsPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/health" element={<HealthPage />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}