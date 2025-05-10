import { useLocation } from 'wouter';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function Header() {
  const [location] = useLocation();

  // Get the page title based on the current location
  const getPageTitle = () => {
    const pathSegments = location.split('/').filter(Boolean);
    
    if (pathSegments.length === 0) return 'Dashboard';
    
    if (pathSegments.length === 1) {
      return pathSegments[0].charAt(0).toUpperCase() + pathSegments[0].slice(1);
    }
    
    if (pathSegments[0] === 'calls' && pathSegments[1]) {
      return `Calls ${pathSegments[1].charAt(0).toUpperCase() + pathSegments[1].slice(1)}`;
    }
    
    return pathSegments[0].charAt(0).toUpperCase() + pathSegments[0].slice(1);
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="px-4 sm:px-6 md:px-8 py-4 flex justify-between items-center">
        <div></div>
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon"
            className="text-gray-400 hover:text-gray-500"
          >
            <Bell className="h-5 w-5" />
            <span className="sr-only">View notifications</span>
          </Button>

          {/* Profile dropdown */}
          <div className="ml-3 relative">
            <div>
              <Avatar className="h-8 w-8 cursor-pointer">
                <AvatarImage src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&h=256&q=80" alt="User profile" />
                <AvatarFallback>AD</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
