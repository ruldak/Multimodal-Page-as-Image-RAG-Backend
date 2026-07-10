import { Bell, Search, User, Menu } from "lucide-react";
import { Input } from "./ui/Input";
import { useSidebar } from "@/context/SidebarContext";

export function Header({ title }: { title: string }) {
  const { toggle } = useSidebar();

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 lg:px-8 sticky top-0 z-20">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={toggle}
          className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg md:text-xl font-semibold text-slate-900 tracking-tight truncate">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-3 md:gap-4 shrink-0">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search..." className="w-40 lg:w-64 pl-9 bg-slate-50 border-slate-200" />
        </div>
        <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
        </button>
        <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-semibold text-sm border border-primary-200">
          <User className="w-4 h-4" />
        </div>
      </div>
    </header>
  );
}