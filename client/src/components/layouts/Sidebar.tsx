import { useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  Zap, 
  FileText, 
  BarChart2, 
  UserCircle, 
  Megaphone, 
  Phone, 
  CreditCard, 
  Settings, 
  User
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const [location] = useLocation();
  
  const navItems = [
    { 
      path: "/", 
      label: "Dashboard", 
      icon: <LayoutDashboard className="mr-3 h-5 w-5" /> 
    },
    { 
      path: "/agents", 
      label: "Agents", 
      icon: <Users className="mr-3 h-5 w-5" /> 
    },
    { 
      path: "/actions", 
      label: "Actions", 
      icon: <Zap className="mr-3 h-5 w-5" /> 
    },
    { 
      path: "/calls/history", 
      label: "Calls History", 
      icon: <FileText className="mr-3 h-5 w-5" /> 
    },
    { 
      path: "/calls/monitor", 
      label: "Calls Monitor", 
      icon: <BarChart2 className="mr-3 h-5 w-5" /> 
    },
    { 
      path: "/contacts", 
      label: "Contacts", 
      icon: <UserCircle className="mr-3 h-5 w-5" /> 
    },
    { 
      path: "/campaigns", 
      label: "Campaigns", 
      icon: <Megaphone className="mr-3 h-5 w-5" /> 
    },
    { 
      path: "/phone-numbers", 
      label: "Phone Numbers", 
      icon: <Phone className="mr-3 h-5 w-5" /> 
    },
    { 
      path: "/billing", 
      label: "Billing", 
      icon: <CreditCard className="mr-3 h-5 w-5" /> 
    },
    { 
      path: "/settings", 
      label: "Settings", 
      icon: <Settings className="mr-3 h-5 w-5" /> 
    }
  ];
  
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 bg-white border-r border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <h1 className="ml-2 text-xl font-semibold text-gray-800">AimAI</h1>
          </div>
        </div>
        
        <nav className="flex-grow py-4 px-2 overflow-y-auto">
          <div className="space-y-1">
            {navItems.map((item) => (
              <a
                key={item.path}
                href={item.path}
                className={cn(
                  "group flex items-center px-4 py-2 text-sm font-medium rounded-md",
                  location === item.path
                    ? "bg-primary-50 text-primary"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                {item.icon}
                {item.label}
              </a>
            ))}
          </div>
          
          <div className="mt-auto pt-10">
            <a
              href="/account"
              className="group flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            >
              <User className="mr-3 h-5 w-5 text-gray-500" />
              Account
              <span className="ml-auto text-xs text-gray-400">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </a>
          </div>
        </nav>
      </aside>
      
      {/* Mobile header (menu button) */}
      <div className="md:hidden fixed top-0 left-0 z-50 w-full bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
            >
              <span className="sr-only">Open main menu</span>
              <svg
                className="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <div className="flex items-center ml-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
              <h1 className="ml-1 text-lg font-semibold text-gray-800">AimAI</h1>
            </div>
          </div>
          <div>
            <button
              type="button"
              className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <span className="sr-only">View notifications</span>
              <svg
                className="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
