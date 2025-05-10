import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

type AppLayoutProps = {
  children: ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen">
      {/* Sidebar - hidden on mobile */}
      <Sidebar />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col md:ml-0 mt-14 md:mt-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
