import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ToastProvider } from "@/context/ToastContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { DocumentsPage } from "@/components/pages/DocumentsPage";
import { ChatPage } from "@/components/pages/ChatPage";
import { HealthPage } from "@/components/pages/HealthPage";

export default function App() {
  return (
    <ToastProvider>
      <SidebarProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<DocumentsPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/health" element={<HealthPage />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </SidebarProvider>
    </ToastProvider>
  );
}