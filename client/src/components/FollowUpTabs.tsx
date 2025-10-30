import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  GraduationCap, 
  Plane,
  DollarSign,
  User,
  Search,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

interface FollowUpTabsProps {
  studentId: string;
  studentName: string;
}

interface FollowUpNote {
  title: string;
  content: string;
  priority: string;
  date: string;
}

type FollowUpCategory = 'leads' | 'applications' | 'visa' | 'loan';

export default function FollowUpTabs({ studentId, studentName }: FollowUpTabsProps) {
  const [activeTab, setActiveTab] = useState<FollowUpCategory>('leads');
  const [isCollapsed, setIsCollapsed] = useState(false);



  // Placeholder data - will be replaced with real API calls
  const categoryData = {
    leads: {
      icon: User,
      title: "Lead Follow-up",
      description: "Track initial contacts and lead conversion",
      notes: [] as FollowUpNote[]
    },
    applications: {
      icon: GraduationCap,
      title: "Application Follow-up", 
      description: "Monitor university application progress",
      notes: [] as FollowUpNote[]
    },
    visa: {
      icon: Plane,
      title: "Visa Follow-up",
      description: "Track visa application and documentation",
      notes: [] as FollowUpNote[]
    },
    loan: {
      icon: DollarSign,
      title: "Loan Follow-up",
      description: "Monitor educational loan applications",
      notes: [] as FollowUpNote[]
    }
  };

  const CategoryCard = ({ category, icon: Icon, title, description, notes }: {
    category: FollowUpCategory;
    icon: any;
    title: string;
    description: string;
    notes: FollowUpNote[];
  }) => (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Icon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2">
          <Badge variant="outline" className="text-xs">
            {notes.length} notes
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] w-full">
          {notes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Icon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No {title.toLowerCase()} notes yet</p>
              <p className="text-xs">Feature coming soon</p>
            </div>
          ) : (
            <div className="space-y-3 pr-4">
              {notes.map((note, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-sm">{note.title}</h4>
                    <Badge variant="outline" className="text-xs">
                      {note.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600">{note.content}</p>
                  <p className="text-xs text-gray-400 mt-1">{note.date}</p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Follow-up Management</h2>
          <p className="text-gray-600">Track all follow-up activities for {studentName}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input 
              placeholder="Search notes..."
              className="pl-9 w-64"
              data-testid="input-search-notes"
            />
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as FollowUpCategory)} className="w-full flex gap-6" orientation="vertical">
        <div className={`flex flex-col space-y-2 transition-all duration-300 ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}>
          {/* Toggle Button */}
          <div className="flex justify-end mb-2">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              data-testid="button-toggle-collapse"
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              )}
            </button>
          </div>

          {Object.entries(categoryData).map(([key, data]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as FollowUpCategory)}
              className={`w-full flex items-center rounded-xl text-left transition-all duration-300 ${
                isCollapsed ? 'p-3 justify-center' : 'gap-3 p-4'
              } ${
                activeTab === key 
                  ? 'bg-gradient-to-br from-purple-500/90 to-purple-600/90 text-white shadow-xl backdrop-blur-sm border border-purple-400/30' 
                  : 'bg-white/70 text-gray-700 hover:bg-white/90 border border-gray-200/50 backdrop-blur-sm'
              }`}
              data-testid={`tab-${key}`}
              title={isCollapsed ? data.title : ''}
              style={{
                background: activeTab === key 
                  ? 'linear-gradient(135deg, rgba(147, 51, 234, 0.95) 0%, rgba(126, 34, 206, 0.95) 100%)'
                  : undefined,
                backdropFilter: 'blur(10px)',
                boxShadow: activeTab === key 
                  ? '0 8px 32px rgba(147, 51, 234, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                  : '0 2px 8px rgba(0, 0, 0, 0.04)'
              }}
            >
              <div className={`rounded-lg transition-all duration-300 ${
                isCollapsed ? 'p-2' : 'p-2'
              } ${
                activeTab === key 
                  ? 'bg-white/20 backdrop-blur-sm' 
                  : 'bg-gray-100/80'
              }`}>
                <data.icon className={`w-5 h-5 transition-colors duration-300 ${
                  activeTab === key ? 'text-white' : 'text-gray-600'
                }`} />
              </div>
              
              {!isCollapsed && (
                <>
                  <div className="flex-1">
                    <div className="font-medium text-base">{data.title}</div>
                  </div>
                  <Badge 
                    variant={activeTab === key ? "secondary" : "outline"} 
                    className={`text-xs transition-all duration-300 ${
                      activeTab === key 
                        ? 'bg-white/20 text-white border-white/30 backdrop-blur-sm' 
                        : 'bg-white/50 text-gray-600 border-gray-300/50'
                    }`}
                  >
                    {data.notes.length}
                  </Badge>
                </>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1">
          {Object.entries(categoryData).map(([key, data]) => (
            <TabsContent key={key} value={key} className="mt-0">
              <CategoryCard
                category={key as FollowUpCategory}
                icon={data.icon}
                title={data.title}
                description={data.description}
                notes={data.notes}
              />
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
}