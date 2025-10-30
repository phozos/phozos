import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MobileTopHeaderProps {
  user: {
    firstName: string;
    lastName: string;
    profilePicture?: string;
    subscriptionTier?: string;
  };
}

const getSubscriptionIcon = (subscriptionTier?: string) => {
  switch (subscriptionTier) {
    case 'premium':
      return <span className="text-blue-600 font-bold text-xs">🔹</span>;
    case 'elite':
      return <span className="text-purple-600 font-bold text-xs">💎</span>;
    case 'free':
    case null:
    case undefined:
    default:
      return null;
  }
};

export const MobileTopHeader = ({ user }: MobileTopHeaderProps) => {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="flex items-center justify-between h-16 px-4">
        {/* Logo */}
        <div className="flex items-center">
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Phozos
          </h1>
        </div>

        {/* User Avatar */}
        <div className="flex items-center space-x-2">
          {getSubscriptionIcon(user.subscriptionTier)}
          <Avatar className="w-8 h-8">
            <AvatarImage src={user.profilePicture} />
            <AvatarFallback className="text-xs">
              {user.firstName[0]}{user.lastName[0]}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </div>
  );
};