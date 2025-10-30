import { db } from "./db.js";
import { eq } from "drizzle-orm";
import { 
  users, 
  studentProfiles, 
  testimonials as testimonialsTable, 
  studentTimeline,
  forumPostsEnhanced,
  customFields,
  customFieldValues
} from "@shared/schema";
import bcrypt from "bcrypt";

// Sample student data
const sampleStudents = [
  // 10 students with visa approved (will have testimonials)
  {
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah.johnson@gmail.com",
    phone: "+1-555-0101",
    nationality: "USA",
    destinationCountry: "UK",
    intakeYear: "2024",
    status: "visa_approved" as const,
    ieltsScore: 7.5,
    counselor: "Emily Carter",
    hasTestimony: true
  },
  {
    firstName: "Raj",
    lastName: "Patel",
    email: "raj.patel@outlook.com",
    phone: "+91-9876543210",
    nationality: "India",
    destinationCountry: "Canada",
    intakeYear: "2024",
    status: "visa_approved" as const,
    ieltsScore: 8.0,
    counselor: "Michael Brown",
    hasTestimony: true
  },
  {
    firstName: "Maria",
    lastName: "Rodriguez",
    email: "maria.rodriguez@gmail.com",
    phone: "+34-612345678",
    nationality: "Spain",
    destinationCountry: "Australia",
    intakeYear: "2024",
    status: "visa_approved" as const,
    ieltsScore: 7.0,
    counselor: "Sarah Wilson",
    hasTestimony: true
  },
  {
    firstName: "Ahmed",
    lastName: "Hassan",
    email: "ahmed.hassan@outlook.com",
    phone: "+20-1234567890",
    nationality: "Egypt",
    destinationCountry: "USA",
    intakeYear: "2024",
    status: "visa_approved" as const,
    ieltsScore: 7.5,
    counselor: "David Lee",
    hasTestimony: true
  },
  {
    firstName: "Li",
    lastName: "Wei",
    email: "li.wei@gmail.com",
    phone: "+86-13800138000",
    nationality: "China",
    destinationCountry: "UK",
    intakeYear: "2024",
    status: "visa_approved" as const,
    ieltsScore: 8.5,
    counselor: "Emily Carter",
    hasTestimony: true
  },
  {
    firstName: "Anna",
    lastName: "Kowalski",
    email: "anna.kowalski@outlook.com",
    phone: "+48-123456789",
    nationality: "Poland",
    destinationCountry: "Canada",
    intakeYear: "2024",
    status: "visa_approved" as const,
    ieltsScore: 7.0,
    counselor: "Michael Brown",
    hasTestimony: true
  },
  {
    firstName: "Carlos",
    lastName: "Silva",
    email: "carlos.silva@gmail.com",
    phone: "+55-11987654321",
    nationality: "Brazil",
    destinationCountry: "Australia",
    intakeYear: "2024",
    status: "visa_approved" as const,
    ieltsScore: 6.5,
    counselor: "Sarah Wilson",
    hasTestimony: true
  },
  {
    firstName: "Fatima",
    lastName: "Al-Zahra",
    email: "fatima.alzahra@outlook.com",
    phone: "+966-501234567",
    nationality: "Saudi Arabia",
    destinationCountry: "USA",
    intakeYear: "2024",
    status: "visa_approved" as const,
    ieltsScore: 7.5,
    counselor: "David Lee",
    hasTestimony: true
  },
  {
    firstName: "James",
    lastName: "Murphy",
    email: "james.murphy@gmail.com",
    phone: "+353-851234567",
    nationality: "Ireland",
    destinationCountry: "UK",
    intakeYear: "2024",
    status: "visa_approved" as const,
    ieltsScore: 8.0,
    counselor: "Emily Carter",
    hasTestimony: true
  },
  {
    firstName: "Yuki",
    lastName: "Tanaka",
    email: "yuki.tanaka@outlook.com",
    phone: "+81-9012345678",
    nationality: "Japan",
    destinationCountry: "Canada",
    intakeYear: "2024",
    status: "visa_approved" as const,
    ieltsScore: 7.0,
    counselor: "Michael Brown",
    hasTestimony: true
  },
  // 10 students with other statuses
  {
    firstName: "Elena",
    lastName: "Popov",
    email: "elena.popov@gmail.com",
    phone: "+7-9123456789",
    nationality: "Russia",
    destinationCountry: "UK",
    intakeYear: "2025",
    status: "visa_applied" as const,
    ieltsScore: 7.5,
    counselor: "Emily Carter",
    hasTestimony: false
  },
  {
    firstName: "Mohammad",
    lastName: "Khan",
    email: "mohammad.khan@outlook.com",
    phone: "+92-3001234567",
    nationality: "Pakistan",
    destinationCountry: "Canada",
    intakeYear: "2025",
    status: "visa_applied" as const,
    ieltsScore: 6.5,
    counselor: "Michael Brown",
    hasTestimony: false
  },
  {
    firstName: "Sophie",
    lastName: "Dubois",
    email: "sophie.dubois@gmail.com",
    phone: "+33-612345678",
    nationality: "France",
    destinationCountry: "Australia",
    intakeYear: "2025",
    status: "converted" as const,
    ieltsScore: 7.0,
    counselor: "Sarah Wilson",
    hasTestimony: false
  },
  {
    firstName: "Dimitri",
    lastName: "Volkov",
    email: "dimitri.volkov@outlook.com",
    phone: "+380-671234567",
    nationality: "Ukraine",
    destinationCountry: "USA",
    intakeYear: "2025",
    status: "converted" as const,
    ieltsScore: 7.5,
    counselor: "David Lee",
    hasTestimony: false
  },
  {
    firstName: "Priya",
    lastName: "Sharma",
    email: "priya.sharma@gmail.com",
    phone: "+91-8765432109",
    nationality: "India",
    destinationCountry: "UK",
    intakeYear: "2025",
    status: "converted" as const,
    ieltsScore: 8.0,
    counselor: "Emily Carter",
    hasTestimony: false
  },
  {
    firstName: "Gabriel",
    lastName: "Santos",
    email: "gabriel.santos@outlook.com",
    phone: "+351-912345678",
    nationality: "Portugal",
    destinationCountry: "Canada",
    intakeYear: "2025",
    status: "inquiry" as const,
    ieltsScore: 6.0,
    counselor: "Michael Brown",
    hasTestimony: false
  },
  {
    firstName: "Mei",
    lastName: "Chen",
    email: "mei.chen@gmail.com",
    phone: "+886-912345678",
    nationality: "Taiwan",
    destinationCountry: "Australia",
    intakeYear: "2025",
    status: "inquiry" as const,
    ieltsScore: 6.5,
    counselor: "Sarah Wilson",
    hasTestimony: false
  },
  {
    firstName: "Olaf",
    lastName: "Andersen",
    email: "olaf.andersen@outlook.com",
    phone: "+47-98765432",
    nationality: "Norway",
    destinationCountry: "USA",
    intakeYear: "2025",
    status: "inquiry" as const,
    ieltsScore: 7.0,
    counselor: "David Lee",
    hasTestimony: false
  },
  {
    firstName: "Isabella",
    lastName: "Rossi",
    email: "isabella.rossi@gmail.com",
    phone: "+39-3331234567",
    nationality: "Italy",
    destinationCountry: "UK",
    intakeYear: "2025",
    status: "departed" as const,
    ieltsScore: 7.5,
    counselor: "Emily Carter",
    hasTestimony: false
  },
  {
    firstName: "Kwame",
    lastName: "Asante",
    email: "kwame.asante@outlook.com",
    phone: "+233-241234567",
    nationality: "Ghana",
    destinationCountry: "Canada",
    intakeYear: "2025",
    status: "departed" as const,
    ieltsScore: 7.0,
    counselor: "Michael Brown",
    hasTestimony: false
  }
];

// Testimonials for visa-approved students
const testimonials = [
  {
    feedback: "Phozos made my dream of studying in the UK a reality! The counselors were incredibly supportive throughout the entire process, from university selection to visa approval. I couldn't have done it without their expert guidance.",
    photo: "/api/placeholder/150/150"
  },
  {
    feedback: "Moving to Canada for my studies seemed impossible until I found Phozos. Their team helped me navigate the complex visa process and I'm now pursuing my Master's degree in Toronto. Highly recommended!",
    photo: "/api/placeholder/150/150"
  },
  {
    feedback: "The personalized attention I received from Phozos was outstanding. They understood my goals and helped me secure admission to my dream university in Australia. The visa process was smooth thanks to their expertise.",
    photo: "/api/placeholder/150/150"
  },
  {
    feedback: "Phozos's comprehensive support system is unmatched. From test preparation guidance to visa interviews, they were with me every step of the way. Now I'm studying computer science in the USA!",
    photo: "/api/placeholder/150/150"
  },
  {
    feedback: "I was initially overwhelmed by the study abroad process, but Phozos simplified everything. Their counselors are knowledgeable and genuinely care about student success. Thank you for making my UK education possible!",
    photo: "/api/placeholder/150/150"
  },
  {
    feedback: "The team at Phozos is simply amazing. They helped me overcome all challenges and secure my student visa for Canada. Their dedication and professionalism are truly commendable.",
    photo: "/api/placeholder/150/150"
  },
  {
    feedback: "Phozos exceeded my expectations in every way. Their guidance was invaluable in securing my admission to a top Australian university. I'm grateful for their continuous support and expertise.",
    photo: "/api/placeholder/150/150"
  },
  {
    feedback: "Thanks to Phozos, I'm now living my dream of studying in America. Their counselors provided excellent advice and made the visa process stress-free. I highly recommend their services to anyone seeking quality education abroad.",
    photo: "/api/placeholder/150/150"
  },
  {
    feedback: "Phozos's professional approach and attention to detail impressed me from day one. They helped me achieve my goal of studying in the UK, and I couldn't be happier with the outcome.",
    photo: "/api/placeholder/150/150"
  },
  {
    feedback: "The expertise and dedication of Phozos's team made all the difference in my journey to Canada. They turned what seemed like an impossible dream into reality. Forever grateful!",
    photo: "/api/placeholder/150/150"
  }
];

export async function seedSampleData() {
  try {
    console.log("🌱 Starting database seeding...");

    // Check if data already exists
    const existingStudents = await db.select().from(users).where(eq(users.userType, "customer")).limit(1);
    if (existingStudents.length > 0) {
      console.log("✅ Sample data already exists, skipping seeding");
      return;
    }

    // Create counselor users first
    const counselors = [
      { name: "Emily Carter", email: "emily.carter@edupath.com" },
      { name: "Michael Brown", email: "michael.brown@edupath.com" },
      { name: "Sarah Wilson", email: "sarah.wilson@edupath.com" },
      { name: "David Lee", email: "david.lee@edupath.com" }
    ];

    const counselorMap = new Map();
    
    for (const counselor of counselors) {
      const hashedPassword = await bcrypt.hash("counselor123", 10);
      const [newCounselor] = await db.insert(users).values({
        email: counselor.email.toLowerCase(),
        password: hashedPassword,
        userType: "team_member",
        teamRole: "counselor",
        firstName: counselor.name.split(" ")[0],
        lastName: counselor.name.split(" ")[1],
        accountStatus: 'active'
      }).returning();
      
      counselorMap.set(counselor.name, newCounselor.id);
    }

    // Create student users and profiles
    let testimonialIndex = 0;
    
    for (const studentData of sampleStudents) {
      const hashedPassword = await bcrypt.hash("student123", 10);
      
      // Create user
      const [newUser] = await db.insert(users).values({
        email: studentData.email.toLowerCase(),
        password: hashedPassword,
        userType: "customer",
        firstName: studentData.firstName,
        lastName: studentData.lastName,
        accountStatus: 'active'
      }).returning();

      // Create student profile
      const [newProfile] = await db.insert(studentProfiles).values({
        userId: newUser.id,
        phone: studentData.phone,
        nationality: studentData.nationality,
        destinationCountry: studentData.destinationCountry,
        intakeYear: studentData.intakeYear,
        status: studentData.status,
        assignedCounselorId: counselorMap.get(studentData.counselor),
        testScores: {
          ielts: studentData.ieltsScore
        },
        familyInfo: {
          fatherName: `${studentData.firstName}'s Father`,
          motherName: `${studentData.firstName}'s Mother`,
          fatherOccupation: "Engineer",
          motherOccupation: "Teacher",
          familyIncome: 75000,
          siblings: Math.floor(Math.random() * 3)
        },
        educationHistory: [
          {
            institution: "Local High School",
            degree: "High School Diploma",
            fieldOfStudy: "General Studies",
            startYear: "2018",
            endYear: "2022",
            percentage: 85 + Math.random() * 10
          }
        ]
      }).returning();

      // Create timeline entry
      await db.insert(studentTimeline).values({
        studentId: newProfile.id,
        action: "Student Registration",
        description: `${studentData.firstName} ${studentData.lastName} registered as a new student`,
        newStatus: "inquiry",
        performedBy: counselorMap.get(studentData.counselor),
        metadata: { initialContact: "website_form" }
      });

      // Add status progression timeline
      if (studentData.status !== "inquiry") {
        await db.insert(studentTimeline).values({
          studentId: newProfile.id,
          action: "Status Update",
          description: `Student status updated to ${studentData.status}`,
          previousStatus: "inquiry",
          newStatus: studentData.status,
          performedBy: counselorMap.get(studentData.counselor),
          metadata: { reason: "application_progress" }
        });
      }

      // Create testimonial for visa-approved students
      if (studentData.hasTestimony && testimonialIndex < testimonials.length) {
        await db.insert(testimonialsTable).values({
          userId: newUser.id,
          name: `${studentData.firstName} ${studentData.lastName}`,
          destinationCountry: studentData.destinationCountry,
          intake: studentData.intakeYear,
          photo: testimonials[testimonialIndex].photo,
          counselorName: studentData.counselor,
          feedback: testimonials[testimonialIndex].feedback,
          isApproved: true
        });
        testimonialIndex++;
      }
    }

    // Create some sample forum posts
    const forumPosts = [
      {
        title: "IELTS Speaking Tips - How I scored 8.5",
        content: "Hi everyone! I recently took the IELTS exam and scored 8.5 in speaking. Here are my top tips: 1) Practice speaking English daily 2) Watch English movies without subtitles 3) Record yourself speaking and analyze your fluency 4) Work on pronunciation with native speakers. Hope this helps!",
        category: "ielts_prep" as const
      },
      {
        title: "UK Student Visa Timeline - My Experience",
        content: "Just wanted to share my UK student visa timeline to help others plan better. Applied: March 15, Biometrics: March 22, Decision: April 10 (26 days total). Make sure all documents are properly attested and don't forget the TB test if you're from a required country!",
        category: "visa_tips" as const
      },
      {
        title: "Best Universities for Computer Science in Canada",
        content: "I'm planning to apply for Computer Science programs in Canada. Can anyone share their experiences with University of Toronto, UBC, or Waterloo? I'm particularly interested in co-op opportunities and industry connections.",
        category: "canada_study" as const
      },
      {
        title: "Scholarship Opportunities for International Students",
        content: "Has anyone successfully applied for scholarships as an international student? I'm looking for merit-based scholarships for engineering programs. Please share your success stories and tips for writing compelling scholarship essays.",
        category: "general" as const
      }
    ];

    // Get first few student IDs for forum posts
    const students = await db.select().from(users).where(eq(users.userType, "customer")).limit(4);
    
    for (let i = 0; i < forumPosts.length && i < students.length; i++) {
      await db.insert(forumPostsEnhanced).values({
        authorId: students[i].id,
        title: forumPosts[i].title,
        content: forumPosts[i].content,
        category: forumPosts[i].category,
        viewsCount: Math.floor(Math.random() * 100) + 10,
        likesCount: Math.floor(Math.random() * 20) + 1,
        commentsCount: Math.floor(Math.random() * 10) + 1
      });
    }

    console.log("✅ Sample data seeded successfully!");
    console.log(`✅ Created ${sampleStudents.length} students`);
    console.log(`✅ Created ${counselors.length} counselors`);
    console.log(`✅ Created ${testimonials.length} testimonials`);
    console.log(`✅ Created ${forumPosts.length} forum posts`);

  } catch (error) {
    console.error("❌ Error seeding data:", error);
    throw error;
  }
}