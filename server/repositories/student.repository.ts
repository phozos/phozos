import { BaseRepository } from './base.repository';
import { 
  StudentProfile, 
  InsertStudentProfile, 
  studentProfiles,
  users
} from '@shared/schema';
import { db } from '../db';
import { eq, and, desc, sql, SQL } from 'drizzle-orm';
import { handleDatabaseError, NotFoundError } from './errors';
import { StudentWithUserDetails, StudentAssignedToCounselor } from '../types/repository-responses';
import { StudentProfileFilters } from '../types/repository-filters';

export interface IStudentRepository {
  findById(id: string): Promise<StudentProfile>;
  findByIdOptional(id: string): Promise<StudentProfile | undefined>;
  findByUserId(userId: string): Promise<StudentProfile | undefined>;
  findAll(filters?: StudentProfileFilters): Promise<StudentProfile[]>;
  findAllWithUserDetails(): Promise<StudentWithUserDetails[]>;
  findAssignedToCounselor(counselorId: string): Promise<StudentAssignedToCounselor[]>;
  create(data: InsertStudentProfile): Promise<StudentProfile>;
  update(id: string, data: Partial<StudentProfile>): Promise<StudentProfile>;
  assignCounselor(studentId: string, counselorId: string): Promise<void>;
  unassign(studentId: string): Promise<void>;
  checkAssignment(counselorId: string, studentId: string): Promise<boolean>;
  delete(id: string): Promise<boolean>;
}

export class StudentRepository extends BaseRepository<StudentProfile, InsertStudentProfile> implements IStudentRepository {
  constructor() {
    super(studentProfiles, 'id');
  }

  async findByUserId(userId: string): Promise<StudentProfile | undefined> {
    try {
      const results = await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, userId))
        .limit(1);
      return results[0];
    } catch (error) {
      handleDatabaseError(error, 'StudentRepository.findByUserId');
    }
  }

  async findAllWithUserDetails(): Promise<StudentWithUserDetails[]> {
    try {
      const counselorUsers = db
        .select()
        .from(users)
        .as('counselor_users');

      const results = await db
        .select({
          id: studentProfiles.id,
          userId: studentProfiles.userId,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          userType: users.userType,
          phone: studentProfiles.phone,
          nationality: studentProfiles.nationality,
          destinationCountry: studentProfiles.destinationCountry,
          intakeYear: studentProfiles.intakeYear,
          status: studentProfiles.status,
          profilePicture: users.profilePicture,
          createdAt: studentProfiles.createdAt,
          currentEducationLevel: studentProfiles.currentEducationLevel,
          intendedMajor: studentProfiles.intendedMajor,
          budgetRange: studentProfiles.budgetRange,
          gpa: studentProfiles.gpa,
          testScores: studentProfiles.testScores,
          academicInterests: studentProfiles.academicInterests,
          extracurriculars: studentProfiles.extracurriculars,
          workExperience: studentProfiles.workExperience,
          accountStatus: users.accountStatus,
          assignedCounselorId: studentProfiles.assignedCounselorId,
          assignedCounselorFirstName: counselorUsers.firstName,
          assignedCounselorLastName: counselorUsers.lastName,
          assignedCounselorEmail: counselorUsers.email
        })
        .from(studentProfiles)
        .leftJoin(users, eq(studentProfiles.userId, users.id))
        .leftJoin(counselorUsers, eq(studentProfiles.assignedCounselorId, counselorUsers.id))
        .orderBy(desc(studentProfiles.createdAt));

      return results.map(student => ({
        ...student,
        gpa: student.gpa ? parseFloat(student.gpa) : null,
        accountStatus: student.accountStatus || 'pending_approval',
        assignedCounselor: student.assignedCounselorId && student.assignedCounselorEmail ? {
          id: student.assignedCounselorId,
          firstName: student.assignedCounselorFirstName,
          lastName: student.assignedCounselorLastName,
          email: student.assignedCounselorEmail
        } : null
      }));
    } catch (error) {
      handleDatabaseError(error, 'StudentRepository.findAllWithUserDetails');
    }
  }

  async findAssignedToCounselor(counselorId: string): Promise<StudentAssignedToCounselor[]> {
    try {
      const results = await db
        .select({
          id: studentProfiles.id,
          userId: studentProfiles.userId,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          phone: studentProfiles.phone,
          nationality: studentProfiles.nationality,
          destinationCountry: studentProfiles.destinationCountry,
          intakeYear: studentProfiles.intakeYear,
          status: studentProfiles.status,
          profilePicture: users.profilePicture,
          createdAt: studentProfiles.createdAt,
          currentEducationLevel: studentProfiles.currentEducationLevel,
          intendedMajor: studentProfiles.intendedMajor,
          budgetRange: studentProfiles.budgetRange,
          gpa: studentProfiles.gpa,
          testScores: studentProfiles.testScores,
          academicInterests: studentProfiles.academicInterests,
          extracurriculars: studentProfiles.extracurriculars,
          workExperience: studentProfiles.workExperience
        })
        .from(studentProfiles)
        .leftJoin(users, eq(studentProfiles.userId, users.id))
        .where(eq(studentProfiles.assignedCounselorId, counselorId))
        .orderBy(desc(studentProfiles.createdAt));

      return results.map(student => ({
        ...student,
        gpa: student.gpa ? parseFloat(student.gpa) : null
      }));
    } catch (error) {
      handleDatabaseError(error, 'StudentRepository.findAssignedToCounselor');
    }
  }

  async assignCounselor(studentId: string, counselorId: string): Promise<void> {
    try {
      const result = await db
        .update(studentProfiles)
        .set({ assignedCounselorId: counselorId })
        .where(eq(studentProfiles.id, studentId))
        .returning();
      
      if (!result[0]) {
        throw new NotFoundError('StudentProfile', studentId);
      }
    } catch (error) {
      handleDatabaseError(error, 'StudentRepository.assignCounselor');
    }
  }

  async unassign(studentId: string): Promise<void> {
    try {
      const result = await db
        .update(studentProfiles)
        .set({ assignedCounselorId: null })
        .where(eq(studentProfiles.id, studentId))
        .returning();
      
      if (!result[0]) {
        throw new NotFoundError('StudentProfile', studentId);
      }
    } catch (error) {
      handleDatabaseError(error, 'StudentRepository.unassign');
    }
  }

  async checkAssignment(counselorId: string, studentId: string): Promise<boolean> {
    try {
      const results = await db
        .select()
        .from(studentProfiles)
        .where(
          and(
            eq(studentProfiles.assignedCounselorId, counselorId),
            eq(studentProfiles.id, studentId)
          )
        )
        .limit(1);
      return results.length > 0;
    } catch (error) {
      handleDatabaseError(error, 'StudentRepository.checkAssignment');
    }
  }

  async findAll(filters?: StudentProfileFilters): Promise<StudentProfile[]> {
    try {
      const conditions: SQL[] = [];
      
      if (filters) {
        if (filters.userId) {
          conditions.push(eq(studentProfiles.userId, filters.userId));
        }
        if (filters.status) {
          conditions.push(eq(studentProfiles.status, filters.status));
        }
        if (filters.assignedCounselorId !== undefined) {
          if (filters.assignedCounselorId === null) {
            conditions.push(sql`${studentProfiles.assignedCounselorId} IS NULL`);
          } else {
            conditions.push(eq(studentProfiles.assignedCounselorId, filters.assignedCounselorId));
          }
        }
        if (filters.nationality) {
          conditions.push(eq(studentProfiles.nationality, filters.nationality));
        }
        if (filters.destinationCountry) {
          conditions.push(eq(studentProfiles.destinationCountry, filters.destinationCountry));
        }
      }
      
      let query = db.select().from(studentProfiles);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }
      
      return await query.orderBy(desc(studentProfiles.createdAt)) as StudentProfile[];
    } catch (error) {
      handleDatabaseError(error, 'StudentRepository.findAll');
    }
  }
}

export const studentRepository = new StudentRepository();
