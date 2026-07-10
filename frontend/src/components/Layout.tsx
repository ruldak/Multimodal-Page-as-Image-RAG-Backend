import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useSidebar } from "@/context/SidebarContext";
import { cn } from "@/lib/utils";

export function Layout({ children }: { children: React.ReactNode }) {
  const { isOpen, isMobile, close } = useSidebar();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm transition-opacity"
          onClick={close}
          aria-hidden="true"
        />
      )}

      <div
        className={cn(
          "flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out",
          !isMobile && isOpen ? "lg:ml-64" : "ml-0"
        )}
      >
        <Header />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}