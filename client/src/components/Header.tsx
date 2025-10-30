import { GraduationCap, LogOut, Search, Settings, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useState } from "react";
import { useApiQuery } from "@/hooks/api-hooks";
import { api } from "@/lib/api-client";

export default function Header() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Fetch security settings to get the current secret code
  const { data: securitySettings } = useApiQuery<{ visible: boolean; secretCode: string }>(
    ['/api/auth/team-login-visibility'],
    '/api/auth/team-login-visibility',
    undefined,
    {
      staleTime: 30 * 1000, // 30 seconds - shorter stale time to get updates faster
      refetchOnMount: true,
    }
  );

  const handleLogoClick = () => {
    // Navigate to appropriate dashboard based on user type
    if (user?.userType === 'customer') {
      navigate('/dashboard/student');
    } else if (user?.userType === 'company_profile') {
      navigate('/dashboard/company');
    } else if (user?.teamRole === 'admin') {
      navigate('/dashboard/admin');
    } else if (user?.teamRole) {
      navigate('/dashboard/team');
    } else {
      navigate('/');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get the current secret code from security settings
    const currentSecretCode = securitySettings?.secretCode || 'edupath-admin-2025';
    
    // Secret admin code - check against the current code from security settings
    if (searchQuery.trim().toLowerCase() === currentSecretCode.toLowerCase()) {
      navigate('/auth?type=admin');
      setSearchQuery("");
      setShowSearch(false);
      return;
    }
    
    // Regular search functionality (can be implemented later)
    console.log("Search for:", searchQuery);
    setSearchQuery("");
    setShowSearch(false);
  };

  if (!user) return null;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Logo and Title */}
        <div 
          className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={handleLogoClick}
          data-testid="logo-button"
        >
          <div className="w-10 h-10 bg-gradient-to-r from-primary to-amber-500 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Phozos</h1>
        </div>

        {/* Search and User Actions */}
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative">
            {showSearch ? (
              <form onSubmit={handleSearch} className="flex items-center">
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-48 h-8"
                  autoFocus
                  onBlur={() => {
                    if (!searchQuery) {
                      setShowSearch(false);
                    }
                  }}
                />
                <Button type="submit" size="sm" variant="ghost" className="ml-1">
                  <Search className="w-4 h-4" />
                </Button>
              </form>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSearch(true)}
                data-testid="search-button"
              >
                <Search className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center space-x-2 p-2 hover:bg-accent"
                data-testid="user-menu-trigger"
                aria-label="Open user menu"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.profilePicture || undefined} alt={`${user.firstName} ${user.lastName}`} />
                  <AvatarFallback className="bg-gradient-to-r from-primary to-amber-500 text-white text-sm">
                    {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-left hidden sm:block">
                  <span className="text-sm font-medium">
                    {user.firstName} {user.lastName}
                  </span>
                  {user.teamRole && (
                    <span className="text-xs text-gray-500 capitalize">
                      {user.teamRole}
                    </span>
                  )}
                </div>
                <ChevronDown className="h-4 w-4 text-gray-500 hidden sm:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                  {user.teamRole && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full w-fit">
                      {user.teamRole}
                    </span>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {user.userType === 'team_member' && user.teamRole === 'admin' && (
                <DropdownMenuItem
                  onClick={() => navigate('/dashboard/admin/profile')}
                  className="cursor-pointer"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Profile Settings</span>
                </DropdownMenuItem>
              )}
              {user.userType === 'team_member' && user.teamRole === 'counselor' && (
                <DropdownMenuItem
                  onClick={() => navigate('/dashboard/counselor/profile')}
                  className="cursor-pointer"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Profile Settings</span>
                </DropdownMenuItem>
              )}
              {user.userType === 'team_member' && user.teamRole !== 'admin' && user.teamRole !== 'counselor' && (
                <DropdownMenuItem
                  onClick={() => navigate('/dashboard/team')}
                  className="cursor-pointer"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>My Dashboard</span>
                </DropdownMenuItem>
              )}
              {user.userType === 'customer' && (
                <DropdownMenuItem
                  onClick={() => navigate('/profile')}
                  className="cursor-pointer"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Profile Settings</span>
                </DropdownMenuItem>
              )}
              {user.userType === 'company_profile' && (
                <DropdownMenuItem
                  onClick={() => navigate('/dashboard/company/profile')}
                  className="cursor-pointer"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Profile Settings</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="cursor-pointer text-red-600 focus:text-red-600"
                data-testid="logout-menu-item"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}