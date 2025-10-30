import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Bookmark, Heart, MessageSquare } from "lucide-react";

interface MobileProfileTabProps {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    profilePicture?: string;
    subscriptionTier?: string;
  };
  allPosts: any[];
  savedPosts: any[];
  savedPostsLoading: boolean;
  onPostClick: (postId: string) => void;
  getTimeAgo: (date: string) => string;
}

export const MobileProfileTab = ({ 
  user, 
  allPosts, 
  savedPosts, 
  savedPostsLoading, 
  onPostClick,
  getTimeAgo 
}: MobileProfileTabProps) => {
  const userPosts = allPosts.filter(p => p.authorId === user.id);

  return (
    <div className="space-y-6 p-4">
      {/* User Stats */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4 mb-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={user.profilePicture} />
              <AvatarFallback className="text-lg">
                {user.firstName[0]}{user.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-semibold">
                {user.firstName} {user.lastName}
              </h2>
              {user.subscriptionTier && (
                <span className="text-sm text-muted-foreground">
                  {user.subscriptionTier} member
                </span>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xl font-bold">{userPosts.length}</div>
              <div className="text-sm text-muted-foreground">Posts</div>
            </div>
            <div>
              <div className="text-xl font-bold">
                {userPosts.reduce((sum, post) => sum + post.likesCount, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Likes</div>
            </div>
            <div>
              <div className="text-xl font-bold">
                {savedPosts?.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Saved</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Posts Tabs */}
      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="my-posts" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-none border-b">
              <TabsTrigger 
                value="my-posts" 
                className="flex items-center space-x-2 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                <MessageCircle className="w-4 h-4" />
                <span>My Posts</span>
                <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                  {userPosts.length}
                </span>
              </TabsTrigger>
              <TabsTrigger 
                value="saved-posts" 
                className="flex items-center space-x-2 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
              >
                <Bookmark className="w-4 h-4" />
                <span>Saved</span>
                <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                  {savedPosts?.length || 0}
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="my-posts" className="p-4 mt-0">
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {userPosts.map((post) => (
                  <div 
                    key={post.id} 
                    className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => onPostClick(post.id)}
                    data-testid={`my-post-${post.id}`}
                  >
                    <h4 className="text-sm font-medium text-foreground truncate">
                      {post.content.length > 50 ? post.content.substring(0, 50) + "..." : post.content}
                    </h4>
                    <div className="flex items-center space-x-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center">
                        <Heart className="w-3 h-3 mr-1" />
                        {post.likesCount}
                      </span>
                      <span className="flex items-center">
                        <MessageCircle className="w-3 h-3 mr-1" />
                        {post.commentsCount}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {getTimeAgo(post.createdAt)}
                    </div>
                  </div>
                ))}
                {userPosts.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>You haven't created any posts yet</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="saved-posts" className="p-4 mt-0">
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {savedPostsLoading ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
                    <p>Loading saved posts...</p>
                  </div>
                ) : savedPosts && savedPosts.length > 0 ? (
                  savedPosts.map((post: any) => (
                    <div 
                      key={post.id} 
                      className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => onPostClick(post.id)}
                      data-testid={`saved-post-${post.id}`}
                    >
                      <h4 className="text-sm font-medium text-foreground truncate">
                        {post.content.length > 50 ? post.content.substring(0, 50) + "..." : post.content}
                      </h4>
                      <div className="text-xs text-muted-foreground mt-1">
                        By {post.user.firstName} {post.user.lastName}
                      </div>
                      <div className="flex items-center space-x-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center">
                          <Heart className="w-3 h-3 mr-1" />
                          {post.likesCount}
                        </span>
                        <span className="flex items-center">
                          <MessageCircle className="w-3 h-3 mr-1" />
                          {post.commentsCount}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Saved {getTimeAgo(post.savedAt)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <Bookmark className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>You haven't saved any posts yet</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>


    </div>
  );
};