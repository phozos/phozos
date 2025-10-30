import React, { useState, useEffect } from "react";
import { useApiQuery } from "@/hooks/api-hooks";
import { api } from "@/lib/api-client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { SEO } from "@/components/SEO";
import { 
  Search, 
  Globe, 
  GraduationCap, 
  DollarSign, 
  Star,
  Plus,
  Filter,
  Eye,
  Heart,
  MapPin,
  Users,
  Calendar,
  Zap,
  SlidersHorizontal,
  Loader2
} from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { UNIVERSITY_FILTERS } from "@/lib/constants";

// Mock user for demo
const mockUser = {
  id: "user-1",
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@example.com",
  userType: "customer"
};

interface Filters {
  search: string;
  countries: string[];
  fields: string[];
  tuitionRange: [number, number];
  ranking: number | null;
  degreeType: string;
}

export default function Universities() {
  const [user] = useState(mockUser);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    countries: [],
    fields: [],
    tuitionRange: [0, 100000],
    ranking: null,
    degreeType: ""
  });
  const [sortBy, setSortBy] = useState("relevance");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [loadedCount, setLoadedCount] = useState(6); // Start with 6 universities
  const [loadMoreClicks, setLoadMoreClicks] = useState(0); // Track load more clicks (max 3)
  const [allUniversities, setAllUniversities] = useState<any[]>([]); // Store all loaded universities
  const [isLoadingMore, setIsLoadingMore] = useState(false); // Track load more loading state

  // Fetch universities with filters - Future-proof with debouncing and error handling
  const { data: universitiesData, isLoading, isFetching, refetch, error } = useApiQuery<{ universities: any[]; total: number; hasMore: boolean }>(
    [
      "/api/universities", 
      filters.search, 
      filters.countries.join(','), 
      filters.fields.join(','), 
      filters.degreeType,
      filters.tuitionRange[0],
      filters.tuitionRange[1],
      filters.ranking || 0,
      sortBy
    ],
    (() => {
      // Construct query parameters with validation
      const params = new URLSearchParams();
      
      if (filters.search?.trim()) params.append('search', filters.search.trim());
      if (filters.countries.length > 0) params.append('country', filters.countries.join(','));
      if (filters.fields.length > 0) params.append('fields', filters.fields.join(','));
      if (filters.degreeType?.trim()) params.append('degreeType', filters.degreeType.trim());
      if (filters.tuitionRange[0] > 0) params.append('minTuition', filters.tuitionRange[0].toString());
      if (filters.tuitionRange[1] < 100000) params.append('maxTuition', filters.tuitionRange[1].toString());
      if (filters.ranking) params.append('maxRanking', filters.ranking.toString());
      if (sortBy !== 'relevance') params.append('sortBy', sortBy);
      params.append('limit', '6'); // Always fetch 6 universities initially
      
      return `/api/universities${params.toString() ? `?${params.toString()}` : ''}`;
    })(),
    undefined,
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2, // Retry failed requests twice
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      select: (data: any) => {
        // Validate response structure
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid response format from server');
        }
        
        return {
          universities: Array.isArray(data.universities) ? data.universities : [],
          total: typeof data.total === 'number' ? data.total : 0,
          hasMore: Boolean(data.hasMore)
        };
      }
    }
  );

  // Update allUniversities when new data is fetched
  React.useEffect(() => {
    if (universitiesData?.universities) {
      setAllUniversities(universitiesData.universities);
    }
  }, [universitiesData]);

  const universities = allUniversities || [];
  const totalCount = universitiesData?.total || 0;
  const hasMore = universitiesData?.hasMore || false;

  const handleFilterChange = (key: keyof Filters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    // Reset pagination when filters change
    setLoadedCount(6);
    setLoadMoreClicks(0);
    setAllUniversities([]); // Clear existing universities
  };

  const handleLoadMore = async () => {
    if (loadMoreClicks >= 3 || loadedCount >= 18 || isLoadingMore) {
      return; // Prevent multiple clicks or exceed limits
    }
    
    setIsLoadingMore(true);
    
    try {
      // Construct query parameters for additional universities
      const params = new URLSearchParams();
      
      if (filters.search?.trim()) params.append('search', filters.search.trim());
      if (filters.countries.length > 0) params.append('country', filters.countries.join(','));
      if (filters.fields.length > 0) params.append('fields', filters.fields.join(','));
      if (filters.degreeType?.trim()) params.append('degreeType', filters.degreeType.trim());
      if (filters.tuitionRange[0] > 0) params.append('minTuition', filters.tuitionRange[0].toString());
      if (filters.tuitionRange[1] < 100000) params.append('maxTuition', filters.tuitionRange[1].toString());
      if (filters.ranking) params.append('maxRanking', filters.ranking.toString());
      if (sortBy !== 'relevance') params.append('sortBy', sortBy);
      params.append('limit', '6'); // Always fetch 6 more
      params.append('offset', allUniversities.length.toString()); // Skip already loaded universities
      
      const url = `/api/universities${params.toString() ? `?${params.toString()}` : ''}`;
      
      const data = await api.get(url) as any;
      
      if (data?.universities?.length > 0) {
        // Add new universities to existing ones
        setAllUniversities(prev => [...prev, ...data.universities]);
        setLoadedCount(prev => prev + 6);
        setLoadMoreClicks(prev => prev + 1);
      }
    } catch (error) {
      console.error('Load More error:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      countries: [],
      fields: [],
      tuitionRange: [0, 100000],
      ranking: null,
      degreeType: ""
    });
    // Reset pagination when filters are cleared
    setLoadedCount(6);
    setLoadMoreClicks(0);
    setAllUniversities([]); // Clear existing universities
  };

  const activeFiltersCount = Object.entries(filters).reduce((count, [key, value]) => {
    if (key === 'search' && value) return count + 1;
    if (Array.isArray(value) && value.length > 0) return count + 1;
    if (key === 'tuitionRange' && (value[0] > 0 || value[1] < 100000)) return count + 1;
    if (key === 'ranking' && value) return count + 1;
    if (key === 'degreeType' && value) return count + 1;
    return count;
  }, 0);

  // Only show full page loading on initial load (when no data exists)
  if (isLoading && !universitiesData) {
    return (
      <>
        <SEO
          title="University Directory - Phozos Study Abroad"
          description="Explore 500+ universities across 40+ countries. Filter by field of study, tuition, ranking, and location to find your perfect match."
          keywords="university directory, international universities, study abroad destinations, university search"
          canonical="/universities"
          noindex={true}
          nofollow={true}
        />
        
        <div className="min-h-screen bg-background">
          <Header />
          <div className="max-w-7xl mx-auto px-4 pt-24 pb-8">
            <LoadingSkeleton type="card" count={6} />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO
        title="University Directory - Phozos Study Abroad"
        description="Explore 500+ universities across 40+ countries. Filter by field of study, tuition, ranking, and location to find your perfect match."
        keywords="university directory, international universities, study abroad destinations, university search"
        canonical="/universities"
        noindex={true}
        nofollow={true}
      />
      
      <div className="min-h-screen bg-background">
        <Header />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Find Your Perfect University
            </h1>
            <p className="text-muted-foreground">
              Discover and compare universities worldwide with our AI-powered search
            </p>
          </div>

        {/* Search and Filters */}
        <Card className="mb-8 minimal-glass dark:apple-glass-dark border-0">
          <CardContent className="p-6">
            {/* Search Bar */}
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input 
                placeholder="Search universities, courses, or locations..." 
                className="pl-12 pr-32 py-3 text-lg minimal-glass dark:apple-glass-dark border-0 rounded-2xl hover:shadow-[0_4px_16px_0_rgba(31,38,135,0.1)] transition-all duration-300"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
              <Button className="absolute right-2 top-1/2 transform -translate-y-1/2 minimal-glass dark:apple-glass-dark rounded-2xl hover:shadow-[0_6px_20px_0_rgba(31,38,135,0.15)] transition-all duration-300">
                <Zap className="w-4 h-4 mr-2" />
                AI Search
              </Button>
            </div>
            
            {/* Filter Chips */}
            <div className="flex flex-wrap gap-2 mb-6">
              {/* Country Filter */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button 
                    variant="outline"
                    size="sm" 
                    className={`h-10 px-4 minimal-glass dark:apple-glass-dark rounded-2xl hover:shadow-[0_4px_16px_0_rgba(31,38,135,0.1)] transition-all duration-300 ${
                      filters.countries.length > 0 
                        ? 'bg-primary/10 border-primary text-primary dark:bg-primary/20 dark:border-primary dark:text-primary' 
                        : ''
                    }`}
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    Country
                    {filters.countries.length > 0 && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {filters.countries.length}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Filter by Country</SheetTitle>
                    <SheetDescription>
                      Select countries you're interested in studying
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6 space-y-4">
                    {UNIVERSITY_FILTERS.countries.map((country) => (
                      <div key={country} className="flex items-center space-x-2">
                        <Checkbox 
                          id={country}
                          checked={filters.countries.includes(country)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              handleFilterChange('countries', [...filters.countries, country]);
                            } else {
                              handleFilterChange('countries', filters.countries.filter(c => c !== country));
                            }
                          }}
                        />
                        <label htmlFor={country} className="text-sm font-medium cursor-pointer">
                          {country}
                        </label>
                      </div>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>

              {/* Field of Study Filter */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button 
                    variant="outline"
                    size="sm"
                    className={`h-10 px-4 minimal-glass dark:apple-glass-dark rounded-2xl hover:shadow-[0_4px_16px_0_rgba(31,38,135,0.1)] transition-all duration-300 ${
                      filters.fields.length > 0 
                        ? 'bg-primary/10 border-primary text-primary dark:bg-primary/20 dark:border-primary dark:text-primary' 
                        : ''
                    }`}
                  >
                    <GraduationCap className="w-4 h-4 mr-2" />
                    Field of Study
                    {filters.fields.length > 0 && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {filters.fields.length}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Filter by Field of Study</SheetTitle>
                    <SheetDescription>
                      Select your areas of academic interest
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6 space-y-4">
                    {UNIVERSITY_FILTERS.fields.map((field) => (
                      <div key={field} className="flex items-center space-x-2">
                        <Checkbox 
                          id={field}
                          checked={filters.fields.includes(field)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              handleFilterChange('fields', [...filters.fields, field]);
                            } else {
                              handleFilterChange('fields', filters.fields.filter(f => f !== field));
                            }
                          }}
                        />
                        <label htmlFor={field} className="text-sm font-medium cursor-pointer">
                          {field}
                        </label>
                      </div>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>

              {/* Tuition Range Filter */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button 
                    variant="outline"
                    size="sm"
                    className={`h-10 px-4 minimal-glass dark:apple-glass-dark rounded-2xl hover:shadow-[0_4px_16px_0_rgba(31,38,135,0.1)] transition-all duration-300 ${
                      (filters.tuitionRange[0] > 0 || filters.tuitionRange[1] < 100000) 
                        ? 'bg-primary/10 border-primary text-primary dark:bg-primary/20 dark:border-primary dark:text-primary' 
                        : ''
                    }`}
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Tuition Range
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Filter by Tuition Range</SheetTitle>
                    <SheetDescription>
                      Select your budget range for annual tuition
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6 space-y-4">
                    {UNIVERSITY_FILTERS.tuitionRanges.map((range) => (
                      <div key={range.label} className="flex items-center space-x-2">
                        <Checkbox 
                          id={range.label}
                          checked={filters.tuitionRange[0] === range.min && filters.tuitionRange[1] === range.max}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              handleFilterChange('tuitionRange', [range.min, range.max]);
                            } else {
                              handleFilterChange('tuitionRange', [0, 100000]);
                            }
                          }}
                        />
                        <label htmlFor={range.label} className="text-sm font-medium cursor-pointer">
                          {range.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>

              {/* Ranking Filter */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button 
                    variant="outline"
                    size="sm"
                    className={`h-10 px-4 minimal-glass dark:apple-glass-dark rounded-2xl hover:shadow-[0_4px_16px_0_rgba(31,38,135,0.1)] transition-all duration-300 ${
                      filters.ranking 
                        ? 'bg-primary/10 border-primary text-primary dark:bg-primary/20 dark:border-primary dark:text-primary' 
                        : ''
                    }`}
                  >
                    <Star className="w-4 h-4 mr-2" />
                    Ranking
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Filter by University Ranking</SheetTitle>
                    <SheetDescription>
                      Select universities within specific ranking ranges
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6 space-y-4">
                    {UNIVERSITY_FILTERS.rankings.map((ranking) => (
                      <div key={ranking.label} className="flex items-center space-x-2">
                        <Checkbox 
                          id={ranking.label}
                          checked={filters.ranking === ranking.max}
                          onCheckedChange={(checked) => {
                            handleFilterChange('ranking', checked ? ranking.max : null);
                          }}
                        />
                        <label htmlFor={ranking.label} className="text-sm font-medium cursor-pointer">
                          {ranking.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>

              {/* More Filters */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={`h-10 px-4 minimal-glass dark:apple-glass-dark rounded-2xl hover:shadow-[0_4px_16px_0_rgba(31,38,135,0.1)] transition-all duration-300 ${
                      filters.degreeType 
                        ? 'bg-primary/10 border-primary text-primary dark:bg-primary/20 dark:border-primary dark:text-primary' 
                        : ''
                    }`}
                  >
                    <SlidersHorizontal className="w-4 h-4 mr-2" />
                    More Filters
                    {activeFiltersCount > 0 && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-80">
                  <SheetHeader>
                    <SheetTitle>Advanced Filters</SheetTitle>
                    <SheetDescription>
                      Refine your search with detailed criteria
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6 space-y-6">
                    {/* Degree Type */}
                    <div>
                      <label className="text-sm font-medium mb-3 block">
                        Degree Type
                      </label>
                      <Select
                        value={filters.degreeType}
                        onValueChange={(value) => handleFilterChange('degreeType', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select degree type" />
                        </SelectTrigger>
                        <SelectContent>
                          {UNIVERSITY_FILTERS.degreeTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Clear Filters */}
                    <Button 
                      variant="outline" 
                      className="w-full minimal-glass dark:apple-glass-dark rounded-2xl hover:shadow-[0_4px_16px_0_rgba(31,38,135,0.1)] transition-all duration-300"
                      onClick={clearFilters}
                    >
                      Clear All Filters
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Active Filters Display */}
            {(filters.countries.length > 0 || filters.fields.length > 0 || filters.ranking || filters.degreeType || (filters.tuitionRange[0] > 0 || filters.tuitionRange[1] < 100000)) && (
              <div className="mb-4 p-4 minimal-glass dark:apple-glass-dark rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-foreground">Active Filters</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-xs h-6 px-2 hover:bg-destructive/10 hover:text-destructive"
                  >
                    Clear All
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {filters.countries.map((country) => (
                    <Badge key={`country-${country}`} variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {country}
                      <button
                        onClick={() => handleFilterChange('countries', filters.countries.filter(c => c !== country))}
                        className="ml-2 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full w-3 h-3 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                  {filters.fields.map((field) => (
                    <Badge key={`field-${field}`} variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                      {field}
                      <button
                        onClick={() => handleFilterChange('fields', filters.fields.filter(f => f !== field))}
                        className="ml-2 hover:bg-green-200 dark:hover:bg-green-800 rounded-full w-3 h-3 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                  {filters.ranking && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                      Top {filters.ranking}
                      <button
                        onClick={() => handleFilterChange('ranking', null)}
                        className="ml-2 hover:bg-yellow-200 dark:hover:bg-yellow-800 rounded-full w-3 h-3 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                  {filters.degreeType && (
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                      {filters.degreeType}
                      <button
                        onClick={() => handleFilterChange('degreeType', '')}
                        className="ml-2 hover:bg-purple-200 dark:hover:bg-purple-800 rounded-full w-3 h-3 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                  {(filters.tuitionRange[0] > 0 || filters.tuitionRange[1] < 100000) && (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                      ${filters.tuitionRange[0].toLocaleString()} - ${filters.tuitionRange[1].toLocaleString()}
                      <button
                        onClick={() => handleFilterChange('tuitionRange', [0, 100000])}
                        className="ml-2 hover:bg-orange-200 dark:hover:bg-orange-800 rounded-full w-3 h-3 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Results Header */}
            <div className="flex items-center justify-end">
              <div className="flex items-center space-x-4">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40 minimal-glass dark:apple-glass-dark border-0 rounded-2xl hover:shadow-[0_4px_16px_0_rgba(31,38,135,0.1)] transition-all duration-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Relevance</SelectItem>
                    <SelectItem value="ranking">Ranking</SelectItem>
                    <SelectItem value="tuition-low">Tuition: Low to High</SelectItem>
                    <SelectItem value="tuition-high">Tuition: High to Low</SelectItem>
                    <SelectItem value="alphabetical">Alphabetical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {universities.map((university: any) => (
            <Card key={university.id} className="group relative minimal-glass dark:apple-glass-dark rounded-3xl hover:shadow-[0_8px_24px_0_rgba(31,38,135,0.12)] transition-all transform hover:-translate-y-3 animate-float" style={{ animationDelay: `${Math.random() * 3}s` }}>
              <CardContent className="relative p-6 z-10">
                {/* University Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-foreground mb-1">{university.name}</h3>
                    <p className="text-muted-foreground text-sm">{university.city}, {university.country}</p>
                  </div>
                  {university.ranking?.world && (
                    <div className="flex items-center space-x-1 bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 px-3 py-1 rounded-full">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">#{university.ranking.world}</span>
                    </div>
                  )}
                </div>

                {/* Specialization */}
                {university.specialization && (
                  <div className="mb-3">
                    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {university.specialization}
                    </Badge>
                  </div>
                )}

                {/* Description */}
                {university.description && (
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{university.description}</p>
                )}

                {/* Fees Section */}
                <div className="space-y-2 mb-4">
                  {university.offerLetterFee && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Offer Letter Fee:</span>
                      <span className="text-sm font-semibold text-foreground">${university.offerLetterFee}</span>
                    </div>
                  )}
                  {university.annualFee && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Annual Fee:</span>
                      <span className="text-sm font-semibold text-primary">${university.annualFee}/year</span>
                    </div>
                  )}
                  {!university.annualFee && university.tuitionFees?.international?.min && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Annual Fee:</span>
                      <span className="text-sm font-semibold text-primary">${university.tuitionFees.international.min.toLocaleString()}/year</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <Button 
                    className="flex-1 apple-glass dark:apple-glass-dark text-gray-900 dark:text-white hover:shadow-[0_6px_20px_0_rgba(31,38,135,0.15)] rounded-2xl transition-all duration-300" 
                    size="sm"
                    onClick={() => {
                      if (university.website) {
                        window.open(university.website, '_blank', 'noopener,noreferrer');
                      }
                    }}
                  >
                    View Details
                  </Button>
                  <Button variant="outline" size="sm" className="p-2 minimal-glass dark:apple-glass-dark hover:shadow-[0_4px_16px_0_rgba(31,38,135,0.1)] rounded-2xl transition-all duration-300">
                    <Heart className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Loading indicator for fetching more universities */}
        {isLoadingMore && (
          <div className="text-center py-8">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-muted-foreground">Loading more universities...</span>
            </div>
          </div>
        )}

        {/* Load More */}
        {universities.length > 0 && loadMoreClicks < 3 && loadedCount < 18 && !isLoadingMore && (
          <div className="text-center">
            <Button 
              variant="outline" 
              size="lg" 
              onClick={handleLoadMore}
              className="minimal-glass dark:apple-glass-dark rounded-2xl hover:shadow-[0_6px_20px_0_rgba(31,38,135,0.15)] transition-all duration-300"
            >
              <Plus className="w-4 h-4 mr-2" />
              Load More Universities
            </Button>
          </div>
        )}

        {/* Empty State */}
        {universities.length === 0 && (
          <div className="text-center py-12">
            <GraduationCap className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No universities found
            </h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search criteria or filters
            </p>
            <Button onClick={clearFilters}>
              Clear All Filters
            </Button>
          </div>
        )}
      </main>

      <Footer />
    </div>
    </>
  );
}
