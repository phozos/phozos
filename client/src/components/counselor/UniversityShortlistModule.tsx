import { useState } from "react";
import { useApiQuery, useApiMutation } from "@/hooks/api-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash2, 
  CheckCircle, 
  Lock, 
  Unlock, 
  AlertTriangle,
  User,
  Users,
  Calendar,
  FileText,
  Target
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";

interface University {
  id: string;
  name: string;
  country: string;
  city: string;
  ranking?: number;
  tuitionFee?: number;
  applicationDeadline?: string;
  course?: string;
  addedBy: 'student' | 'counselor';
  status: 'draft' | 'finalized' | 'application_started';
  counselorNotes?: string;
  dateAdded: string;
  deadlineApproaching?: boolean;
}

interface UniversityShortlistModuleProps {
  studentId: string;
  studentName: string;
}

export default function UniversityShortlistModule({ studentId, studentName }: UniversityShortlistModuleProps) {
  const [activeTab, setActiveTab] = useState("shortlist");
  const [selectedUniversities, setSelectedUniversities] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState<string | null>(null);
  const [newUniversity, setNewUniversity] = useState({
    name: '',
    country: '',
    city: '',
    course: '',
    tuitionFee: '',
    applicationDeadline: '',
    notes: ''
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: shortlistedUniversities = [], isLoading } = useApiQuery<University[]>(
    ['/api/counselor/student-universities', studentId],
    `/api/counselor/student-universities/${studentId}`,
    undefined
  );

  const { data: availableUniversities = [] } = useApiQuery<any[]>(
    ['/api/universities', searchQuery],
    `/api/universities?search=${searchQuery}`,
    undefined,
    { enabled: isAddDialogOpen }
  );

  const addUniversityMutation = useApiMutation(
    async (universityData: any) => {
      return await api.post('/api/counselor/add-university-to-shortlist', {
        studentId,
        ...universityData,
        addedBy: 'counselor'
      });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/counselor/student-universities', studentId] });
        setIsAddDialogOpen(false);
        setNewUniversity({
          name: '', country: '', city: '', course: '', tuitionFee: '', applicationDeadline: '', notes: ''
        });
        toast({
          title: "University added",
          description: "University has been added to the shortlist."
        });
      }
    }
  );

  const finalizeMutation = useApiMutation(
    async (universityIds: string[]) => {
      return await api.post('/api/counselor/finalize-universities', { studentId, universityIds });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/counselor/student-universities', studentId] });
        setSelectedUniversities([]);
        toast({
          title: "Universities finalized",
          description: "Selected universities have been finalized for application."
        });
      }
    }
  );

  const updateNotesMutation = useApiMutation(
    async ({ universityId, notes }: { universityId: string; notes: string }) => {
      return await api.put('/api/counselor/update-university-notes', { universityId, notes });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/counselor/student-universities', studentId] });
        setNotesDialogOpen(null);
        toast({
          title: "Notes updated",
          description: "University notes have been updated."
        });
      }
    }
  );

  const removeUniversityMutation = useApiMutation(
    async (universityId: string) => {
      return await api.delete(`/api/counselor/remove-university/${universityId}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/counselor/student-universities', studentId] });
        toast({
          title: "University removed",
          description: "University has been removed from the shortlist."
        });
      }
    }
  );

  const reopenUniversityMutation = useApiMutation(
    async (universityId: string) => {
      return await api.put(`/api/counselor/reopen-university/${universityId}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/counselor/student-universities', studentId] });
        toast({
          title: "University reopened",
          description: "University has been moved back to draft status."
        });
      }
    }
  );

  const draftUniversities = shortlistedUniversities.filter((uni: University) => uni.status === 'draft');
  const finalizedUniversities = shortlistedUniversities.filter((uni: University) => uni.status === 'finalized' || uni.status === 'application_started');

  const getStatusBadge = (university: University) => {
    if (university.deadlineApproaching) {
      return <Badge variant="destructive">Deadline Approaching</Badge>;
    }
    if (university.status === 'finalized') {
      return <Badge variant="default">Finalized</Badge>;
    }
    if (university.status === 'application_started') {
      return <Badge variant="secondary">Application Started</Badge>;
    }
    return null;
  };

  const getAddedByBadge = (addedBy: string) => {
    return addedBy === 'student' ? (
      <Badge variant="outline" className="flex items-center gap-1">
        <User className="h-3 w-3" />
        Added by Student
      </Badge>
    ) : (
      <Badge variant="outline" className="flex items-center gap-1">
        <Users className="h-3 w-3" />
        Added by Counselor
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            🎯 University Shortlisting - {studentName}
          </span>
          <div className="flex gap-2">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add University
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add University to Shortlist</DialogTitle>
                  <DialogDescription>
                    Add a university to {studentName}'s shortlist as a counselor.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Search Universities</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search for universities..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  {availableUniversities.length > 0 && (
                    <div className="max-h-40 overflow-y-auto border rounded-md">
                      {availableUniversities.map((uni: any) => (
                        <div
                          key={uni.id}
                          className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                          onClick={() => {
                            setNewUniversity({
                              name: uni.name,
                              country: uni.country,
                              city: uni.city,
                              course: '',
                              tuitionFee: uni.tuitionFees?.international?.min?.toString() || '',
                              applicationDeadline: '',
                              notes: ''
                            });
                          }}
                        >
                          <div className="font-medium">{uni.name}</div>
                          <div className="text-sm text-gray-500">{uni.city}, {uni.country}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>University Name</Label>
                      <Input
                        value={newUniversity.name}
                        onChange={(e) => setNewUniversity({...newUniversity, name: e.target.value})}
                        placeholder="University name"
                      />
                    </div>
                    <div>
                      <Label>Course/Program</Label>
                      <Input
                        value={newUniversity.course}
                        onChange={(e) => setNewUniversity({...newUniversity, course: e.target.value})}
                        placeholder="Course name"
                      />
                    </div>
                    <div>
                      <Label>Country</Label>
                      <Input
                        value={newUniversity.country}
                        onChange={(e) => setNewUniversity({...newUniversity, country: e.target.value})}
                        placeholder="Country"
                      />
                    </div>
                    <div>
                      <Label>City</Label>
                      <Input
                        value={newUniversity.city}
                        onChange={(e) => setNewUniversity({...newUniversity, city: e.target.value})}
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <Label>Tuition Fee (USD)</Label>
                      <Input
                        type="number"
                        value={newUniversity.tuitionFee}
                        onChange={(e) => setNewUniversity({...newUniversity, tuitionFee: e.target.value})}
                        placeholder="Annual tuition fee"
                      />
                    </div>
                    <div>
                      <Label>Application Deadline</Label>
                      <Input
                        type="date"
                        value={newUniversity.applicationDeadline}
                        onChange={(e) => setNewUniversity({...newUniversity, applicationDeadline: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Internal Notes</Label>
                    <Textarea
                      value={newUniversity.notes}
                      onChange={(e) => setNewUniversity({...newUniversity, notes: e.target.value})}
                      placeholder="Add private notes about this university choice..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => addUniversityMutation.mutate(newUniversity)}
                    disabled={!newUniversity.name || addUniversityMutation.isPending}
                  >
                    Add University
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
        <CardDescription>
          Manage university shortlisting with draft and finalized sections
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="shortlist" className="flex items-center gap-2">
              Shortlist (Draft)
              <Badge variant="secondary">{draftUniversities.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="finalized" className="flex items-center gap-2">
              Finalized Universities
              <Badge variant="default">{finalizedUniversities.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Draft Shortlist Tab */}
          <TabsContent value="shortlist" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Universities in draft stage. Students and counselors can edit these.
              </p>
              {selectedUniversities.length > 0 && (
                <Button 
                  onClick={() => finalizeMutation.mutate(selectedUniversities)}
                  disabled={finalizeMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Finalize Selected ({selectedUniversities.length})
                </Button>
              )}
            </div>

            {draftUniversities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No universities in shortlist</p>
                <p className="text-sm">Add universities to get started</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedUniversities.length === draftUniversities.length}
                        onCheckedChange={(checked) => {
                          setSelectedUniversities(
                            checked ? draftUniversities.map((uni: University) => uni.id) : []
                          );
                        }}
                      />
                    </TableHead>
                    <TableHead>University</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Added By</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {draftUniversities.map((university: University) => (
                    <TableRow key={university.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedUniversities.includes(university.id)}
                          onCheckedChange={(checked) => {
                            setSelectedUniversities(prev =>
                              checked 
                                ? [...prev, university.id]
                                : prev.filter(id => id !== university.id)
                            );
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{university.name}</div>
                          <div className="text-sm text-gray-500">{university.city}, {university.country}</div>
                          {university.tuitionFee && (
                            <div className="text-sm text-gray-500">${university.tuitionFee.toLocaleString()}/year</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{university.course || 'Not specified'}</span>
                      </TableCell>
                      <TableCell>
                        {getAddedByBadge(university.addedBy)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm">
                            {university.applicationDeadline ? 
                              new Date(university.applicationDeadline).toLocaleDateString() : 
                              'Not set'
                            }
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(university)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Dialog 
                            open={notesDialogOpen === university.id} 
                            onOpenChange={(open) => setNotesDialogOpen(open ? university.id : null)}
                          >
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <FileText className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Internal Notes - {university.name}</DialogTitle>
                              </DialogHeader>
                              <Textarea
                                placeholder="Add private counselor notes..."
                                defaultValue={university.counselorNotes || ''}
                                rows={4}
                                id="notes-textarea"
                              />
                              <DialogFooter>
                                <Button 
                                  onClick={() => {
                                    const textarea = document.getElementById('notes-textarea') as HTMLTextAreaElement;
                                    updateNotesMutation.mutate({
                                      universityId: university.id,
                                      notes: textarea.value
                                    });
                                  }}
                                >
                                  Save Notes
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => removeUniversityMutation.mutate(university.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          {/* Finalized Universities Tab */}
          <TabsContent value="finalized" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Finalized universities are locked and ready for application process.
              </p>
            </div>

            {finalizedUniversities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No finalized universities</p>
                <p className="text-sm">Finalize universities from the shortlist to see them here</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>University</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {finalizedUniversities.map((university: University) => (
                    <TableRow key={university.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4 text-green-600" />
                          <div>
                            <div className="font-medium">{university.name}</div>
                            <div className="text-sm text-gray-500">{university.city}, {university.country}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{university.course || 'Not specified'}</span>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(university)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm">
                            {university.applicationDeadline ? 
                              new Date(university.applicationDeadline).toLocaleDateString() : 
                              'Not set'
                            }
                          </span>
                          {university.deadlineApproaching && (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {university.counselorNotes ? 
                            university.counselorNotes.substring(0, 50) + '...' : 
                            'No notes'
                          }
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {university.status === 'finalized' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => reopenUniversityMutation.mutate(university.id)}
                            >
                              <Unlock className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}