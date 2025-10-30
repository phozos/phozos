import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  X, 
  Send, 
  ImageIcon, 
  BarChart3, 
  Settings, 
  ChevronDown, 
  ChevronUp 
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FORUM_CATEGORIES } from "@/lib/constants";
import { api } from "@/lib/api-client";

interface MobileCreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (post: { 
    title: string; 
    content: string; 
    category: string; 
    tags: string[]; 
    images: string[];
    pollQuestion?: string;
    pollOptions?: { id: string; text: string; }[];
    pollEndsAt?: string;
  }) => void;
  isSubmitting?: boolean;
  userType?: string;
}

export const MobileCreatePostModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isSubmitting = false,
  userType 
}: MobileCreatePostModalProps) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState(FORUM_CATEGORIES[0]?.id || "general");
  const [tags, setTags] = useState("");
  
  // Company profile features state
  const [showPhotos, setShowPhotos] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollEndDate, setPollEndDate] = useState("");

  const handleSubmit = () => {
    if (!content.trim()) return;
    
    // Process tags from input field
    const processedTags = tags.split(',').map(tag => tag.trim()).filter(Boolean);
    
    // Also extract hashtags from content as backup
    const hashtags = content.match(/#\w+/g) || [];
    const hashtagsOnly = hashtags.map(tag => tag.substring(1)); // Remove # symbol
    
    // Combine both tag sources and remove duplicates
    const combinedTags = [...processedTags, ...hashtagsOnly];
    const allTags = Array.from(new Set(combinedTags));
    
    onSubmit({
      title: userType === 'company_profile' ? title : (content.slice(0, 50).trim() + (content.length > 50 ? "..." : "")),
      content,
      category: category,
      tags: allTags,
      images: uploadedPhotos,
      pollQuestion,
      pollOptions: pollOptions.filter(option => option.trim() !== "").map((option, index) => ({
        id: `option_${index}`,
        text: option
      })),
      pollEndsAt: pollEndDate,
    });
  };

  const handleClose = () => {
    setTitle("");
    setContent("");
    setCategory(FORUM_CATEGORIES[0]?.id || "general");
    setTags("");
    setShowPhotos(false);
    setShowPoll(false);
    setShowAdvanced(false);
    setUploadedPhotos([]);
    setPollQuestion("");
    setPollOptions(["", ""]);
    setPollEndDate("");
    onClose();
  };

  if (!isOpen) return null;

  // Debug logging for mobile modal visibility
  console.log(`📱 [MOBILE MODAL] isOpen: ${isOpen}`);

  return (
    <div 
      className="fixed inset-0 bg-background z-50 flex flex-col" 
      data-testid="mobile-create-post-modal"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Mobile Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10">
        <button 
          onClick={handleClose}
          className="p-2 text-muted-foreground hover:text-foreground"
          data-testid="close-create-post"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold">Create New Post</h2>
        <div className="w-9"></div> {/* Spacer for centering */}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-4 pb-20 overflow-y-auto modal-scroll">
        {/* Title field for company profiles */}
        {userType === 'company_profile' && (
          <div>
            <label className="text-sm font-medium block mb-2">Post Title</label>
            <Input
              placeholder="Enter a title for your post"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="mobile-post-title"
            />
          </div>
        )}
        
        {/* Content field */}
        <div>
          <label className="text-sm font-medium block mb-2">Content</label>
          <Textarea
            placeholder={userType === 'company_profile' ? "What's on your mind?" : "Share your thoughts... (max 100 characters)"}
            rows={userType === 'company_profile' ? 8 : 6}
            value={content}
            onChange={(e) => {
              const text = e.target.value;
              
              // Apply character limit only for non-company profiles
              if (userType !== 'company_profile' && text.length > 100) return;
              
              setContent(text);
            }}
            className="resize-none"
            data-testid="mobile-post-content"
          />
          {userType !== 'company_profile' && (
            <div className="text-right text-xs text-muted-foreground mt-1">
              {content.length}/100
            </div>
          )}
        </div>

        {/* Category Selection for Mobile */}
        <div>
          <label className="text-sm font-medium block mb-2">Category</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger data-testid="mobile-post-category">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {FORUM_CATEGORIES.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tags Input for Mobile */}
        <div>
          <label className="text-sm font-medium block mb-2">Tags (comma-separated)</label>
          <Input
            placeholder="e.g., scholarship, visa, application"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            data-testid="mobile-post-tags"
          />
        </div>

        {/* Company Profile Features */}
        {userType === 'company_profile' && (
          <div className="space-y-4">
            {/* Add Photos Section */}
            <Collapsible open={showPhotos} onOpenChange={setShowPhotos}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between" data-testid="mobile-add-photos-toggle">
                  <div className="flex items-center">
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Add Photos
                  </div>
                  {showPhotos ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 mt-3">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                  <ImageIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">Upload photos to your post</p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    id="mobile-photo-upload"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length === 0) return;

                      // Create FormData for image upload
                      const formData = new FormData();
                      files.forEach(file => {
                        formData.append('images', file);
                      });

                      try {
                        // Upload images to backend using secure API client
                        const data = await api.post('/api/forum/upload-images', formData) as any;
                        
                        // Store the uploaded image URLs (we'll pass these in onSubmit)
                        setUploadedPhotos(prev => [...prev, ...data.imageUrls]);
                        
                      } catch (error) {
                        console.error('Image upload error:', error);
                      }
                    }}
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    data-testid="mobile-upload-photos"
                    onClick={() => document.getElementById('mobile-photo-upload')?.click()}
                  >
                    Choose Photos
                  </Button>
                </div>
                {uploadedPhotos.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    {uploadedPhotos.length} photo(s) selected
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Create Poll Section */}
            <Collapsible open={showPoll} onOpenChange={setShowPoll}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between" data-testid="mobile-create-poll-toggle">
                  <div className="flex items-center">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Create Poll
                  </div>
                  {showPoll ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 mt-3">
                <div>
                  <label className="text-sm font-medium block mb-2">Poll Question</label>
                  <Input
                    placeholder="Ask a question..."
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    data-testid="mobile-poll-question"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-2">Poll Options</label>
                  {pollOptions.map((option, index) => (
                    <div key={index} className="mb-2">
                      <Input
                        placeholder={`Option ${index + 1}`}
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...pollOptions];
                          newOptions[index] = e.target.value;
                          setPollOptions(newOptions);
                        }}
                        data-testid={`mobile-poll-option-${index}`}
                      />
                    </div>
                  ))}
                  {pollOptions.length < 5 && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setPollOptions([...pollOptions, ""])}
                      data-testid="mobile-add-poll-option"
                    >
                      Add Option
                    </Button>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium block mb-2">Poll End Date</label>
                  <Input
                    type="datetime-local"
                    value={pollEndDate}
                    onChange={(e) => setPollEndDate(e.target.value)}
                    data-testid="mobile-poll-end-date"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Advanced Options Section */}
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between" data-testid="mobile-advanced-options-toggle">
                  <div className="flex items-center">
                    <Settings className="w-4 h-4 mr-2" />
                    Advanced Options
                  </div>
                  {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 mt-3">
                <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded">
                  <p>Advanced features:</p>
                  <ul className="mt-1 space-y-1">
                    <li>• Schedule post publication</li>
                    <li>• Add custom tags</li>
                    <li>• Set post visibility</li>
                    <li>• Enable comments moderation</li>
                  </ul>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {/* Community Guidelines */}
        <div className="bg-muted/50 p-3 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Community Guidelines</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Be respectful and constructive</li>
            <li>• No spam or promotional content</li>
            <li>• Use hashtags for better discoverability</li>
            <li>• Report inappropriate content</li>
          </ul>
        </div>
      </div>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t z-10">
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            onClick={handleClose}
            className="flex-1"
            data-testid="mobile-cancel-post"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting || !content.trim()}
            className="flex-1"
            data-testid="mobile-submit-post"
          >
            {isSubmitting ? (
              "Publishing..."
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Publish
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};