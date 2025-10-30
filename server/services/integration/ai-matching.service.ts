import type { StudentProfile, University, AIMatchingResult } from "@shared/schema";
import { BaseService } from '../base.service';
import { 
  IStudentRepository, 
  IUniversityRepository, 
  IAIMatchingRepository 
} from '../../repositories';
import { container, TYPES } from '../container';
import { ResourceNotFoundError } from '../errors';

interface MatchingFactors {
  academicFit: number;
  locationPreference: number;
  budgetCompatibility: number;
  programAlignment: number;
  admissionChances: number;
}

export class AIMatchingService extends BaseService {
  private readonly WEIGHTS = {
    academicFit: 0.3,
    locationPreference: 0.15,
    budgetCompatibility: 0.25,
    programAlignment: 0.2,
    admissionChances: 0.1
  };

  constructor(
    private studentRepository: IStudentRepository = container.get<IStudentRepository>(TYPES.IStudentRepository),
    private universityRepository: IUniversityRepository = container.get<IUniversityRepository>(TYPES.IUniversityRepository),
    private aiMatchingRepository: IAIMatchingRepository = container.get<IAIMatchingRepository>(TYPES.IAIMatchingRepository)
  ) {
    super();
  }

  public async getMatches(userId: string): Promise<AIMatchingResult[]> {
    try {
      return await this.aiMatchingRepository.findByUser(userId);
    } catch (error) {
      return this.handleError(error, 'AIMatchingService.getMatches');
    }
  }

  public async generateMatches(userId: string): Promise<AIMatchingResult[]> {
    try {
      const profile = await this.studentRepository.findByUserId(userId);
      if (!profile) {
        throw new ResourceNotFoundError('Student Profile', userId);
      }

      const universities = await this.universityRepository.findAll();
      const results: AIMatchingResult[] = [];

      for (const university of universities) {
        const matchScore = this.calculateMatchScore(profile, university);
        const factors = this.calculateFactors(profile, university);
        const reasoningObj = this.generateReasoning(profile, university, factors);

        const result = await this.aiMatchingRepository.create({
          userId,
          universityId: university.id,
          matchScore: matchScore.toString(),
          reasoning: reasoningObj,
          modelVersion: "1.0.0"
        });

        results.push(result);
      }

      return results.sort((a, b) => {
        const scoreA = typeof a.matchScore === 'string' ? parseFloat(a.matchScore) : Number(a.matchScore) || 0;
        const scoreB = typeof b.matchScore === 'string' ? parseFloat(b.matchScore) : Number(b.matchScore) || 0;
        return scoreB - scoreA;
      });
    } catch (error) {
      return this.handleError(error, 'AIMatchingService.generateMatches');
    }
  }

  private calculateMatchScore(profile: StudentProfile, university: University): number {
    const factors = this.calculateFactors(profile, university);
    
    const weightedScore = 
      factors.academicFit * this.WEIGHTS.academicFit +
      factors.locationPreference * this.WEIGHTS.locationPreference +
      factors.budgetCompatibility * this.WEIGHTS.budgetCompatibility +
      factors.programAlignment * this.WEIGHTS.programAlignment +
      factors.admissionChances * this.WEIGHTS.admissionChances;

    return Math.round(weightedScore * 100) / 100;
  }

  private calculateFactors(profile: StudentProfile, university: University): MatchingFactors {
    return {
      academicFit: this.calculateAcademicFit(profile, university),
      locationPreference: this.calculateLocationPreference(profile, university),
      budgetCompatibility: this.calculateBudgetCompatibility(profile, university),
      programAlignment: this.calculateProgramAlignment(profile, university),
      admissionChances: this.calculateAdmissionChances(profile, university)
    };
  }

  private calculateAcademicFit(profile: StudentProfile, university: University): number {
    let score = 0.5;

    if (profile.gpa) {
      const gpa = parseFloat(profile.gpa);
      const minGPA = university.admissionRequirements?.minimumGPA 
        ? parseFloat(university.admissionRequirements.minimumGPA) 
        : 3.0;

      if (gpa >= minGPA + 0.5) score = 1.0;
      else if (gpa >= minGPA) score = 0.8;
      else if (gpa >= minGPA - 0.3) score = 0.6;
      else score = 0.3;
    }

    if (profile.testScores && university.admissionRequirements?.ieltsScore) {
      const ieltsScore = parseFloat(university.admissionRequirements.ieltsScore);
      const hasIELTS = profile.testScores.ielts !== undefined;
      if (hasIELTS && profile.testScores.ielts! >= ieltsScore) {
        score = Math.min(1.0, score + 0.1);
      }
    }

    return score;
  }

  private calculateLocationPreference(profile: StudentProfile, university: University): number {
    if (profile.destinationCountry && university.country) {
      return profile.destinationCountry.toLowerCase() === university.country.toLowerCase() ? 1.0 : 0.3;
    }
    return 0.5;
  }

  private calculateBudgetCompatibility(profile: StudentProfile, university: University): number {
    if (!profile.budgetRange || !university.tuitionFees) {
      return 0.5;
    }

    const budgetRangeStr = String(profile.budgetRange);
    const budgetMax = typeof profile.budgetRange === 'string' 
      ? parseInt(budgetRangeStr.split('-')[1] || '50000')
      : 50000;
    const tuitionMin = university.tuitionFees.international?.min || 
                       university.tuitionFees.domestic?.min || 
                       0;

    if (tuitionMin <= budgetMax * 0.7) return 1.0;
    if (tuitionMin <= budgetMax) return 0.8;
    if (tuitionMin <= budgetMax * 1.2) return 0.5;
    return 0.2;
  }

  private calculateProgramAlignment(profile: StudentProfile, university: University): number {
    if (!profile.intendedMajor || !university.specialization) {
      return 0.5;
    }

    const major = profile.intendedMajor.toLowerCase();
    const specializationStr = typeof university.specialization === 'string' 
      ? university.specialization 
      : String(university.specialization);
    const specializations = specializationStr.toLowerCase().split(',');

    for (const spec of specializations) {
      if (spec.trim().includes(major) || major.includes(spec.trim())) {
        return 1.0;
      }
    }

    return 0.3;
  }

  private calculateAdmissionChances(profile: StudentProfile, university: University): number {
    let score = 0.5;

    if (university.acceptanceRate) {
      const acceptanceRate = parseFloat(university.acceptanceRate.replace('%', ''));
      
      if (acceptanceRate > 50) score = 0.9;
      else if (acceptanceRate > 30) score = 0.7;
      else if (acceptanceRate > 15) score = 0.5;
      else if (acceptanceRate > 5) score = 0.3;
      else score = 0.1;
    }

    return score;
  }

  private generateReasoning(
    profile: StudentProfile, 
    university: University, 
    factors: MatchingFactors
  ): { factors: string[]; weights: Record<string, number>; details: string } {
    const factorsList: string[] = [];

    if (factors.academicFit > 0.7) {
      factorsList.push("Strong academic profile match");
    } else if (factors.academicFit < 0.5) {
      factorsList.push("Academic requirements may be challenging");
    }

    if (factors.locationPreference > 0.8) {
      factorsList.push("Matches preferred location");
    }

    if (factors.budgetCompatibility > 0.7) {
      factorsList.push("Within budget range");
    } else if (factors.budgetCompatibility < 0.5) {
      factorsList.push("May exceed budget");
    }

    if (factors.programAlignment > 0.7) {
      factorsList.push("Excellent program alignment");
    }

    return {
      factors: factorsList,
      weights: {
        academicFit: factors.academicFit,
        locationPreference: factors.locationPreference,
        budgetCompatibility: factors.budgetCompatibility,
        programAlignment: factors.programAlignment,
        admissionChances: factors.admissionChances
      },
      details: factorsList.join(". ") + (factorsList.length > 0 ? "." : "No specific factors identified.")
    };
  }
}

// Export singleton instance
export const aiMatchingService = new AIMatchingService();
