export const APP_CONFIG = {
  name: "Phozos",
  description: "International Education Platform",
  version: "2.0.0",
  api: {
    baseUrl: "",
    timeout: 30000,
  },
  websocket: {
    reconnectInterval: 5000,
    maxReconnectAttempts: 5,
  },
  features: {
    realTimeNotifications: true,
    aiMatching: true,
    darkMode: true,
    fileUpload: true,
    forum: true,
    analytics: true,
  },
  limits: {
    fileUpload: {
      maxSize: 10, // MB
      maxFiles: 5,
      acceptedTypes: [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"],
    },
    forum: {
      maxPostLength: 5000,
      maxCommentLength: 1000,
    },
    applications: {
      freeUserLimit: 5,
      premiumUserLimit: -1, // unlimited
    },
  },
  subscription: {
    tiers: {
      free: {
        name: "Explorer",
        price: 0,
        features: [
          "5 University Applications",
          "Basic AI Matching",
          "Community Access",
          "Document Storage (100MB)",
        ],
      },
      premium: {
        name: "Achiever",
        price: 49,
        originalPrice: 99,
        features: [
          "Unlimited Applications",
          "Advanced AI Matching",
          "1-on-1 Counselor Sessions",
          "Essay Review & Feedback",
          "Priority Support",
          "Document Storage (10GB)",
        ],
      },
      elite: {
        name: "Elite",
        price: 149,
        features: [
          "Everything in Achiever",
          "Weekly Counselor Sessions",
          "Scholarship Matching",
          "Interview Preparation",
          "Visa Application Support",
          "Unlimited Storage",
        ],
      },
    },
  },
  theme: {
    colors: {
      primary: "hsl(262, 83%, 58%)",
      primaryLight: "hsl(262, 65%, 65%)",
      amber: "hsl(43, 96%, 56%)",
      yellow: "hsl(48, 87%, 47%)",
      cream: "hsl(33, 36%, 97%)",
      creamDark: "hsl(25, 15%, 90%)",
    },
  },
  routes: {
    auth: {
      login: "/auth/login",
      register: "/auth/register",
      logout: "/auth/logout",
    },
    dashboard: {
      student: "/dashboard",
      admin: "/dashboard/admin",
      team: "/dashboard/team",
    },
    features: {
      universities: "/universities",
      applications: "/applications",
      documents: "/documents",
      community: "/community",
      events: "/events",
      profile: "/profile",
    },
  },
  external: {
    docs: "https://docs.edupath.com",
    support: "https://support.edupath.com",
    blog: "https://blog.edupath.com",
    social: {
      twitter: "https://twitter.com/edupath",
      linkedin: "https://linkedin.com/company/edupath",
      facebook: "https://facebook.com/edupath",
      instagram: "https://instagram.com/edupath",
    },
  },
};

export const UNIVERSITY_FILTERS = {
  countries: [
    "United States",
    "United Kingdom",
    "Canada",
    "Australia",
    "Germany",
    "France",
    "Netherlands",
    "Switzerland",
    "Sweden",
    "Norway",
    "Denmark",
    "Japan",
    "South Korea",
    "Singapore",
    "New Zealand",
  ],
  fields: [
    "Computer Science",
    "Engineering",
    "Business",
    "Medicine",
    "Law",
    "Arts & Humanities",
    "Social Sciences",
    "Natural Sciences",
    "Mathematics",
    "Psychology",
    "Economics",
    "Education",
    "Architecture",
    "Design",
    "Music",
  ],
  degreeTypes: [
    "Bachelor's",
    "Master's",
    "PhD",
    "Certificate",
    "Diploma",
  ],
  tuitionRanges: [
    { label: "Under $10,000", min: 0, max: 10000 },
    { label: "$10,000 - $25,000", min: 10000, max: 25000 },
    { label: "$25,000 - $50,000", min: 25000, max: 50000 },
    { label: "$50,000 - $75,000", min: 50000, max: 75000 },
    { label: "Over $75,000", min: 75000, max: 999999 },
  ],
  rankings: [
    { label: "Top 10", max: 10 },
    { label: "Top 50", max: 50 },
    { label: "Top 100", max: 100 },
    { label: "Top 500", max: 500 },
  ],
};

export const FORUM_CATEGORIES = [
  { id: "general", name: "General Discussion", icon: "💬" },
  { id: "usa_study", name: "USA Study", icon: "🇺🇸" },
  { id: "uk_study", name: "UK Study", icon: "🇬🇧" },
  { id: "canada_study", name: "Canada Study", icon: "🇨🇦" },
  { id: "australia_study", name: "Australia Study", icon: "🇦🇺" },
  { id: "ielts_prep", name: "IELTS Preparation", icon: "📚" },
  { id: "visa_tips", name: "Visa & Immigration", icon: "✈️" },
  { id: "scholarships", name: "Scholarship & Funding", icon: "💰" },
  { id: "europe_study", name: "Germany & Europe Study", icon: "🇪🇺" },
];

export const NOTIFICATION_TYPES = {
  APPLICATION_UPDATE: "application_update",
  DOCUMENT_REMINDER: "document_reminder",
  MESSAGE: "message",
  SYSTEM: "system",
  DEADLINE: "deadline",
} as const;

export const DOCUMENT_TYPES = {
  TRANSCRIPT: "transcript",
  TEST_SCORE: "test_score",
  ESSAY: "essay",
  RECOMMENDATION: "recommendation",
  RESUME: "resume",
  CERTIFICATE: "certificate",
  OTHER: "other",
} as const;

export const APPLICATION_STATUSES = {
  DRAFT: "draft",
  SUBMITTED: "submitted",
  UNDER_REVIEW: "under_review",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  WAITLISTED: "waitlisted",
} as const;
