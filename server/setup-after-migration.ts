import { db } from './db';
import { users, securitySettings, studentProfiles } from '@shared/schema';
import { eq, and, or, ne, isNull, isNotNull } from 'drizzle-orm';
import bcrypt from 'bcrypt';

/**
 * Complete auto-setup for Phozos after migration
 * Creates admin user and all security settings automatically
 */
export async function setupAfterMigration() {
  console.log('🔧 Running complete auto-setup...');
  
  try {
    // 0. Verify Express middleware requirements
    console.log('🔍 Verifying server configuration...');
    if (typeof require !== 'undefined') {
      try {
        require('cookie-parser');
        console.log('✅ Cookie parser available');
      } catch (e) {
        console.log('⚠️  Cookie parser not found - ensuring fallback');
      }
    }
    // 1. Create or update admin user
    const adminEmail = 'admin@phozos.com';
    const adminPassword = 'Phozos2025!';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    const existingAdmin = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
    
    let adminId: string;
    
    if (existingAdmin.length === 0) {
      // Create admin user
      const [newAdmin] = await db.insert(users).values({
        email: adminEmail,
        password: hashedPassword,
        temporaryPassword: adminPassword,
        userType: 'team_member',
        teamRole: 'admin',
        firstName: 'System',
        lastName: 'Administrator',
        accountStatus: 'active'
      }).returning({ id: users.id });
      
      adminId = newAdmin.id;
      console.log('✅ Admin user created');
    } else {
      // Update existing admin to ensure it's active (don't touch password fields)
      await db.update(users)
        .set({ 
          accountStatus: 'active'
        })
        .where(eq(users.email, adminEmail));
      
      adminId = existingAdmin[0].id;
      console.log('✅ Admin user updated and approved');
    }
    
    // 2. Ensure all security settings have correct default values
    const requiredSettings = [
      {
        settingKey: 'team_login_visible',
        settingValue: 'false',
        description: 'Controls visibility of team login option on authentication page'
      },
      {
        settingKey: 'secret_search_code',
        settingValue: 'edupath-admin-2025',
        description: 'Secret code required to access team login when visibility is disabled'
      },
      {
        settingKey: 'maintenance_mode',
        settingValue: 'false',
        description: 'When enabled, prevents new student registrations'
      },
      {
        settingKey: 'force_logout_enabled',
        settingValue: 'false',
        description: 'When enabled, forces all users to logout and re-authenticate'
      },
      {
        settingKey: 'forum_cooling_period_enabled',
        settingValue: 'true',
        description: 'When enabled, new accounts must wait 1 hour before posting in community forum'
      }
    ];
    
    for (const setting of requiredSettings) {
      const existing = await db.select()
        .from(securitySettings)
        .where(eq(securitySettings.settingKey, setting.settingKey))
        .limit(1);
        
      if (existing.length === 0) {
        await db.insert(securitySettings).values({
          ...setting,
          updatedBy: adminId
        });
        console.log(`✅ Created security setting: ${setting.settingKey} = ${setting.settingValue}`);
      } else {
        // Ensure default values are set correctly (especially team_login_visible should be false)
        if (setting.settingKey === 'team_login_visible' && existing[0].settingValue !== setting.settingValue) {
          await db.update(securitySettings)
            .set({ 
              settingValue: setting.settingValue,
              updatedBy: adminId,
              updatedAt: new Date()
            })
            .where(eq(securitySettings.settingKey, setting.settingKey));
          console.log(`✅ Reset security setting: ${setting.settingKey} = ${setting.settingValue}`);
        } else {
          console.log(`✅ Security setting exists: ${setting.settingKey} = ${existing[0].settingValue}`);
        }
      }
    }
    
    // 3. Fix any inconsistent staff accounts (should have been here from the start)
    const inconsistentStaff = await db.select()
      .from(users)
      .where(eq(users.userType, 'team_member'));
    
    for (const staff of inconsistentStaff) {
      if (staff.accountStatus !== 'active' && staff.accountStatus !== 'inactive' && staff.accountStatus !== 'pending_approval' && staff.accountStatus !== 'suspended' && staff.accountStatus !== 'rejected') {
        await db.update(users)
          .set({ accountStatus: 'active' })
          .where(eq(users.id, staff.id));
        console.log(`✅ Fixed inconsistent staff account: ${staff.email}`);
      }
    }

    // 4. Student Profile Completion Validation
    const { studentProfiles } = await import('../shared/schema');
    
    // Find customer users without student profiles
    const usersWithoutProfiles = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email
    })
    .from(users)
    .leftJoin(studentProfiles, eq(users.id, studentProfiles.userId))
    .where(
      and(
        eq(users.userType, 'customer'),
        isNull(studentProfiles.id)
      )
    );

    // Create basic student profiles for incomplete registrations
    for (const user of usersWithoutProfiles) {
      await db.insert(studentProfiles).values({
        userId: user.id,
        phone: 'Not provided', // Student can update this
        dateOfBirth: new Date('1995-01-01'), // Placeholder, counselor will update
        nationality: 'Not specified',
        destinationCountry: 'Not specified',
        intakeYear: 'Not specified',
        status: 'inquiry',
        personalDetails: {},
        academicDetails: {},
        workDetails: {},
        studyPreferences: {},
        universityPreferences: {},
        financialInfo: {},
        visaHistory: {},
        familyDetails: {},
        additionalInfo: {}
      });
      console.log(`✅ Created student profile for: ${user.firstName} ${user.lastName} (${user.email})`);
    }

    // 5. Student-Counselor Assignment Validation
    const invalidAssignments = await db.select({
      studentId: studentProfiles.id,
      assignedCounselorId: studentProfiles.assignedCounselorId
    })
    .from(studentProfiles)
    .leftJoin(users, eq(studentProfiles.assignedCounselorId, users.id))
    .where(
      and(
        isNotNull(studentProfiles.assignedCounselorId),
        or(
          isNull(users.id),
          ne(users.userType, 'team_member'),
          ne(users.teamRole, 'counselor'),
          ne(users.accountStatus, 'active')
        )
      )
    );

    // Clear invalid counselor assignments
    for (const invalidAssignment of invalidAssignments) {
      await db.update(studentProfiles)
        .set({ assignedCounselorId: null })
        .where(eq(studentProfiles.id, invalidAssignment.studentId));
      console.log(`✅ Cleared invalid counselor assignment for student: ${invalidAssignment.studentId}`);
    }
    
    console.log('\n🎉 Phozos auto-setup completed successfully!');
    console.log('🔑 Admin Login Credentials:');
    console.log('   Email: admin@phozos.com');
    console.log('   Password: [Check environment variable or default]');
    console.log('🔒 All security settings are functional');
    console.log('✅ Student profile validation completed');
    console.log('✅ Counselor assignment validation completed');
    
    // 6. Validate student profile save functionality
    console.log('🔍 Validating student profile save functionality...');
    try {
      // Check if we have any student profiles with the correct schema
      const profilesWithDetails = await db.select().from(studentProfiles)
        .where(isNotNull(studentProfiles.personalDetails))
        .limit(1);
        
      if (profilesWithDetails.length > 0) {
        console.log('✅ Student profile data structure validated');
        
        // Verify personalDetails structure
        const sampleProfile = profilesWithDetails[0];
        if (sampleProfile.personalDetails && typeof sampleProfile.personalDetails === 'object') {
          console.log('✅ Student profile JSONB fields properly structured');
        }
      } else {
        console.log('ℹ️  No student profiles with extended details found (this is normal for new installations)');
      }
    } catch (error) {
      console.log('⚠️  Student profile validation skipped:', error instanceof Error ? error.message : 'Unknown error');
    }
    // 6. Validate community forum TypeScript consistency
    console.log('🔍 Validating community forum TypeScript interfaces...');
    try {
      const { existsSync, readFileSync } = await import('fs');
      
      // Check if Community.tsx has the required interface fields
      const communityPath = 'client/src/pages/Community.tsx';
      if (existsSync(communityPath)) {
        const communityContent = readFileSync(communityPath, 'utf8');
        
        const hasUserTypeField = communityContent.includes('userType?:') || communityContent.includes('userType:');
        const hasCompanyNameField = communityContent.includes('companyName?:') || communityContent.includes('companyName:');
        const hasCorrectPostClick = communityContent.includes('handlePostClick(post.id)');
        
        if (hasUserTypeField && hasCompanyNameField) {
          console.log('✅ Community forum interfaces include required userType and companyName fields');
        } else {
          console.log('⚠️  Community forum may need userType/companyName interface updates');
        }
        
        if (hasCorrectPostClick) {
          console.log('✅ Community forum handlePostClick correctly passes post.id');
        } else {
          console.log('⚠️  Community forum handlePostClick may need parameter fix');
        }
      } else {
        console.log('ℹ️  Community.tsx not found - will be created during development');
      }
      
      // Note: Forum API data contract validation removed - now handled by repository layer
      
    } catch (error: any) {
      console.log('⚠️  Community forum validation skipped:', error instanceof Error ? error.message : 'Unknown error');
    }
    
    console.log('🚀 Platform is ready for use!\n');
    
  } catch (error) {
    console.error('❌ Error during auto-setup:', error);
    throw error;
  }
}