import { useLocation } from 'wouter';

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
        <h1 className="text-lg font-semibold text-gray-900">{getPageTitle()}</h1>
      </div>
    </header>
  );
}
