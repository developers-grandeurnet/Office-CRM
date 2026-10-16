import { Menu, LogOut, ChevronDown, UserRound } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { NotificationBell } from "./NotificationBell";

export function Header({ setMobileMenuOpen, isMobile }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      if (user) await api.post("auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      logout();
      navigate("/");
    }
  };
  
  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-x-4 border-b border-slate-200 bg-white/80 px-4 shadow-sm backdrop-blur-md sm:gap-x-6 sm:px-6 lg:px-8">
      {isMobile && (
        <button
          type="button"
          className="-m-2.5 p-2.5 text-slate-700 lg:hidden"
          onClick={() => setMobileMenuOpen(true)}
        >
          <span className="sr-only">Open sidebar</span>
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>
      )}

      {/* Separator for mobile */}
      {isMobile && <div className="h-6 w-px bg-slate-200 lg:hidden" aria-hidden="true" />}

      {pathname === "/dashboard" && (
        <p className="hidden text-sm font-semibold text-slate-900 sm:block">Dashboard</p>
      )}

      <div className="flex flex-1 justify-end self-stretch">
        <div className="flex items-center">
          <NotificationBell />
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              className="-m-1.5 flex items-center p-1.5 hover:bg-slate-50 rounded-md transition-colors"
              id="user-menu-button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <span className="sr-only">Open user menu</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-violet-500 font-bold text-white shadow-sm">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <span className="hidden lg:flex lg:flex-col lg:items-start lg:ml-4">
                <span className="text-sm font-semibold leading-6 text-slate-900" aria-hidden="true">
                  {user?.name || "User"}
                </span>
                <span className="text-xs leading-4 text-slate-500" aria-hidden="true">
                  {user?.designation?.name || user?.userType || "Guest"}
                </span>
              </span>
              <ChevronDown className="ml-2 h-4 w-4 text-slate-400 hidden lg:block" />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 z-10 mt-2.5 w-64 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-slate-900/5 focus:outline-none">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-medium text-slate-900 truncate">{user?.name}</p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                </div>
                
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      navigate("/dashboard/profile");
                    }}
                    className="flex w-full items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <UserRound className="mr-2 h-4 w-4" />
                    My profile
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
