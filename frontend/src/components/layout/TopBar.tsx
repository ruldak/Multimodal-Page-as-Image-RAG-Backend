import { Menu, Search, Bell, User } from 'lucide-react'

interface TopBarProps {
  onToggleSidebar: () => void
}

export default function TopBar({ onToggleSidebar }: TopBarProps) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5 text-slate-600" />
        </button>
        
        <div className="relative max-w-md hidden md:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search documents, sessions..."
            className="input-field pl-10 w-80"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors relative">
          <Bell className="w-5 h-5 text-slate-600" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        
        <div className="w-px h-6 bg-slate-200"></div>
        
        <button className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100 rounded-lg transition-colors">
          <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-700 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="text-left hidden md:block">
            <p className="text-sm font-medium text-slate-900">Enterprise Admin</p>
            <p className="text-xs text-slate-500">admin@company.com</p>
          </div>
        </button>
      </div>
    </header>
  )
}