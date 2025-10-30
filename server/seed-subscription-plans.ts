import { db } from "./db";
import { subscriptionPlans } from "@shared/schema";

async function seedSubscriptionPlans() {
  console.log("🌱 Seeding subscription plans...");

  try {
    // Clear existing plans (optional)
    await db.delete(subscriptionPlans);

    // Seed the 4 subscription plans
    const plans = [
      {
        name: "Explorer Plan",
        price: "199.00",
        currency: "USD",
        description: "Start Strong. Build Your Foundation.",
        features: [
          "Apply to up to 4 Universities",
          "Apply in 1 Country",
          "University Shortlisting (Public/General Universities)",
          "SOP & LOR Templates + Counselor Tips",
          "Visa Filing Checklist & Support",
          "Document Upload & Review",
          "Full Loan Assistance (with partner banks/NBFCs)",
          "Email Support"
        ],
        maxUniversities: 4,
        maxCountries: 1,
        universityTier: "general" as const,
        supportType: "email" as const,
        turnaroundDays: 4, // 3-5 days average
        includeLoanAssistance: true,
        includeVisaSupport: true,
        includeCounselorSession: false,
        includeScholarshipPlanning: false,
        includeMockInterview: false,
        includeExpertEditing: false,
        includePostAdmitSupport: false,
        includeDedicatedManager: false,
        includeNetworkingEvents: false,
        includeFlightAccommodation: false,
        isBusinessFocused: false,
        displayOrder: 1,
        isActive: true
      },
      {
        name: "Achiever Plan",
        price: "499.00",
        currency: "USD",
        description: "More Countries, More Opportunities, More Support",
        features: [
          "Apply to up to 6 Universities",
          "Apply in up to 2 Countries",
          "Access to Top 500 Ranked Universities",
          "SOP/LOR Review & Feedback",
          "WhatsApp Support",
          "Counselor Strategy Session",
          "Loan Partner Matching + Documentation Help"
        ],
        maxUniversities: 6,
        maxCountries: 2,
        universityTier: "top500" as const,
        supportType: "whatsapp" as const,
        turnaroundDays: 3, // 2-3 days average
        includeLoanAssistance: true,
        includeVisaSupport: true,
        includeCounselorSession: true,
        includeScholarshipPlanning: false,
        includeMockInterview: false,
        includeExpertEditing: false,
        includePostAdmitSupport: false,
        includeDedicatedManager: false,
        includeNetworkingEvents: false,
        includeFlightAccommodation: false,
        isBusinessFocused: false,
        displayOrder: 2,
        isActive: true
      },
      {
        name: "Champion Plan",
        price: "999.00",
        currency: "USD", 
        description: "Advanced Help for High-Achieving Students",
        features: [
          "Apply to up to 6 Universities",
          "Apply in up to 3 Countries",
          "Access to Top 200 Universities",
          "SOP & LOR Editing by Experts",
          "Scholarship & Financial Planning",
          "Mock Visa Interview",
          "Loan Support (Bank liaison + fast-tracking)"
        ],
        maxUniversities: 6,
        maxCountries: 3,
        universityTier: "top200" as const,
        supportType: "phone" as const,
        turnaroundDays: 2, // 1-2 days average
        includeLoanAssistance: true,
        includeVisaSupport: true,
        includeCounselorSession: true,
        includeScholarshipPlanning: true,
        includeMockInterview: true,
        includeExpertEditing: true,
        includePostAdmitSupport: false,
        includeDedicatedManager: false,
        includeNetworkingEvents: false,
        includeFlightAccommodation: false,
        isBusinessFocused: false,
        displayOrder: 3,
        isActive: true
      },
      {
        name: "Legend Plan",
        price: "1999.00",
        currency: "USD",
        description: "For Business-Focused Students Applying to Top Global Programs",
        features: [
          "Apply to up to 10 Universities",
          "Apply in up to 3 Countries",
          "Shortlisting for Top 100 Business Schools & Ivy League Programs",
          "Dedicated Business School Admissions Expert",
          "Deep SOP/Essay Strategy for MBA/MIM",
          "Resume Optimization for Business Schools",
          "LOR Strategy for academic + professional referees",
          "Post-Admit Negotiation Support (Deferral, Scholarship, Conversion)",
          "Premium Loan Support",
          "Flight + Accommodation Advisory",
          "Exclusive Webinars + Networking Events",
          "Dedicated Success Manager"
        ],
        maxUniversities: 10,
        maxCountries: 3,
        universityTier: "top100" as const,
        supportType: "premium" as const,
        turnaroundDays: 1, // Same day fast track
        includeLoanAssistance: true,
        includeVisaSupport: true,
        includeCounselorSession: true,
        includeScholarshipPlanning: true,
        includeMockInterview: true,
        includeExpertEditing: true,
        includePostAdmitSupport: true,
        includeDedicatedManager: true,
        includeNetworkingEvents: true,
        includeFlightAccommodation: true,
        isBusinessFocused: true,
        displayOrder: 4,
        isActive: true
      }
    ];

    // Insert all plans
    const insertedPlans = await db.insert(subscriptionPlans).values(plans).returning();
    
    console.log(`✅ Successfully seeded ${insertedPlans.length} subscription plans:`);
    insertedPlans.forEach(plan => {
      console.log(`   • ${plan.name} - $${plan.price} ${plan.currency}`);
    });

    return insertedPlans;
  } catch (error) {
    console.error("❌ Error seeding subscription plans:", error);
    throw error;
  }
}

// Export the function for use in setup scripts
export { seedSubscriptionPlans };

// Run if called directly (ES module compatible)
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if this file is being run directly
if (process.argv[1] === __filename) {
  seedSubscriptionPlans()
    .then(() => {
      console.log("🎉 Subscription plans seeding completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Failed to seed subscription plans:", error);
      process.exit(1);
    });
}