import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";
import { 
  GraduationCap, 
  Globe, 
  DollarSign, 
  Users, 
  TrendingUp, 
  Award,
  Building,
  MapPin
} from "lucide-react";

interface University {
  id: string;
  name: string;
  country: string;
  city: string;
  type: string;
  established: number;
  ranking?: {
    world?: number;
    national?: number;
  };
  tuitionFees?: {
    domestic?: string;
    international?: string;
  };
  programs?: string[];
  studentPopulation?: number;
}

interface UniversityAnalyticsProps {
  universities: University[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function UniversityAnalytics({ universities }: UniversityAnalyticsProps) {
  const analytics = useMemo(() => {
    if (!universities || universities.length === 0) {
      return {
        totalUniversities: 0,
        countryDistribution: [],
        typeDistribution: [],
        establishmentTrends: [],
        rankingDistribution: [],
        averageRanking: 0,
        topCountries: [],
        topCities: [],
        oldestUniversities: [],
        newestUniversities: []
      };
    }

    // Country distribution
    const countryCount = universities.reduce((acc, uni) => {
      acc[uni.country] = (acc[uni.country] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const countryDistribution = Object.entries(countryCount)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count);

    // University type distribution
    const typeCount = universities.reduce((acc, uni) => {
      const type = uni.type || 'Unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const typeDistribution = Object.entries(typeCount)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    // Establishment year trends (by decade)
    const establishmentDecades = universities
      .filter(uni => uni.established)
      .reduce((acc, uni) => {
        const decade = Math.floor(uni.established / 10) * 10;
        acc[decade] = (acc[decade] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

    const establishmentTrends = Object.entries(establishmentDecades)
      .map(([decade, count]) => ({ decade: `${decade}s`, count }))
      .sort((a, b) => parseInt(a.decade) - parseInt(b.decade));

    // Ranking analysis
    const rankedUniversities = universities.filter(uni => uni.ranking?.world);
    const averageRanking = rankedUniversities.length > 0 
      ? rankedUniversities.reduce((sum, uni) => sum + (uni.ranking?.world || 0), 0) / rankedUniversities.length
      : 0;

    const rankingRanges = [
      { range: 'Top 100', min: 1, max: 100 },
      { range: '101-300', min: 101, max: 300 },
      { range: '301-500', min: 301, max: 500 },
      { range: '501+', min: 501, max: Infinity }
    ];

    const rankingDistribution = rankingRanges.map(({ range, min, max }) => ({
      range,
      count: rankedUniversities.filter(uni => {
        const rank = uni.ranking?.world || 0;
        return rank >= min && rank <= max;
      }).length
    }));

    // Top locations
    const topCountries = countryDistribution.slice(0, 5);
    
    const cityCount = universities.reduce((acc, uni) => {
      const cityCountry = `${uni.city}, ${uni.country}`;
      acc[cityCountry] = (acc[cityCountry] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topCities = Object.entries(cityCount)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Oldest and newest universities
    const sortedByYear = universities
      .filter(uni => uni.established)
      .sort((a, b) => a.established - b.established);

    const oldestUniversities = sortedByYear.slice(0, 5);
    const newestUniversities = sortedByYear.slice(-5).reverse();

    return {
      totalUniversities: universities.length,
      countryDistribution,
      typeDistribution,
      establishmentTrends,
      rankingDistribution,
      averageRanking: Math.round(averageRanking),
      topCountries,
      topCities,
      oldestUniversities,
      newestUniversities,
      rankedUniversitiesCount: rankedUniversities.length
    };
  }, [universities]);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Universities</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalUniversities}</div>
            <p className="text-xs text-muted-foreground">
              Across {analytics.countryDistribution.length} countries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Countries Covered</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.countryDistribution.length}</div>
            <p className="text-xs text-muted-foreground">
              Top: {analytics.topCountries[0]?.country || 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ranked Universities</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.rankedUniversitiesCount}</div>
            <p className="text-xs text-muted-foreground">
              Avg. ranking: {analytics.averageRanking || 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">University Types</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.typeDistribution.length}</div>
            <p className="text-xs text-muted-foreground">
              Different institution types
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Country Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Universities by Country
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.countryDistribution.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="country" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#0088FE" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* University Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Institution Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.typeDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ type, count }) => `${type}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analytics.typeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Establishment Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Establishment Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.establishmentTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="decade" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#00C49F" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Ranking Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              World Ranking Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.rankingDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#FFBB28" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Top Countries */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Countries</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.topCountries.map((item, index) => (
              <div key={item.country} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{index + 1}</Badge>
                  <span className="font-medium">{item.country}</span>
                </div>
                <span className="text-muted-foreground">{item.count} unis</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top Cities */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Cities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.topCities.map((item, index) => (
              <div key={item.city} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{index + 1}</Badge>
                  <span className="font-medium text-sm">{item.city}</span>
                </div>
                <span className="text-muted-foreground">{item.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Historic Universities */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Oldest Universities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.oldestUniversities.map((uni, index) => (
              <div key={uni.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{index + 1}</Badge>
                  <div>
                    <div className="font-medium text-sm">{uni.name}</div>
                    <div className="text-xs text-muted-foreground">{uni.country}</div>
                  </div>
                </div>
                <span className="text-muted-foreground text-sm">{uni.established}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}