import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet";
import { useTheme } from "@/components/ui/theme-provider";
import { useNotifications } from "@/hooks/useNotifications";
import { 
  Bell, 
  Moon, 
  Sun, 
  Menu, 
  GraduationCap,
  User,
  Settings,
  LogOut,
  Search
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useApiQuery } from "@/hooks/api-hooks";
import { api } from "@/lib/api-client";

interface NavigationProps {
  user?: any;
  onSignOut?: () => void;
}

export default function Navigation({ user, onSignOut }: NavigationProps) {
  const [location, navigate] = useLocation();
  const { theme, setTheme } = useTheme();
  const { unreadCount } = useNotifications(user?.id);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch team login visibility and secret code
  const { data: teamLoginData } = useApiQuery<{ visible: boolean; secretCode: string }>(
    ['/api/auth/team-login-visibility'],
    '/api/auth/team-login-visibility',
    undefined,
    { staleTime: 5 * 60 * 1000 } // 5 minutes
  );

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if search matches the current secret code
    const currentSecretCode = teamLoginData?.secretCode;
    if (currentSecretCode && searchQuery.trim().toLowerCase() === currentSecretCode.toLowerCase()) {
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

  const navigationItems = [
    { href: "/universities", label: "Universities" },
    { href: "/community", label: "Community" },
    { href: "/plans", label: "Plans" },
    { href: "/about", label: "About" },
  ];

  const userNavigationItems = user ? [
    ...(user.userType === "customer" ? [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/applications", label: "Applications" },
      { href: "/documents", label: "Documents" },
    ] : []),
    ...(user.teamRole === "admin" ? [{ href: "/dashboard/admin", label: "Admin Dashboard" }] : []),
    ...(user.teamRole === "counselor" ? [{ href: "/dashboard/team", label: "Counselor Dashboard" }] : [])
  ] : [];

  const isActiveLink = (href: string) => {
    if (href === "/" && location === "/") return true;
    return location.startsWith(href) && href !== "/";
  };

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? "bg-background/90 backdrop-blur-md border-b border-border shadow-sm" 
          : "bg-background/50 backdrop-blur-sm"
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-gradient-to-r from-primary to-amber-500 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">Phozos</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActiveLink(item.href)
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}

            {user && userNavigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActiveLink(item.href)
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {/* Notifications (authenticated users only) */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center text-xs"
                      >
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <div className="p-4">
                    <h3 className="font-semibold text-sm">Notifications</h3>
                    {unreadCount > 0 ? (
                      <p className="text-xs text-muted-foreground mt-1">
                        You have {unreadCount} unread notifications
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">
                        No new notifications
                      </p>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <div className="p-2">
                    <Button variant="outline" size="sm" className="w-full">
                      View All Notifications
                    </Button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

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
                  className="w-9 h-9 p-0"
                >
                  <Search className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="w-9 h-9 p-0"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>

            {/* User Menu or Sign In/Up */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.profilePicture} alt={user.firstName} />
                      <AvatarFallback>
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{user.firstName} {user.lastName}</p>
                      <p className="w-[200px] truncate text-sm text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-destructive focus:text-destructive"
                    onClick={onSignOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden md:flex space-x-2">
                <Button asChild>
                  <Link href="/auth">Get Started</Link>
                </Button>
              </div>
            )}

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="md:hidden z-50"
                  onClick={() => {
                    console.log('Mobile menu button clicked');
                    setMobileMenuOpen(true);
                  }}
                >
                  <Menu className="w-5 h-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 z-[100] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-l">
                <SheetHeader className="sr-only">
                  <SheetTitle>Navigation Menu</SheetTitle>
                  <SheetDescription>Access all navigation links</SheetDescription>
                </SheetHeader>
                <div className="flex flex-col space-y-4 mt-8">
                  {navigationItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`text-sm font-medium transition-colors hover:text-primary ${
                        isActiveLink(item.href)
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}

                  {user && userNavigationItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`text-sm font-medium transition-colors hover:text-primary ${
                        isActiveLink(item.href)
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}

                  {!user && (
                    <div className="flex flex-col space-y-3 pt-4 border-t">
                      <Button asChild onClick={() => setMobileMenuOpen(false)}>
                        <Link href="/auth">Get Started</Link>
                      </Button>
                    </div>
                  )}

                  {/* User Actions for Mobile */}
                  {user && (
                    <div className="flex flex-col space-y-3 pt-4 border-t">
                      <Link
                        href="/profile"
                        onClick={() => setMobileMenuOpen(false)}
                        className="text-sm font-medium transition-colors hover:text-primary text-muted-foreground"
                      >
                        <User className="mr-2 h-4 w-4 inline" />
                        Profile
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setMobileMenuOpen(false)}
                        className="text-sm font-medium transition-colors hover:text-primary text-muted-foreground"
                      >
                        <Settings className="mr-2 h-4 w-4 inline" />
                        Settings
                      </Link>
                      <Button
                        variant="ghost"
                        className="justify-start text-destructive hover:text-destructive text-sm font-medium"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          onSignOut?.();
                        }}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
    </header>
  );
}
