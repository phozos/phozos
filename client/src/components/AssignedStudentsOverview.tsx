import { useState } from "react";
import { useApiQuery } from "@/hooks/api-hooks";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Filter, Eye, MessageCircle, FileText, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  nationality?: string;
  destinationCountry?: string;
  intakeYear?: string;
  status: 'inquiry' | 'converted' | 'visa_applied' | 'visa_approved' | 'departed';
  profilePicture?: string;
  applicationStage: string;
  documentsCount: number;
  universitiesShortlisted: number;
  lastActivity: string;
  urgentActions: number;
}

export default function AssignedStudentsOverview({ counselorId }: { counselorId: string }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  const { data: students = [], isLoading } = useApiQuery<Student[]>(
    ['/api/counselor/assigned-students', counselorId, statusFilter, courseFilter],
    `/api/counselor/assigned-students?status=${statusFilter}&course=${courseFilter}`,
    undefined
  );

  const filteredStudents = students.filter((student: Student) =>
    student.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'inquiry': return 'bg-gray-100 text-gray-800';
      case 'converted': return 'bg-blue-100 text-blue-800';
      case 'visa_applied': return 'bg-yellow-100 text-yellow-800';
      case 'visa_approved': return 'bg-green-100 text-green-800';
      case 'departed': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'inquiry': return 'Initial Inquiry';
      case 'converted': return 'Active Student';
      case 'visa_applied': return 'Visa Applied';
      case 'visa_approved': return 'Visa Approved';
      case 'departed': return 'Departed';
      default: return status;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assigned Students</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>🧑‍🎓 Assigned Students</span>
          <Badge variant="secondary">{filteredStudents.length}</Badge>
        </CardTitle>
        <CardDescription>
          Manage and track your assigned students' progress
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search students by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="inquiry">Initial Inquiry</SelectItem>
              <SelectItem value="converted">Active Student</SelectItem>
              <SelectItem value="visa_applied">Visa Applied</SelectItem>
              <SelectItem value="visa_approved">Visa Approved</SelectItem>
              <SelectItem value="departed">Departed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              <SelectItem value="computer-science">Computer Science</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="engineering">Engineering</SelectItem>
              <SelectItem value="medicine">Medicine</SelectItem>
              <SelectItem value="arts">Arts</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Students List */}
        <div className="space-y-3">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No students found matching your criteria</p>
            </div>
          ) : (
            filteredStudents.map((student: Student) => (
              <div
                key={student.id}
                className={`border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
                  selectedStudent === student.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => setSelectedStudent(student.id === selectedStudent ? null : student.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={student.profilePicture} />
                      <AvatarFallback>
                        {student.firstName[0]}{student.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium">
                        {student.firstName} {student.lastName}
                      </h3>
                      <p className="text-sm text-gray-600">{student.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getStatusColor(student.status)}>
                          {getStatusLabel(student.status)}
                        </Badge>
                        {student.urgentActions > 0 && (
                          <Badge variant="destructive">
                            {student.urgentActions} urgent
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        <span>{student.documentsCount} docs</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{student.universitiesShortlisted} unis</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Last active: {student.lastActivity}
                    </p>
                  </div>
                </div>

                {/* Expanded Details */}
                {selectedStudent === student.id && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Nationality:</span>
                        <p className="font-medium">{student.nationality || 'Not set'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Destination:</span>
                        <p className="font-medium">{student.destinationCountry || 'Not set'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Intake:</span>
                        <p className="font-medium">{student.intakeYear || 'Not set'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Application Stage:</span>
                        <p className="font-medium">{student.applicationStage}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-2" />
                        View Profile
                      </Button>
                      <Button size="sm" variant="outline">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Send Message
                      </Button>
                      <Button size="sm" variant="outline">
                        <FileText className="h-4 w-4 mr-2" />
                        Documents
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}