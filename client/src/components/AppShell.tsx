import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTheme } from "@/components/ui/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useApiQuery } from "@/hooks/api-hooks";
import { 
  Bell, 
  Moon, 
  Sun, 
  Menu, 
  GraduationCap,
  User,
  Settings,
  LogOut,
  Search,
  ChevronDown,
  X,
  Loader2
} from "lucide-react";

export default function AppShell() {
  const { user, logout, loading } = useAuth();
  const [location, navigate] = useLocation();
  const { theme, setTheme } = useTheme();
  const { unreadCount, notifications, markAsRead } = useNotifications(user?.id);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Fetch team login visibility and secret code
  const { data: teamLoginData } = useApiQuery<{ visible: boolean; secretCode: string }>(
    ['/api/auth/team-login-visibility'],
    '/api/auth/team-login-visibility',
    undefined,
    { staleTime: 5 * 60 * 1000 }
  );

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogoClick = () => {
    if (!user) {
      navigate('/');
      return;
    }

    if (user.userType === 'customer') {
      navigate('/dashboard/student');
    } else if (user.userType === 'company_profile') {
      navigate('/dashboard/company');
    } else if (user.teamRole === 'admin') {
      navigate('/dashboard/admin');
    } else if (user.teamRole) {
      navigate('/dashboard/team');
    } else {
      navigate('/');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    const currentSecretCode = teamLoginData?.secretCode || 'edupath-admin-2025';
    
    if (searchQuery.trim().toLowerCase() === currentSecretCode.toLowerCase()) {
      navigate('/auth?type=admin');
      setSearchQuery("");
      setShowSearch(false);
      setMobileMenuOpen(false);
      return;
    }
    
    console.log("Search for:", searchQuery);
    setSearchQuery("");
    setShowSearch(false);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/auth');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleNotificationClick = async (notification: any) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    setNotificationsOpen(false);
  };

  const publicNavigationItems = [
    { href: "/universities", label: "Universities" },
    { href: "/community", label: "Community" },
    { href: "/plans", label: "Plans" },
    { href: "/about", label: "About" },
  ];

  const userNavigationItems = user ? [
    ...(user.userType === "customer" ? [
      { href: "/dashboard/student", label: "Dashboard" },
      { href: "/applications", label: "Applications" },
      { href: "/documents", label: "Documents" },
    ] : []),
    ...(user.teamRole === "admin" ? [{ href: "/dashboard/admin", label: "Admin Dashboard" }] : []),
    ...(user.teamRole === "counselor" ? [{ href: "/dashboard/team", label: "Counselor Dashboard" }] : []),
    ...(user.userType === "company_profile" ? [{ href: "/dashboard/company", label: "Company Dashboard" }] : [])
  ] : [];

  const allNavigationItems = user 
    ? [...userNavigationItems, ...publicNavigationItems]
    : publicNavigationItems;

  const isActiveLink = (href: string) => {
    if (href === "/" && location === "/") return true;
    return location.startsWith(href) && href !== "/";
  };

  const getUserInitials = () => {
    if (!user) return "U";
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user.email?.[0]?.toUpperCase() || "U";
  };

  const getUserProfileLink = () => {
    if (!user) return "/profile";
    if (user.userType === 'customer') return "/profile";
    if (user.userType === 'company_profile') return "/profile/company";
    if (user.teamRole === 'admin') return "/profile/admin";
    if (user.teamRole === 'counselor') return "/profile/counselor";
    return "/profile";
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
          <div 
            className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleLogoClick}
            data-testid="logo-button"
          >
            <div className="w-8 h-8 bg-gradient-to-r from-primary to-amber-500 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">Phozos</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {publicNavigationItems.map((item) => (
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
          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Search */}
            <div className="relative">
              {showSearch ? (
                <form onSubmit={handleSearch} className="flex items-center">
                  <Input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-32 md:w-48 h-8"
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

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="hidden md:flex"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>

            {/* Notifications (Authenticated Users Only) */}
            {user && (
              <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative">
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                      >
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-semibold">Notifications</h3>
                    {unreadCount > 0 && (
                      <Badge variant="secondary">{unreadCount} new</Badge>
                    )}
                  </div>
                  <ScrollArea className="h-96">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No notifications yet</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {notifications.map((notification) => (
                          <button
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                              !notification.isRead ? "bg-primary/5" : ""
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{notification.title}</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  {new Date(notification.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              {!notification.isRead && (
                                <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            )}

            {/* User Menu or Auth Buttons */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full md:w-auto md:px-3">
                    {loading ? (
                      <Skeleton className="h-8 w-8 rounded-full" />
                    ) : (
                      <>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.profilePicture || undefined} alt={user.email} />
                          <AvatarFallback>{getUserInitials()}</AvatarFallback>
                        </Avatar>
                        <ChevronDown className="ml-2 h-4 w-4 hidden md:block" />
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.firstName && user.lastName
                          ? `${user.firstName} ${user.lastName}`
                          : user.email}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate(getUserProfileLink())}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/settings")}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="text-destructive focus:text-destructive"
                  >
                    {isLoggingOut ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Logging out...
                      </>
                    ) : (
                      <>
                        <LogOut className="mr-2 h-4 w-4" />
                        Log out
                      </>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden md:flex items-center space-x-2">
                <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
                  Log in
                </Button>
                <Button size="sm" onClick={() => navigate("/auth?tab=signup")}>
                  Sign up
                </Button>
              </div>
            )}

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                  <SheetDescription>
                    Navigate through Phozos
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-8 flex flex-col space-y-4">
                  {/* Mobile Search */}
                  <form onSubmit={handleSearch} className="flex items-center space-x-2">
                    <Input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="submit" size="sm">
                      <Search className="w-4 h-4" />
                    </Button>
                  </form>

                  {/* Mobile Navigation Links */}
                  <div className="space-y-2">
                    {allNavigationItems.map((item) => (
                      <SheetClose asChild key={item.href}>
                        <Link href={item.href}>
                          <Button
                            variant={isActiveLink(item.href) ? "default" : "ghost"}
                            className="w-full justify-start"
                          >
                            {item.label}
                          </Button>
                        </Link>
                      </SheetClose>
                    ))}
                  </div>

                  {/* Mobile Theme Toggle */}
                  <Button
                    variant="outline"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="justify-start"
                  >
                    {theme === "dark" ? (
                      <>
                        <Sun className="mr-2 w-4 h-4" />
                        Light Mode
                      </>
                    ) : (
                      <>
                        <Moon className="mr-2 w-4 h-4" />
                        Dark Mode
                      </>
                    )}
                  </Button>

                  {/* Mobile Auth Buttons */}
                  {!user && (
                    <div className="pt-4 space-y-2 border-t">
                      <SheetClose asChild>
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => navigate("/auth")}
                        >
                          Log in
                        </Button>
                      </SheetClose>
                      <SheetClose asChild>
                        <Button 
                          className="w-full"
                          onClick={() => navigate("/auth?tab=signup")}
                        >
                          Sign up
                        </Button>
                      </SheetClose>
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
