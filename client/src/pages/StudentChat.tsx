import { useState, useEffect, useRef, useCallback } from "react";
import { useApiQuery, useApiMutation } from "@/hooks/api-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { 
  ArrowLeft,
  Send,
  MessageSquare,
  Clock,
  AlertTriangle,
  Shield,
  User,
  Users,
  CheckCircle,
  Check,
  CheckCheck
} from "lucide-react";
import { Link } from "wouter";

interface ChatMessage {
  id: string;
  message: string;
  sender: 'counselor' | 'student';
  timestamp: string;
  read: boolean;
}

export default function StudentChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState('');
  const [lastMessageTime, setLastMessageTime] = useState(0);
  const [cooldownTimeLeft, setCooldownTimeLeft] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch chat messages (no polling since we use WebSocket)
  const { data: messages = [], isLoading: messagesLoading } = useApiQuery<ChatMessage[]>(
    ['/api/chat/student'],
    '/api/chat/student',
    undefined,
    { enabled: !!user }
  );

  // WebSocket for real-time chat updates
  const { isConnected } = useWebSocket({
    userId: user?.id,
    onMessage: (message) => {
      if (message.type === 'chat_message') {
        // Directly update the cache with the new message for instant updates
        queryClient.setQueryData(['/api/chat/student'], (oldMessages: ChatMessage[] | undefined) => {
          if (!oldMessages) return [message.data];
          
          // Check if message already exists to avoid duplicates
          const messageExists = oldMessages.some(msg => msg.id === message.data.id);
          if (messageExists) return oldMessages;
          
          // Add new message to the end
          return [...oldMessages, message.data];
        });
        
        // Auto-mark counselor messages as read when received (after a brief delay)
        if (message.data.sender === 'counselor') {
          setTimeout(() => {
            markAsReadMutation.mutate(message.data.id);
          }, 1000);
        }
      } else if (message.type === 'message_read') {
        // Update read status in real-time
        queryClient.setQueryData(['/api/chat/student'], (oldMessages: ChatMessage[] | undefined) => {
          if (!oldMessages) return oldMessages;
          return oldMessages.map(msg => 
            msg.id === message.data.messageId ? { ...msg, read: true } : msg
          );
        });
      }
    }
  });

  // Mutation for marking messages as read
  const markAsReadMutation = useApiMutation(
    async (messageId: string): Promise<void> => {
      await api.put(`/api/chat/messages/${messageId}/read`);
    }
  );

  // Send message mutation with security rules
  const sendMessageMutation = useApiMutation(
    async (message: string): Promise<ChatMessage> => {
      return await api.post('/api/chat/student', { message });
    },
    {
      onSuccess: (newMessageData: ChatMessage) => {
        // Directly add the sent message to cache for instant feedback
        queryClient.setQueryData(['/api/chat/student'], (oldMessages: ChatMessage[] | undefined) => {
          if (!oldMessages) return [newMessageData];
          
          // Check if message already exists to avoid duplicates
          const messageExists = oldMessages.some(msg => msg.id === newMessageData.id);
          if (messageExists) return oldMessages;
          
          return [...oldMessages, newMessageData];
        });
        
        setNewMessage('');
        setLastMessageTime(Date.now());
        setCooldownTimeLeft(15); // 15 second cooldown
        toast({ title: "Message sent successfully" });
      },
      onError: (error: any) => {
        toast({ 
          title: "Failed to send message", 
          description: error.message || "Please try again",
          variant: "destructive"
        });
      }
    }
  );

  // Handle message sending with security validation
  const handleSendMessage = () => {
    const currentTime = Date.now();
    const timeSinceLastMessage = currentTime - lastMessageTime;
    
    // Rule 4: 15 second gap between messages
    if (timeSinceLastMessage < 15000 && lastMessageTime > 0) {
      const remainingTime = Math.ceil((15000 - timeSinceLastMessage) / 1000);
      toast({
        title: "Please wait",
        description: `You can send another message in ${remainingTime} seconds`,
        variant: "destructive"
      });
      return;
    }

    if (!newMessage.trim()) {
      toast({
        title: "Message cannot be empty",
        variant: "destructive"
      });
      return;
    }

    sendMessageMutation.mutate(newMessage);
  };

  // Handle paste prevention (Rule 1)
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    toast({
      title: "Paste not allowed",
      description: "Please type your message manually for security",
      variant: "destructive"
    });
  };

  // Handle key events
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Validate message content as user types
  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Rule 2: Check for URLs
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[^\s]+\.(com|org|net|edu|gov|mil|int|co|io|ly|me|tv|info|biz)[^\s]*)/gi;
    if (urlRegex.test(value)) {
      toast({
        title: "Links not allowed",
        description: "Please remove any URLs from your message",
        variant: "destructive"
      });
      return;
    }

    // Character limit
    if (value.length > 100) {
      toast({
        title: "Message too long",
        description: "Please keep messages under 100 characters",
        variant: "destructive"
      });
      return;
    }

    setNewMessage(value);
  };

  // Cooldown timer effect
  useEffect(() => {
    if (cooldownTimeLeft > 0) {
      const timer = setTimeout(() => {
        setCooldownTimeLeft(cooldownTimeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownTimeLeft]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-mark visible counselor messages as read when component loads or messages change
  useEffect(() => {
    if (!messages || !user || messages.length === 0) return;
    
    const unreadCounselorMessages = messages.filter(msg => 
      msg.sender === 'counselor' && !msg.read
    );
    
    if (unreadCounselorMessages.length > 0) {
      // Delay to ensure smooth UI experience
      const timer = setTimeout(() => {
        unreadCounselorMessages.forEach(message => {
          markAsReadMutation.mutate(message.id);
        });
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [messages, user, markAsReadMutation]);

  // Auto-focus input when component loads
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Manual function to mark messages as read (called only when user scrolls or interacts)
  const markMessagesAsRead = useCallback(async () => {
    if (!messages || !user) return;
    
    const unreadCounselorMessages = messages.filter(msg => 
      msg.sender === 'counselor' && !msg.read
    );
    
    if (unreadCounselorMessages.length > 0) {
      // Update local state optimistically first to prevent loops
      queryClient.setQueryData(['/api/chat/student'], (oldMessages: ChatMessage[] | undefined) => {
        if (!oldMessages) return oldMessages;
        return oldMessages.map(msg => 
          msg.sender === 'counselor' && !msg.read ? { ...msg, read: true } : msg
        );
      });

      // Then make API calls
      try {
        for (const message of unreadCounselorMessages) {
          await markAsReadMutation.mutateAsync(message.id);
        }
      } catch (error) {
        console.error('Failed to mark messages as read:', error);
        // Revert optimistic update on error
        queryClient.setQueryData(['/api/chat/student'], (oldMessages: ChatMessage[] | undefined) => {
          if (!oldMessages) return oldMessages;
          return oldMessages.map(msg => {
            const wasUnread = unreadCounselorMessages.find(u => u.id === msg.id);
            return wasUnread ? { ...msg, read: false } : msg;
          });
        });
      }
    }
  }, [messages, user, markAsReadMutation, queryClient]);

  // Manual button-triggered message marking to prevent infinite loops
  const handleMarkAllAsRead = useCallback(() => {
    if (!messages || !user) return;
    
    const unreadCounselorMessages = messages.filter(msg => 
      msg.sender === 'counselor' && !msg.read
    );
    
    if (unreadCounselorMessages.length > 0) {
      // Mark messages manually
      unreadCounselorMessages.forEach(message => {
        markAsReadMutation.mutate(message.id, {
          onSuccess: () => {
            queryClient.setQueryData(['/api/chat/student'], (oldMessages: ChatMessage[] | undefined) => {
              if (!oldMessages) return oldMessages;
              return oldMessages.map(msg => 
                msg.id === message.id ? { ...msg, read: true } : msg
              );
            });
          }
        });
      });
    }
  }, [messages, user, markAsReadMutation, queryClient]);

  if (!user) {
    return <LoadingSkeleton type="card" count={3} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <Header />
      
      <main className="container mx-auto px-4 pt-24 pb-8">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/student">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Chat with Counselor</h1>
                <p className="text-gray-600">Get guidance and support from your assigned counselor</p>
              </div>
            </div>
          </div>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            Connected
          </Badge>
        </div>

        {/* Security Notice */}
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-800">Chat Security Guidelines</h3>
                <ul className="text-sm text-amber-700 mt-2 space-y-1">
                  <li>• Messages must be typed manually (no copying/pasting)</li>
                  <li>• Links and URLs are not allowed for security</li>
                  <li>• File attachments and images cannot be shared</li>
                  <li>• Please wait 15 seconds between messages</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Chat Area */}
          <div className="lg:col-span-3">
            <Card className="h-[600px] flex flex-col shadow-lg">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src="/api/placeholder/40/40" />
                      <AvatarFallback className="bg-indigo-600 text-white">
                        <User className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">Your Counselor</CardTitle>
                      <p className="text-sm text-gray-600">Professional Educational Advisor</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messagesLoading ? (
                    <LoadingSkeleton count={3} />
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-3">
                      <MessageSquare className="w-12 h-12 text-gray-300" />
                      <div className="text-center">
                        <p className="font-medium">No messages yet</p>
                        <p className="text-sm">Start a conversation with your counselor!</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.sender === 'student' ? 'justify-end' : 'justify-start'}`}
                          data-testid={`message-${message.sender}-${message.id}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm ${
                              message.sender === 'student'
                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-md'
                                : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md'
                            }`}
                          >
                            <p className="text-sm leading-relaxed">{message.message}</p>
                            <div className={`flex items-center justify-between mt-2 ${message.sender === 'student' ? 'text-indigo-100' : 'text-gray-500'}`}>
                              <span className="text-xs">
                                {message.timestamp && !isNaN(Date.parse(message.timestamp)) 
                                  ? new Date(message.timestamp).toLocaleTimeString() 
                                  : new Date().toLocaleTimeString()}
                              </span>
                              {message.sender === 'student' && (
                                <div className="flex items-center ml-2">
                                  {message.read ? (
                                    <CheckCheck className="w-3 h-3 text-indigo-200" />
                                  ) : (
                                    <Check className="w-3 h-3 text-indigo-300" />
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>
                
                {/* Message Input */}
                <div className="border-t bg-white p-4">
                  {cooldownTimeLeft > 0 && (
                    <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center">
                      <Clock className="w-4 h-4 text-amber-600 mr-2" />
                      <span className="text-sm text-amber-700">
                        Please wait {cooldownTimeLeft} seconds before sending another message
                      </span>
                    </div>
                  )}
                  <div className="flex items-center space-x-3">
                    <Input
                      ref={inputRef}
                      value={newMessage}
                      onChange={handleMessageChange}
                      onPaste={handlePaste}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message... (max 100 characters)"
                      className="flex-1"
                      disabled={sendMessageMutation.isPending || cooldownTimeLeft > 0}
                      maxLength={100}
                      data-testid="input-message"
                    />
                    <Button 
                      onClick={handleSendMessage}
                      disabled={sendMessageMutation.isPending || !newMessage.trim() || cooldownTimeLeft > 0}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                      data-testid="button-send"
                    >
                      {sendMessageMutation.isPending ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {newMessage.length}/100 characters
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Chat Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Chat Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Total Messages</p>
                    <p className="text-gray-600 text-sm">{messages.length}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <Users className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Counselor Status</p>
                    <p className="text-green-600 text-sm">Available</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/applications">
                    <Users className="w-4 h-4 mr-2" />
                    View Applications
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/documents">
                    <Users className="w-4 h-4 mr-2" />
                    Upload Documents
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/universities">
                    <Users className="w-4 h-4 mr-2" />
                    Browse Universities
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}