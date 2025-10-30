import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useApiQuery, useApiMutation } from "@/hooks/api-hooks";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import type { StudentProfile } from '../../../shared/types';
import FollowUpTabs from "@/components/FollowUpTabs";
import { 
  ArrowLeft,
  User,
  MessageSquare,
  FileText,
  ClipboardList,
  Phone,
  Mail,
  MapPin,
  Calendar,
  GraduationCap,
  Users,
  Heart,
  BookOpen,
  Upload,
  Download,
  Eye,
  Edit,
  Save,
  X,
  Plus,
  Send,
  Paperclip,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Menu,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,  
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FollowUpNote {
  id: string;
  note: string;
  createdAt: string;
  type: 'general' | 'meeting' | 'urgent' | 'reminder';
  status: 'interested' | 'not_interested' | 'partially_interested' | 'converted';
}

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  sender?: 'counselor' | 'student';
  timestamp: string | Date;
  isRead: boolean;
  read?: boolean;
}

export default function StudentProfileDetail() {
  const params = useParams();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState('details');
  const [isEditing, setIsEditing] = useState(false);
  const [newFollowUp, setNewFollowUp] = useState('');
  const [followUpType, setFollowUpType] = useState<'general' | 'meeting' | 'urgent' | 'reminder'>('general');
  const [newMessage, setNewMessage] = useState('');
  const [editFormData, setEditFormData] = useState<Partial<StudentProfile>>({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [lastMessageTime, setLastMessageTime] = useState<number>(0);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [academicScoringType, setAcademicScoringType] = useState<'gpa' | 'percentage' | 'grade'>('gpa');

  const studentId = params.studentId;

  // WebSocket for real-time chat updates
  const { isConnected } = useWebSocket({
    userId: user?.id,
    onMessage: (message) => {
      if (message.type === 'chat_message') {
        // Directly update the cache with the new message for instant updates
        queryClient.setQueryData(['/api/counselor/chat', studentId], (oldMessages: ChatMessage[] | undefined) => {
          if (!oldMessages) return [message.data];
          
          // Check if message already exists to avoid duplicates
          const messageExists = oldMessages.some(msg => msg.id === message.data.id);
          if (messageExists) return oldMessages;
          
          // Add new message to the end
          return [...oldMessages, message.data];
        });
        
        // Auto-mark student messages as read when received (after a brief delay)
        if (message.data.senderId !== user?.id) {
          setTimeout(() => {
            markAsReadMutation.mutate(message.data.id);
          }, 1000);
        }
      } else if (message.type === 'message_read') {
        // Update read status in real-time
        queryClient.setQueryData(['/api/counselor/chat', studentId], (oldMessages: ChatMessage[] | undefined) => {
          if (!oldMessages) return oldMessages;
          return oldMessages.map(msg => 
            msg.id === message.data.messageId ? { ...msg, isRead: true, read: true } : msg
          );
        });
      }
    }
  });

  // Fetch student profile data - using admin dashboard pattern
  const { data: student, isLoading: studentLoading, error: studentError } = useApiQuery<StudentProfile>(
    ['/api/counselor/student', studentId || ''],
    `/api/counselor/student/${studentId}`,
    undefined,
    {
      enabled: !!studentId,
      staleTime: 2 * 60 * 1000, // 2 minutes like admin dashboard
    }
  );

  // Fetch follow-up notes
  const { data: followUps = [], isLoading: followUpsLoading } = useApiQuery<FollowUpNote[]>(
    ['/api/counselor/followups', studentId || ''],
    `/api/counselor/followups/${studentId}`,
    undefined,
    { enabled: !!studentId }
  );

  // Fetch documents
  const { data: documents = [], isLoading: documentsLoading } = useApiQuery<Document[]>(
    ['/api/students/documents', studentId || ''],
    `/api/students/documents/${studentId}`,
    undefined,
    { enabled: !!studentId }
  );

  // Fetch chat messages
  const { data: messages = [], isLoading: messagesLoading } = useApiQuery<ChatMessage[]>(
    ['/api/counselor/chat', studentId || ''],
    `/api/counselor/chat/${studentId}`,
    undefined,
    { enabled: !!studentId }
  );

  // Add follow-up note mutation
  const addFollowUpMutation = useApiMutation(
    (data: { note: string; type: string }) => {
      return api.post(`/api/counselor/followups/${studentId}`, data);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/counselor/followups', studentId] });
        setNewFollowUp('');
        toast({ title: "Follow-up note added successfully" });
      }
    }
  );

  // Mutation for marking messages as read
  const markAsReadMutation = useApiMutation<void, string>(
    (messageId: string): Promise<void> => {
      return api.put(`/api/chat/messages/${messageId}/read`);
    }
  );

  // Send message mutation
  const sendMessageMutation = useApiMutation<ChatMessage, string>(
    (message: string): Promise<ChatMessage> => {
      return api.post(`/api/counselor/chat/${studentId}`, { message });
    },
    {
      onSuccess: (newMessageData: ChatMessage) => {
        // Directly add the sent message to cache for instant feedback
        queryClient.setQueryData(['/api/counselor/chat', studentId], (oldMessages: ChatMessage[] | undefined) => {
          if (!oldMessages) return [newMessageData];
          
          // Check if message already exists to avoid duplicates
          const messageExists = oldMessages.some(msg => msg.id === newMessageData.id);
          if (messageExists) return oldMessages;
          
          return [...oldMessages, newMessageData];
        });
        
        setNewMessage('');
        toast({ title: "Message sent successfully" });
      }
    }
  );

  // Removed: Follow-up status update mutation (missing backend endpoint)

  // Data validation and cleanup function
  const validateAndCleanStudentData = (data: Partial<StudentProfile>) => {
    const cleaned = { ...data } as any; // Safe casting for dynamic property access
    
    // Define nested fields but DO NOT create empty objects automatically
    const nestedFields = ['personalDetails', 'academicDetails', 'workDetails', 
                         'studyPreferences', 'universityPreferences', 'financialInfo',
                         'visaHistory', 'familyDetails', 'additionalInfo'] as const;
    
    // SAFETY FIX: Only include nested objects if they have actual data
    // This prevents overwriting existing server data with empty objects
    nestedFields.forEach(field => {
      if (cleaned[field] && typeof cleaned[field] === 'object') {
        // Check if the nested object has any meaningful data
        const hasData = Object.values(cleaned[field]).some(value => 
          value !== null && value !== undefined && value !== ''
        );
        
        // Only keep nested objects that contain actual data
        if (!hasData) {
          delete cleaned[field]; // Remove empty nested objects to prevent data loss
        }
      }
    });
    
    // Clean empty strings and null values for simple fields
    Object.keys(cleaned).forEach(key => {
      if (!nestedFields.includes(key as any) && (cleaned[key] === '' || cleaned[key] === null)) {
        delete cleaned[key]; // Don't send empty values that would overwrite existing data
      }
    });
    
    return cleaned as Partial<StudentProfile>;
  };

  // Save student profile mutation
  const saveStudentMutation = useApiMutation(
    (data: Partial<StudentProfile>) => {
      // Clean and validate data before sending
      const cleanedData = validateAndCleanStudentData(data);
      
      return api.put(`/api/counselor/update-student-profile/${studentId}`, cleanedData);
    },
    {
      onSuccess: () => {
        // Fix: Use the same cache key as the query to ensure UI updates
        queryClient.invalidateQueries({ queryKey: ['/api/counselor/student', studentId] });
        setIsEditing(false);
        toast({ title: "Student profile updated successfully" });
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error?.message || "Failed to update student profile. Please try again.",
          variant: "destructive"
        });
      }
    }
  );

  // Removed: Follow-up creation handler (missing backend endpoint)

  // Security validation for chat messages
  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Rule 1: Check for URLs
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[^\s]+\.(com|org|net|edu|gov|mil|int|co|io|ly|me|tv|info|biz)[^\s]*)/gi;
    if (urlRegex.test(value)) {
      toast({
        title: "Links not allowed",
        description: "Please remove any URLs from your message",
        variant: "destructive"
      });
      return;
    }

    // Rule 2: Character limit
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

  // Prevent paste in chat
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    toast({
      title: "Paste not allowed",
      description: "Please type your message manually for security",
      variant: "destructive"
    });
  };

  // Manual button-triggered message marking to prevent infinite loops
  const handleMarkAllAsRead = useCallback(() => {
    if (!messages || !user || !studentId) return;
    
    const unreadStudentMessages = messages.filter(msg => 
      msg.sender === 'student' && !msg.read
    );
    
    if (unreadStudentMessages.length > 0) {
      // Mark messages manually
      unreadStudentMessages.forEach(message => {
        markAsReadMutation.mutate(message.id, {
          onSuccess: () => {
            queryClient.setQueryData(['/api/counselor/chat', studentId], (oldMessages: ChatMessage[] | undefined) => {
              if (!oldMessages) return oldMessages;
              return oldMessages.map(msg => 
                msg.id === message.id ? { ...msg, read: true } : msg
              );
            });
          }
        });
      });
    }
  }, [messages, user, studentId, markAsReadMutation, queryClient]);

  // Auto-mark visible student messages as read when chat section is viewed
  useEffect(() => {
    if (!messages || !user || messages.length === 0 || activeSection !== 'chat') return;
    
    const unreadStudentMessages = messages.filter(msg => 
      msg.sender === 'student' && !msg.read
    );
    
    if (unreadStudentMessages.length > 0) {
      // Delay to ensure smooth UI experience
      const timer = setTimeout(() => {
        unreadStudentMessages.forEach(message => {
          markAsReadMutation.mutate(message.id);
        });
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [messages, user, markAsReadMutation, activeSection]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    // Rule 3: Rate limiting - 15 second cooldown
    const now = Date.now();
    const timeSinceLastMessage = now - lastMessageTime;
    
    if (timeSinceLastMessage < 15000) { // 15 seconds
      const remainingTime = Math.ceil((15000 - timeSinceLastMessage) / 1000);
      toast({
        title: "Please wait",
        description: `You can send another message in ${remainingTime} seconds`,
        variant: "destructive"
      });
      setIsRateLimited(true);
      setTimeout(() => setIsRateLimited(false), 15000 - timeSinceLastMessage);
      return;
    }

    setLastMessageTime(now);
    sendMessageMutation.mutate(newMessage);
  };

  const handleEditToggle = () => {
    if (!isEditing && student) {
      // Initialize edit form with current student data
      setEditFormData({
        ...student,
        personalDetails: student.personalDetails || {},
        academicDetails: student.academicDetails || {},
        workDetails: student.workDetails || {},
        testScores: student.testScores || {},
        studyPreferences: student.studyPreferences || {},
        universityPreferences: student.universityPreferences || {},
        financialInfo: student.financialInfo || {},
        visaHistory: student.visaHistory || {},
        familyDetails: student.familyDetails || {},
        additionalInfo: student.additionalInfo || {}
      });
      // Initialize academic scoring type from student data
      setAcademicScoringType(student.academicScoringType || 'gpa');
    }
    setIsEditing(!isEditing);
  };

  const handleSaveProfile = () => {
    // Include academicScoringType in the form data before saving
    const dataToSave = {
      ...editFormData,
      academicScoringType: academicScoringType
    };
    saveStudentMutation.mutate(dataToSave);
  };

  const updateEditFormData = (field: string, value: any, section?: string) => {
    setEditFormData(prev => {
      if (section) {
        return {
          ...prev,
          [section]: {
            ...prev[section as keyof StudentProfile] as any,
            [field]: value
          }
        };
      } else {
        return {
          ...prev,
          [field]: value
        };
      }
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'interested':
        return 'bg-green-100 text-green-800';
      case 'not_interested':
        return 'bg-red-100 text-red-800';
      case 'partially_interested':
        return 'bg-yellow-100 text-yellow-800';
      case 'converted':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'meeting':
        return <Calendar className="w-4 h-4" />;
      case 'urgent':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'reminder':
        return <Clock className="w-4 h-4" />;
      default:
        return <ClipboardList className="w-4 h-4" />;
    }
  };

  // Add defensive data handling like admin dashboard
  const displayName = student?.firstName && student?.lastName 
    ? `${student.firstName} ${student.lastName}` 
    : 'Student Profile';

  const displayEmail = student?.email || 'No email provided';
  const displayPhone = student?.phone || 'No phone provided';

  // Error handling like admin dashboard
  if (studentError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <AlertCircle className="w-12 h-12 mx-auto mb-2" />
            Failed to load student data
          </div>
          <p className="text-gray-600 mb-4">There was an error loading the student profile.</p>
          <Button 
            onClick={() => navigate('/dashboard/team')}
            className="mt-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (studentLoading) {
    return <LoadingSkeleton />;
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900">Student not found</h2>
          <Button 
            onClick={() => navigate('/dashboard/team')}
            className="mt-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Mobile sidebar toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="md:hidden h-8 w-8 p-0"
            >
              <Menu className="w-4 h-4" />
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={() => navigate('/dashboard/team')}
              className="flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center space-x-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src="" />
                <AvatarFallback className="bg-primary text-white">
                  {student.firstName?.[0] || 'S'}{student.lastName?.[0] || 'S'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {displayName}
                </h1>
                <p className="text-sm text-gray-500">Student Profile</p>
              </div>
            </div>
          </div>
          <Badge className={getStatusColor(student.status || 'pending')}>
            {student.status || 'pending'}
          </Badge>
        </div>
      </div>

      <div className="flex relative">
        {/* Sidebar */}
        <div className={`${
          sidebarCollapsed ? 'w-16 md:w-16' : 'w-64 md:w-64'
        } bg-white border-r transition-all duration-300 flex flex-col z-20 ${
          sidebarCollapsed ? 'md:relative absolute -translate-x-full md:translate-x-0' : 'relative'
        } shadow-lg md:shadow-none`}>
          {/* Sidebar Header with Toggle */}
          <div className="p-4 border-b flex items-center justify-between">
            {!sidebarCollapsed && (
              <h3 className="font-semibold text-gray-900">Navigation</h3>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="h-8 w-8 p-0"
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
          </div>
          
          {/* Scrollable Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <button
              onClick={() => setActiveSection('details')}
              className={`w-full flex items-center px-3 py-2 text-left rounded-lg transition-colors ${
                activeSection === 'details' 
                  ? 'bg-primary text-white' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              title={sidebarCollapsed ? 'View Details' : ''}
            >
              <User className="w-4 h-4 flex-shrink-0" />
              {!sidebarCollapsed && <span className="ml-3">View Details</span>}
            </button>
            
            <button
              onClick={() => setActiveSection('followup')}
              className={`w-full flex items-center px-3 py-2 text-left rounded-lg transition-colors ${
                activeSection === 'followup' 
                  ? 'bg-primary text-white' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              title={sidebarCollapsed ? 'Follow-up' : ''}
            >
              <ClipboardList className="w-4 h-4 flex-shrink-0" />
              {!sidebarCollapsed && <span className="ml-3">Follow-up</span>}
            </button>
            
            <button
              onClick={() => setActiveSection('documents')}
              className={`w-full flex items-center px-3 py-2 text-left rounded-lg transition-colors ${
                activeSection === 'documents' 
                  ? 'bg-primary text-white' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              title={sidebarCollapsed ? 'Documents' : ''}
            >
              <FileText className="w-4 h-4 flex-shrink-0" />
              {!sidebarCollapsed && <span className="ml-3">Documents</span>}
            </button>
            
            <button
              onClick={() => setActiveSection('chat')}
              className={`w-full flex items-center px-3 py-2 text-left rounded-lg transition-colors ${
                activeSection === 'chat' 
                  ? 'bg-primary text-white' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              title={sidebarCollapsed ? 'Chat' : ''}
            >
              <MessageSquare className="w-4 h-4 flex-shrink-0" />
              {!sidebarCollapsed && <span className="ml-3">Chat</span>}
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className={`flex-1 p-6 overflow-y-auto max-h-screen transition-all duration-300 ${
          sidebarCollapsed ? 'md:ml-0' : 'md:ml-0'
        }`}>
          {/* View Details Section */}
          {activeSection === 'details' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-gray-900">Student Details</h2>
                <div className="flex space-x-2">
                  {isEditing && (
                    <Button 
                      onClick={handleSaveProfile}
                      disabled={saveStudentMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {saveStudentMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  )}
                  <Button 
                    onClick={handleEditToggle}
                    variant={isEditing ? "outline" : "default"}
                  >
                    {isEditing ? (
                      <>
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </>
                    ) : (
                      <>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Basic Personal Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <User className="w-5 h-5 mr-2" />
                      Basic Personal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Signup Name (Internal Reference)</Label>
                      <div className="flex items-center space-x-2">
                        <p className="text-sm text-gray-600">{student.firstName} {student.lastName}</p>
                        <Badge variant="outline" className="text-xs">View Only</Badge>
                      </div>
                    </div>
                    <div>
                      <Label>Full Name (as per passport)</Label>
                      {isEditing ? (
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            value={editFormData.personalDetails?.passportFirstName || ''}
                            onChange={(e) => updateEditFormData('passportFirstName', e.target.value, 'personalDetails')}
                            placeholder="Passport First Name"
                          />
                          <Input
                            value={editFormData.personalDetails?.passportLastName || ''}
                            onChange={(e) => updateEditFormData('passportLastName', e.target.value, 'personalDetails')}
                            placeholder="Passport Last Name"
                          />
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600">
                          {student.personalDetails?.passportFirstName || student.firstName} {student.personalDetails?.passportLastName || student.lastName}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label>Date of Birth</Label>
                      {isEditing ? (
                        <Input
                          type="date"
                          value={editFormData.dateOfBirth || ''}
                          onChange={(e) => updateEditFormData('dateOfBirth', e.target.value)}
                        />
                      ) : (
                        <p className="text-sm text-gray-600">
                          {student.dateOfBirth ? formatDate(student.dateOfBirth) : 'Not specified'}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label>Gender</Label>
                      {isEditing ? (
                        <Select 
                          value={editFormData.personalDetails?.gender || ''} 
                          onValueChange={(value) => updateEditFormData('gender', value, 'personalDetails')}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                            <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm text-gray-600">{student.personalDetails?.gender || 'Not specified'}</p>
                      )}
                    </div>
                    <div>
                      <Label>Nationality</Label>
                      {isEditing ? (
                        <Input
                          value={editFormData.personalDetails?.nationality || ''}
                          onChange={(e) => updateEditFormData('nationality', e.target.value, 'personalDetails')}
                          placeholder="e.g., Indian, American, British"
                        />
                      ) : (
                        <p className="text-sm text-gray-600">{student.personalDetails?.nationality || 'Not specified'}</p>
                      )}
                    </div>
                    <div>
                      <Label>Contact Number</Label>
                      {isEditing ? (
                        <Input
                          value={editFormData.phone || ''}
                          onChange={(e) => updateEditFormData('phone', e.target.value)}
                          placeholder="+1234567890"
                        />
                      ) : (
                        <p className="text-sm text-gray-600">{student.phone || 'Not specified'}</p>
                      )}
                    </div>
                    <div>
                      <Label>WhatsApp Number</Label>
                      {isEditing ? (
                        <Input
                          value={editFormData.personalDetails?.whatsappNumber || ''}
                          onChange={(e) => updateEditFormData('whatsappNumber', e.target.value, 'personalDetails')}
                          placeholder="Leave empty if same as contact number"
                        />
                      ) : (
                        <p className="text-sm text-gray-600">{student.personalDetails?.whatsappNumber || 'Same as contact'}</p>
                      )}
                    </div>
                    <div>
                      <Label>Email Address</Label>
                      {isEditing ? (
                        <div className="relative">
                          <Input
                            type="email"
                            value={student.email || ''}
                            disabled={true}
                            className="bg-gray-100 cursor-not-allowed opacity-60"
                            placeholder="Email cannot be changed"
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                            Read-only
                          </span>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600">{student.email}</p>
                      )}
                    </div>
                    <div>
                      <Label>Current Address</Label>
                      {isEditing ? (
                        <div className="space-y-2">
                          <Input
                            value={editFormData.personalDetails?.address || ''}
                            onChange={(e) => updateEditFormData('address', e.target.value, 'personalDetails')}
                            placeholder="Street address"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              value={editFormData.personalDetails?.city || ''}
                              onChange={(e) => updateEditFormData('city', e.target.value, 'personalDetails')}
                              placeholder="City"
                            />
                            <Input
                              value={editFormData.personalDetails?.country || ''}
                              onChange={(e) => updateEditFormData('country', e.target.value, 'personalDetails')}
                              placeholder="Country"
                            />
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600">
                          {student.personalDetails?.address ? `${student.personalDetails.address}, ${student.personalDetails.city}, ${student.personalDetails.country}` : 'Not specified'}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label>Passport Number</Label>
                      {isEditing ? (
                        <Input
                          value={editFormData.personalDetails?.passportNumber || ''}
                          onChange={(e) => updateEditFormData('passportNumber', e.target.value, 'personalDetails')}
                          placeholder="Enter passport number"
                        />
                      ) : (
                        <p className="text-sm text-gray-600">{student.personalDetails?.passportNumber || 'Not specified'}</p>
                      )}
                    </div>
                    <div>
                      <Label>Passport Expiry Date</Label>
                      {isEditing ? (
                        <Input
                          type="date"
                          value={editFormData.personalDetails?.passportExpiry || ''}
                          onChange={(e) => updateEditFormData('passportExpiry', e.target.value, 'personalDetails')}
                        />
                      ) : (
                        <p className="text-sm text-gray-600">
                          {student.personalDetails?.passportExpiry ? formatDate(student.personalDetails.passportExpiry) : 'Not specified'}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 2. Academic Background */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BookOpen className="w-5 h-5 mr-2" />
                      🎓 Academic Background
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Highest Qualification</Label>
                      {isEditing ? (
                        <Select 
                          value={editFormData.academicDetails?.highestQualification || ''} 
                          onValueChange={(value) => updateEditFormData('highestQualification', value, 'academicDetails')}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select qualification" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high-school">High School</SelectItem>
                            <SelectItem value="diploma">Diploma</SelectItem>
                            <SelectItem value="bachelors">Bachelor's Degree</SelectItem>
                            <SelectItem value="masters">Master's Degree</SelectItem>
                            <SelectItem value="phd">PhD</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm text-gray-600">{student.academicDetails?.highestQualification || 'Not specified'}</p>
                      )}
                    </div>
                    <div>
                      <Label>Current Grade/Level</Label>
                      {isEditing ? (
                        <Input
                          value={editFormData.currentEducationLevel || ''}
                          onChange={(e) => updateEditFormData('currentEducationLevel', e.target.value)}
                          placeholder="e.g., 12th Grade, 2nd Year"
                        />
                      ) : (
                        <p className="text-sm text-gray-600">{student.currentEducationLevel || 'Not specified'}</p>
                      )}
                    </div>
                    <div>
                      <Label>Institution Name</Label>
                      {isEditing ? (
                        <Input
                          value={editFormData.institutionName || ''}
                          onChange={(e) => updateEditFormData('institutionName', e.target.value)}
                          placeholder="Enter school/college/university name"
                        />
                      ) : (
                        <p className="text-sm text-gray-600">{student.institutionName || 'Not specified'}</p>
                      )}
                    </div>
                    <div>
                      <Label>Academic Year</Label>
                      {isEditing ? (
                        <Input
                          value={editFormData.academicDetails?.academicYear || ''}
                          onChange={(e) => updateEditFormData('academicYear', e.target.value, 'academicDetails')}
                          placeholder="e.g., 2023-2024"
                        />
                      ) : (
                        <p className="text-sm text-gray-600">{student.academicDetails?.academicYear || 'Not specified'}</p>
                      )}
                    </div>
                    <div>
                      <Label>Marks/Percentage/CGPA</Label>
                      {isEditing ? (
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={editFormData.gpa || ''}
                            onChange={(e) => updateEditFormData('gpa', parseFloat(e.target.value) || 0)}
                            placeholder={
                              academicScoringType === 'percentage' ? 'e.g., 85' :
                              academicScoringType === 'grade' ? 'e.g., 3.5' : 
                              'e.g., 8.5'
                            }
                          />
                          <Select 
                            value={academicScoringType} 
                            onValueChange={(value) => setAcademicScoringType(value as 'gpa' | 'percentage' | 'grade')}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="gpa">CGPA</SelectItem>
                              <SelectItem value="percentage">Percentage</SelectItem>
                              <SelectItem value="grade">Grade</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600">
                          {student.gpa ? 
                            `${student.gpa} (${
                              student.academicScoringType === 'percentage' ? 'Percentage' :
                              student.academicScoringType === 'grade' ? 'Grade' :
                              'CGPA'
                            })` : 'Not specified'
                          }
                        </p>
                      )}
                    </div>
                    <div>
                      <Label>Academic Gaps or Backlogs</Label>
                      {isEditing ? (
                        <Textarea
                          value={editFormData.academicDetails?.academicGaps || ''}
                          onChange={(e) => updateEditFormData('academicGaps', e.target.value, 'academicDetails')}
                          placeholder="Describe any academic gaps, backlogs, or breaks in education"
                          rows={3}
                        />
                      ) : (
                        <p className="text-sm text-gray-600">{student.academicDetails?.academicGaps || 'None'}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 3. Work Experience */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="w-5 h-5 mr-2" />
                      💼 Work Experience
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Job Title</Label>
                      {isEditing ? (
                        <Input
                          value={editFormData.workDetails?.jobTitle || ''}
                          onChange={(e) => updateEditFormData('jobTitle', e.target.value, 'workDetails')}
                          placeholder="e.g., Software Engineer, Marketing Intern"
                        />
                      ) : (
                        <p className="text-sm text-gray-600">{student.workDetails?.jobTitle || 'Not applicable'}</p>
                      )}
                    </div>
                    <div>
                      <Label>Company Name</Label>
                      {isEditing ? (
                        <Input
                          value={editFormData.workDetails?.companyName || ''}
                          onChange={(e) => updateEditFormData('companyName', e.target.value, 'workDetails')}
                          placeholder="Enter company name"
                        />
                      ) : (
                        <p className="text-sm text-gray-600">{student.workDetails?.companyName || 'Not applicable'}</p>
                      )}
                    </div>
                    <div>
                      <Label>Duration of Employment</Label>
                      {isEditing ? (
                        <Input
                          value={editFormData.workDetails?.workDuration || ''}
                          onChange={(e) => updateEditFormData('workDuration', e.target.value, 'workDetails')}
                          placeholder="e.g., 6 months, 2 years"
                        />
                      ) : (
                        <p className="text-sm text-gray-600">{student.workDetails?.workDuration || 'Not applicable'}</p>
                      )}
                    </div>
                    <div>
                      <Label>Current Employment Status</Label>
                      {isEditing ? (
                        <Select 
                          value={editFormData.workDetails?.employmentStatus || ''} 
                          onValueChange={(value) => updateEditFormData('employmentStatus', value, 'workDetails')}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="employed">Currently Employed</SelectItem>
                            <SelectItem value="unemployed">Unemployed</SelectItem>
                            <SelectItem value="freelancer">Freelancer</SelectItem>
                            <SelectItem value="intern">Intern</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm text-gray-600">{student.workDetails?.employmentStatus || 'Student'}</p>
                      )}
                    </div>
                    <div>
                      <Label>Job Responsibilities</Label>
                      {isEditing ? (
                        <Textarea
                          value={editFormData.workDetails?.jobResponsibilities || ''}
                          onChange={(e) => updateEditFormData('jobResponsibilities', e.target.value, 'workDetails')}
                          placeholder="Describe key responsibilities and achievements"
                          rows={3}
                        />
                      ) : (
                        <p className="text-sm text-gray-600">{student.workDetails?.jobResponsibilities || 'Not applicable'}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 4. Test Scores */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BookOpen className="w-5 h-5 mr-2" />
                      📄 Test Scores
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>IELTS/TOEFL/PTE Overall Score</Label>
                      {isEditing ? (
                        <Input
                          value={editFormData.testScores?.englishTestScore || ''}
                          onChange={(e) => updateEditFormData('englishTestScore', e.target.value, 'testScores')}
                          placeholder="e.g., 7.5, 100, 68"
                        />
                      ) : (
                        <p className="text-sm text-gray-600">{student.testScores?.englishTestScore || 'Not taken'}</p>
                      )}
                    </div>
                    <div>
                      <Label>Individual Band Scores (L/R/W/S)</Label>
                      {isEditing ? (
                        <Input
                          value={editFormData.testScores?.englishBandScores || ''}
                          onChange={(e) => updateEditFormData('englishBandScores', e.target.value, 'testScores')}
                          placeholder="e.g., L:7.5 R:8.0 W:7.0 S:7.5"
                        />
                      ) : (
                        <p className="text-sm text-gray-600">{student.testScores?.englishBandScores || 'Not specified'}</p>
                      )}
                    </div>
                    <div>
                      <Label>English Test Date</Label>
                      {isEditing ? (
                        <Input
                          type="date"
                          value={editFormData.testScores?.englishTestDate || ''}
                          onChange={(e) => updateEditFormData('englishTestDate', e.target.value, 'testScores')}
                        />
                      ) : (
                        <p className="text-sm text-gray-600">
                          {student.testScores?.englishTestDate ? formatDate(student.testScores.englishTestDate) : 'Not specified'}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label>GRE/GMAT/SAT Score</Label>
                      {isEditing ? (
                        <Input
                          value={editFormData.testScores?.standardizedTestScore || ''}
                          onChange={(e) => updateEditFormData('standardizedTestScore', e.target.value, 'testScores')}
                          placeholder="e.g., 320, 700, 1450"
                        />
                      ) : (
                        <p className="text-sm text-gray-600">{student.testScores?.standardizedTestScore || 'Not taken'}</p>
                      )}
                    </div>
                    <div>
                      <Label>Standardized Test Date</Label>
                      {isEditing ? (
                        <Input
                          type="date"
                          value={editFormData.testScores?.standardizedTestDate || ''}
                          onChange={(e) => updateEditFormData('standardizedTestDate', e.target.value, 'testScores')}
                        />
                      ) : (
                        <p className="text-sm text-gray-600">
                          {student.testScores?.standardizedTestDate ? formatDate(student.testScores.standardizedTestDate) : 'Not specified'}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label>Plan to Retake?</Label>
                      {isEditing ? (
                        <Select 
                          value={editFormData.testScores?.planToRetake ? 'yes' : 'no'} 
                          onValueChange={(value) => updateEditFormData('planToRetake', value === 'yes', 'testScores')}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select option" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="no">No</SelectItem>
                            <SelectItem value="yes">Yes</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm text-gray-600">{student.testScores?.planToRetake ? 'Yes' : 'No'}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 5. Study Abroad Preferences */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="w-5 h-5 mr-2" />
                      🌍 Study Abroad Preferences
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Preferred Countries</Label>
                      {isEditing ? (
                        <Textarea
                          value={Array.isArray(editFormData.studyPreferences?.preferredCountries) 
                            ? editFormData.studyPreferences.preferredCountries.join(', ') 
                            : (editFormData.studyPreferences?.preferredCountries || '')}
                          onChange={(e) => {
                            // Always store as string during typing for natural experience
                            updateEditFormData('preferredCountries', e.target.value, 'studyPreferences');
                          }}
                          onBlur={(e) => {
                            // Convert to array when user finishes editing
                            const rawValue = e.target.value;
                            if (rawValue.trim()) {
                              const countries = rawValue.split(',').map(c => c.trim()).filter(c => c.length > 0);
                              updateEditFormData('preferredCountries', countries, 'studyPreferences');
                            } else {
                              updateEditFormData('preferredCountries', [], 'studyPreferences');
                            }
                          }}
                          placeholder="USA, Canada, UK (separate with commas)"
                          rows={2}
                        />
                      ) : (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {student.studyPreferences?.preferredCountries && student.studyPreferences.preferredCountries.length > 0 ? (
                            student.studyPreferences.preferredCountries.map((country: string, index: number) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {country}
                              </Badge>
                            ))
                          ) : (
                            <p className="text-sm text-gray-600">Not specified</p>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <Label>Preferred Intake</Label>
                      {isEditing ? (
                        <Select 
                          value={editFormData.studyPreferences?.preferredIntake || ''} 
                          onValueChange={(value) => updateEditFormData('preferredIntake', value, 'studyPreferences')}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select intake" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fall">Fall</SelectItem>
                            <SelectItem value="spring">Spring</SelectItem>
                            <SelectItem value="summer">Summer</SelectItem>
                            <SelectItem value="winter">Winter</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm text-gray-600">{student.studyPreferences?.preferredIntake || 'Not specified'}</p>
                      )}
                    </div>
                    <div>
                      <Label>Desired Program Level</Label>
                      {isEditing ? (
                        <Select 
                          value={editFormData.studyPreferences?.programLevel || ''} 
                          onValueChange={(value) => updateEditFormData('programLevel', value, 'studyPreferences')}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bachelor">Bachelor's</SelectItem>
                            <SelectItem value="master">Master's</SelectItem>
                            <SelectItem value="phd">PhD</SelectItem>
                            <SelectItem value="diploma">Diploma</SelectItem>
                            <SelectItem value="certificate">Certificate</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm text-gray-600">{student.studyPreferences?.programLevel || 'Not specified'}</p>
                      )}
                    </div>
                    <div>
                      <Label>Field of Study / Intended Major</Label>
                      {isEditing ? (
                        <Textarea
                          value={Array.isArray(editFormData.academicInterests) 
                            ? editFormData.academicInterests.join(', ') 
                            : (editFormData.academicInterests || '')}
                          onChange={(e) => {
                            // Always store as string during typing for natural experience
                            updateEditFormData('academicInterests', e.target.value);
                          }}
                          onBlur={(e) => {
                            // Convert to array when user finishes editing
                            const rawValue = e.target.value;
                            if (rawValue.trim()) {
                              const fields = rawValue.split(',').map(f => f.trim()).filter(f => f.length > 0);
                              updateEditFormData('academicInterests', fields);
                            } else {
                              updateEditFormData('academicInterests', []);
                            }
                          }}
                          placeholder="Computer Science, Engineering, Business (separate with commas)"
                          rows={2}
                        />
                      ) : (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {student.academicInterests && student.academicInterests.length > 0 ? (
                            student.academicInterests.map((field: string, index: number) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {field}
                              </Badge>
                            ))
                          ) : (
                            <p className="text-sm text-gray-600">Not specified</p>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <Label>Reason for Country Choice</Label>
                      {isEditing ? (
                        <Textarea
                          value={editFormData.studyPreferences?.countryChoiceReason || ''}
                          onChange={(e) => updateEditFormData('countryChoiceReason', e.target.value, 'studyPreferences')}
                          placeholder="Why did you choose these countries?"
                          rows={2}
                        />
                      ) : (
                        <p className="text-sm text-gray-600">{student.studyPreferences?.countryChoiceReason || 'Not specified'}</p>
                      )}
                    </div>
                    <div>
                      <Label>Study Goals</Label>
                      {isEditing ? (
                        <Textarea
                          value={editFormData.studyPreferences?.studyGoals || ''}
                          onChange={(e) => updateEditFormData('studyGoals', e.target.value, 'studyPreferences')}
                          placeholder="What do you hope to achieve through this education?"
                          rows={2}
                        />
                      ) : (
                        <p className="text-sm text-gray-600">{student.studyPreferences?.studyGoals || 'Not specified'}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 6. University Preferences */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BookOpen className="w-5 h-5 mr-2" />
                      🏫 University Preferences
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Preferred Universities</Label>
                      {isEditing ? (
                        <Textarea
                          value={Array.isArray(editFormData.universityPreferences?.preferredUniversities) 
                            ? editFormData.universityPreferences.preferredUniversities.join(', ') 
                            : ''}
                          onChange={(e) => updateEditFormData('preferredUniversities', e.target.value.split(', ').filter(u => u.trim()), 'universityPreferences')}
                          placeholder="Harvard, MIT, Stanford (separate with commas)"
                          rows={2}
                        />
                      ) : (
                        <p className="text-sm text-gray-600">
                          {Array.isArray(student.universityPreferences?.preferredUniversities) 
                            ? student.universityPreferences.preferredUniversities.join(', ') 
                            : 'Open to suggestions'}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label>Preferred Location</Label>
                      {isEditing ? (
                        <Input
                          value={editFormData.universityPreferences?.preferredLocation || ''}
                          onChange={(e) => updateEditFormData('preferredLocation', e.target.value, 'universityPreferences')}
                          placeholder="e.g., California, New York, London"
                        />
                      ) : (
                        <p className="text-sm text-gray-600">{student.universityPreferences?.preferredLocation || 'Not specified'}</p>
                      )}
                    </div>
                    <div>
                      <Label>Institution Type Preference</Label>
                      {isEditing ? (
                        <Select 
                          value={editFormData.universityPreferences?.institutionType || ''} 
                          onValueChange={(value) => updateEditFormData('institutionType', value, 'universityPreferences')}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="public">Public University</SelectItem>
                            <SelectItem value="private">Private University</SelectItem>
                            <SelectItem value="community">Community College</SelectItem>
                            <SelectItem value="liberal_arts">Liberal Arts College</SelectItem>
                            <SelectItem value="research">Research University</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm text-gray-600">{student.universityPreferences?.institutionType || 'Not specified'}</p>
                      )}
                    </div>
                    <div>
                      <Label>Campus Preference</Label>
                      {isEditing ? (
                        <Select 
                          value={editFormData.universityPreferences?.campusPreference || ''} 
                          onValueChange={(value) => updateEditFormData('campusPreference', value, 'universityPreferences')}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select preference" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="urban">Urban Campus</SelectItem>
                            <SelectItem value="suburban">Suburban Campus</SelectItem>
                            <SelectItem value="rural">Rural Campus</SelectItem>
                            <SelectItem value="online">Online Learning</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm text-gray-600">{student.universityPreferences?.campusPreference || 'Not specified'}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 7. Financial Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="w-5 h-5 mr-2" />
                      💰 Financial Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Estimated Budget (Tuition + Living)</Label>
                      {isEditing ? (
                        <Input
                          value={editFormData.financialInfo?.estimatedBudget || ''}
                          onChange={(e) => updateEditFormData('estimatedBudget', e.target.value, 'financialInfo')}
                          placeholder="e.g., $50,000 - $80,000 per year"
                        />
                      ) : (
                        <p className="text-sm text-gray-600">{student.financialInfo?.estimatedBudget || 'Not specified'}</p>
                      )}
                    </div>
                    <div>
                      <Label>Source of Funds</Label>
                      {isEditing ? (
                        <Select 
                          value={editFormData.financialInfo?.fundingSource || ''} 
                          onValueChange={(value) => updateEditFormData('fundingSource', value, 'financialInfo')}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select source" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="self">Self-funded</SelectItem>
                            <SelectItem value="family">Family Support</SelectItem>
                            <SelectItem value="scholarship">Scholarship</SelectItem>
                            <SelectItem value="loan">Educational Loan</SelectItem>
                            <SelectItem value="employer">Employer Sponsorship</SelectItem>
                            <SelectItem value="mixed">Mixed Sources</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm text-gray-600">{student.financialInfo?.fundingSource || 'Not specified'}</p>
                      )}
                    </div>
                    <div>
                      <Label>Loan Required?</Label>
                      {isEditing ? (
                        <Select 
                          value={editFormData.financialInfo?.loanRequired ? 'yes' : 'no'} 
                          onValueChange={(value) => updateEditFormData('loanRequired', value === 'yes', 'financialInfo')}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select option" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="no">No</SelectItem>
                            <SelectItem value="yes">Yes</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm text-gray-600">{student.financialInfo?.loanRequired ? 'Yes' : 'No'}</p>
                      )}
                    </div>
                    <div>
                      <Label>Financial Constraints</Label>
                      {isEditing ? (
                        <Textarea
                          value={editFormData.financialInfo?.financialConstraints || ''}
                          onChange={(e) => updateEditFormData('financialConstraints', e.target.value, 'financialInfo')}
                          placeholder="Any specific financial limitations or requirements"
                          rows={2}
                        />
                      ) : (
                        <p className="text-sm text-gray-600">{student.financialInfo?.financialConstraints || 'None specified'}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 8. Visa & Travel History */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="w-5 h-5 mr-2" />
                      🛂 Visa & Travel History
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Previous Visa Applications</Label>
                      {isEditing ? (
                        <Textarea
                          value={editFormData.visaHistory?.previousVisaApplications || ''}
                          onChange={(e) => updateEditFormData('previousVisaApplications', e.target.value, 'visaHistory')}
                          placeholder="List any previous visa applications with countries and dates"
                          rows={2}
                        />
                      ) : (
                        <p className="text-sm text-gray-600">{student.visaHistory?.previousVisaApplications || 'None'}</p>
                      )}
                    </div>
                    <div>
                      <Label>Visa Application Outcomes</Label>
                      {isEditing ? (
                        <Input
                          value={editFormData.visaHistory?.visaOutcomes || ''}
                          onChange={(e) => updateEditFormData('visaOutcomes', e.target.value, 'visaHistory')}
                          placeholder="e.g., Approved, Rejected, Pending"
                        />
                      ) : (
                        <p className="text-sm text-gray-600">{student.visaHistory?.visaOutcomes || 'N/A'}</p>
                      )}
                    </div>
                    <div>
                      <Label>Travel History</Label>
                      {isEditing ? (
                        <Textarea
                          value={editFormData.visaHistory?.travelHistory || ''}
                          onChange={(e) => updateEditFormData('travelHistory', e.target.value, 'visaHistory')}
                          placeholder="List countries visited and duration of stay"
                          rows={2}
                        />
                      ) : (
                        <p className="text-sm text-gray-600">{student.visaHistory?.travelHistory || 'Not specified'}</p>
                      )}
                    </div>
                    <div>
                      <Label>Immigration Issues</Label>
                      {isEditing ? (
                        <Textarea
                          value={editFormData.visaHistory?.immigrationIssues || ''}
                          onChange={(e) => updateEditFormData('immigrationIssues', e.target.value, 'visaHistory')}
                          placeholder="Any immigration-related issues or complications"
                          rows={2}
                        />
                      ) : (
                        <p className="text-sm text-gray-600">{student.visaHistory?.immigrationIssues || 'None'}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 9. Family Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="w-5 h-5 mr-2" />
                      👨‍👩‍👧‍👦 Family Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Father's Name & Occupation</Label>
                      {isEditing ? (
                        <Input
                          value={editFormData.familyDetails?.fatherDetails || ''}
                          onChange={(e) => updateEditFormData('fatherDetails', e.target.value, 'familyDetails')}
                          placeholder="Father's name and occupation"
                        />
                      ) : (
                        <p className="text-sm text-gray-600">{student.familyDetails?.fatherDetails || 'Not specified'}</p>
                      )}
                    </div>
                    <div>
                      <Label>Mother's Name & Occupation</Label>
                      {isEditing ? (
                        <Input
                          value={editFormData.familyDetails?.motherDetails || ''}
                          onChange={(e) => updateEditFormData('motherDetails', e.target.value, 'familyDetails')}
                          placeholder="Mother's name and occupation"
                        />
                      ) : (
                        <p className="text-sm text-gray-600">{student.familyDetails?.motherDetails || 'Not specified'}</p>
                      )}
                    </div>
                    <div>
                      <Label>Annual Family Income</Label>
                      {isEditing ? (
                        <Input
                          value={editFormData.familyDetails?.familyIncome || ''}
                          onChange={(e) => updateEditFormData('familyIncome', e.target.value, 'familyDetails')}
                          placeholder="e.g., $50,000 - $100,000"
                        />
                      ) : (
                        <p className="text-sm text-gray-600">{student.familyDetails?.familyIncome || 'Not specified'}</p>
                      )}
                    </div>
                    <div>
                      <Label>Number of Family Members</Label>
                      {isEditing ? (
                        <Input
                          value={editFormData.familyDetails?.familyMembers || ''}
                          onChange={(e) => updateEditFormData('familyMembers', e.target.value, 'familyDetails')}
                          placeholder="Total family members"
                        />
                      ) : (
                        <p className="text-sm text-gray-600">{student.familyDetails?.familyMembers || 'Not specified'}</p>
                      )}
                    </div>
                    <div>
                      <Label>Relatives Abroad</Label>
                      {isEditing ? (
                        <Textarea
                          value={editFormData.familyDetails?.relativesAbroad || ''}
                          onChange={(e) => updateEditFormData('relativesAbroad', e.target.value, 'familyDetails')}
                          placeholder="Any relatives living abroad (names, countries, relationship)"
                          rows={2}
                        />
                      ) : (
                        <p className="text-sm text-gray-600">{student.familyDetails?.relativesAbroad || 'None'}</p>
                      )}
                    </div>
                    <div>
                      <Label>Education Sponsor</Label>
                      {isEditing ? (
                        <Input
                          value={editFormData.familyDetails?.sponsor || ''}
                          onChange={(e) => updateEditFormData('sponsor', e.target.value, 'familyDetails')}
                          placeholder="Who will sponsor the education"
                        />
                      ) : (
                        <p className="text-sm text-gray-600">{student.familyDetails?.sponsor || 'Parents'}</p>
                      )}
                    </div>
                    <div>
                      <Label>Emergency Contact</Label>
                      {isEditing ? (
                        <Input
                          value={editFormData.familyDetails?.emergencyContact || ''}
                          onChange={(e) => updateEditFormData('emergencyContact', e.target.value, 'familyDetails')}
                          placeholder="Emergency contact name and phone"
                        />
                      ) : (
                        <p className="text-sm text-gray-600">{student.familyDetails?.emergencyContact || 'Not specified'}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 10. Additional Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="w-5 h-5 mr-2" />
                      🔍 Additional Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Career Goals</Label>
                      {isEditing ? (
                        <Textarea
                          value={editFormData.additionalInfo?.careerGoals || ''}
                          onChange={(e) => updateEditFormData('careerGoals', e.target.value, 'additionalInfo')}
                          placeholder="What are your long-term career aspirations?"
                          rows={2}
                        />
                      ) : (
                        <p className="text-sm text-gray-600">{student.additionalInfo?.careerGoals || 'Not specified'}</p>
                      )}
                    </div>
                    <div>
                      <Label>Special Needs or Medical Conditions</Label>
                      {isEditing ? (
                        <Textarea
                          value={editFormData.additionalInfo?.specialNeeds || ''}
                          onChange={(e) => updateEditFormData('specialNeeds', e.target.value, 'additionalInfo')}
                          placeholder="Any special accommodations or medical conditions to consider"
                          rows={2}
                        />
                      ) : (
                        <p className="text-sm text-gray-600">{student.additionalInfo?.specialNeeds || 'None'}</p>
                      )}
                    </div>
                    <div>
                      <Label>Preferred Counseling Language</Label>
                      {isEditing ? (
                        <Select 
                          value={editFormData.additionalInfo?.preferredLanguage || ''} 
                          onValueChange={(value) => updateEditFormData('preferredLanguage', value, 'additionalInfo')}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="english">English</SelectItem>
                            <SelectItem value="hindi">Hindi</SelectItem>
                            <SelectItem value="spanish">Spanish</SelectItem>
                            <SelectItem value="french">French</SelectItem>
                            <SelectItem value="mandarin">Mandarin</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm text-gray-600">{student.additionalInfo?.preferredLanguage || 'English'}</p>
                      )}
                    </div>
                    <div>
                      <Label>How They Found Us</Label>
                      {isEditing ? (
                        <Input
                          value={editFormData.additionalInfo?.referralSource || ''}
                          onChange={(e) => updateEditFormData('referralSource', e.target.value, 'additionalInfo')}
                          placeholder="e.g., Google search, referral, social media"
                        />
                      ) : (
                        <p className="text-sm text-gray-600">{student.additionalInfo?.referralSource || 'Not specified'}</p>
                      )}
                    </div>
                    <div>
                      <Label>Application Urgency</Label>
                      {isEditing ? (
                        <Select 
                          value={editFormData.additionalInfo?.applicationUrgency || ''} 
                          onValueChange={(value) => updateEditFormData('applicationUrgency', value, 'additionalInfo')}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select urgency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low Priority</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">High Priority</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm text-gray-600">{student.additionalInfo?.applicationUrgency || 'Normal'}</p>
                      )}
                    </div>
                    <div>
                      <Label>Important Deadlines</Label>
                      {isEditing ? (
                        <Textarea
                          value={editFormData.additionalInfo?.importantDeadlines || ''}
                          onChange={(e) => updateEditFormData('importantDeadlines', e.target.value, 'additionalInfo')}
                          placeholder="Any specific deadlines or time constraints"
                          rows={2}
                        />
                      ) : (
                        <p className="text-sm text-gray-600">{student.additionalInfo?.importantDeadlines || 'None specified'}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Follow-up Section with 4 Categories */}
          {activeSection === 'followup' && (
            <FollowUpTabs 
              studentId={studentId!} 
              studentName={`${student?.firstName} ${student?.lastName}`} 
            />
          )}

          {/* Legacy Follow-up Section (temporarily disabled) */}
          {false && activeSection === 'followup' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-gray-900">Follow-up Notes</h2>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Note
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Follow-up Note</DialogTitle>
                      <DialogDescription>
                        Add a new follow-up note for this student.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Type</Label>
                        <Select value={followUpType} onValueChange={(value: any) => setFollowUpType(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="meeting">Meeting</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                            <SelectItem value="reminder">Reminder</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Note</Label>
                        <Textarea
                          value={newFollowUp}
                          onChange={(e) => setNewFollowUp(e.target.value)}
                          placeholder="Enter your follow-up note..."
                          rows={4}
                        />
                      </div>
                      <Button 
                        disabled // Follow-up creation disabled
                        // onClick={handleAddFollowUp} // Removed functionality
                        className="w-full"
                      >
                        Add Note
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-4">
                {followUpsLoading ? (
                  <LoadingSkeleton />
                ) : followUps.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-gray-500">
                      No follow-up notes yet. Add your first note to get started.
                    </CardContent>
                  </Card>
                ) : (
                  followUps.map((followUp) => (
                    <Card key={followUp.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <div className="mt-1">
                              {getTypeIcon(followUp.type)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <Badge variant="outline" className="capitalize">
                                  {followUp.type}
                                </Badge>
                                <Badge className={getStatusColor(followUp.status)}>
                                  {followUp.status}
                                </Badge>
                                <span className="text-sm text-gray-500">
                                  {formatDate(followUp.createdAt)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700">{followUp.note}</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled // Follow-up update disabled
                            // onClick removed - functionality no longer available
                          >
                            {followUp.status === 'interested' ? 'Mark Converted' : 'Mark Interested'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Documents Section */}
          {activeSection === 'documents' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-gray-900">Documents</h2>
                <Button>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Document
                </Button>
              </div>

              <Card>
                <CardContent className="p-0">
                  {documentsLoading ? (
                    <div className="p-8">
                      <LoadingSkeleton />
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">
                      No documents uploaded yet.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Document Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Size</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Upload Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {documents.map((doc) => (
                          <TableRow key={doc.id}>
                            <TableCell className="font-medium">{doc.name}</TableCell>
                            <TableCell>{doc.type}</TableCell>
                            <TableCell>{formatFileSize(doc.size)}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(doc.status)}>
                                {doc.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDate(doc.uploadedAt)}</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button size="sm" variant="outline">
                                  <Eye className="w-3 h-3" />
                                </Button>
                                <Button size="sm" variant="outline">
                                  <Download className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Chat Section */}
          {activeSection === 'chat' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900">Chat with Student</h2>
              
              <Card className="h-96 flex flex-col">
                <CardContent className="flex-1 p-4 overflow-y-auto">
                  {messagesLoading ? (
                    <LoadingSkeleton />
                  ) : messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-500">
                      No messages yet. Start a conversation!
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => {
                        const isCounselor = message.senderId === user?.id;
                        return (
                        <div
                          key={message.id}
                          className={`flex ${isCounselor ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              isCounselor
                                ? 'bg-primary text-white'
                                : 'bg-gray-200 text-gray-900'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs opacity-70">
                                {new Date(message.timestamp).toLocaleTimeString()}
                              </span>
                              {isCounselor && (
                                <div className="flex items-center ml-2">
                                  {message.isRead || message.read ? (
                                    <CheckCheck className="w-3 h-3 opacity-70" />
                                  ) : (
                                    <Check className="w-3 h-3 opacity-50" />
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
                
                <div className="border-t p-4">
                  <div className="flex items-center space-x-2">
                    <Input
                      value={newMessage}
                      onChange={handleMessageChange}
                      onPaste={handlePaste}
                      placeholder="Type your message... (max 100 chars, no URLs)"
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      className="flex-1"
                      maxLength={100}
                      data-testid="input-chat-message"
                    />
                    <Button 
                      onClick={handleSendMessage}
                      disabled={sendMessageMutation.isPending || !newMessage.trim() || isRateLimited}
                      data-testid="button-send-message"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}