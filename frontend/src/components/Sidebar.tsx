import { NavLink } from "react-router-dom";
import { FileText, MessageSquare, Activity, Layers, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/context/SidebarContext";

const nav = [
  { to: "/", icon: FileText, label: "Documents" },
  { to: "/chat", icon: MessageSquare, label: "Chat" },
  { to: "/health", icon: Activity, label: "System Health" },
];

export function Sidebar() {
  const { isOpen, isMobile, close } = useSidebar();

  return (
    <>
      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transform transition-transform duration-300 ease-in-out lg:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Layers className="w-6 h-6 text-primary-500" />
            <span className="text-white font-bold text-lg tracking-tight">RAG Vision</span>
          </div>
          <button
            onClick={close}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 px-3 py-6 space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={close}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive ? "bg-primary-600/10 text-primary-400" : "hover:bg-slate-800 hover:text-white"
                )
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800/50 rounded-lg p-3">
            <p className="text-xs text-slate-400 mb-1">Backend Status</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-slate-300">Connected</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-slate-300 hidden lg:flex flex-col border-r border-slate-800 transition-all duration-300 ease-in-out",
          !isOpen && "lg:-ml-64"
        )}
      >
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <Layers className="w-6 h-6 text-primary-500 mr-3" />
          <span className="text-white font-bold text-lg tracking-tight">RAG Vision</span>
        </div>
        <nav className="flex-1 px-3 py-6 space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive ? "bg-primary-600/10 text-primary-400" : "hover:bg-slate-800 hover:text-white"
                )
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800/50 rounded-lg p-3">
            <p className="text-xs text-slate-400 mb-1">Backend Status</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-slate-300">Connected</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}