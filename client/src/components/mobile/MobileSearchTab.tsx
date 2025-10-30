import { useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";


interface MobileSearchTabProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchResults?: any[];
  isSearching?: boolean;
  onTopicClick?: (topic: any) => void; // NEW: Optional trending topic click handler
}

export const MobileSearchTab = ({ searchQuery, onSearchChange, searchResults = [], isSearching = false, onTopicClick }: MobileSearchTabProps) => {
  return (
    <div className="space-y-6 p-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
        <Input 
          placeholder="Search by title, tags, content..." 
          className="pl-12 pr-12 h-12 text-base"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          data-testid="search-input"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 p-0"
            onClick={() => onSearchChange("")}
            aria-label="Clear search"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>


      {/* Search Results */}
      {searchQuery && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Search Results {searchResults.length > 0 && `(${searchResults.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isSearching ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-4">
                {searchResults.map((post: any) => (
                  <div key={post.id} className="p-3 border rounded-lg">
                    <h4 className="font-medium text-sm mb-2">
                      {post.content.length > 80 ? `${post.content.substring(0, 80)}...` : post.content}
                    </h4>
                    <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                      <span>❤️ {post.likesCount}</span>
                      <span>💬 {post.commentsCount}</span>
                      <span>👁️ {post.viewsCount}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      By {post.user?.firstName} {post.user?.lastName}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Search className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No results found</h3>
                <p className="text-muted-foreground mb-4 px-4">
                  No posts match "{searchQuery}"
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => onSearchChange("")}
                >
                  Clear Search
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};