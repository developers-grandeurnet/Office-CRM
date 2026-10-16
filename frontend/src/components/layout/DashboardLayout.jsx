import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { cn } from "../../utils/cn";
import { X } from "lucide-react";

export function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="min-h-screen font-sans">
      {/* Mobile sidebar */}
      {isMobile && mobileMenuOpen && (
        <div className="relative z-50 lg:hidden">
          <div className="fixed inset-0 bg-slate-900/80 transition-opacity" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed inset-0 flex">
            <div className="relative mr-16 flex w-full max-w-xs flex-1">
              <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                <button type="button" className="-m-2.5 p-2.5" onClick={() => setMobileMenuOpen(false)}>
                  <span className="sr-only">Close sidebar</span>
                  <X className="h-6 w-6 text-white" aria-hidden="true" />
                </button>
              </div>
              <div className="w-full h-full bg-white">
                <Sidebar collapsed={false} setCollapsed={() => {}} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      {!isMobile && <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />}

      {/* Main content */}
      <div className={cn("flex flex-col min-h-screen transition-all duration-300 ease-in-out", !isMobile && (collapsed ? "pl-[72px]" : "pl-64"))}>
        <Header setMobileMenuOpen={setMobileMenuOpen} isMobile={isMobile} />
        <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
