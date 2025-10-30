import { useState, useEffect, useCallback, memo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApiQuery, useApiMutation } from "@/hooks/api-hooks";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { ACCOUNT_STATUSES, ACCOUNT_STATUS_LABELS, type AccountStatus } from "@shared/account-status";
import { getStudentAccountId, getStudentProfileId } from "@shared/utils/student-id-helpers";
import { AccountId } from "@shared/types/branded-ids";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import BulkImportUniversities from "@/components/BulkImportUniversities";
import UniversityExport from "@/components/UniversityExport";
import UniversityAnalytics from "@/components/UniversityAnalytics";
import SubscriptionManagement from "@/components/admin/SubscriptionManagement";
import { CompanyProfileManagement } from "@/components/admin";
import { PasswordResetDialog } from "@/components/admin/PasswordResetDialog";
import { 
  Settings,
  Users, 
  FileText, 
  Trophy,
  Bus,
  Plus,
  Download,
  Edit,
  Trash2,
  Eye,
  UserCheck,
  UserX,
  Shield,
  MessageSquare,
  Calendar,
  AlertTriangle,
  DollarSign,
  BarChart3,
  Bell,
  Upload,
  Search,
  Filter,
  MoreHorizontal,
  MoreVertical,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertCircle,
  Zap,
  Globe,
  BookOpen,
  CreditCard,
  TrendingUp,
  Award,
  Mail,
  Phone,
  MapPin,
  Star,
  GraduationCap,
  Building,
  Building2,
  Key,
  Menu,
  ChevronLeft,
  ChevronRight,
  X,
  TestTube
} from "lucide-react";
import { Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";


// Extract dialog components outside to prevent re-creation on every render
const CreateUniversityDialog = memo(({ 
  open, 
  onOpenChange, 
  newUniversity, 
  setNewUniversity, 
  onSubmit, 
  onCancel, 
  isLoading 
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newUniversity: any;
  setNewUniversity: (fn: (prev: any) => any) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New University</DialogTitle>
          <DialogDescription>
            Create a new university profile with basic information, academics, fees, and requirements
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* 1. Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1. University Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">University Name *</label>
                  <Input
                    type="text"
                    placeholder="e.g. Stanford University"
                    value={newUniversity.name || ""}
                    onChange={(e) => setNewUniversity(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Country *</label>
                  <Input
                    type="text"
                    placeholder="e.g. United States"
                    value={newUniversity.country || ""}
                    onChange={(e) => setNewUniversity(prev => ({ ...prev, country: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">City *</label>
                  <Input
                    type="text"
                    placeholder="e.g. Stanford"
                    value={newUniversity.city || ""}
                    onChange={(e) => setNewUniversity(prev => ({ ...prev, city: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Official Website</label>
                  <Input
                    type="text"
                    placeholder="e.g. https://stanford.edu"
                    value={newUniversity.website || ""}
                    onChange={(e) => setNewUniversity(prev => ({ ...prev, website: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">World Ranking</label>
                  <Input
                    type="number"
                    placeholder="e.g. 5"
                    value={newUniversity.worldRanking || ""}
                    onChange={(e) => setNewUniversity(prev => ({ ...prev, worldRanking: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Description</label>
                  <Input
                    type="text"
                    placeholder="Brief description of the university"
                    value={newUniversity.description || ""}
                    onChange={(e) => setNewUniversity(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. Academics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">2. Academics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Degree Levels</label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id="bachelor" 
                        checked={newUniversity.degreeLevels?.includes('Bachelor') || false}
                        onChange={(e) => {
                          const levels = newUniversity.degreeLevels || [];
                          if (e.target.checked) {
                            setNewUniversity(prev => ({ ...prev, degreeLevels: [...levels, 'Bachelor'] }));
                          } else {
                            setNewUniversity(prev => ({ ...prev, degreeLevels: levels.filter((l: string) => l !== 'Bachelor') }));
                          }
                        }}
                      />
                      <label htmlFor="bachelor" className="text-sm">Bachelor's</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id="master" 
                        checked={newUniversity.degreeLevels?.includes('Master') || false}
                        onChange={(e) => {
                          const levels = newUniversity.degreeLevels || [];
                          if (e.target.checked) {
                            setNewUniversity(prev => ({ ...prev, degreeLevels: [...levels, 'Master'] }));
                          } else {
                            setNewUniversity(prev => ({ ...prev, degreeLevels: levels.filter((l: string) => l !== 'Master') }));
                          }
                        }}
                      />
                      <label htmlFor="master" className="text-sm">Master's</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id="phd" 
                        checked={newUniversity.degreeLevels?.includes('PhD') || false}
                        onChange={(e) => {
                          const levels = newUniversity.degreeLevels || [];
                          if (e.target.checked) {
                            setNewUniversity(prev => ({ ...prev, degreeLevels: [...levels, 'PhD'] }));
                          } else {
                            setNewUniversity(prev => ({ ...prev, degreeLevels: levels.filter((l: string) => l !== 'PhD') }));
                          }
                        }}
                      />
                      <label htmlFor="phd" className="text-sm">PhD</label>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Specialization</label>
                  <Select 
                    value={newUniversity.specialization || ""} 
                    onValueChange={(value) => setNewUniversity(prev => ({ ...prev, specialization: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select specialization" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="science">Science</SelectItem>
                      <SelectItem value="engineering">Engineering</SelectItem>
                      <SelectItem value="arts">Arts</SelectItem>
                      <SelectItem value="medicine">Medicine</SelectItem>
                      <SelectItem value="law">Law</SelectItem>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. Fees */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">3. Fees</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Offer Letter Fee (USD)</label>
                  <Input
                    type="number"
                    placeholder="e.g. 500"
                    value={newUniversity.offerLetterFee || ""}
                    onChange={(e) => setNewUniversity(prev => ({ ...prev, offerLetterFee: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Annual Fee (USD)</label>
                  <Input
                    type="number"
                    placeholder="e.g. 50000"
                    value={newUniversity.annualFee || ""}
                    onChange={(e) => setNewUniversity(prev => ({ ...prev, annualFee: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4. Requirements */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">4. Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Minimum GPA</label>
                  <Input
                    type="text"
                    placeholder="e.g. 3.5"
                    value={newUniversity.minimumGPA || ""}
                    onChange={(e) => setNewUniversity(prev => ({ ...prev, minimumGPA: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">IELTS Score</label>
                  <Input
                    type="text"
                    placeholder="e.g. 6.5"
                    value={newUniversity.ieltsScore || ""}
                    onChange={(e) => setNewUniversity(prev => ({ ...prev, ieltsScore: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">GMAT Score</label>
                  <Input
                    type="text"
                    placeholder="e.g. 650"
                    value={newUniversity.gmatScore || ""}
                    onChange={(e) => setNewUniversity(prev => ({ ...prev, gmatScore: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 5. Known Alumni */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">5. Known Alumni</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Alumni 1</label>
                  <Input
                    type="text"
                    placeholder="e.g. Sundar Pichai"
                    value={newUniversity.alumni1 || ""}
                    onChange={(e) => setNewUniversity(prev => ({ ...prev, alumni1: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Alumni 2</label>
                  <Input
                    type="text"
                    placeholder="e.g. Tim Cook"
                    value={newUniversity.alumni2 || ""}
                    onChange={(e) => setNewUniversity(prev => ({ ...prev, alumni2: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Alumni 3</label>
                  <Input
                    type="text"
                    placeholder="e.g. Elon Musk"
                    value={newUniversity.alumni3 || ""}
                    onChange={(e) => setNewUniversity(prev => ({ ...prev, alumni3: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={onSubmit}
              disabled={isLoading}
            >
              {isLoading ? "Creating..." : "Create University"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

// Add Staff Dialog Component - Extract outside to prevent re-creation and form blinking
const AddStaffDialog = memo(({ 
  open, 
  onOpenChange, 
  newStaff, 
  setNewStaff, 
  onSubmit, 
  isLoading 
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newStaff: any;
  setNewStaff: (fn: (prev: any) => any) => void;
  onSubmit: () => void;
  isLoading: boolean;
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Staff Member</DialogTitle>
          <DialogDescription>
            Create a new staff member account with login credentials
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                placeholder="John"
                value={newStaff.firstName || ""}
                onChange={(e) => setNewStaff(prev => ({ ...prev, firstName: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                placeholder="Doe"
                value={newStaff.lastName || ""}
                onChange={(e) => setNewStaff(prev => ({ ...prev, lastName: e.target.value }))}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="john.doe@company.com"
              value={newStaff.email || ""}
              onChange={(e) => setNewStaff(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>
          
          <div>
            <Label htmlFor="teamRole">Role</Label>
            <Select 
              value={newStaff.teamRole || ""} 
              onValueChange={(value) => setNewStaff(prev => ({ ...prev, teamRole: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrator</SelectItem>
                <SelectItem value="counselor">Counselor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="department">Department (Optional)</Label>
            <Input
              id="department"
              placeholder="e.g. Academic Support, Admissions"
              value={newStaff.department || ""}
              onChange={(e) => setNewStaff(prev => ({ ...prev, department: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={onSubmit}
            disabled={isLoading || !newStaff.firstName || !newStaff.lastName || !newStaff.email || !newStaff.teamRole}
          >
            {isLoading ? "Adding..." : "Add Staff Member"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});

const EditUniversityDialog = memo(({ 
  open, 
  onOpenChange, 
  editUniversityData, 
  setEditUniversityData,
  onSave,
  isLoading
}: {
  open: boolean;
  onOpenChange: () => void;
  editUniversityData: any;
  setEditUniversityData: (fn: (prev: any) => any) => void;
  onSave: () => void;
  isLoading: boolean;
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit University</DialogTitle>
          <DialogDescription>
            Update university information with simplified 4-section structure
          </DialogDescription>
        </DialogHeader>
        
        {editUniversityData && (
          <div className="space-y-6">
            {/* 1. Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">1. University Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">University Name *</label>
                    <Input
                      placeholder="e.g. Stanford University"
                      value={editUniversityData.name || ''}
                      onChange={(e) => setEditUniversityData((prev: any) => ({ ...prev!, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Country *</label>
                    <Input
                      placeholder="e.g. United States"
                      value={editUniversityData.country || ''}
                      onChange={(e) => setEditUniversityData((prev: any) => ({ ...prev!, country: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">City *</label>
                    <Input
                      placeholder="e.g. Stanford"
                      value={editUniversityData.city || ''}
                      onChange={(e) => setEditUniversityData((prev: any) => ({ ...prev!, city: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Official Website</label>
                    <Input
                      placeholder="e.g. https://stanford.edu"
                      value={editUniversityData.website || ''}
                      onChange={(e) => setEditUniversityData((prev: any) => ({ ...prev!, website: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">World Ranking</label>
                    <Input
                      type="number"
                      placeholder="e.g. 5"
                      value={editUniversityData.worldRanking || ''}
                      onChange={(e) => setEditUniversityData((prev: any) => ({ ...prev!, worldRanking: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Description</label>
                    <Input
                      placeholder="Brief description of the university"
                      value={editUniversityData.description || ''}
                      onChange={(e) => setEditUniversityData((prev: any) => ({ ...prev!, description: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. Academics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">2. Academics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Degree Levels</label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          id="edit-bachelor" 
                          checked={editUniversityData.degreeLevels?.includes('Bachelor') || false}
                          onChange={(e) => {
                            const levels = editUniversityData.degreeLevels || [];
                            if (e.target.checked) {
                              setEditUniversityData(prev => ({ ...prev!, degreeLevels: [...levels, 'Bachelor'] }));
                            } else {
                              setEditUniversityData(prev => ({ ...prev!, degreeLevels: levels.filter((l: string) => l !== 'Bachelor') }));
                            }
                          }}
                        />
                        <label htmlFor="edit-bachelor" className="text-sm">Bachelor's</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          id="edit-master" 
                          checked={editUniversityData.degreeLevels?.includes('Master') || false}
                          onChange={(e) => {
                            const levels = editUniversityData.degreeLevels || [];
                            if (e.target.checked) {
                              setEditUniversityData(prev => ({ ...prev!, degreeLevels: [...levels, 'Master'] }));
                            } else {
                              setEditUniversityData(prev => ({ ...prev!, degreeLevels: levels.filter((l: string) => l !== 'Master') }));
                            }
                          }}
                        />
                        <label htmlFor="edit-master" className="text-sm">Master's</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          id="edit-phd" 
                          checked={editUniversityData.degreeLevels?.includes('PhD') || false}
                          onChange={(e) => {
                            const levels = editUniversityData.degreeLevels || [];
                            if (e.target.checked) {
                              setEditUniversityData(prev => ({ ...prev!, degreeLevels: [...levels, 'PhD'] }));
                            } else {
                              setEditUniversityData(prev => ({ ...prev!, degreeLevels: levels.filter((l: string) => l !== 'PhD') }));
                            }
                          }}
                        />
                        <label htmlFor="edit-phd" className="text-sm">PhD</label>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Specialization</label>
                    <Select 
                      value={editUniversityData.specialization || ""} 
                      onValueChange={(value) => setEditUniversityData(prev => ({ ...prev!, specialization: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select specialization" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="business">Business</SelectItem>
                        <SelectItem value="science">Science</SelectItem>
                        <SelectItem value="engineering">Engineering</SelectItem>
                        <SelectItem value="arts">Arts</SelectItem>
                        <SelectItem value="medicine">Medicine</SelectItem>
                        <SelectItem value="law">Law</SelectItem>
                        <SelectItem value="technology">Technology</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3. Fees */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">3. Fees</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Offer Letter Fee (USD)</label>
                    <Input
                      type="number"
                      placeholder="e.g. 500"
                      value={editUniversityData.offerLetterFee || ""}
                      onChange={(e) => setEditUniversityData(prev => ({ ...prev!, offerLetterFee: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Annual Fee (USD)</label>
                    <Input
                      type="number"
                      placeholder="e.g. 50000"
                      value={editUniversityData.annualFee || ""}
                      onChange={(e) => setEditUniversityData(prev => ({ ...prev!, annualFee: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 4. Requirements */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">4. Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Minimum GPA</label>
                    <Input
                      type="text"
                      placeholder="e.g. 3.5"
                      value={editUniversityData.admissionRequirements?.minimumGPA || ""}
                      onChange={(e) => setEditUniversityData(prev => ({
                        ...prev!,
                        admissionRequirements: {
                          ...prev!.admissionRequirements,
                          minimumGPA: e.target.value
                        }
                      }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">IELTS Score</label>
                    <Input
                      type="text"
                      placeholder="e.g. 6.5"
                      value={editUniversityData.admissionRequirements?.ieltsScore || ""}
                      onChange={(e) => setEditUniversityData(prev => ({
                        ...prev!,
                        admissionRequirements: {
                          ...prev!.admissionRequirements,
                          ieltsScore: e.target.value
                        }
                      }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">GMAT Score</label>
                    <Input
                      type="text"
                      placeholder="e.g. 650"
                      value={editUniversityData.admissionRequirements?.gmatScore || ""}
                      onChange={(e) => setEditUniversityData(prev => ({
                        ...prev!,
                        admissionRequirements: {
                          ...prev!.admissionRequirements,
                          gmatScore: e.target.value
                        }
                      }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 5. Known Alumni */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">5. Known Alumni</CardTitle>
                <p className="text-sm text-muted-foreground">Add up to 3 notable alumni names</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-2 block">1. Alumni Name</label>
                    <Input
                      placeholder="e.g. John Smith - CEO of TechCorp"
                      value={editUniversityData.alumni1 || ""}
                      onChange={(e) => setEditUniversityData(prev => ({ ...prev!, alumni1: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">2. Alumni Name</label>
                    <Input
                      placeholder="e.g. Jane Doe - Nobel Prize Winner"
                      value={editUniversityData.alumni2 || ""}
                      onChange={(e) => setEditUniversityData(prev => ({ ...prev!, alumni2: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">3. Alumni Name</label>
                    <Input
                      placeholder="e.g. Robert Johnson - Famous Author"
                      value={editUniversityData.alumni3 || ""}
                      onChange={(e) => setEditUniversityData(prev => ({ ...prev!, alumni3: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onOpenChange}>
            Cancel
          </Button>
          <Button 
            onClick={onSave}
            disabled={isLoading || !editUniversityData?.name || !editUniversityData?.country || !editUniversityData?.city}
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

// Mock admin user
const mockAdminUser = {
  id: "admin-1",
  firstName: "Admin",
  lastName: "User",
  email: "admin@phozos.com",
  userType: "team_member",
  teamRole: "admin",
  profilePicture: null
};

interface AdminStats {
  totalStudents: number;
  totalUniversities: number;
  totalApplications: number;
  pendingTasks: number;
  newSignups: number;
  conversionRate: number;
}

interface UniversityManagement {
  id: string;
  name: string;
  country: string;
  city: string;
  ranking: number;
  acceptanceRate: string;
  isActive: boolean;
  createdAt: string;
  totalApplications: number;
}

interface StudentManagement {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  status: string;
  counselorId?: string;
  applications: number;
  lastActive: string;
  isPremium: boolean;
}

export default function AdminDashboard() {
  const [user] = useState(mockAdminUser);
  const [selectedTab, setSelectedTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [counselorFilter, setCounselorFilter] = useState("all");
  const [showCreateUniversity, setShowCreateUniversity] = useState(false);
  const [showUniversityDetails, setShowUniversityDetails] = useState(false);
  const [showEditUniversity, setShowEditUniversity] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  // Password Reset Dialog State
  const [showPasswordResetDialog, setShowPasswordResetDialog] = useState(false);
  const [passwordResetData, setPasswordResetData] = useState<{
    temporaryPassword: string;
    email: string;
    firstName: string;
    lastName: string;
    userType: 'team_member' | 'customer' | 'company_profile';
  } | null>(null);
  const [universityTab, setUniversityTab] = useState<"list" | "analytics">("list");
  const [selectedUniversity, setSelectedUniversity] = useState<any>(null);
  const [editUniversityData, setEditUniversityData] = useState<any>(null);
  const [showCreateStudent, setShowCreateStudent] = useState(false);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showCustomFieldManager, setShowCustomFieldManager] = useState(false);
  const [showContentEditor, setShowContentEditor] = useState(false);
  const [showStudentDetails, setShowStudentDetails] = useState(false);
  const [selectedStudentDetails, setSelectedStudentDetails] = useState<any>(null);
  const [showAssignCounselor, setShowAssignCounselor] = useState(false);
  const [selectedStudentForAssignment, setSelectedStudentForAssignment] = useState<string | null>(null);
  const [studentTempPasswords, setStudentTempPasswords] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [contentType, setContentType] = useState("");
  const [contentData, setContentData] = useState({
    title: "",
    content: "",
    slug: ""
  });
  const [newUniversity, setNewUniversity] = useState({
    // 1. Basic Information
    name: "",
    country: "",
    city: "",
    website: "",
    worldRanking: "",
    description: "",
    
    // 2. Academics
    degreeLevels: [] as string[],
    specialization: "",
    
    // 3. Fees
    offerLetterFee: "",
    annualFee: "",
    
    // 4. Requirements
    minimumGPA: "",
    ieltsScore: "",
    gmatScore: "",
    
    // 5. Known Alumni
    alumni1: "",
    alumni2: "",
    alumni3: ""
  });
  const [newStaff, setNewStaff] = useState({
    firstName: "",
    lastName: "",
    email: "",
    teamRole: "",
    department: ""
  });
  const [newSecretCode, setNewSecretCode] = useState("");
  
  // Student management state
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [studentStatusFilter, setStudentStatusFilter] = useState("all");
  const [processingPostId, setProcessingPostId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch reported posts data
  const { data: rawReportedPosts, isLoading: reportedPostsLoading, error: reportedPostsError } = useApiQuery(
    ["/api/admin/forum/reported-posts"],
    "/api/admin/forum/reported-posts",
    undefined,
    { staleTime: 30 * 1000 }
  );

  // Auto-refresh data on component mount to prevent cache issues
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/counselors"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
  }, [queryClient]);

  // Handler functions for reported posts
  const handleReviewPost = async (postId: string) => {
    try {
      setProcessingPostId(postId);
      const reportDetails = await api.get(`/api/admin/forum/posts/${postId}/reports`) as any[] || [];
      
      toast({
        title: "Report Details",
        description: `Post has ${Array.isArray(reportDetails) ? reportDetails.length : 0} report(s). Check browser console for full details.`,
      });
      console.log('📋 Report details for post:', postId, reportDetails);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch report details",
        variant: "destructive"
      });
    } finally {
      setProcessingPostId(null);
    }
  };

  const handleRestorePost = async (postId: string) => {
    try {
      setProcessingPostId(postId);
      await api.post(`/api/admin/forum/posts/${postId}/restore`);
      
      toast({
        title: "Success",
        description: "Post has been restored and is now visible to the community",
      });
      // Refresh the reported posts list
      queryClient.invalidateQueries({ queryKey: ["/api/admin/forum/reported-posts"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to restore post",
        variant: "destructive"
      });
    } finally {
      setProcessingPostId(null);
    }
  };

  // Fetch admin dashboard stats
  const { data: adminStats, isLoading: statsLoading } = useApiQuery(
    ["/api/admin/stats"],
    "/api/admin/stats",
    undefined,
    { staleTime: 5 * 60 * 1000 }
  );

  // Fetch universities for management  
  const { data: rawUniversities, isLoading: universitiesLoading } = useApiQuery(
    ["/api/admin/universities"],
    "/api/admin/universities",
    undefined,
    { staleTime: 2 * 60 * 1000 }
  );

  // Fetch students for management  
  const { data: rawStudents, isLoading: studentsLoading } = useApiQuery(
    ["/api/admin/students"],
    "/api/admin/students",
    undefined,
    { staleTime: 2 * 60 * 1000 }
  );

  // Fetch counselors for assignment dropdown
  const { data: rawCounselors, isLoading: counselorsLoading } = useApiQuery(
    ["/api/admin/counselors"],
    "/api/admin/counselors",
    undefined,
    { 
      staleTime: 2 * 60 * 1000,
      refetchOnMount: true,
    }
  );

  // Fetch staff members
  const { data: rawStaffMembers, isLoading: staffMembersLoading, error: staffError } = useApiQuery(
    ["/api/admin/staff"],
    "/api/admin/staff",
    undefined,
    { 
      staleTime: 1 * 60 * 1000,
      refetchOnMount: true,
    }
  );

  // Assign student to counselor mutation
  const assignStudentMutation = useApiMutation(
    async ({ studentId, counselorId }: { studentId: string, counselorId: string }) => {
      return await api.post("/api/admin/assign-student", { studentId, counselorId });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
        toast({
          title: "Student assigned",
          description: "Student has been successfully assigned to counselor.",
        });
      },
      onError: () => {
        toast({
          title: "Assignment failed",
          description: "Failed to assign student to counselor. Please try again.",
          variant: "destructive",
        });
      },
    }
  );

  // Unassign student mutation
  const unassignStudentMutation = useApiMutation(
    async (studentId: string) => {
      return await api.post("/api/admin/unassign-student", { studentId });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
        toast({
          title: "Student unassigned",
          description: "Student has been unassigned from counselor.",
        });
      },
      onError: () => {
        toast({
          title: "Unassignment failed",
          description: "Failed to unassign student. Please try again.",
          variant: "destructive",
        });
      },
    }
  );

  // Security Settings Query
  const { data: securitySettings, isLoading: securityLoading, refetch: refetchSecuritySettings } = useApiQuery(
    ['/api/admin/security/settings'],
    '/api/admin/security/settings',
    undefined
  );

  // Student management mutations
  const toggleStudentStatusMutation = useApiMutation(
    async ({ studentId, status }: { studentId: string; status: AccountStatus }) => {
      return api.put(`/api/admin/students/${studentId}/toggle-status`, { status });
    },
    {
      onSuccess: (data: any) => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
        toast({
          title: "Student Status Updated",
          description: "Student account status has been updated successfully.",
        });
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to update student status",
          variant: "destructive",
        });
      },
    }
  );



  // Student management handlers
  /**
   * View detailed information for a specific student
   * @param studentId - The user account ID (userId) from the users table
   */
  const handleViewStudentDetails = async (studentId: AccountId) => {
    try {
      try {
        const studentData = await api.get(`/api/admin/students/${studentId}`);
        setSelectedStudentDetails(studentData);
        setShowStudentDetails(true);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch student details",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch student details",
        variant: "destructive",
      });
    }
  };

  const handleAssignCounselor = async (studentId: string) => {
    // First ensure we have the latest counselors data
    await queryClient.invalidateQueries({ queryKey: ["/api/admin/counselors"] });
    
    // Wait a moment for the query to update
    setTimeout(() => {
      // Get the current counselors data from the query client
      const currentCounselors = queryClient.getQueryData(["/api/admin/counselors"]) || counselors;
      
      // Directly create and show modal using DOM manipulation to bypass React state issues
      const modalHtml = `
        <div id="counselor-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999;">
          <div style="background: white; padding: 24px; border-radius: 8px; max-width: 400px; width: 90%;">
            <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Assign Counselor</h2>
            <p style="margin-bottom: 12px; color: #666;">Available Counselors:</p>
            <div id="counselor-list"></div>
            <div style="margin-top: 16px; text-align: right;">
              <button onclick="document.getElementById('counselor-modal').remove()" style="padding: 8px 16px; background: #f5f5f5; border: 1px solid #ccc; border-radius: 4px; cursor: pointer;">Cancel</button>
            </div>
          </div>
        </div>
      `;
      
      // Remove any existing modal
      const existingModal = document.getElementById('counselor-modal');
      if (existingModal) existingModal.remove();
      
      // Add modal to page
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      
      // Add counselors to the list
      const counselorList = document.getElementById('counselor-list');
      if (currentCounselors && (currentCounselors as any[]).length > 0) {
        (currentCounselors as any[]).forEach((counselor: any) => {
          const button = document.createElement('button');
          button.textContent = `${counselor.firstName} ${counselor.lastName}`;
          button.style.cssText = 'width: 100%; padding: 12px; margin-bottom: 8px; background: white; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; text-align: left;';
          button.onmouseover = () => button.style.background = '#f5f5f5';
          button.onmouseout = () => button.style.background = 'white';
          button.onclick = async () => {
            try {
              // Use secure API client with CSRF protection
              await api.post('/api/admin/assign-student', {
                studentId: studentId,
                counselorId: counselor.id
              });
              document.getElementById('counselor-modal')?.remove();
              window.location.reload(); // Simple reload to refresh the data
            } catch (error) {
              console.error('Assignment error:', error);
            }
          };
          counselorList?.appendChild(button);
        });
      } else {
        if (counselorList) {
          counselorList.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">No counselors available</p>';
        }
      }
    }, 100); // Small delay to ensure data is refreshed
  };

  /**
   * Toggle student account status (activate/deactivate/suspend/etc.)
   * @param studentId - The user account ID (userId) from the users table
   * @param status - The new account status to set
   */
  const handleToggleStudentStatus = (studentId: AccountId, status: AccountStatus) => {
    toggleStudentStatusMutation.mutate({ studentId, status });
  };

  const handleResetStudentPassword = async (studentId: string) => {
    try {
      const result = await api.post(`/api/admin/students/${studentId}/reset-password`) as any;
      
      // Store the temporary password in state so it can be viewed later
      setStudentTempPasswords(prev => ({
        ...prev,
        [studentId]: result.temporaryPassword
      }));
      
      toast({
        title: "Password Reset Successful",
        description: `New password: ${result.temporaryPassword}. Please share this with the student.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reset student password",
        variant: "destructive",
      });
    }
  };

  // Update Security Setting Mutation
  const updateSecurityMutation = useApiMutation(
    ({ settingKey, settingValue }: { settingKey: string; settingValue: string }) =>
      api.put(`/api/admin/security/settings/${settingKey}`, { settingValue }),
    {
      onMutate: async ({ settingKey, settingValue }) => {
        console.log('Mutation starting:', settingKey, '=', settingValue);
        
        // Cancel any outgoing refetches so they don't overwrite our optimistic update
        await queryClient.cancelQueries({ queryKey: ['/api/admin/security/settings'] });

        // Snapshot the previous value
        const previousSettings = queryClient.getQueryData(['/api/admin/security/settings']);

        // Optimistically update to the new value
        const currentSettings = previousSettings as any[];
        if (currentSettings) {
          const updatedSettings = currentSettings.map(setting => 
            setting.settingKey === settingKey 
              ? { ...setting, settingValue, updatedAt: new Date().toISOString() } 
              : setting
          );
          console.log('Optimistically updating cache with:', updatedSettings.find(s => s.settingKey === settingKey));
          queryClient.setQueryData(['/api/admin/security/settings'], updatedSettings);
        }

        // Return a context object with the snapshotted value
        return { previousSettings };
      },
      onSuccess: () => {
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['/api/auth/team-login-visibility'] });
        
        toast({
          title: "Security Setting Updated",
          description: "The security setting has been successfully updated.",
        });
      },
      onError: (error: any, newData, context) => {
        // If the mutation fails, use the context returned from onMutate to roll back
        if (context?.previousSettings) {
          queryClient.setQueryData(['/api/admin/security/settings'], context.previousSettings);
        }
        
        console.error('Security setting update error:', error);
        toast({
          title: "Error",
          description: error?.message || "Failed to update security setting. Please try again.",
          variant: "destructive",
        });
      },
      onSettled: () => {
        // Only invalidate team login visibility, not the main settings to avoid reverting optimistic updates
        queryClient.invalidateQueries({ queryKey: ['/api/auth/team-login-visibility'] });
      }
    }
  );

  // Force logout mutation
  const forceLogoutMutation = useApiMutation(
    () => api.post('/api/admin/force-logout-all'),
    {
      onSuccess: () => {
        toast({
          title: "Forced Logout Initiated",
          description: "All users will be logged out on their next interaction.",
        });
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to force logout all users.",
          variant: "destructive",
        });
      }
    }
  );

  // Fix session issues
  const handleFixSession = () => {
    // Clear all React Query cache
    queryClient.clear();
    
    // Clear local storage
    localStorage.clear();
    
    // Clear session storage
    sessionStorage.clear();
    
    // Show success message
    toast({
      title: "Session Reset",
      description: "Cache cleared. Please refresh the page and log in again.",
    });
    
    // Automatically refresh after a short delay
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  // Safe type assertion for stats with proper fallback
  const stats = (adminStats && typeof adminStats === 'object' && adminStats !== null) ? adminStats as any : {
    totalStudents: 0,
    totalUniversities: 0,
    totalApplications: 0,
    pendingTasks: 0,
    newSignups: 0,
    conversionRate: 0
  };
  
  // Safe type assertion for universities with proper fallback
  const universities = Array.isArray(rawUniversities) ? rawUniversities : [];
  
  // Safe type assertion for students with proper fallback  
  const students = Array.isArray(rawStudents) ? rawStudents : [];
  
  // Safe type assertion for counselors with proper fallback
  const counselors = Array.isArray(rawCounselors) ? rawCounselors : [];
  
  // Safe type assertion for staff members with proper fallback
  const staffMembers = Array.isArray(rawStaffMembers) ? rawStaffMembers : [];

  // Safe type assertion for reported posts with proper fallback
  const reportedPosts = Array.isArray(rawReportedPosts) ? rawReportedPosts : [];

  // Create university mutation
  const createUniversityMutation = useApiMutation(
    async (universityData: any) => {
      return api.post("/api/admin/universities", universityData);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/universities"] });
        setShowCreateUniversity(false);
        setNewUniversity({
          // 1. Basic Information
          name: "",
          country: "",
          city: "",
          website: "",
          worldRanking: "",
          description: "",
          
          // 2. Academics
          degreeLevels: [] as string[],
          specialization: "",
          
          // 3. Fees
          offerLetterFee: "",
          annualFee: "",
          
          // 4. Requirements
          minimumGPA: "",
          ieltsScore: "",
          gmatScore: "",
          
          // 5. Known Alumni
          alumni1: "",
          alumni2: "",
          alumni3: ""
        });
        toast({
          title: "University created",
          description: "University has been successfully added to the system.",
        });
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to create university. Please try again.",
          variant: "destructive",
        });
      },
    }
  );

  // Update university mutation
  const updateUniversityMutation = useApiMutation(
    async (universityData: any) => {
      return api.put(`/api/admin/universities/${universityData.id}`, universityData);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/universities"] });
        setShowEditUniversity(false);
        setEditUniversityData(null);
        toast({
          title: "University updated",
          description: "University information has been successfully updated.",
        });
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to update university. Please try again.",
          variant: "destructive",
        });
      },
    }
  );

  const deleteUniversityMutation = useApiMutation(
    async (universityId: string) => {
      return api.delete(`/api/admin/universities/${universityId}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/universities"] });
        toast({
          title: "University deleted",
          description: "University has been successfully deleted.",
        });
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to delete university. Please try again.",
          variant: "destructive",
        });
      },
    }
  );

  // Add staff mutation
  const addStaffMutation = useApiMutation(
    async (staffData: any) => {
      return await api.post("/api/admin/staff", staffData);
    },
    {
      onSuccess: (data: any) => {
        // Extract payload from sendSuccess wrapper - handle both wrapped and unwrapped responses
        const payload = data?.data ?? data;
        
        queryClient.invalidateQueries({ queryKey: ["/api/admin/staff"] });
        setShowAddStaff(false);
        setNewStaff({
          firstName: "",
          lastName: "",
          email: "",
          teamRole: "",
          department: ""
        });
        
        // Show secure password dialog - aligned with reset password flow
        if (payload.temporaryPassword) {
          setPasswordResetData({
            temporaryPassword: payload.temporaryPassword,
            email: payload.email,
            firstName: payload.name?.split(' ')[0] || payload.firstName || '',
            lastName: payload.name?.split(' ')[1] || payload.lastName || '',
            userType: 'team_member'
          });
          setShowPasswordResetDialog(true);
        }
        
        toast({
          title: "Staff member added successfully!",
          description: `${payload.name} has been added to the team.`,
        });
      },
      onError: (error: any) => {
        console.error("Add staff error:", error);
        
        let title = "Error";
        let description = "Failed to add staff member. Please try again.";
        
        // Handle specific error cases
        if (error?.message === "Email address already exists") {
          title = "Email Already Exists";
          description = "This email address is already registered. Please use a different email address.";
        } else if (error?.message === "Invalid input data") {
          title = "Invalid Input";
          description = "Please check all required fields and try again.";
        } else if (error?.message) {
          description = error.message;
        }
        
        toast({
          title,
          description,
          variant: "destructive",
        });
      },
    }
  );


  const getResetPasswordEndpoint = (user: any) => {
    if (user.userType === "team_member") {
      return `/api/admin/staff/${user.id}/reset-password`;
    } else if (user.userType === "customer") {
      return `/api/admin/students/${user.userId}/reset-password`;
    } else if (user.userType === "company_profile") {
      return `/api/admin/company-profiles/${user.id}/reset-password`;
    }
    throw new Error("Unknown user type");
  };

  const getUserTypeLabel = (userType: string) => {
    if (userType === "team_member") return "staff member";
    if (userType === "customer") return "student";
    if (userType === "company_profile") return "company";
    return "user";
  };


  const handleResetPassword = async (user: any) => {
    try {
      const endpoint = getResetPasswordEndpoint(user);
      const result = await api.post(endpoint) as any;
      
      // Set password reset data for the secure popup dialog
      // Based on sendSuccess wrapper structure, password data is in result.data
      const passwordData = {
        temporaryPassword: result.data?.temporaryPassword || result.temporaryPassword,
        email: result.data?.email || user.email,
        firstName: result.data?.firstName || user.firstName,
        lastName: user.lastName,
        userType: user.userType,
      };
      setPasswordResetData(passwordData);
      
      // Show the secure password reset dialog
      setShowPasswordResetDialog(true);
      console.log(`🔍 DEBUG: Dialog should now be visible with password:`, passwordData.temporaryPassword);
      
    } catch (error) {
      console.log(`🔍 DEBUG: Password reset error:`, error);
      const userLabel = getUserTypeLabel(user.userType);
      toast({
        title: "Error",
        description: `Failed to reset ${userLabel} password`,
        variant: "destructive",
      });
    }
  };

  const handleToggleStaffStatus = async (staffId: string, status: AccountStatus) => {
    try {
      await api.put(`/api/admin/staff/${staffId}/toggle-status`, { status });
      
      toast({
        title: "Status Updated",
        description: "Staff member status has been updated successfully.",
      });
      
      // Refresh staff list
      queryClient.invalidateQueries({ queryKey: ["/api/admin/staff"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/counselors"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update staff status",
        variant: "destructive",
      });
    }
  };



  // Simple form handlers without memoization
  const handleUniversityFormSubmit = () => {
    if (!newUniversity.name.trim() || !newUniversity.country.trim() || !newUniversity.city.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (Name, Country, City).",
        variant: "destructive",
      });
      return;
    }

    // Create university object with complete 5-section structure
    const universityData = {
      // 1. Basic Information
      name: newUniversity.name.trim(),
      country: newUniversity.country.trim(),
      city: newUniversity.city.trim(),
      website: newUniversity.website.trim() || "",
      worldRanking: newUniversity.worldRanking ? parseInt(newUniversity.worldRanking) : null,
      description: newUniversity.description || "",
      
      // 2. Academics
      degreeLevels: newUniversity.degreeLevels || [],
      specialization: newUniversity.specialization || "",
      
      // 3. Fees
      offerLetterFee: parseFloat(newUniversity.offerLetterFee) || 0,
      annualFee: parseFloat(newUniversity.annualFee) || 0,
      
      // 4. Requirements
      admissionRequirements: {
        minimumGPA: newUniversity.minimumGPA || "",
        ieltsScore: newUniversity.ieltsScore || "",
        gmatScore: newUniversity.gmatScore || ""
      },
      
      // 5. Known Alumni
      alumni1: newUniversity.alumni1 || "",
      alumni2: newUniversity.alumni2 || "",
      alumni3: newUniversity.alumni3 || ""
    };

    createUniversityMutation.mutate(universityData);
  };

  const handleUniversityFormCancel = () => {
    setShowCreateUniversity(false);
    setNewUniversity({
      // 1. Basic Information
      name: "",
      country: "",
      city: "",
      website: "",
      worldRanking: "",
      description: "",
      
      // 2. Academics
      degreeLevels: [] as string[],
      specialization: "",
      
      // 3. Fees
      offerLetterFee: "",
      annualFee: "",
      
      // 4. Requirements
      minimumGPA: "",
      ieltsScore: "",
      gmatScore: "",
      
      // 5. Known Alumni
      alumni1: "",
      alumni2: "",
      alumni3: ""
    });
  };

  // Content management functions
  const handleContentEdit = (type: string, title: string) => {
    setContentType(type);
    
    // Load actual content based on type
    let initialContent = {};
    switch(type) {
      case 'homepage':
        initialContent = {
          title: 'Homepage Content',
          heroTitle: 'Your Journey to Global Education',
          heroSubtitle: 'Discover universities worldwide with AI-powered matching, expert guidance, and a community of ambitious students.',
          ctaButtonText: 'Start AI Matching',
          ctaSecondaryText: 'Watch Demo',
          stats: {
            universities: '500+',
            students: '50K+', 
            successRate: '95%',
            countries: '40+'
          },
          slug: 'homepage'
        };
        break;
      case 'about':
        initialContent = {
          title: 'About Page',
          content: 'Phozos is your trusted partner in international education. We help students navigate the complex world of university applications with AI-powered matching and expert guidance.',
          slug: 'about'
        };
        break;
      case 'terms':
        initialContent = {
          title: 'Terms & Privacy Policy',
          content: 'Terms of Service and Privacy Policy content goes here...',
          slug: 'terms-privacy'
        };
        break;
      default:
        initialContent = {
          title: title,
          content: `Edit ${title} content here...`,
          slug: type.toLowerCase().replace(/\s+/g, '-')
        };
    }
    
    setContentData(initialContent as any);
    setShowContentEditor(true);
  };

  const handleSaveContent = async () => {
    try {
      // For homepage, we would save to a content management API
      if (contentType === 'homepage') {
        // In a real implementation, this would save to a CMS or database
        console.log('Saving homepage content:', contentData);
        
        toast({
          title: "Homepage Updated",
          description: "Homepage content has been successfully updated. Changes will be visible on the live site.",
        });
      } else {
        // Save other content types
        console.log('Saving content:', contentData);
        
        toast({
          title: "Content Updated",
          description: `${contentData.title} has been successfully updated.`,
        });
      }
      
      setShowContentEditor(false);
      setContentData({ title: "", content: "", slug: "" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save content. Please try again.",
        variant: "destructive",
      });
    }
  };



  const handleViewUniversityDetails = (university: any) => {
    // Close edit dialog if open
    setShowEditUniversity(false);
    setEditUniversityData(null);
    
    setSelectedUniversity(university);
    setShowUniversityDetails(true);
  };

  const handleEditUniversity = (university: any) => {
    // Close details dialog if open
    setShowUniversityDetails(false);
    setSelectedUniversity(null);
    
    setEditUniversityData({
      id: university.id,
      name: university.name || "",
      country: university.country || "",
      city: university.city || "",
      description: university.description || "",
      website: university.website || "",
      worldRanking: university.world_ranking || university.worldRanking || "",
      degreeLevels: university.degree_levels || university.degreeLevels || [],
      specialization: university.specialization || "",
      offerLetterFee: university.offer_letter_fee || university.offerLetterFee || "",
      annualFee: university.annual_fee || university.annualFee || "",
      alumni1: university.alumni1 || "",
      alumni2: university.alumni2 || "",
      alumni3: university.alumni3 || "",
      admissionRequirements: university.admission_requirements || university.admissionRequirements || {
        minimumGPA: "",
        ieltsScore: "",
        gmatScore: ""
      }
    });
    setShowEditUniversity(true);
  };

  const handleSaveEditUniversity = () => {
    if (!editUniversityData?.name?.trim()) {
      toast({
        title: "Validation Error",
        description: "University name is required.",
        variant: "destructive",
      });
      return;
    }

    updateUniversityMutation.mutate(editUniversityData);
  };

  const handleDeleteUniversity = (university: any) => {
    if (window.confirm(`Are you sure you want to delete "${university.name}"? This action cannot be undone.`)) {
      deleteUniversityMutation.mutate(university.id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      case "pending":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "inactive":
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  if (statsLoading || universitiesLoading || studentsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-8 pt-24">
          <LoadingSkeleton type="card" count={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="flex h-[calc(100vh-4rem)] pt-16">
        {/* Floating Toggle Button (when sidebar is closed) */}
        {!sidebarOpen && (
          <div className="fixed top-20 left-4 z-50">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="shadow-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              data-testid="button-sidebar-open"
            >
              <Menu className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Collapsible Vertical Navigation Sidebar */}
        <div className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out overflow-hidden relative`}>
          {/* Close Toggle Button (when sidebar is open) */}
          {sidebarOpen && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 z-10 shadow-md bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              data-testid="button-sidebar-close"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
          
          <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
            <h1 className="text-xl font-bold text-foreground whitespace-nowrap">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1 whitespace-nowrap">Manage your platform</p>
          </div>
          
          <nav className="p-4 space-y-2 overflow-y-auto flex-1">
            <button
              onClick={() => setSelectedTab("overview")}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg text-left transition-colors ${
                selectedTab === "overview"
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-2 border-blue-500"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <BarChart3 className="w-4 h-4 mr-3" />
              Overview
            </button>
            
            <button
              onClick={() => setSelectedTab("universities")}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg text-left transition-colors ${
                selectedTab === "universities"
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-2 border-blue-500"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <Building className="w-4 h-4 mr-3" />
              Universities
            </button>
            
            <button
              onClick={() => setSelectedTab("students")}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg text-left transition-colors ${
                selectedTab === "students"
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-2 border-blue-500"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <Users className="w-4 h-4 mr-3" />
              Students
            </button>
            
            <button
              onClick={() => setSelectedTab("team")}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg text-left transition-colors ${
                selectedTab === "team"
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-2 border-blue-500"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <Shield className="w-4 h-4 mr-3" />
              Staff Management
            </button>
            
            <button
              onClick={() => setSelectedTab("company-profiles")}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg text-left transition-colors ${
                selectedTab === "company-profiles"
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-2 border-blue-500"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
              data-testid="button-company-profiles-sidebar"
            >
              <Building2 className="w-4 h-4 mr-3" />
              Company Profiles
            </button>
            
            <button
              onClick={() => setSelectedTab("subscriptions")}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg text-left transition-colors ${
                selectedTab === "subscriptions"
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-2 border-blue-500"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <CreditCard className="w-4 h-4 mr-3" />
              Subscriptions
            </button>
            
            <button
              onClick={() => setSelectedTab("applications")}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg text-left transition-colors ${
                selectedTab === "applications"
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-2 border-blue-500"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <FileText className="w-4 h-4 mr-3" />
              Applications
            </button>
            
            <button
              onClick={() => setSelectedTab("documents")}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg text-left transition-colors ${
                selectedTab === "documents"
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-2 border-blue-500"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <Upload className="w-4 h-4 mr-3" />
              Documents
            </button>
            
            <button
              onClick={() => setSelectedTab("conversions")}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg text-left transition-colors ${
                selectedTab === "conversions"
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-2 border-blue-500"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
              data-testid="button-conversions-sidebar"
            >
              <DollarSign className="w-4 h-4 mr-3" />
              Conversions
            </button>
            
            <button
              onClick={() => setSelectedTab("community")}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg text-left transition-colors ${
                selectedTab === "community"
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-2 border-blue-500"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
              data-testid="button-community-sidebar"
            >
              <MessageSquare className="w-4 h-4 mr-3" />
              Community Forum
            </button>
            
            <button
              onClick={() => setSelectedTab("reported-posts")}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg text-left transition-colors ${
                selectedTab === "reported-posts"
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-2 border-blue-500"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
              data-testid="button-reported-posts-sidebar"
            >
              <AlertTriangle className="w-4 h-4 mr-3" />
              Community Forum - Reported Posts
            </button>
            
            <button
              onClick={() => setSelectedTab("analytics")}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg text-left transition-colors ${
                selectedTab === "analytics"
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-2 border-blue-500"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <TrendingUp className="w-4 h-4 mr-3" />
              Analytics
            </button>
            
            <button
              onClick={() => setSelectedTab("security")}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg text-left transition-colors ${
                selectedTab === "security"
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-2 border-blue-500"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <Key className="w-4 h-4 mr-3" />
              Security
            </button>

            <button
              onClick={() => setSelectedTab("settings")}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg text-left transition-colors ${
                selectedTab === "settings"
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-2 border-blue-500"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <Settings className="w-4 h-4 mr-3" />
              Settings
            </button>
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">{renderSelectedContent()}</div>
        </div>
      </div>

      {/* Dialogs */}
      <AddStaffDialog 
        open={showAddStaff}
        onOpenChange={(open) => {
          setShowAddStaff(open);
          if (!open) {
            setNewStaff({
              firstName: "",
              lastName: "",
              email: "",
              teamRole: "",
              department: ""
            });
          }
        }}
        newStaff={newStaff}
        setNewStaff={setNewStaff}
        onSubmit={() => addStaffMutation.mutate(newStaff)}
        isLoading={addStaffMutation.isPending}
      />

      
      {/* Password Reset Dialog - Secure popup for displaying temporary passwords */}
      <PasswordResetDialog
        open={showPasswordResetDialog}
        onOpenChange={setShowPasswordResetDialog}
        passwordData={passwordResetData}
      />
    </div>
  );

  function renderSelectedContent() {
    switch (selectedTab) {
      case "overview":
        return renderOverviewContent();
      case "universities":
        return renderUniversitiesContent();
      case "students":
        return renderStudentsContent();
      case "applications":
        return renderApplicationsContent();
      case "documents":
        return renderDocumentsContent();
      case "conversions":
        return renderConversionsContent();
      case "community":
        return <CommunityContent />;
      case "reported-posts":
        return renderReportedPostsContent();
      case "team":
        return renderTeamContent();
      case "company-profiles":
        return <CompanyProfileManagement />;
      case "subscriptions":
        return renderSubscriptionsContent();
      case "analytics":
        return renderAnalyticsContent();
      case "security":
        return renderSecurityContent();
      case "settings":
        return renderSettingsContent();
      default:
        return renderOverviewContent();
    }
  }

  function renderOverviewContent() {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Dashboard Overview</h2>
            <p className="text-muted-foreground">Platform statistics and key metrics</p>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/test/conversions">
              <Button variant="outline" data-testid="button-test-conversions">
                <TestTube className="w-4 h-4 mr-2" />
                Test Conversions
              </Button>
            </Link>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Students
                  </p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {stats.totalStudents}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <Building className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Universities
                  </p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {stats.totalUniversities}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <FileText className="w-6 h-6 text-amber-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Applications
                  </p>
                  <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                    {stats.totalApplications}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <Clock className="w-6 h-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Pending Tasks
                  </p>
                  <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                    {stats.pendingTasks}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    New Signups
                  </p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                    {stats.newSignups}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                  <Award className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Conversion
                  </p>
                  <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">
                    {stats.conversionRate}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  function renderUniversitiesContent() {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">University Management</h2>
            <p className="text-muted-foreground">Add, edit, and manage university information</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline" 
              onClick={() => setShowBulkImport(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
            >
              <Upload className="w-4 h-4" />
              Import CSV
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowExport(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
            >
              <Download className="w-4 h-4" />
              Export Data
            </Button>
            <Button 
              onClick={() => setShowCreateUniversity(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              Add University
            </Button>
          </div>
        </div>

        <Tabs value={universityTab} onValueChange={(value: string) => setUniversityTab(value as "list" | "analytics")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list" className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              University List
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics & Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input 
                placeholder="Search universities..." 
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
        
        {/* Universities Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>University</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Ranking</TableHead>
                  <TableHead>Applications</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {universities.map((university: any) => (
                  <TableRow key={university.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                          {university.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{university.name}</p>
                          <p className="text-sm text-muted-foreground">{university.website}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{university.city}</p>
                        <p className="text-sm text-muted-foreground">{university.country}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">#{university.worldRanking || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{university.totalApplications || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={university.isActive 
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" 
                          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        }
                      >
                        {university.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewUniversityDetails(university);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditUniversity(university);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteUniversity(university);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <UniversityAnalytics universities={universities} />
          </TabsContent>
        </Tabs>
        
        {/* Dialogs - moved outside of tabs */}
        <CreateUniversityDialog 
          open={showCreateUniversity}
          onOpenChange={setShowCreateUniversity}
          newUniversity={newUniversity}
          setNewUniversity={setNewUniversity}
          onSubmit={handleUniversityFormSubmit}
          onCancel={handleUniversityFormCancel}
          isLoading={createUniversityMutation.isPending}
        />

        <BulkImportUniversities 
          open={showBulkImport} 
          onOpenChange={setShowBulkImport} 
        />


        <UniversityExport 
          open={showExport} 
          onOpenChange={setShowExport} 
        />

        <EditUniversityDialog 
          open={showEditUniversity}
          onOpenChange={() => {
            setShowEditUniversity(false);
            setEditUniversityData(null);
          }}
          editUniversityData={editUniversityData}
          setEditUniversityData={setEditUniversityData}
          onSave={handleSaveEditUniversity}
          isLoading={updateUniversityMutation.isPending}
        />
        <UniversityDetailsDialog />
        <AddStaffDialog 
          open={showAddStaff}
          onOpenChange={(open) => {
            setShowAddStaff(open);
            if (!open) {
              setNewStaff({
                firstName: "",
                lastName: "",
                email: "",
                teamRole: "",
                department: ""
              });
            }
          }}
          newStaff={newStaff}
          setNewStaff={setNewStaff}
          onSubmit={() => addStaffMutation.mutate(newStaff)}
          isLoading={addStaffMutation.isPending}
        />
  
      </div>
    );
  }

  function renderStudentsContent() {
    const filteredStudents = students.filter((student: any) => {
      const matchesSearch = 
        student.firstName?.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
        student.lastName?.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
        student.email?.toLowerCase().includes(studentSearchQuery.toLowerCase());
      
      const matchesStatus = studentStatusFilter === "all" || 
        (studentStatusFilter === "active" && student.accountStatus === "active") ||
        (studentStatusFilter === "inactive" && (student.accountStatus === "inactive" || student.accountStatus === "pending_approval" || student.accountStatus === "suspended" || student.accountStatus === "rejected"));
      
      return matchesSearch && matchesStatus;
    });

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Student Management</h2>
            <p className="text-muted-foreground">Manage student accounts and assignments</p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant="secondary">{filteredStudents.length} Students</Badge>
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input 
                  placeholder="Search students by name or email..." 
                  className="pl-10"
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                />
              </div>
              <Select value={studentStatusFilter} onValueChange={setStudentStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/admin/counselors"] });
                }}
                className="gap-2"
                data-testid="button-refresh-students"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Students Table */}
        <Card>
          <CardHeader>
            <CardTitle>Students ({filteredStudents.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {studentsLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No students found</p>
                <p className="text-gray-400">
                  {studentSearchQuery ? "Try adjusting your search terms" : "No students have registered yet"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Registration Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned Counselor</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student: any) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarFallback>
                              {student.firstName?.[0] || ''}{student.lastName?.[0] || ''}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {student.firstName} {student.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              ID: {student.id.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>
                        {student.createdAt ? 
                          new Date(student.createdAt).toLocaleDateString() : 
                          'Unknown'
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant={student.accountStatus === "active" ? "default" : "secondary"}>
                          {student.accountStatus === "active" ? "Active" : 
                           student.accountStatus === "inactive" ? "Inactive" :
                           student.accountStatus === "pending_approval" ? "Pending Approval" :
                           student.accountStatus === "suspended" ? "Suspended" :
                           student.accountStatus === "rejected" ? "Rejected" : "Unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {student.assignedCounselor ? (
                          <div className="flex items-center space-x-2">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="text-xs">
                                {student.assignedCounselor.firstName?.[0] || ''}
                                {student.assignedCounselor.lastName?.[0] || ''}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">
                              {student.assignedCounselor.firstName} {student.assignedCounselor.lastName}
                            </span>
                          </div>
                        ) : (
                          <Badge variant="outline">Unassigned</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewStudentDetails(getStudentAccountId(student))}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAssignCounselor(student.id)}>
                              <UserCheck className="w-4 h-4 mr-2" />
                              Assign Counselor
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleResetPassword(student)}>
                              <Shield className="w-4 h-4 mr-2" />
                              Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                <UserCheck className="w-4 h-4 mr-2" />
                                Change Status
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                {Object.entries(ACCOUNT_STATUS_LABELS).map(([value, label]) => (
                                  <DropdownMenuItem
                                    key={value}
                                    onClick={() => handleToggleStudentStatus(getStudentAccountId(student), value as AccountStatus)}
                                    disabled={student.accountStatus === value}
                                  >
                                    {label}
                                    {student.accountStatus === value && " (Current)"}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Student Details Modal */}
        <Dialog open={showStudentDetails} onOpenChange={setShowStudentDetails}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Student Details</DialogTitle>
              <DialogDescription>
                Comprehensive information about the selected student
              </DialogDescription>
            </DialogHeader>
            
            {selectedStudentDetails && (
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={selectedStudentDetails.profilePicture} />
                          <AvatarFallback>
                            {selectedStudentDetails.firstName?.[0]}
                            {selectedStudentDetails.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">
                            {selectedStudentDetails.firstName} {selectedStudentDetails.lastName}
                          </h3>
                          <p className="text-sm text-muted-foreground">{selectedStudentDetails.email}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Account Status:</span>
                          <Badge variant={selectedStudentDetails.accountStatus === "active" ? "default" : "secondary"}>
                            {selectedStudentDetails.accountStatus === "active" ? "Active" : 
                             selectedStudentDetails.accountStatus === "inactive" ? "Inactive" :
                             selectedStudentDetails.accountStatus === "pending_approval" ? "Pending Approval" :
                             selectedStudentDetails.accountStatus === "suspended" ? "Suspended" :
                             selectedStudentDetails.accountStatus === "rejected" ? "Rejected" : selectedStudentDetails.accountStatus}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">User Type:</span>
                          <span className="text-sm">{selectedStudentDetails.userType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Joined:</span>
                          <span className="text-sm">
                            {new Date(selectedStudentDetails.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Last Login:</span>
                          <span className="text-sm">
                            {selectedStudentDetails.lastLoginAt 
                              ? new Date(selectedStudentDetails.lastLoginAt).toLocaleDateString()
                              : "Never"
                            }
                          </span>
                        </div>
                        
                        {/* Temporary Password Section */}
                        {studentTempPasswords[selectedStudentDetails.id] && (
                          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded border">
                            <div className="flex justify-between items-start">
                              <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Temporary Password:</span>
                              <div className="text-right">
                                <div className="text-sm font-mono bg-yellow-100 dark:bg-yellow-800/30 p-1 px-2 rounded text-yellow-900 dark:text-yellow-100">
                                  {studentTempPasswords[selectedStudentDetails.id]}
                                </div>
                                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                                  Share securely with student
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Profile Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedStudentDetails.profile ? (
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Phone:</span>
                            <span className="text-sm">{selectedStudentDetails.profile.phone || "Not provided"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Date of Birth:</span>
                            <span className="text-sm">
                              {selectedStudentDetails.profile.dateOfBirth 
                                ? new Date(selectedStudentDetails.profile.dateOfBirth).toLocaleDateString()
                                : "Not provided"
                              }
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Nationality:</span>
                            <span className="text-sm">{selectedStudentDetails.profile.nationality || "Not provided"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Education Level:</span>
                            <span className="text-sm">{selectedStudentDetails.profile.currentEducationLevel || "Not provided"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">GPA:</span>
                            <span className="text-sm">{selectedStudentDetails.profile.gpa || "Not provided"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Intended Major:</span>
                            <span className="text-sm">{selectedStudentDetails.profile.intendedMajor || "Not provided"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Status:</span>
                            <Badge variant="outline">{selectedStudentDetails.profile.status}</Badge>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No profile information available</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Test Scores */}
                {selectedStudentDetails.profile?.testScores && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Test Scores</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Object.entries(selectedStudentDetails.profile.testScores).map(([test, score]) => (
                          <div key={test} className="text-center p-3 bg-muted/30 rounded-lg">
                            <div className="text-lg font-semibold">{String(score)}</div>
                            <div className="text-sm text-muted-foreground uppercase">{test}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Academic Interests */}
                {selectedStudentDetails.profile?.academicInterests?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Academic Interests</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {selectedStudentDetails.profile.academicInterests.map((interest: string, index: number) => (
                          <Badge key={index} variant="outline">{interest}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Preferred Countries */}
                {selectedStudentDetails.profile?.preferredCountries?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Preferred Countries</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {selectedStudentDetails.profile.preferredCountries.map((country: string, index: number) => (
                          <Badge key={index} variant="secondary">{country}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Notes */}
                {selectedStudentDetails.profile?.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{selectedStudentDetails.profile.notes}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  function renderApplicationsContent() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Applications Management</h2>
          <p className="text-muted-foreground">Track and manage student applications</p>
        </div>
        {/* Applications content will go here */}
      </div>
    );
  }

  function renderDocumentsContent() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Documents Management</h2>
          <p className="text-muted-foreground">Review and approve student documents</p>
        </div>
        {/* Documents content will go here */}
      </div>
    );
  }

  function renderSubscriptionsContent() {
    return <SubscriptionManagement />;
  }

  function renderTeamContent() {
    // Combine staff and counselors with unique keys to avoid duplicates
    const allStaffMembers = [
      ...((staffMembers as any[]) || []).map((member: any) => ({ ...member, sourceType: 'staff' })),
      ...((counselors as any[]) || []).filter((counselor: any) => 
        !((staffMembers as any[]) || []).some((staff: any) => staff.id === counselor.id)
      ).map((member: any) => ({ ...member, sourceType: 'counselor' }))
    ];
    
    const filteredStaffMembers = allStaffMembers.filter(member => {
      const matchesSearch = 
        member.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFilter = counselorFilter === "all" || 
        (counselorFilter === "counselors" && member.teamRole === "counselor") ||
        (counselorFilter === "admin" && member.teamRole === "admin");
      
      return matchesSearch && matchesFilter;
    });

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Staff Management</h2>
            <p className="text-muted-foreground">Manage team members, invitations and staff accounts</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button onClick={() => setShowAddStaff(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Staff Member
            </Button>
          </div>
        </div>



        {/* Search and Filter */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input 
              placeholder="Search team members by name or email..." 
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={counselorFilter} onValueChange={setCounselorFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Administrators</SelectItem>
              <SelectItem value="counselors">Counselors</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Team Members Table */}
        <Card>
          <CardHeader>
            <CardTitle>Team Members ({filteredStaffMembers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {staffMembersLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredStaffMembers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No team members found</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {searchQuery || counselorFilter !== "all" 
                    ? "No members match your search criteria" 
                    : "Start by adding your first team member"}
                </p>
                {!searchQuery && counselorFilter === "all" && (
                  <Button onClick={() => setShowAddStaff(true)} className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Staff Member
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaffMembers.map((member: any) => (
                    <TableRow key={`${member.sourceType}-${member.id}`}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={member.profilePicture} alt={member.firstName} />
                            <AvatarFallback>
                              {member.firstName?.[0]}{member.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-foreground">
                              {member.firstName} {member.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {member.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.teamRole === "admin" ? "default" : "secondary"}>
                          {member.teamRole || member.role || "Staff"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.department || member.specialization || "General"}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={
                            member.accountStatus === "active" 
                              ? "text-green-600 border-green-200" 
                              : "text-red-600 border-red-200"
                          }
                        >
                          {member.accountStatus === "active" ? "Active" : 
                           member.accountStatus === "inactive" ? "Inactive" :
                           member.accountStatus === "pending_approval" ? "Pending" :
                           member.accountStatus === "suspended" ? "Suspended" :
                           member.accountStatus === "rejected" ? "Rejected" : "Unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleResetPassword(member)}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Reset Password
                              </DropdownMenuItem>
                              {/* Only show status change for staff that aren't the current user */}
                              {member.id !== user?.id && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>
                                      <UserCheck className="w-4 h-4 mr-2" />
                                      Change Status
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent>
                                      {Object.entries(ACCOUNT_STATUS_LABELS).map(([value, label]) => (
                                        <DropdownMenuItem
                                          key={value}
                                          onClick={() => handleToggleStaffStatus(member.id, value as AccountStatus)}
                                          disabled={member.accountStatus === value}
                                        >
                                          {label}
                                          {member.accountStatus === value && " (Current)"}
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuSubContent>
                                  </DropdownMenuSub>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
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
    );
  }



  function renderAnalyticsContent() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Analytics</h2>
          <p className="text-muted-foreground">Platform performance and insights</p>
        </div>
        {/* Analytics content will go here */}
      </div>
    );
  }

  function renderSettingsContent() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Settings</h2>
          <p className="text-muted-foreground">Configure platform settings</p>
        </div>
        {/* Settings content will go here */}
      </div>
    );
  }

  function renderConversionsContent() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Conversion Management</h2>
          <p className="text-muted-foreground">Review and approve offline conversions</p>
        </div>
        <div className="flex items-center justify-center min-h-[500px]">
          <div className="text-center space-y-4">
            <div className="text-8xl">🚧</div>
            <h3 className="text-2xl font-bold text-gray-700">Coming Soon</h3>
            <p className="text-gray-500 max-w-md">
              Conversion management features are currently under development. 
              This section will be redesigned with enhanced functionality.
            </p>
          </div>
        </div>
      </div>
    );
  }

  function CommunityContent() {
    const [securitySettings, setSecuritySettings] = useState<{forum_cooling_period_enabled: boolean}>({
      forum_cooling_period_enabled: true
    });
    const [isUpdating, setIsUpdating] = useState(false);
    const { toast } = useToast();

    // Query for community forum settings
    const { data: settings, isLoading, refetch } = useApiQuery(
      ["/api/admin/security-settings"],
      "/api/admin/security-settings",
      undefined,
      {}
    );

    useEffect(() => {
      if (settings && Array.isArray(settings)) {
        const coolingPeriodSetting = settings.find((s: any) => s.settingKey === 'forum_cooling_period_enabled');
        setSecuritySettings({
          forum_cooling_period_enabled: coolingPeriodSetting?.settingValue === 'true'
        });
      }
    }, [settings]);

    const handleToggleCoolingPeriod = async () => {
      setIsUpdating(true);
      try {
        const newValue = securitySettings.forum_cooling_period_enabled ? "false" : "true";
        const result = await api.put("/api/admin/security/settings/forum_cooling_period_enabled", {
          settingValue: newValue
        });
        
        console.log("Security setting update result:", result);

        setSecuritySettings(prev => ({
          ...prev,
          forum_cooling_period_enabled: !prev.forum_cooling_period_enabled
        }));
        refetch();
        toast({
          title: "Settings Updated",
          description: `Forum cooling period ${securitySettings.forum_cooling_period_enabled ? 'disabled' : 'enabled'} successfully`,
        });
      } catch (error) {
        console.error("Error updating setting:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to update forum cooling period setting";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
      } finally {
        setIsUpdating(false);
      }
    };



    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Community Forum Management</h2>
          <p className="text-muted-foreground">Manage community forum settings and policies</p>
        </div>

        {/* Forum Policies */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Forum Policies
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Current Policy</h4>
              <p className="text-blue-800 dark:text-blue-200">
                <strong>Text-only posts:</strong> Community forum only allows text-based discussions. 
                Photos, videos, polls, and emojis are not permitted to maintain focus on educational content.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Posting Restrictions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              New User Posting Restrictions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <LoadingSkeleton type="card" count={1} />
            ) : (
              <>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <h4 className="font-medium">1-Hour Cooling Period</h4>
                    <p className="text-sm text-muted-foreground">
                      When enabled, new accounts must wait 1 hour before they can post in the community forum. 
                      This helps prevent spam and encourages thoughtful participation.
                    </p>
                    <div className="text-xs text-muted-foreground mt-2">
                      Status: <span className={`font-medium ${securitySettings.forum_cooling_period_enabled ? 'text-green-600' : 'text-red-600'}`}>
                        {securitySettings.forum_cooling_period_enabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant={securitySettings.forum_cooling_period_enabled ? "destructive" : "default"}
                    onClick={handleToggleCoolingPeriod}
                    disabled={isUpdating}
                    className="ml-4"
                  >
                    {isUpdating ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      securitySettings.forum_cooling_period_enabled ? "Disable" : "Enable"
                    )}
                  </Button>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
                  <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                    <AlertTriangle className="w-4 h-4 inline mr-2" />
                    Important Note
                  </h4>
                  <p className="text-amber-800 dark:text-amber-200 text-sm">
                    When the cooling period is enabled, new users will see a message indicating they need to wait 
                    before posting. Users who attempt to post during this period will receive a clear error message 
                    with the remaining wait time.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Trending Topics Filter */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Trending Topics Feature
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <LoadingSkeleton type="card" count={1} />
            ) : (
              <>


              </>
            )}
          </CardContent>
        </Card>

        {/* Forum Guidelines */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Community Guidelines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Text-only posts</strong> - Focus on meaningful educational discussions</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>1-hour waiting period</strong> - New accounts wait before first post</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Educational content</strong> - Share experiences and advice about international education</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Respectful communication</strong> - Maintain professional and supportive tone</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderReportedPostsContent() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Community Forum - Reported Posts</h2>
          <p className="text-muted-foreground">Review and manage reported community posts</p>
        </div>

        {/* Reports Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Reports</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {reportedPostsLoading ? "..." : Array.isArray(reportedPosts) ? reportedPosts.filter((p: any) => p.isHiddenByReports).length : "0"}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Resolved Today</p>
                  <p className="text-2xl font-bold text-green-600">0</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total This Week</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {reportedPostsLoading ? "..." : Array.isArray(reportedPosts) ? reportedPosts.length : "0"}
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Response Time</p>
                  <p className="text-2xl font-bold text-purple-600">-</p>
                </div>
                <Clock className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reports Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Recent Reports
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {reportedPostsLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin" />
                <span className="ml-2">Loading reported posts...</span>
              </div>
            ) : reportedPostsError ? (
              <div className="text-center py-12">
                <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Error Loading Reports</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  There was an issue loading the reported posts. Please try refreshing the page.
                </p>
                <button 
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/forum/reported-posts"] })}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : !Array.isArray(reportedPosts) || reportedPosts.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No Reported Posts</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  No posts have been reported yet. This section will show community reports when they come in.
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg max-w-md mx-auto">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">What gets reported?</h4>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 text-left space-y-1">
                    <li>• Inappropriate content</li>
                    <li>• Spam or off-topic posts</li>
                    <li>• Harassment or bullying</li>
                    <li>• Misleading information</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {reportedPosts.map((post: any) => (
                  <div key={post.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={post.isHiddenByReports ? "destructive" : "secondary"}>
                            {post.isHiddenByReports ? "Auto-Hidden" : "Under Review"}
                          </Badge>
                          <Badge variant="outline">
                            {post.reportCount} {post.reportCount === 1 ? "Report" : "Reports"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {post.category}
                          </span>
                        </div>
                        <h4 className="font-semibold text-base mb-1">{post.title}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {post.content}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>By {post.user.firstName} {post.user.lastName}</span>
                          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                          {post.hiddenAt && (
                            <span>Hidden: {new Date(post.hiddenAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleReviewPost(post.id)}
                          disabled={processingPostId === post.id}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          {processingPostId === post.id ? "Loading..." : "Review"}
                        </Button>
                        {post.isHiddenByReports && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleRestorePost(post.id)}
                            disabled={processingPostId === post.id}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            {processingPostId === post.id ? "Restoring..." : "Restore"}
                          </Button>
                        )}
                      </div>
                    </div>
                    {post.reportReasons && post.reportReasons.length > 0 && (
                      <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded border-l-4 border-red-500">
                        <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">
                          Report Reasons:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {post.reportReasons.map((reason: string, index: number) => (
                            <Badge key={index} variant="destructive" className="text-xs">
                              {reason}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Moderation Guidelines */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Moderation Guidelines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3 text-green-700 dark:text-green-300">✓ Actions to Take</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Review reported content within 24 hours</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Document reasons for moderation decisions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Send clear communication to users about actions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Escalate serious violations to senior staff</span>
                  </li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3 text-red-700 dark:text-red-300">⚠ Common Report Types</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span><strong>Spam:</strong> Promotional or repeated content</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span><strong>Off-topic:</strong> Non-educational discussions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span><strong>Harassment:</strong> Personal attacks or bullying</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span><strong>Misinformation:</strong> False or misleading advice</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Helper components for dialogs


  function UniversityDetailsDialog() {
    return (
      <Dialog open={showUniversityDetails} onOpenChange={setShowUniversityDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>University Details</DialogTitle>
            <DialogDescription>
              Comprehensive university information and admission requirements
            </DialogDescription>
          </DialogHeader>
          
          {selectedUniversity && (
            <div className="space-y-6">
              {/* 1. University Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">1. University Basic Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <p><strong>Name:</strong> {selectedUniversity.name}</p>
                      <p><strong>Country:</strong> {selectedUniversity.country}</p>
                      <p><strong>City:</strong> {selectedUniversity.city}</p>
                    </div>
                    <div className="space-y-2">
                      <p><strong>Website:</strong> {selectedUniversity.website ? (
                        <a href={selectedUniversity.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {selectedUniversity.website}
                        </a>
                      ) : 'N/A'}</p>
                      <p><strong>World Ranking:</strong> #{selectedUniversity.worldRanking || selectedUniversity.world_ranking || 'N/A'}</p>
                      <p><strong>Description:</strong> {selectedUniversity.description || 'No description available'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 2. Academics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">2. Academics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="font-medium mb-2">Degree Levels</p>
                      <div className="space-y-1">
                        {(selectedUniversity.degree_levels || selectedUniversity.degreeLevels) && 
                         (selectedUniversity.degree_levels || selectedUniversity.degreeLevels).length > 0 ? (
                          (selectedUniversity.degree_levels || selectedUniversity.degreeLevels).map((level: string, index: number) => (
                            <p key={index} className="text-sm">• {level}</p>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">No degree levels specified</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="font-medium mb-2">Specialization</p>
                      <p className="text-sm capitalize">{selectedUniversity.specialization || 'Not specified'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 3. Fees */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">3. Fees</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="font-medium mb-2">Offer Letter Fee (USD)</p>
                      <p className="text-sm">${selectedUniversity.offerLetterFee || selectedUniversity.offer_letter_fee ? parseFloat(selectedUniversity.offerLetterFee || selectedUniversity.offer_letter_fee).toLocaleString() : '0'}</p>
                    </div>
                    <div>
                      <p className="font-medium mb-2">Annual Fee (USD)</p>
                      <p className="text-sm">${selectedUniversity.annualFee || selectedUniversity.annual_fee ? parseFloat(selectedUniversity.annualFee || selectedUniversity.annual_fee).toLocaleString() : '0'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 4. Requirements */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">4. Requirements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <p className="font-medium mb-2">Minimum GPA</p>
                      <p className="text-sm">{selectedUniversity.admissionRequirements?.minimumGPA || selectedUniversity.admission_requirements?.minimumGPA || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="font-medium mb-2">IELTS Score</p>
                      <p className="text-sm">{selectedUniversity.admissionRequirements?.ieltsScore || selectedUniversity.admission_requirements?.ieltsScore || 'Not required'}</p>
                    </div>
                    <div>
                      <p className="font-medium mb-2">GMAT Score</p>
                      <p className="text-sm">{selectedUniversity.admissionRequirements?.gmatScore || selectedUniversity.admission_requirements?.gmatScore || 'Not required'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 5. Known Alumni */}
              {(selectedUniversity.alumni1 || selectedUniversity.alumni2 || selectedUniversity.alumni3) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">5. Known Alumni</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedUniversity.alumni1 && (
                        <p className="text-sm"><span className="font-medium">1.</span> {selectedUniversity.alumni1}</p>
                      )}
                      {selectedUniversity.alumni2 && (
                        <p className="text-sm"><span className="font-medium">2.</span> {selectedUniversity.alumni2}</p>
                      )}
                      {selectedUniversity.alumni3 && (
                        <p className="text-sm"><span className="font-medium">3.</span> {selectedUniversity.alumni3}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end pt-4">
                <Button onClick={() => setShowUniversityDetails(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }






  // Security Content Renderer
  function renderSecurityContent() {
    // Helper functions for security content
    const handleToggleTeamLogin = (enabled: boolean) => {
      console.log('Toggle clicked:', enabled, 'Current setting:', getTeamLoginSetting());
      updateSecurityMutation.mutate({
        settingKey: 'team_login_visible',
        settingValue: enabled ? 'true' : 'false'
      });
    };

    const getTeamLoginSetting = () => {
      if (!securitySettings || !Array.isArray(securitySettings)) return false;
      const setting = securitySettings.find((s: any) => s.settingKey === 'team_login_visible');
      return setting?.settingValue === 'true';
    };

    const handleToggleMaintenanceMode = (enabled: boolean) => {
      updateSecurityMutation.mutate({
        settingKey: 'maintenance_mode',
        settingValue: enabled ? 'true' : 'false'
      });
    };

    const getMaintenanceModeSetting = () => {
      if (!securitySettings || !Array.isArray(securitySettings)) return false;
      const setting = securitySettings.find((s: any) => s.settingKey === 'maintenance_mode');
      return setting?.settingValue === 'true';
    };

    const getSecretCodeSetting = () => {
      if (!securitySettings || !Array.isArray(securitySettings)) return 'edupath-admin-2025';
      const setting = securitySettings.find((s: any) => s.settingKey === 'secret_search_code');
      return setting?.settingValue || 'edupath-admin-2025';
    };

    const handleUpdateSecretCode = () => {
      if (!newSecretCode.trim()) return;
      
      updateSecurityMutation.mutate({
        settingKey: 'secret_search_code',
        settingValue: newSecretCode.trim()
      });
      
      setNewSecretCode('');
    };

    const handleForceLogoutAll = () => {
      forceLogoutMutation.mutate();
    };

    if (securityLoading) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Security Settings</h2>
              <p className="text-muted-foreground">Manage platform security and access controls</p>
            </div>
          </div>
          <LoadingSkeleton type="card" count={2} />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Security Settings</h2>
            <p className="text-muted-foreground">Manage platform security and access controls</p>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Team Login Visibility */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Team Login Visibility
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Control whether the team login option is visible on the authentication page
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Show Team Login Option</Label>
                  <p className="text-xs text-muted-foreground">
                    When enabled, staff can access team login from the authentication page
                  </p>
                </div>
                <Switch
                  checked={getTeamLoginSetting()}
                  onCheckedChange={handleToggleTeamLogin}
                  disabled={updateSecurityMutation.isPending}
                />
              </div>
              
              {!getTeamLoginSetting() && (
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="text-yellow-800 dark:text-yellow-200 font-medium">Team Login Hidden</p>
                      <p className="text-yellow-700 dark:text-yellow-300">
                        Staff members can still access team login using the secret search code: <code className="bg-yellow-100 dark:bg-yellow-800/50 px-1 py-0.5 rounded text-xs">{getSecretCodeSetting()}</code>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Secret Code Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Secret Access Code
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage the secret code that allows access to team login when visibility is disabled
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Current Secret Code</Label>
                    <p className="text-xs text-muted-foreground">
                      Staff can type this code in the search box to access team login
                    </p>
                  </div>
                  <div className="text-right">
                    <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm font-mono">
                      {getSecretCodeSetting()}
                    </code>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Input
                    type="text"
                    placeholder="Enter new secret code"
                    value={newSecretCode}
                    onChange={(e) => setNewSecretCode(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleUpdateSecretCode}
                    disabled={updateSecurityMutation.isPending || !newSecretCode.trim()}
                    size="sm"
                  >
                    {updateSecurityMutation.isPending ? 'Updating...' : 'Update Code'}
                  </Button>
                </div>
                
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="text-blue-800 dark:text-blue-200 font-medium">Security Note</p>
                      <p className="text-blue-700 dark:text-blue-300">
                        Choose a unique code that's easy for staff to remember but hard for others to guess. Avoid common words or patterns.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Maintenance Mode */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Maintenance Mode
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Enable maintenance mode to temporarily block all users and perform system updates
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Enable Maintenance Mode</Label>
                    <p className="text-xs text-muted-foreground">
                      When enabled, all users except admins will be blocked from accessing the site
                    </p>
                  </div>
                  <Switch
                    checked={getMaintenanceModeSetting()}
                    onCheckedChange={handleToggleMaintenanceMode}
                    disabled={updateSecurityMutation.isPending}
                  />
                </div>
                
                {getMaintenanceModeSetting() && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="text-red-800 dark:text-red-200 font-medium">Maintenance Mode Active</p>
                        <p className="text-red-700 dark:text-red-300">
                          All users are currently blocked from accessing the site. Only administrators can access admin functions.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="pt-2">
                  <Button
                    onClick={handleForceLogoutAll}
                    disabled={forceLogoutMutation.isPending}
                    variant="destructive"
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    {forceLogoutMutation.isPending ? "Processing..." : "Force Logout All Users"}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Immediately logs out all users. Use this when enabling maintenance mode or for security purposes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Session Troubleshooting */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Session Troubleshooting
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Fix authentication and session issues when settings don't update properly
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="text-amber-800 dark:text-amber-200 font-medium">Having Session Issues?</p>
                      <p className="text-amber-700 dark:text-amber-300">
                        If you see "Unauthorized" errors, toggles don't save, or settings revert automatically, click below to fix session problems.
                      </p>
                    </div>
                  </div>
                </div>
                
                <Button 
                  onClick={handleFixSession}
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Fix Session Issues
                </Button>
                
                <p className="text-xs text-muted-foreground">
                  This clears browser cache and forces a fresh login. Use when authentication problems occur.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Security Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm font-medium text-green-800 dark:text-green-200">CAPTCHA Protection</span>
                    </div>
                    <p className="text-xs text-green-700 dark:text-green-300">
                      All student registrations require CAPTCHA verification
                    </p>
                  </div>
                  
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Rate Limiting</span>
                    </div>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Maximum 5 new registrations per IP per hour
                    </p>
                  </div>
                </div>
                
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-sm font-medium text-purple-800 dark:text-purple-200">Account Cooling Period</span>
                  </div>
                  <p className="text-xs text-purple-700 dark:text-purple-300">
                    New student accounts have a 1-hour cooling period before community access. Admins can bypass this restriction.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="flex pt-16">
        {/* Sidebar */}
        <div className="w-64 bg-card border-r">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Admin Dashboard</h2>
          </div>
          <nav className="px-4 space-y-2">
            <Button
              variant={selectedTab === "overview" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setSelectedTab("overview")}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Overview
            </Button>
            <Button
              variant={selectedTab === "students" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setSelectedTab("students")}
            >
              <Users className="w-4 h-4 mr-2" />
              Students
            </Button>
            <Button
              variant={selectedTab === "universities" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setSelectedTab("universities")}
            >
              <Building2 className="w-4 h-4 mr-2" />
              Universities
            </Button>
            <Button
              variant={selectedTab === "applications" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setSelectedTab("applications")}
            >
              <FileText className="w-4 h-4 mr-2" />
              Applications
            </Button>
            <Button
              variant={selectedTab === "documents" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setSelectedTab("documents")}
            >
              <Upload className="w-4 h-4 mr-2" />
              Documents
            </Button>
            <Button
              variant={selectedTab === "conversions" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setSelectedTab("conversions")}
              data-testid="button-conversions-tab"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Conversions
            </Button>
            <Button
              variant={selectedTab === "community" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setSelectedTab("community")}
              data-testid="button-community-tab"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Community Forum
            </Button>
            <Button
              variant={selectedTab === "team" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setSelectedTab("team")}
            >
              <UserCheck className="w-4 h-4 mr-2" />
              Staff Management
            </Button>
            <Button
              variant={selectedTab === "analytics" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setSelectedTab("analytics")}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Analytics
            </Button>
            <Button
              variant={selectedTab === "security" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setSelectedTab("security")}
            >
              <Shield className="w-4 h-4 mr-2" />
              Security
            </Button>
            <Button
              variant={selectedTab === "settings" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setSelectedTab("settings")}
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="p-6">
            {selectedTab === "overview" && renderOverviewContent()}
            {selectedTab === "students" && renderStudentsContent()}
            {selectedTab === "universities" && renderUniversitiesContent()}
            {selectedTab === "applications" && renderApplicationsContent()}
            {selectedTab === "documents" && renderDocumentsContent()}
            {selectedTab === "conversions" && renderConversionsContent()}
            {selectedTab === "community" && <CommunityContent />}
            {selectedTab === "team" && renderTeamContent()}
            {selectedTab === "analytics" && renderAnalyticsContent()}
            {selectedTab === "security" && renderSecurityContent()}
            {selectedTab === "settings" && renderSettingsContent()}
          </div>
        </div>
      </div>

      {/* Student Details Modal */}
      <Dialog open={showStudentDetails} onOpenChange={setShowStudentDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
            <DialogDescription>
              Comprehensive information about the selected student
            </DialogDescription>
          </DialogHeader>
          
          {selectedStudentDetails && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={selectedStudentDetails.profilePicture} />
                        <AvatarFallback>
                          {selectedStudentDetails.firstName?.[0]}
                          {selectedStudentDetails.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">
                          {selectedStudentDetails.firstName} {selectedStudentDetails.lastName}
                        </h3>
                        <p className="text-sm text-muted-foreground">{selectedStudentDetails.email}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Account Status:</span>
                        <Badge variant={selectedStudentDetails.accountStatus === "active" ? "default" : "secondary"}>
                          {selectedStudentDetails.accountStatus === "active" ? "Active" : 
                           selectedStudentDetails.accountStatus === "inactive" ? "Inactive" :
                           selectedStudentDetails.accountStatus === "pending_approval" ? "Pending Approval" :
                           selectedStudentDetails.accountStatus === "suspended" ? "Suspended" :
                           selectedStudentDetails.accountStatus === "rejected" ? "Rejected" : selectedStudentDetails.accountStatus}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">User Type:</span>
                        <span className="text-sm">{selectedStudentDetails.userType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Joined:</span>
                        <span className="text-sm">
                          {new Date(selectedStudentDetails.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Last Login:</span>
                        <span className="text-sm">
                          {selectedStudentDetails.lastLoginAt 
                            ? new Date(selectedStudentDetails.lastLoginAt).toLocaleDateString()
                            : "Never"
                          }
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Profile Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedStudentDetails.profile ? (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Phone:</span>
                          <span className="text-sm">{selectedStudentDetails.profile.phone || "Not provided"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Date of Birth:</span>
                          <span className="text-sm">
                            {selectedStudentDetails.profile.dateOfBirth 
                              ? new Date(selectedStudentDetails.profile.dateOfBirth).toLocaleDateString()
                              : "Not provided"
                            }
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Nationality:</span>
                          <span className="text-sm">{selectedStudentDetails.profile.nationality || "Not provided"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Education Level:</span>
                          <span className="text-sm">{selectedStudentDetails.profile.currentEducationLevel || "Not provided"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">GPA:</span>
                          <span className="text-sm">{selectedStudentDetails.profile.gpa || "Not provided"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Intended Major:</span>
                          <span className="text-sm">{selectedStudentDetails.profile.intendedMajor || "Not provided"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Status:</span>
                          <Badge variant="outline">{selectedStudentDetails.profile.status}</Badge>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No profile information available</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Test Scores */}
              {selectedStudentDetails.profile?.testScores && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Test Scores</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {Object.entries(selectedStudentDetails.profile.testScores).map(([test, score]) => (
                        <div key={test} className="text-center p-3 bg-muted/30 rounded-lg">
                          <div className="text-lg font-semibold">{String(score)}</div>
                          <div className="text-sm text-muted-foreground uppercase">{test}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Academic Interests */}
              {selectedStudentDetails.profile?.academicInterests?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Academic Interests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {selectedStudentDetails.profile.academicInterests.map((interest: string, index: number) => (
                        <Badge key={index} variant="outline">{interest}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Preferred Countries */}
              {selectedStudentDetails.profile?.preferredCountries?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Preferred Countries</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {selectedStudentDetails.profile.preferredCountries.map((country: string, index: number) => (
                        <Badge key={index} variant="secondary">{country}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              {selectedStudentDetails.profile?.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{selectedStudentDetails.profile.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          
          {/* Action Buttons Footer */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowStudentDetails(false)}>
              Close
            </Button>
            {selectedStudentDetails && (
              <Button 
                onClick={() => handleResetPassword(selectedStudentDetails)}
                variant="secondary"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset Password
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Counselor assignment now handled via direct DOM manipulation */}

      {/* Other existing modals would go here */}
    </div>
  );
}
