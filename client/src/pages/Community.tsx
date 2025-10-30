import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useApiQuery, useApiMutation } from "@/hooks/api-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/useWebSocket";
import { api } from "@/lib/api-client";
import { FORUM_CATEGORIES } from "@/lib/constants";
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";
import { MobileTopHeader } from "@/components/mobile/MobileTopHeader";
import { FloatingCreateButton } from "@/components/mobile/FloatingCreateButton";
import { MobileSearchTab } from "@/components/mobile/MobileSearchTab";
import { MobileProfileTab } from "@/components/mobile/MobileProfileTab";
import { MobileCreatePostModal } from "@/components/mobile/MobileCreatePostModal";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { 
  MessageSquare, 
  Heart, 
  Share2 as Share, 
  Bookmark,
  Plus,
  Search,
  Filter,
  TrendingUp,
  Users,
  Clock,
  Eye,
  ThumbsUp,
  Send,
  Image as ImageIcon,
  Smile,
  BarChart3,
  Award,
  MessageCircle,
  Calendar,
  Flag,
  ChevronDown,
  ChevronUp,
  Camera,
  BarChart2,
  Settings,
  X,
  Loader2
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Helper function to blur email
const blurEmail = (email: string) => {
  const [name, domain] = email.split('@');
  if (name.length <= 2) return email;
  const blurred = name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
  return `${blurred}@${domain}`;
};

// Helper function to get subscription plan icon
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
      return null; // No icon for free/undefined/null users
  }
};

// Helper function to calculate dynamic modal size with mobile-first approach
const getModalSize = (isPhotosExpanded: boolean, isPollExpanded: boolean, isAdvancedExpanded: boolean, userType?: string, isMobile?: boolean) => {
  // Mobile-first: Full viewport coverage for mobile devices
  if (isMobile) {
    return "fixed inset-0 z-[60] bg-background m-0 max-w-none max-h-none rounded-none border-0 p-0";
  }
  
  // Desktop: Existing responsive sizing logic
  let width = "max-w-lg"; // 512px
  let height = "max-h-[80vh]"; // Conservative base height
  
  // Expand for company profile features on desktop
  if (userType === 'company_profile') {
    if (isPhotosExpanded || isPollExpanded) {
      width = "max-w-xl"; // 576px
      height = "max-h-[85vh]"; // Slightly taller for expanded content
    }
    if (isPhotosExpanded && isPollExpanded) {
      width = "max-w-2xl"; // 672px
      height = "max-h-[90vh]"; // Taller for dual expansion
    }
    if (isAdvancedExpanded) {
      width = "max-w-2xl"; // 672px
      height = "max-h-[90vh]"; // Taller for advanced options
    }
  }
  
  // Desktop-specific optimizations for different screen sizes
  const desktopClasses = "lg:max-h-[85vh] lg:w-full xl:max-h-[80vh] 2xl:max-h-[75vh]";
  
  // Safe viewport bounds for desktop
  const viewportClasses = "my-4 mx-4 lg:my-8 lg:mx-auto";
  const overflowClasses = "overflow-hidden max-w-[calc(100vw-2rem)] lg:max-w-[calc(100vw-4rem)]";
  
  return `${width} ${height} ${desktopClasses} ${viewportClasses} ${overflowClasses}`;
};

// Use real authentication

interface ForumPost {
  id: string;
  authorId: string;
  title: string;
  content: string;
  category: string;
  tags?: string[];
  images?: string[];
  pollOptions?: Array<{ id: string; text: string; votes: number; percentage: number }>;
  pollQuestion?: string;
  pollEndsAt?: string;
  userVotes?: string[]; // Option IDs that the current user has voted for
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  isPinned?: boolean;
  isLocked?: boolean;
  isHiddenByReports?: boolean;
  isLiked?: boolean;
  isSaved?: boolean;
  createdAt: string;
  updatedAt: string;
  user?: {
    id?: string;
    firstName: string;
    lastName: string;
    profilePicture?: string;
    email: string;
    subscriptionTier?: string;
    userType?: string;
    companyName?: string;
  };
}

interface ForumComment {
  id: string;
  postId: string;
  userId: string;
  parentId?: string;
  content: string;
  likesCount: number;
  createdAt: string;
  updatedAt: string;
  user?: {
    id?: string;
    firstName: string;
    lastName: string;
    profilePicture?: string;
    email: string;
    subscriptionTier?: string;
    userType?: string;
    companyName?: string;
  };
}

// Memoized ForumPostCard component for better performance
interface ForumPostCardProps {
  post: ForumPost;
  userId?: string;
  selectedPost: string | null;
  likePostMutationPending: boolean;
  savePostMutationPending: boolean;
  onLike: (postId: string) => void;
  onSave: (postId: string) => void;
  onComment: (postId: string) => void;
  onShare: (postId: string) => void;
  onReport: (postId: string) => void;
  onPollVote: (postId: string, optionId: string) => void;
  onImageClick: (images: string[], index: number) => void;
  getTimeAgo: (dateString: string) => string;
  isPollExpired: (pollEndsAt: string | undefined) => boolean;
}

const ForumPostCard = React.memo(({ 
  post, 
  userId,
  selectedPost,
  likePostMutationPending,
  savePostMutationPending,
  onLike, 
  onSave, 
  onComment,
  onShare,
  onReport,
  onPollVote,
  onImageClick,
  getTimeAgo,
  isPollExpired
}: ForumPostCardProps) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={post.user?.profilePicture} />
            <AvatarFallback>
              {post.user?.firstName?.[0]}{post.user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <h4 className="font-semibold text-foreground text-sm">
                {post.user?.userType === 'company_profile' && post.user?.companyName 
                  ? post.user.companyName 
                  : `${post.user?.firstName} ${post.user?.lastName}`
                }
              </h4>
              {getSubscriptionIcon(post.user?.subscriptionTier)}
              <Badge variant="outline" className="text-xs">
                {FORUM_CATEGORIES.find(cat => cat.id === post.category)?.name || post.category}
              </Badge>
              <span className="text-muted-foreground text-xs">
                {getTimeAgo(post.createdAt)}
              </span>
            </div>
            
            {post.title && <h4 className="font-semibold text-foreground text-sm mb-2">{post.title}</h4>}
            <p className="text-foreground text-sm whitespace-pre-wrap mb-3">
              {post.content}
            </p>
            
            {/* Post Images */}
            {post.images && post.images.length > 0 && (
              <div className="mb-3">
                <div className={`grid gap-2 ${post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {post.images.slice(0, 4).map((image, index) => (
                    <div 
                      key={index} 
                      className="relative cursor-pointer"
                      onClick={() => onImageClick(post.images!, index)}
                    >
                      <img 
                        src={image} 
                        alt={`Post image ${index + 1}`} 
                        className="w-full h-32 object-cover rounded-lg border hover:opacity-90 transition-opacity"
                      />
                      {post.images!.length > 4 && index === 3 && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                          <span className="text-white font-medium">+{post.images!.length - 4} more</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Post Poll */}
            {post.pollQuestion && (
              <div className="mb-3 p-3 border rounded-lg bg-muted/20">
                <h5 className="font-medium text-sm mb-2">{post.pollQuestion}</h5>
                <div className="space-y-2">
                  {post.pollOptions && post.pollOptions.map((option: any, index: number) => {
                    const hasUserVoted = post.userVotes && post.userVotes.length > 0;
                    const isUserChoice = hasUserVoted && post.userVotes && post.userVotes.includes(option.id);
                    const pollExpired = isPollExpired(post.pollEndsAt);
                    
                    if (hasUserVoted || pollExpired) {
                      return (
                        <div 
                          key={index} 
                          className={`flex items-center justify-between p-2 border rounded ${
                            isUserChoice ? 'bg-primary/10 border-primary' : 'bg-background'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <span className="text-sm">{option.text}</span>
                            {isUserChoice && (
                              <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                                Your choice
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-muted rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full" 
                                style={{ width: `${option.percentage || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-muted-foreground">{option.votes || 0} votes</span>
                            <span className="text-xs font-medium">{option.percentage || 0}%</span>
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <Button
                          key={index}
                          variant="outline"
                          className="w-full justify-start p-3 h-auto text-sm"
                          onClick={() => onPollVote(post.id, option.id)}
                          disabled={pollExpired}
                        >
                          {option.text}
                        </Button>
                      );
                    }
                  })}
                </div>
                {post.pollEndsAt && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {isPollExpired(post.pollEndsAt) ? (
                      <span className="text-red-500 font-medium">Poll expired</span>
                    ) : (
                      <span>Poll ends: {new Date(post.pollEndsAt).toLocaleString()}</span>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {post.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            
            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const now = Date.now();
                    const lastClick = e.currentTarget.getAttribute('data-last-click');
                    if (lastClick && (now - parseInt(lastClick)) < 500) return;
                    e.currentTarget.setAttribute('data-last-click', now.toString());
                    if (!likePostMutationPending) onLike(post.id);
                  }}
                  disabled={likePostMutationPending}
                  className={`h-8 px-2 transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                    post.isLiked 
                      ? 'text-red-500 hover:text-red-600' 
                      : 'text-muted-foreground hover:text-red-500'
                  } ${likePostMutationPending ? 'opacity-70' : ''}`}
                  data-testid={`like-post-mobile-${post.id}`}
                >
                  <Heart className={`w-4 h-4 mr-1 transition-all duration-300 ${
                    post.isLiked 
                      ? 'fill-red-500 text-red-500 scale-110' 
                      : 'text-muted-foreground'
                  } ${likePostMutationPending ? 'animate-pulse' : ''}`} />
                  <span className="text-xs">
                    {likePostMutationPending ? '...' : post.likesCount}
                  </span>
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onComment(post.id);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onComment(post.id);
                  }}
                  className="h-8 px-2"
                  data-testid={`comment-post-${post.id}`}
                >
                  <MessageCircle className="w-4 h-4 mr-1" />
                  <span className="text-xs">{post.commentsCount}</span>
                </Button>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const now = Date.now();
                    const lastClick = e.currentTarget.getAttribute('data-last-click');
                    if (lastClick && (now - parseInt(lastClick)) < 500) return;
                    e.currentTarget.setAttribute('data-last-click', now.toString());
                    if (!savePostMutationPending) onSave(post.id);
                  }}
                  disabled={savePostMutationPending}
                  className={`h-8 px-2 transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                    post.isSaved 
                      ? 'text-violet-500 hover:text-violet-600' 
                      : 'text-muted-foreground hover:text-violet-500'
                  } ${savePostMutationPending ? 'opacity-70' : ''}`}
                  data-testid={`save-post-${post.id}`}
                >
                  <Bookmark className={`w-4 h-4 transition-all duration-300 ${
                    post.isSaved 
                      ? 'fill-violet-500 text-violet-500 scale-110' 
                      : 'text-muted-foreground'
                  } ${savePostMutationPending ? 'animate-pulse' : ''}`} />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onShare(post.id)}
                  className="h-8 px-2"
                  data-testid={`share-post-${post.id}`}
                >
                  <Share className="w-4 h-4" />
                </Button>
                
                {post.authorId !== userId && post.user?.userType !== 'company_profile' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onReport(post.id);
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onReport(post.id);
                    }}
                    className="h-8 px-2 text-muted-foreground hover:text-red-500"
                    data-testid={`report-post-${post.id}`}
                  >
                    <Flag className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

ForumPostCard.displayName = 'ForumPostCard';

export default function Community() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // NEW: Component-level error state (100% safe addition)
  const [componentError, setComponentError] = useState<string | null>(null);
  
  // NEW: Safe error handler
  const handleComponentError = (error: Error) => {
    console.error('Community component error:', error);
    setComponentError(error.message);
  };
  
  // NEW: Error recovery
  if (componentError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900 mb-4">Community Temporarily Unavailable</h1>
          <p className="text-gray-600 mb-4">
            We're experiencing technical issues with the community forum.
          </p>
          <button
            onClick={() => setComponentError(null)}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showCreatePost, setShowCreatePost] = useState(false);

  // Debug showCreatePost state changes
  useEffect(() => {
    console.log(`📱 [DEBUG] showCreatePost state changed to: ${showCreatePost}, isMobile: ${isMobile}`);
  }, [showCreatePost, isMobile]);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedPostForAnalytics, setSelectedPostForAnalytics] = useState<string | null>(null);
  const [newPost, setNewPost] = useState({
    title: "",
    content: "",
    category: "",
    tags: [] as string[],
    images: [] as string[],
    pollQuestion: "",
    pollOptions: [] as Array<{ id: string; text: string }>,
    pollEndsAt: ""
  });
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [selectedPostForReport, setSelectedPostForReport] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  
  // Track posts that have been reported by the current user
  const [reportedPosts, setReportedPosts] = useState<Set<string>>(new Set());
  
  
  // Progressive disclosure state for create post modal
  const [isPhotosExpanded, setIsPhotosExpanded] = useState(false);
  const [isPollExpanded, setIsPollExpanded] = useState(false);
  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState(true); // Default expanded for visibility
  
  // Reset progressive disclosure when modal closes
  const resetCreatePostModal = () => {
    setShowCreatePost(false);
    setIsPhotosExpanded(false);
    setIsPollExpanded(false);
    setIsAdvancedExpanded(false);
    setNewPost({
      title: "",
      content: "",
      category: "",
      tags: [],
      images: [],
      pollQuestion: "",
      pollOptions: [],
      pollEndsAt: ""
    });
  };
  
  // Infinite scroll state
  const [allPosts, setAllPosts] = useState<ForumPost[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);
  
  // Mobile state - ensure activeTab starts with 'feed' and persists correctly
  const [activeTab, setActiveTab] = useState<'feed' | 'search' | 'profile'>('feed');
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [mobileTabInitialized, setMobileTabInitialized] = useState(false);
  
  // Reset to feed tab only once when switching to mobile view (not on every tab change)
  useEffect(() => {
    if (isMobile && !mobileTabInitialized) {
      console.log(`📱 [MOBILE TAB INIT] Initializing mobile tab to 'feed'`);
      setActiveTab('feed');
      setMobileTabInitialized(true);
    }
  }, [isMobile, mobileTabInitialized]);
  
  // Debug mobile tab state
  useEffect(() => {
    if (isMobile) {
      console.log(`📱 [MOBILE TAB DEBUG] activeTab is: ${activeTab}`);
    }
  }, [activeTab, isMobile]);
  
  // Debounce search query to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300); // 300ms debounce
    
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  // Image lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxInitialIndex, setLightboxInitialIndex] = useState(0);

  // Function to open lightbox
  const openLightbox = (images: string[], index: number = 0) => {
    setLightboxImages(images);
    setLightboxInitialIndex(index);
    setLightboxOpen(true);
  };

  // Fetch saved posts
  const { data: savedPosts = [], isLoading: savedPostsLoading } = useApiQuery(
    ['/api/forum/saved'],
    '/api/forum/saved',
    undefined,
    { staleTime: 0 } // Always fetch fresh data
  );

  // Report mutation
  const reportPostMutation = useApiMutation(
    async ({ postId, reportReason, reportDetails }: { postId: string; reportReason: string; reportDetails?: string }) => {
      return await api.post(`/api/forum/posts/${postId}/report`, {
        reportReason, 
        reportDetails
      });
    },
    {
      onSuccess: () => {
        toast({
          title: "Post Reported",
          description: "Thank you for your report. Our team will review it shortly.",
        });
        
        // Add the post to the reported posts set
        if (selectedPostForReport) {
          setReportedPosts(prev => new Set(Array.from(prev).concat([selectedPostForReport])));
        }
        
        setShowReportDialog(false);
        setSelectedPostForReport(null);
        setReportReason("");
        setReportDetails("");
      },
      onError: (error: any) => {
        const errorMessage = error?.message || "";
        
        // Check for specific error cases
        if (errorMessage.includes("already reported")) {
          // Add the post to reported posts set to prevent future attempts
          if (selectedPostForReport) {
            setReportedPosts(prev => new Set(Array.from(prev).concat([selectedPostForReport])));
          }
          
          toast({
            title: "Already Reported", 
            description: "You have already reported this post. Our team will review it.",
            variant: "default",
          });
        } else if (errorMessage.includes("Unauthorized")) {
          toast({
            title: "Please Log In", 
            description: "You need to be logged in to report posts.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Report Failed", 
            description: errorMessage || "Failed to report post. Please try again.",
            variant: "destructive",
          });
        }
        
        // Always close the dialog and reset form on any error
        setShowReportDialog(false);
        setSelectedPostForReport(null);
        setReportReason("");
        setReportDetails("");
      },
    }
  );

  // Handle real-time forum updates via WebSocket with infinite scroll awareness
  const handleWebSocketMessage = (message: any) => {
    if (message.type === "forum_post_created") {
      // Add new post to the top of the list for all users (including the author)
      if (message.data?.post) {
        setAllPosts(prev => {
          // Check if post already exists to avoid duplicates
          const exists = prev.some(p => p.id === message.data.post.id);
          if (!exists) {
            return [message.data.post, ...prev];
          }
          return prev;
        });
      } else {
        // Fallback: invalidate queries if we don't have post data
        queryClient.invalidateQueries({ queryKey: ["/api/forum/posts"] });
      }
    } else if (message.type === "forum_post_updated") {
      // Invalidate specific post queries when post is updated
      queryClient.invalidateQueries({ queryKey: ["/api/forum/posts"] });
      if (message.data?.postId) {
        queryClient.invalidateQueries({ queryKey: ["/api/forum/posts", message.data.postId, "comments"] });
      }
    } else if (message.type === "post_reported") {
      // Handle post being reported - just in case UI needs to update
      setAllPosts(prev => prev.map(post => {
        if (post.id === message.data?.postId) {
          return { ...post, reportCount: message.data?.reportCount || 0 };
        }
        return post;
      }));
    } else if (message.type === "post_auto_hidden") {
      // Silently remove auto-hidden post from UI (no notifications)
      setAllPosts(prev => prev.filter(post => post.id !== message.data?.postId));
      console.log(`🔇 Post ${message.data?.postId} silently removed from forum due to reports`);
    } else if (message.type === "post_restored") {
      // Post was restored by admin - refresh the posts
      queryClient.invalidateQueries({ queryKey: ["/api/forum/posts"] });
    } else if (message.type === "post_permanently_deleted") {
      // Post was permanently deleted - remove from local state
      setAllPosts(prev => prev.filter(post => post.id !== message.data?.postId));
    } else if (message.type === "forum_comment_created") {
      // Refresh comments for the specific post
      if (message.data?.postId) {
        queryClient.invalidateQueries({ queryKey: ["/api/forum/posts", message.data.postId, "comments"] });
        // Refresh the posts data to get updated comment count from server
        queryClient.invalidateQueries({ queryKey: ["/api/forum/posts"] });
      }
    } else if (message.type === "forum_post_like_update") {
      // Update like count in real-time for all users
      if (message.data?.postId) {
        setAllPosts(prev => prev.map(post => 
          post.id === message.data.postId 
            ? { 
                ...post, 
                likesCount: message.data.newLikeCount,
                // Only update isLiked if this is the current user's action
                isLiked: message.data.userId === user?.id ? message.data.liked : post.isLiked
              }
            : post
        ));
        
        // Also invalidate analytics if the analytics modal is open for this post
        if (selectedPostForAnalytics === message.data.postId) {
          queryClient.invalidateQueries({ queryKey: ["/api/forum/posts", message.data.postId, "analytics"] });
        }
      }
    } else if (message.type === "poll_vote_update") {
      // Enhanced poll update handling with privacy controls
      if (message.data?.postId) {
        // Check if this update should be applied to current user
        const shouldUpdatePoll = () => {
          // New privacy-aware messages include showResults flag
          if (message.data.showResults !== undefined) {
            return message.data.showResults;
          }
          
          // Fallback: Use legacy logic for backwards compatibility
          if (message.data.pollResults) {
            const currentPost = allPosts.find(p => p.id === message.data.postId);
            return currentPost?.userVotes && currentPost.userVotes.length > 0;
          }
          
          return false;
        };

        if (shouldUpdatePoll()) {
          setAllPosts(prev => prev.map(post => 
            post.id === message.data.postId 
              ? { 
                  ...post, 
                  // Use new pollOptions if available, otherwise use legacy pollResults.options
                  pollOptions: message.data.pollOptions || message.data.pollResults?.options,
                  // Update userVotes appropriately
                  userVotes: message.data.userId === user?.id ? 
                    (message.data.userVotes || message.data.userVotes) : 
                    post.userVotes
                }
              : post
          ));
          
          console.log(`✅ Poll update applied for user ${user?.id} on post ${message.data.postId}`);
          
          // Invalidate relevant queries to ensure data consistency
          queryClient.invalidateQueries({ 
            queryKey: ["/api/forum/posts", message.data.postId, "poll"],
            exact: false 
          });
        } else {
          console.log(`🔒 Poll update ignored for non-voter on post ${message.data.postId}`);
        }
      }
    }
  };

  // Setup WebSocket connection for real-time updates
  const { isConnected } = useWebSocket({
    onMessage: handleWebSocketMessage,
    userId: user?.id,
    autoReconnect: true,
  });

  // Function to load more posts
  const loadMorePosts = useCallback(async (page: number = 1, resetPosts: boolean = false) => {
    if (!user) return;
    
    try {
      setIsLoadingMore(true);
      if (debouncedSearchQuery.trim()) {
        setIsSearching(true);
      }
      
      let url = "/api/forum/posts";
      const params = new URLSearchParams();
      
      if (selectedCategory !== "all") {
        params.append("category", selectedCategory);
      }
      
      if (debouncedSearchQuery.trim()) {
        params.append("search", debouncedSearchQuery.trim());
      }
      
      
      params.append("page", page.toString());
      params.append("limit", "20");
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const data = await api.get(url) as any;
      const newPosts = Array.isArray(data) ? data : (data.posts || []);
      
      if (resetPosts || page === 1) {
        setAllPosts(newPosts);
      } else {
        setAllPosts(prev => {
          // Avoid duplicates by checking IDs
          const existingIds = new Set(prev.map(post => post.id));
          const uniqueNewPosts = newPosts.filter((post: ForumPost) => !existingIds.has(post.id));
          return [...prev, ...uniqueNewPosts];
        });
      }
      
      // Check if there are more posts to load
      const pagination = data.pagination || data.meta?.pagination;
      setHasMore(pagination?.hasNext || false);
      
    } catch (error) {
      console.error('Failed to load posts:', error);
      toast({
        title: "Error",
        description: "Failed to load posts. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMore(false);
      setIsSearching(false);
    }
  }, [user, selectedCategory, debouncedSearchQuery, toast]);

  // Initial load when component mounts or category/search changes
  useEffect(() => {
    if (!user) return; // Don't load posts if user not authenticated
    
    console.log(`🔄 [${isMobile ? 'MOBILE' : 'DESKTOP'}] Loading posts for category:`, selectedCategory, 'search:', debouncedSearchQuery);
    setAllPosts([]);
    setCurrentPage(1);
    setHasMore(true);
    loadMorePosts(1, true);
  }, [selectedCategory, debouncedSearchQuery, loadMorePosts, user, isMobile]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasMore && !isLoadingMore) {
          const nextPage = currentPage + 1;
          setCurrentPage(nextPage);
          loadMorePosts(nextPage, false);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px',
      }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, isLoadingMore, currentPage, loadMorePosts]);

  // Fetch comments for selected post
  const { data: comments = [], isLoading: commentsLoading, error: commentsError } = useApiQuery(
    ["/api/forum/posts", selectedPost, "comments"],
    selectedPost ? `/api/forum/posts/${selectedPost}/comments` : '',
    undefined,
    {
      enabled: !!selectedPost && !!user,
      staleTime: 1 * 60 * 1000, // 1 minute
    }
  ) as { data: ForumComment[]; isLoading: boolean; error: Error | null };

  // Fetch post analytics
  const { data: postAnalytics, isLoading: analyticsLoading } = useApiQuery(
    ["/api/forum/posts", selectedPostForAnalytics, "analytics"],
    selectedPostForAnalytics ? `/api/forum/posts/${selectedPostForAnalytics}/analytics` : '',
    undefined,
    {
      enabled: !!selectedPostForAnalytics && !!user,
      staleTime: 30 * 1000, // 30 seconds
    }
  );

  // Create post mutation
  const createPostMutation = useApiMutation(
    async (postData: any) => {
      return await api.post("/api/forum/posts", postData);
    },
    {
      onSuccess: (response: any) => {
        // Don't add to local state here - let WebSocket handle it for consistency
        // The WebSocket broadcast will include complete user data structure
        resetCreatePostModal();
        toast({
          title: "Post created",
          description: "Your post has been successfully published.",
        });
      },
      onError: (error: any) => {
        let title = "Posting Error";
        let description = "Failed to create post. Please try again.";
        
        // Handle specific error responses based on forum rules
        if (error?.response?.status === 403) {
          // Cooling period restriction for new accounts
          const errorData = error.response.data || {};
          if (errorData.coolingPeriodEnds) {
            const endTime = new Date(errorData.coolingPeriodEnds);
            const remainingTime = Math.ceil((endTime.getTime() - Date.now()) / (1000 * 60)); // minutes
            title = "Account Cooling Period";
            description = `New accounts must wait 1 hour before posting. Time remaining: ${remainingTime} minutes.`;
          } else {
            title = "Access Restricted";
            description = errorData.message || "You don't have permission to create posts yet.";
          }
        } else if (error?.response?.status === 429) {
          const errorData = error.response.data || {};
          if (errorData.waitTime) {
            // Rule 7: 15-second posting interval
            title = "Please Wait";
            description = `Please wait ${errorData.waitTime} seconds before posting again.`;
          } else if (errorData.dailyLimit) {
            // Rule 8: Daily post limit
            title = "Daily Limit Reached";
            description = `You've reached the daily post limit (${errorData.dailyLimit} posts). Try again tomorrow.`;
          }
        } else if (error?.response?.status === 400) {
          // Validation errors (Rules 2, 3, 4, 5)
          title = "Content Validation Error";
          const errorMessage = error.response?.data?.message || error.message;
          description = errorMessage || "Your post doesn't meet community guidelines.";
        }
        
        toast({
          title,
          description,
          variant: "destructive",
        });
      },
    }
  );

  // Create comment mutation
  const createCommentMutation = useApiMutation(
    async ({ postId, content }: { postId: string; content: string }) => {
      return await api.post(`/api/forum/posts/${postId}/comments`, { content });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/forum/posts", selectedPost, "comments"] });
        // Refresh the posts data to get updated comment count from server
        queryClient.invalidateQueries({ queryKey: ["/api/forum/posts"] });
        setNewComment("");
        toast({
          title: "Comment added",
          description: "Your comment has been posted.",
        });
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to post comment. Please try again.",
          variant: "destructive",
        });
      },
    }
  );

  // Like post mutation with optimistic updates and debouncing
  const likePostMutation = useApiMutation(
    async (postId: string) => {
      return await api.post(`/api/forum/posts/${postId}/like`);
    },
    {
      onMutate: async (postId: string) => {
        // Optimistic update for immediate feedback
        const previousPosts = allPosts;
        
        setAllPosts(prev => prev.map(post => {
          if (post.id === postId) {
            const newLiked = !post.isLiked;
            const newCount = newLiked 
              ? (post.likesCount || 0) + 1 
              : Math.max((post.likesCount || 0) - 1, 0);
            return { 
              ...post, 
              isLiked: newLiked, 
              likesCount: newCount 
            };
          }
          return post;
        }));

        return { previousPosts, postId };
      },
      onSuccess: (data: any, postId: string) => {
        // Update with server response to ensure accuracy
        setAllPosts(prev => prev.map(post => 
          post.id === postId 
            ? { ...post, likesCount: data.likesCount, isLiked: data.liked }
            : post
        ));
      },
      onError: (error, postId, context) => {
        // Revert optimistic update on error
        if (context?.previousPosts) {
          setAllPosts(context.previousPosts);
        }
        toast({
          title: "Error",
          description: "Failed to like post. Please try again.",
          variant: "destructive",
        });
      },
    }
  );

  // Save post mutation
  const savePostMutation = useApiMutation(
    async (postId: string) => {
      return await api.post(`/api/forum/posts/${postId}/save`);
    },
    {
      onMutate: async (postId: string) => {
        // Optimistic update for immediate feedback
        const previousPosts = allPosts;
        
        setAllPosts(prev => prev.map(post => {
          if (post.id === postId) {
            const newSaved = !post.isSaved;
            return { 
              ...post, 
              isSaved: newSaved
            };
          }
          return post;
        }));

        return { previousPosts, postId };
      },
      onSuccess: (data: any, postId: string) => {
        // Update with server response to ensure accuracy
        setAllPosts(prev => prev.map(post => 
          post.id === postId 
            ? { ...post, isSaved: data.saved }
            : post
        ));
        // Still show success toast but with dynamic message
        const wasSaved = data.saved;
        toast({
          title: wasSaved ? "Post saved" : "Post unsaved",
          description: wasSaved ? "Post has been saved to your collection." : "Post has been removed from your collection.",
        });
        // Invalidate saved posts query to refresh the list
        queryClient.invalidateQueries({ queryKey: ['/api/forum/saved'] });
      },
      onError: (error, postId, context) => {
        // Revert optimistic update on error
        if (context?.previousPosts) {
          setAllPosts(context.previousPosts);
        }
        toast({
          title: "Error",
          description: "Failed to save post. Please try again.",
          variant: "destructive",
        });
      },
    }
  );

  // Handle share post functionality
  const handleSharePost = async (postId: string) => {
    try {
      // Get the current URL and construct the post link
      const postUrl = `${window.location.origin}/community?post=${postId}`;
      
      // Try to use the Web Share API if available (mobile devices)
      if (navigator.share) {
        await navigator.share({
          title: 'Check out this post on Phozos',
          text: 'Interesting discussion happening here',
          url: postUrl,
        });
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(postUrl);
        toast({
          title: "Link copied!",
          description: "Post link has been copied to your clipboard.",
        });
      }
    } catch (error) {
      // If everything fails, show the URL in a dialog
      toast({
        title: "Share this post",
        description: `Copy this link: ${window.location.origin}/community?post=${postId}`,
        duration: 8000,
      });
    }
  };

  const handleCreatePost = () => {
    const content = newPost.content.trim();
    
    if (!content) {
      toast({
        title: "Validation Error",
        description: "Please write something to post.",
        variant: "destructive",
      });
      return;
    }

    // Client-side validation for forum rules (skip for company profiles)
    if (user?.userType !== 'company_profile') {
      // Rule 2: Check for links
      const urlRegex = /(https?:\/\/|www\.|[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/i;
      if (urlRegex.test(content)) {
        toast({
          title: "Links Not Allowed",
          description: "Please remove links from your post. Only text content is allowed.",
          variant: "destructive",
        });
        return;
      }

      // Rule 3: Check for phone numbers
      const phoneRegex = /(\+?\d[\d\s\-\(\)]{7,}|\b\d{3}[\s\-]?\d{3}[\s\-]?\d{4}\b)/;
      if (phoneRegex.test(content)) {
        toast({
          title: "Phone Numbers Not Allowed",
          description: "Please remove phone numbers from your post.",
          variant: "destructive",
        });
        return;
      }

      // Rule 5: Length check (should be handled by UI but double check)
      if (content.length > 100) {
        toast({
          title: "Content Too Long",
          description: "Posts cannot exceed 100 characters including spaces.",
          variant: "destructive",
        });
        return;
      }
    }

    // Build post data
    const postData: any = {
      title: user?.userType === 'company_profile' && newPost.title ? newPost.title : null,
      content: content,
      category: newPost.category || FORUM_CATEGORIES[0]?.id || "general",
      tags: newPost.tags || []
    };

    // Add company profile specific fields
    if (user?.userType === 'company_profile') {
      if (newPost.images.length > 0) {
        postData.images = newPost.images;
      }
      
      if (newPost.pollQuestion && newPost.pollOptions.length >= 2) {
        postData.pollQuestion = newPost.pollQuestion;
        postData.pollOptions = newPost.pollOptions
          .filter(option => option.text.trim())
          .map((option, index) => ({
            id: `option_${index}`,  // Always use mobile format
            text: option.text.trim()
            // Remove votes field during creation
          }));
        // Use poll end date from form, or default to 7 days
        if (newPost.pollEndsAt) {
          postData.pollEndsAt = new Date(newPost.pollEndsAt).toISOString();
        } else {
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + 7);
          postData.pollEndsAt = endDate.toISOString();
        }
      }
    }

    createPostMutation.mutate(postData);
  };

  const handleCreateComment = () => {
    if (!newComment.trim() || !selectedPost) return;

    createCommentMutation.mutate({
      postId: selectedPost,
      content: newComment,
    });
  };

  const handleReportPost = (postId: string) => {
    setSelectedPostForReport(postId);
    setShowReportDialog(true);
  };

  const handleSubmitReport = () => {
    if (!selectedPostForReport || !reportReason.trim()) return;

    reportPostMutation.mutate({
      postId: selectedPostForReport,
      reportReason,
      reportDetails: reportDetails || undefined,
    });
  };

  // Poll voting mutation
  const voteOnPollMutation = useApiMutation(
    async ({ postId, optionId }: { postId: string; optionId: string }) => {
      return await api.post(`/api/forum/posts/${postId}/poll/vote/${optionId}`);
    },
    {
      onSuccess: (data, variables) => {
        // Update the local post with new poll results and user votes
        const responseData = data as any;
        setAllPosts(prev => prev.map(post => 
          post.id === variables.postId 
            ? { 
                ...post, 
                pollOptions: responseData.pollResults?.options || post.pollOptions,
                userVotes: responseData.userVotes || post.userVotes || []
              }
            : post
        ));

        toast({
          title: "Vote Submitted",
          description: "Your vote has been recorded successfully!",
        });
      },
      onError: (error: any) => {
        // Handle poll expiration error specifically
        if (error?.message?.includes("expired") || error?.message?.includes("POLL_EXPIRED")) {
          toast({
            title: "Poll Expired",
            description: "This poll is no longer accepting votes.",
            variant: "destructive",
          });
          
          // Refresh the posts to update UI state
          queryClient.invalidateQueries({ queryKey: ["/api/forum/posts"] });
        } else {
          // Existing error handling
          toast({
            title: "Vote Failed",
            description: error.message || "Failed to submit your vote. Please try again.",
            variant: "destructive",
          });
        }
      },
    }
  );

  // Helper function to check if poll has expired
  const isPollExpired = (pollEndsAt: string | undefined) => {
    if (!pollEndsAt) return false;
    return new Date() > new Date(pollEndsAt);
  };

  const handlePollVote = (postId: string, optionId: string) => {
    if (!user) {
      toast({
        title: "Please Log In",
        description: "You need to be logged in to vote on polls.",
        variant: "destructive",
      });
      return;
    }

    // Client-side poll expiration check
    const post = allPosts.find(p => p.id === postId);
    if (post?.pollEndsAt && isPollExpired(post.pollEndsAt)) {
      toast({
        title: "Poll Expired",
        description: "This poll is no longer accepting votes.",
        variant: "destructive",
      });
      return;
    }

    voteOnPollMutation.mutate({ postId, optionId });
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  // Filter posts to hide those that are hidden by reports (unless user is admin)
  // Memoized to avoid re-filtering on every render
  const filteredPosts = useMemo(() => {
    return allPosts.filter(post => {
      // Hide posts that are hidden by reports (3+ reports)
      if (post.isHiddenByReports && (user as any)?.userType !== 'admin') {
        return false;
      }
      return true;
    });
  }, [allPosts, user]);

  // Debug logging for mobile data loading issues
  useEffect(() => {
    if (isMobile) {
      console.log(`📱 [MOBILE DEBUG] allPosts length: ${allPosts.length}, filteredPosts length: ${filteredPosts.length}`);
      console.log(`📱 [MOBILE DEBUG] activeTab: ${activeTab}, user: ${user ? 'authenticated' : 'not authenticated'}`);
      console.log(`📱 [MOBILE DEBUG] isLoadingMore: ${isLoadingMore}, hasMore: ${hasMore}`);
    }
  }, [isMobile, allPosts.length, filteredPosts.length, activeTab, user, isLoadingMore, hasMore]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (allPosts.length === 0 && isLoadingMore) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <LoadingSkeleton type="card" count={4} />
        </div>
      </div>
    );
  }

  // Show error state if no posts can be loaded (handled by infinite scroll)

  // Helper function for post analytics
  const handlePostClick = (postId: string) => {
    setSelectedPostForAnalytics(postId);
    setShowAnalytics(true);
  };

  // Render analytics dialog (shared between mobile and desktop)
  const renderAnalyticsDialog = () => (
    <Dialog open={showAnalytics} onOpenChange={setShowAnalytics}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] md:max-w-lg lg:max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Post Analytics</DialogTitle>
          <DialogDescription>
            View detailed engagement statistics for this post
          </DialogDescription>
        </DialogHeader>
        
        {analyticsLoading ? (
          <div className="space-y-4 py-4">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-20 bg-muted rounded"></div>
            </div>
          </div>
        ) : postAnalytics ? (
          <Tabs defaultValue="likes" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="likes">Likes ({(postAnalytics as any).likes?.length || 0})</TabsTrigger>
              <TabsTrigger value="comments">Comments ({(postAnalytics as any).comments?.length || 0})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="likes" className="space-y-4 mt-4">
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {(postAnalytics as any).likes && (postAnalytics as any).likes.length > 0 ? (
                  (postAnalytics as any).likes.map((like: any) => (
                    <div key={like.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={like.profilePicture} />
                        <AvatarFallback className="text-xs">
                          {like.userType === 'company_profile' && like.companyName 
                            ? like.companyName.charAt(0)
                            : `${like.firstName?.[0] || ''}${like.lastName?.[0] || ''}`
                          }
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {like.userType === 'company_profile' && like.companyName 
                            ? like.companyName 
                            : `${like.firstName} ${like.lastName}`
                          }
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(like.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Heart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No likes yet</p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="comments" className="space-y-4 mt-4">
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {(postAnalytics as any).comments && (postAnalytics as any).comments.length > 0 ? (
                  (postAnalytics as any).comments.map((comment: any) => (
                    <div key={comment.id} className="space-y-2 p-3 rounded-lg border">
                      <div className="flex items-center space-x-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={comment.profilePicture} />
                          <AvatarFallback className="text-xs">
                            {comment.firstName?.[0]}{comment.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-sm font-medium">
                          {comment.firstName} {comment.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <p className="text-sm text-foreground ml-8">{comment.content}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No comments yet</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No analytics data available</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  // Mobile Layout
  if (isMobile) {
    console.log(`📱 [MOBILE RENDER] Rendering mobile view with ${filteredPosts.length} filtered posts, activeTab: ${activeTab}`);
    
    return (
      <div className="min-h-screen bg-background">
        {/* Mobile Top Header */}
        <MobileTopHeader user={{
          firstName: user.firstName,
          lastName: user.lastName,
          profilePicture: user.profilePicture || undefined,
          subscriptionTier: (user as any).subscriptionTier
        }} />
        
        {/* Mobile Content */}
        <div className="pt-16 pb-20">
          {activeTab === 'feed' && (
            <div className="space-y-4 p-4">
              
              
              {filteredPosts.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="flex flex-col items-center space-y-4">
                      <MessageSquare className="w-12 h-12 text-muted-foreground" />
                      <div>
                        <h3 className="text-lg font-medium text-foreground mb-2">
                          {isLoadingMore ? 'Loading posts...' : 'No posts yet'}
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          {isLoadingMore ? 'Please wait while we load the community posts.' : 'Be the first to start a conversation!'}
                        </p>
                        {!isLoadingMore && (
                          <Button onClick={() => {
                            console.log('📱 [MOBILE] Create First Post button clicked, setting showCreatePost to true');
                            setShowCreatePost(true);
                          }} data-testid="create-first-post">
                            <Plus className="w-4 h-4 mr-2" />
                            Create First Post
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                filteredPosts.map((post: ForumPost) => (
                  <div key={post.id}>
                    <ForumPostCard
                      post={post}
                      userId={user?.id}
                      selectedPost={selectedPost}
                      likePostMutationPending={likePostMutation.isPending}
                      savePostMutationPending={savePostMutation.isPending}
                      onLike={(postId) => likePostMutation.mutate(postId)}
                      onSave={(postId) => savePostMutation.mutate(postId)}
                      onComment={(postId) => setSelectedPost(selectedPost === postId ? null : postId)}
                      onShare={handleSharePost}
                      onReport={handleReportPost}
                      onPollVote={handlePollVote}
                      onImageClick={openLightbox}
                      getTimeAgo={getTimeAgo}
                      isPollExpired={isPollExpired}
                    />
                    
                    {/* Comments section */}
                    <Card className="border-t-0 rounded-t-none">
                    
                    {/* Mobile Comments Section */}
                    {selectedPost === post.id && (
                      <div className="mt-4 pt-4 border-t mx-4">
                        {/* Add Comment */}
                        <div className="flex space-x-3 mb-4">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={user.profilePicture || undefined} />
                            <AvatarFallback className="text-xs">
                              {user.firstName[0]}{user.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <Textarea
                              placeholder="Write a comment..."
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              rows={2}
                              className="mb-2 text-sm"
                            />
                            <Button 
                              size="sm"
                              onClick={handleCreateComment}
                              disabled={!newComment.trim() || createCommentMutation.isPending}
                            >
                              <Send className="w-3 h-3 mr-1" />
                              {createCommentMutation.isPending ? "Posting..." : "Comment"}
                            </Button>
                          </div>
                        </div>

                        {/* Comments List */}
                        {commentsLoading ? (
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            <div className="animate-pulse">
                              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                              <div className="h-3 bg-muted rounded w-1/2"></div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                            {comments.map((comment: ForumComment) => (
                              <div key={comment.id} className="flex space-x-3">
                                <Avatar className="w-7 h-7">
                                  <AvatarImage src={comment.user?.profilePicture} />
                                  <AvatarFallback className="text-xs">
                                    {comment.user?.firstName?.[0]}{comment.user?.lastName?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 bg-muted rounded-lg p-3">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className="font-medium text-sm">
                                      {comment.user?.firstName} {comment.user?.lastName}
                                    </span>
                                    <span className="text-muted-foreground text-xs">
                                      {getTimeAgo(comment.createdAt)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-foreground whitespace-pre-wrap">
                                    {comment.content}
                                  </p>
                                </div>
                              </div>
                            ))}
                            {comments.length === 0 && (
                              <p className="text-center text-muted-foreground text-sm py-4">
                                No comments yet. Be the first to comment!
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                  </div>
                ))
              )}
              
              {/* Mobile Infinite Scroll Indicator */}
              {hasMore && (
                <div ref={observerTarget} className="flex justify-center py-4">
                  {isLoadingMore && (
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span className="text-sm">Loading more...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'search' && (
            <MobileSearchTab 
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchResults={filteredPosts}
              isSearching={isSearching}
            />
          )}
          
          {activeTab === 'profile' && (
            <MobileProfileTab
              user={{
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                profilePicture: user.profilePicture || undefined,
                subscriptionTier: (user as any).subscriptionTier
              }}
              allPosts={allPosts}
              savedPosts={Array.isArray(savedPosts) ? savedPosts : []}
              savedPostsLoading={savedPostsLoading}
              onPostClick={handlePostClick}
              getTimeAgo={getTimeAgo}
            />
          )}
        </div>
        
        {/* Mobile Bottom Navigation */}
        <MobileBottomNav 
          activeTab={activeTab} 
          onTabChange={(tab) => {
            console.log(`📱 [MOBILE TAB CHANGE] User clicked tab: ${tab}`);
            setActiveTab(tab);
          }} 
        />
        
        {/* Floating Create Button */}
        <FloatingCreateButton onClick={() => setShowCreatePost(true)} />
        
        {/* Mobile Create Post Modal */}
        <MobileCreatePostModal 
          isOpen={isMobile && showCreatePost}
          onClose={resetCreatePostModal}
          onSubmit={(postData) => {
            setNewPost({
              ...newPost,
              title: postData.title,
              content: postData.content,
              category: postData.category,
              tags: postData.tags,
              images: postData.images || [],
              pollQuestion: postData.pollQuestion || "",
              pollOptions: postData.pollOptions || [],
              pollEndsAt: postData.pollEndsAt || "",
            });
            handleCreatePost();
          }}
          isSubmitting={createPostMutation.isPending}
          userType={user?.userType}
        />
        
        {/* Image Lightbox */}
        <ImageLightbox
          images={lightboxImages}
          initialIndex={lightboxInitialIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
        
        {/* Analytics Modal - Mobile */}
        {renderAnalyticsDialog()}
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">


            {/* Forum Posts */}
            <div className="space-y-6">
              {filteredPosts.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="flex flex-col items-center space-y-4">
                      {debouncedSearchQuery ? (
                        <>
                          <Search className="w-12 h-12 text-muted-foreground" />
                          <div>
                            <h3 className="text-lg font-medium text-foreground mb-2">
                              No results found
                            </h3>
                            <p className="text-muted-foreground mb-4">
                              No posts match "{debouncedSearchQuery}". Try different keywords or check your spelling.
                            </p>
                            <Button 
                              variant="outline" 
                              onClick={() => setSearchQuery("")}
                            >
                              Clear Search
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <MessageSquare className="w-12 h-12 text-muted-foreground" />
                          <div>
                            <h3 className="text-lg font-medium text-foreground mb-2">
                              {selectedCategory === "all" ? "No posts yet" : "No posts in this category"}
                            </h3>
                            <p className="text-muted-foreground mb-4">
                              {selectedCategory === "all" 
                                ? "Be the first to start a conversation in the community!" 
                                : "Be the first to post in this category!"}
                            </p>
                            <Button onClick={() => setShowCreatePost(true)}>
                              <Plus className="w-4 h-4 mr-2" />
                              Create First Post
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                filteredPosts.map((post: ForumPost) => (
                <Card key={post.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <Avatar>
                        <AvatarImage src={`/api/placeholder/40/40`} />
                        <AvatarFallback>{post.user?.firstName?.charAt(0) || post.user?.companyName?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-medium text-foreground">
                            {post.user?.userType === 'company_profile' && post.user?.companyName 
                              ? post.user.companyName 
                              : `${post.user?.firstName || ''} ${post.user?.lastName || ''}`.trim()
                            }
                          </h3>
                          <Badge variant="outline" className="text-xs">
                            {FORUM_CATEGORIES.find(cat => cat.id === post.category)?.name || post.category}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {getTimeAgo(post.createdAt)}
                          </span>
                        </div>
                        {post.title && <h4 className="font-semibold text-foreground mb-2">{post.title}</h4>}
                        <p className="text-muted-foreground mb-3">{post.content}</p>
                        
                        {/* Post Images */}
                        {post.images && post.images.length > 0 && (
                          <div className="mb-4">
                            <div className={`grid gap-3 ${post.images.length === 1 ? 'grid-cols-1' : post.images.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                              {post.images.slice(0, 6).map((image, index) => (
                                <div 
                                  key={index} 
                                  className="relative cursor-pointer"
                                  onClick={() => openLightbox(post.images!, index)}
                                >
                                  <img 
                                    src={image} 
                                    alt={`Post image ${index + 1}`} 
                                    className="w-full h-40 object-cover rounded-lg border hover:opacity-90 transition-opacity"
                                  />
                                  {post.images!.length > 6 && index === 5 && (
                                    <div className="absolute inset-0 bg-black bg-opacity-60 rounded-lg flex items-center justify-center">
                                      <span className="text-white font-medium text-lg">+{post.images!.length - 6} more</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Post Poll */}
                        {post.pollQuestion && (
                          <div className="mb-4 p-4 border rounded-lg bg-muted/10">
                            <div className="flex items-center gap-2 mb-3">
                              <BarChart3 className="w-4 h-4 text-primary" />
                              <h5 className="font-semibold text-foreground">{post.pollQuestion}</h5>
                            </div>
                            <div className="space-y-3">
                              {post.pollOptions && post.pollOptions.map((option: any, index: number) => {
                                const hasUserVoted = post.userVotes && post.userVotes.length > 0;
                                const isUserChoice = hasUserVoted && post.userVotes && post.userVotes.includes(option.id);
                                const pollExpired = isPollExpired(post.pollEndsAt);
                                
                                if (hasUserVoted || pollExpired) {
                                  // Show results view with vote counts and percentages
                                  return (
                                    <div key={index} className="group">
                                      <div 
                                        className={`flex items-center justify-between p-3 border rounded-lg ${
                                          isUserChoice ? 'bg-primary/10 border-primary/20' : 'bg-background'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          {isUserChoice && (
                                            <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                                              <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>
                                            </div>
                                          )}
                                          <span className={`font-medium ${isUserChoice ? 'text-primary' : ''}`}>
                                            {option.text}
                                          </span>
                                          {isUserChoice && (
                                            <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                                              Your choice
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center space-x-3">
                                          <span className="text-sm text-muted-foreground">{option.votes || 0} votes</span>
                                          <span className="text-sm font-medium">{option.percentage || 0}%</span>
                                        </div>
                                        {pollExpired && !hasUserVoted && (
                                          <div className="text-xs text-muted-foreground italic">
                                            Poll expired - no votes recorded
                                          </div>
                                        )}
                                      </div>
                                      <div className="mt-2 w-full bg-muted rounded-full h-2">
                                        <div 
                                          className={`h-2 rounded-full transition-all duration-500 ${
                                            isUserChoice ? 'bg-primary' : 'bg-primary/60'
                                          }`}
                                          style={{ width: `${option.percentage || 0}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  );
                                } else {
                                  // Show voting view without results (only if not expired and not voted)
                                  return (
                                    <div key={index} className="group">
                                      <div 
                                        className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                                          pollExpired 
                                            ? 'bg-muted/10 cursor-not-allowed opacity-50' 
                                            : 'bg-background hover:bg-muted/20 cursor-pointer'
                                        }`}
                                        onClick={() => !pollExpired && handlePollVote(post.id, option.id)}
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">{option.text}</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }
                              })}
                            </div>
                            {post.pollEndsAt && (
                              <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {isPollExpired(post.pollEndsAt) ? (
                                  <span className="text-red-500 font-medium">Poll expired</span>
                                ) : (
                                  <span>Poll ends: {new Date(post.pollEndsAt).toLocaleDateString()}</span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {post.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              
                              // Debounce mechanism to prevent rapid clicks
                              const now = Date.now();
                              const lastClick = e.currentTarget.getAttribute('data-last-click');
                              if (lastClick && (now - parseInt(lastClick)) < 500) {
                                return; // Ignore clicks within 500ms
                              }
                              e.currentTarget.setAttribute('data-last-click', now.toString());
                              
                              if (!likePostMutation.isPending) {
                                likePostMutation.mutate(post.id);
                              }
                            }}
                            disabled={likePostMutation.isPending}
                            className={`h-8 px-2 transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                              post.isLiked 
                                ? 'text-red-500 hover:text-red-600' 
                                : 'text-muted-foreground hover:text-red-500'
                            } ${likePostMutation.isPending ? 'opacity-70' : ''}`}
                            data-testid={`like-post-desktop-${post.id}`}
                          >
                            <Heart className={`w-4 h-4 mr-1 transition-all duration-300 ${
                              post.isLiked 
                                ? 'fill-red-500 text-red-500 scale-110' 
                                : 'text-muted-foreground'
                            } ${likePostMutation.isPending ? 'animate-pulse' : ''}`} />
                            <span className={`${likePostMutation.isPending ? 'animate-pulse' : ''}`}>
                              {likePostMutation.isPending ? '...' : (post.likesCount || 0)}
                            </span>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-2"
                            onClick={() => setSelectedPost(selectedPost === post.id ? null : post.id)}
                          >
                            <MessageCircle className="w-4 h-4 mr-1" />
                            {post.commentsCount || 0}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              
                              // Debounce mechanism to prevent rapid clicks
                              const now = Date.now();
                              const lastClick = e.currentTarget.getAttribute('data-last-click');
                              if (lastClick && (now - parseInt(lastClick)) < 500) {
                                return; // Ignore clicks within 500ms
                              }
                              e.currentTarget.setAttribute('data-last-click', now.toString());
                              
                              if (!savePostMutation.isPending) {
                                savePostMutation.mutate(post.id);
                              }
                            }}
                            disabled={savePostMutation.isPending}
                            className={`h-8 px-2 transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                              post.isSaved 
                                ? 'text-violet-500 hover:text-violet-600' 
                                : 'text-muted-foreground hover:text-violet-500'
                            } ${savePostMutation.isPending ? 'opacity-70' : ''}`}
                            data-testid={`save-post-desktop-${post.id}`}
                          >
                            <Bookmark className={`w-4 h-4 mr-1 transition-all duration-300 ${
                              post.isSaved 
                                ? 'fill-violet-500 text-violet-500 scale-110' 
                                : 'text-muted-foreground'
                            } ${savePostMutation.isPending ? 'animate-pulse' : ''}`} />
                            {savePostMutation.isPending ? 'Saving...' : (post.isSaved ? 'Saved' : 'Save')}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleSharePost(post.id);
                            }}
                            className="h-8 px-2"
                            data-testid={`share-post-desktop-${post.id}`}
                          >
                            <Share className="w-4 h-4 mr-1" />
                            Share
                          </Button>
                          {post.authorId !== user?.id && post.user?.userType !== 'company_profile' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleReportPost(post.id);
                              }}
                              className="h-8 px-2 text-muted-foreground hover:text-red-500"
                              data-testid={`report-post-desktop-${post.id}`}
                            >
                              <Flag className="w-4 h-4 mr-1" />
                              Report
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  
                  {/* Desktop Comments Section */}
                  {selectedPost === post.id && (
                    <div className="px-6 pb-6 pt-0">
                      <div className="border-t pt-4">
                        {/* Add Comment */}
                        <div className="flex space-x-4 mb-4">
                          <Avatar>
                            <AvatarImage src={user.profilePicture || undefined} />
                            <AvatarFallback>
                              {user.firstName[0]}{user.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <Textarea
                              placeholder="Write a comment..."
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              rows={3}
                              className="mb-3"
                            />
                            <Button 
                              size="sm"
                              onClick={handleCreateComment}
                              disabled={!newComment.trim() || createCommentMutation.isPending}
                            >
                              <Send className="w-4 h-4 mr-2" />
                              {createCommentMutation.isPending ? "Posting..." : "Comment"}
                            </Button>
                          </div>
                        </div>

                        {/* Comments List */}
                        {commentsLoading ? (
                          <div className="space-y-4 max-h-96 overflow-y-auto">
                            <div className="animate-pulse">
                              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                              <div className="h-3 bg-muted rounded w-1/2"></div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                            {comments.map((comment: ForumComment) => (
                              <div key={comment.id} className="flex space-x-4">
                                <Avatar>
                                  <AvatarImage src={comment.user?.profilePicture} />
                                  <AvatarFallback>
                                    {comment.user?.firstName?.[0]}{comment.user?.lastName?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 bg-muted rounded-lg p-4">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <span className="font-medium">
                                      {comment.user?.firstName} {comment.user?.lastName}
                                    </span>
                                    <span className="text-muted-foreground text-sm">
                                      {getTimeAgo(comment.createdAt)}
                                    </span>
                                  </div>
                                  <p className="text-foreground whitespace-pre-wrap">
                                    {comment.content}
                                  </p>
                                </div>
                              </div>
                            ))}
                            {comments.length === 0 && (
                              <p className="text-center text-muted-foreground py-6">
                                No comments yet. Be the first to comment!
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
                ))
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="h-[calc(100vh-6rem)] overflow-y-auto space-y-6">
            {/* Mobile - Separate Cards */}
            <div className="block md:hidden space-y-6">
              {/* Search Bar */}
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">Search Posts</h3>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search posts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Create Post Button */}
              <Card>
                <CardContent className="p-6">
                  <Button 
                    onClick={() => setShowCreatePost(true)} 
                    className="w-full"
                    data-testid="create-post-button"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Post
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Desktop - Combined Card */}
            <Card className="hidden md:block sticky top-16 z-40 bg-background mb-10">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    {/* Search Section */}
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by title, tags, content, author..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 pr-10"
                        />
                        {searchQuery && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-muted"
                            onClick={() => setSearchQuery("")}
                            aria-label="Clear search"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {/* Create Post Button */}
                    <Button 
                      onClick={() => setShowCreatePost(true)} 
                      className="shrink-0"
                      data-testid="create-post-button"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Post
                    </Button>
                  </div>
                  
                  {/* Loading Indicator */}
                  {debouncedSearchQuery && isSearching && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Searching...</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Categories */}
            <Card className="hidden">
              <CardHeader>
                <CardTitle className="text-lg">Categories</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-1">
                  <Button
                    variant={selectedCategory === "all" ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setSelectedCategory("all")}
                  >
                    All Posts
                  </Button>
                  {FORUM_CATEGORIES.map((category) => (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? "secondary" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => setSelectedCategory(category.id)}
                    >
                      {category.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>


            {/* My Posts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  My Posts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-primary">
                        {allPosts.filter(post => post.authorId === user?.id).length}
                      </div>
                      <div className="text-sm text-muted-foreground">Posts</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-primary">
                        {allPosts.filter(post => post.authorId === user?.id).reduce((sum, post) => sum + (post.likesCount || 0), 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">Likes</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-primary">
                        {Array.isArray(savedPosts) ? savedPosts.length : 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Saved</div>
                    </div>
                  </div>
                  
                  {allPosts.filter(post => post.authorId === user?.id).length === 0 ? (
                    <div className="text-center py-4">
                      <MessageCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">You haven't created any posts yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                      {allPosts
                        .filter(post => post.authorId === user?.id)
                        .slice(0, 10)
                        .map((post) => (
                          <div 
                            key={post.id} 
                            className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => handlePostClick(post.id)}
                          >
                            {post.title && <h4 className="font-medium text-sm line-clamp-1">{post.title}</h4>}
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{post.content}</p>
                            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                              <span>{getTimeAgo(post.createdAt)}</span>
                              <div className="flex items-center space-x-2">
                                <span>{post.likesCount || 0} likes</span>
                                <span>{post.commentsCount || 0} comments</span>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Saved Posts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Bookmark className="w-4 h-4 mr-2" />
                  Saved Posts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {savedPostsLoading ? (
                  <div className="space-y-2">
                    <div className="h-16 bg-muted rounded animate-pulse"></div>
                    <div className="h-16 bg-muted rounded animate-pulse"></div>
                  </div>
                ) : !Array.isArray(savedPosts) || savedPosts.length === 0 ? (
                  <div className="text-center py-4">
                    <Bookmark className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No saved posts yet</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                    {savedPosts.slice(0, 10).map((post) => (
                      <div 
                        key={post.id} 
                        className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handlePostClick(post.id)}
                      >
                        {post.title && <h4 className="font-medium text-sm line-clamp-1">{post.title}</h4>}
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{post.content}</p>
                        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                          <span>{getTimeAgo(post.createdAt)}</span>
                          <div className="flex items-center space-x-2">
                            <span>{post.likesCount || 0} likes</span>
                            <span>{post.commentsCount || 0} comments</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Community Stats */}
            <Card className="hidden">
              <CardHeader>
                <CardTitle className="text-lg">Community Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Posts</span>
                    <span className="font-medium">{allPosts.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Active Today</span>
                    <span className="font-medium">
                      {allPosts.filter(post => 
                        new Date(post.createdAt).toDateString() === new Date().toDateString()
                      ).length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>



      {/* Desktop Create Post Modal */}
      {!isMobile && showCreatePost && (
        <Dialog open={showCreatePost} onOpenChange={setShowCreatePost}>
          <DialogContent className={`${getModalSize(isPhotosExpanded, isPollExpanded, isAdvancedExpanded, user?.userType, false)} flex flex-col transition-all duration-300`}>
          <DialogHeader className={`flex-shrink-0 ${isMobile ? 'p-4 border-b bg-background/95 backdrop-blur-sm sticky top-0 z-10' : 'pb-4'}`}>
            <DialogTitle className={isMobile ? 'text-lg font-semibold' : ''}>Create New Post</DialogTitle>
            <DialogDescription className={isMobile ? 'text-sm text-muted-foreground' : ''}>
              Share your thoughts with the community
            </DialogDescription>
          </DialogHeader>
          
          <div className={`flex-1 overflow-y-auto overflow-x-hidden ${isMobile ? 'p-4 pb-20' : 'pr-2 pb-4'} min-h-0 max-h-full modal-scroll`} style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="space-y-4">
            {/* Title field for company profiles */}
            {user?.userType === 'company_profile' && (
              <div>
                <label className="text-sm font-medium">Post Title</label>
                <Input
                  placeholder="Enter a title for your post"
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  className="mt-1"
                  data-testid="create-post-title"
                />
              </div>
            )}
            
            <div className="relative">
              <label className="text-sm font-medium">Content</label>
              <Textarea
                placeholder={user?.userType === 'company_profile' ? "What's on your mind?" : "Share your thoughts, experiences, or questions... (max 100 characters)"}
                rows={user?.userType === 'company_profile' ? 6 : 4}
                value={newPost.content}
                onChange={(e) => {
                  const text = e.target.value;
                  
                  // Apply character limit only for non-company profiles
                  if (user?.userType !== 'company_profile' && text.length > 100) return;
                  
                  // Extract hashtags from content
                  const hashtags = text.match(/#\w+/g) || [];
                  
                  setNewPost(prev => ({ 
                    ...prev, 
                    content: text,
                    title: user?.userType === 'company_profile' ? prev.title : "",
                    category: FORUM_CATEGORIES[0]?.id || "general",
                    tags: hashtags.map(tag => tag.substring(1)) // Remove # symbol
                  }));
                }}
                onPaste={(e) => {
                  // Prevent pasting for non-company profiles
                  if (user?.userType !== 'company_profile') {
                    e.preventDefault();
                    alert("Please type your message instead of pasting content");
                  }
                }}
                className={`resize-none border rounded-md p-3 ${user?.userType !== 'company_profile' ? 'pr-16' : ''} mt-1`}
                maxLength={user?.userType === 'company_profile' ? undefined : 100}
                data-testid="create-post-content"
              />
              
              {/* Character counter for non-company profiles */}
              {user?.userType !== 'company_profile' && (
                <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                  {newPost.content.length}/100
                </div>
              )}
            </div>
            
            {/* Hide Category field on mobile */}
            {!isMobile && (
              <div>
                <label className="text-sm font-medium">Category</label>
                <Select value={newPost.category} onValueChange={(value) => setNewPost({ ...newPost, category: value })}>
                  <SelectTrigger className="mt-1" data-testid="create-post-category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {FORUM_CATEGORIES.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Hide Tags field on mobile */}
            {!isMobile && (
              <div>
                <label className="text-sm font-medium">Tags (comma-separated)</label>
                  <Input
                    placeholder="e.g., #scholarship, #visa, #application"
                    value={newPost.tags.join(', ')}
                    onChange={(e) => setNewPost({ 
                      ...newPost, 
                      tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                    })}
                    className="mt-1"
                    data-testid="create-post-tags"
                  />
                </div>
            )}

            {/* Company Profile Features - Desktop */}
            {user?.userType === 'company_profile' && (
              <>
                {/* Add Photos - Collapsible */}
                <Collapsible open={isPhotosExpanded} onOpenChange={setIsPhotosExpanded}>
                  <CollapsibleTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full justify-between text-left h-auto py-3"
                      type="button"
                    >
                      <div className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        <span>Add Photos</span>
                        {newPost.images.length > 0 && (
                          <Badge variant="secondary" className="ml-2">
                            {newPost.images.length}
                          </Badge>
                        )}
                      </div>
                      {isPhotosExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 pt-2">
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length === 0) return;

                        // Create FormData for image upload
                        const formData = new FormData();
                        files.forEach(file => {
                          formData.append('images', file);
                        });

                        try {
                          // Upload images to backend
                          const data = await api.post('/api/forum/upload-images', formData) as any;
                          
                          // Add the uploaded image URLs to the post
                          setNewPost({ ...newPost, images: [...newPost.images, ...data.imageUrls] });
                          
                          toast({
                            title: "Images uploaded",
                            description: `${data.count} image(s) uploaded successfully.`,
                          });
                        } catch (error) {
                          console.error('Image upload error:', error);
                          toast({
                            title: "Upload failed",
                            description: "Failed to upload images. Please try again.",
                            variant: "destructive",
                          });
                        }
                      }}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    />
                    {newPost.images.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {newPost.images.map((image, index) => (
                          <div key={index} className="relative">
                            <img src={image} alt={`Upload ${index + 1}`} className="w-full h-20 object-cover rounded border" />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-1 right-1 h-5 w-5 p-0 text-xs"
                              onClick={() => {
                                const newImages = [...newPost.images];
                                newImages.splice(index, 1);
                                setNewPost({ ...newPost, images: newImages });
                              }}
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>

                {/* Create Poll - Collapsible */}
                <Collapsible open={isPollExpanded} onOpenChange={setIsPollExpanded}>
                  <CollapsibleTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full justify-between text-left h-auto py-3"
                      type="button"
                    >
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        <span>Create Poll</span>
                        {newPost.pollQuestion && (
                          <Badge variant="secondary" className="ml-2">
                            Active
                          </Badge>
                        )}
                      </div>
                      {isPollExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 pt-2">
                    <Input
                      placeholder="Poll question (leave empty for no poll)"
                      value={newPost.pollQuestion}
                      onChange={(e) => setNewPost({ ...newPost, pollQuestion: e.target.value })}
                    />
                    
                    {newPost.pollQuestion && (
                      <>
                        <div className="space-y-2">
                          {newPost.pollOptions.map((option, index) => (
                            <div key={index} className="flex gap-2">
                              <Input
                                placeholder={`Option ${index + 1}`}
                                value={option.text}
                                onChange={(e) => {
                                  const newOptions = [...newPost.pollOptions];
                                  newOptions[index] = { ...option, text: e.target.value };
                                  setNewPost({ ...newPost, pollOptions: newOptions });
                                }}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newOptions = [...newPost.pollOptions];
                                  newOptions.splice(index, 1);
                                  setNewPost({ ...newPost, pollOptions: newOptions });
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                        </div>
                        
                        {newPost.pollOptions.length < 6 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setNewPost({
                                ...newPost,
                                pollOptions: [...newPost.pollOptions, { id: `option_${newPost.pollOptions.length}`, text: '' }]
                              });
                            }}
                          >
                            Add Option
                          </Button>
                        )}
                        
                        <div>
                          <label className="text-sm font-medium block mb-2">Poll End Date</label>
                          <Input
                            type="datetime-local"
                            value={newPost.pollEndsAt}
                            onChange={(e) => setNewPost({ ...newPost, pollEndsAt: e.target.value })}
                            data-testid="desktop-poll-end-date"
                          />
                        </div>
                        
                      </>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}
            
            {/* Community Guidelines - Desktop */}
            <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
              <p className="font-medium mb-1">Community Guidelines:</p>
              <ul className="space-y-1">
                {user?.userType === 'company_profile' ? (
                  <li>• Company profile: Full posting privileges (photos, links, polls allowed)</li>
                ) : (
                  <li>• Text-only posts (no photos, videos, or polls)</li>
                )}
                <li>• No links or phone numbers allowed</li>
                <li>• Type only (no copy-paste)</li>
                <li>• Wait 15 seconds between posts</li>
                <li>• Maximum 10 posts per day</li>
                <li>• Use #hashtags to categorize your posts</li>
              </ul>
            </div>
            </div>
          </div>

          <DialogFooter className={`flex-shrink-0 pt-4 ${isMobile ? 'fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t z-20' : 'space-x-2'}`}>
            <Button variant="outline" onClick={resetCreatePostModal}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreatePost}
              disabled={createPostMutation.isPending || !newPost.content.trim()}
              data-testid="submit-post"
            >
              {createPostMutation.isPending ? "Publishing..." : "Publish Post"}
            </Button>
          </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

        {/* Report Post Dialog - Mobile */}
        <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
          <DialogContent className="sm:max-w-[425px] max-w-[95vw] max-h-[90vh] overflow-y-auto z-50">
            <DialogHeader>
              <DialogTitle>Report Post</DialogTitle>
              <DialogDescription>
                Help us maintain a safe and respectful community by reporting inappropriate content.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label htmlFor="report-reason" className="text-sm font-medium mb-2 block">
                  Reason for reporting *
                </label>
                <Select value={reportReason} onValueChange={setReportReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spam">Spam</SelectItem>
                    <SelectItem value="harassment">Harassment</SelectItem>
                    <SelectItem value="inappropriate">Inappropriate Content</SelectItem>
                    <SelectItem value="offensive">Offensive Language</SelectItem>
                    <SelectItem value="misinformation">Misinformation</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label htmlFor="report-details" className="text-sm font-medium mb-2 block">
                  Additional details (optional)
                </label>
                <Textarea
                  id="report-details"
                  placeholder="Provide additional context about why you're reporting this post..."
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowReportDialog(false);
                  setSelectedPostForReport(null);
                  setReportReason("");
                  setReportDetails("");
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitReport}
                disabled={!reportReason.trim() || reportPostMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {reportPostMutation.isPending ? "Reporting..." : "Submit Report"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Analytics Modal - Desktop */}
        {renderAnalyticsDialog()}
        
        {/* Image Lightbox */}
        <ImageLightbox
          images={lightboxImages}
          initialIndex={lightboxInitialIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
    </div>
  );
}
