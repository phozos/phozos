import { universityRepository } from "./repositories";
import { insertUniversitySchema, type InsertUniversity } from "@shared/schema";
import { z } from "zod";



export function parseCSVContent(csvContent: string): string[][] {
  const lines = csvContent.trim().split('\n');
  const result: string[][] = [];
  
  for (const line of lines) {
    const row: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"' && !inQuotes) {
        inQuotes = true;
      } else if (char === '"' && inQuotes && nextChar === '"') {
        current += '"';
        i++; // skip next quote
      } else if (char === '"' && inQuotes) {
        inQuotes = false;
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    row.push(current.trim());
    result.push(row);
  }
  
  return result;
}

export function csvRowToUniversity(row: string[], headers: string[]): InsertUniversity {
  const rowObject: Record<string, string> = {};
  
  headers.forEach((header, index) => {
    const cellValue = row[index] || '';
    // Convert 'n/a' and empty values to empty strings, not undefined
    rowObject[header.toLowerCase().replace(/\s+/g, '')] = cellValue.toLowerCase() === 'n/a' ? '' : cellValue;
  });
  
  // Helper function to safely parse numbers and handle empty/NaN values
  const safeParseInt = (value: string) => {
    if (!value || value.trim() === '' || value.toLowerCase() === 'n/a' || value === 'undefined') return undefined;
    const parsed = parseInt(value);
    return isNaN(parsed) ? undefined : parsed;
  };
  
  const safeParseFloat = (value: string) => {
    if (!value || value.trim() === '' || value.toLowerCase() === 'n/a' || value === 'undefined') return undefined;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? undefined : parsed;
  };
  
  // Special handling for fee fields that need to be strings or numbers for schema transformation
  const safeFeeValue = (value: string) => {
    if (!value || value.trim() === '' || value.toLowerCase() === 'n/a' || value === 'undefined') return undefined;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? undefined : parsed;
  };
  
  const safeString = (value: string) => {
    if (!value || value.trim() === '' || value.toLowerCase() === 'n/a') return undefined;
    return value.trim();
  };
  
  // Parse the simplified university data from CSV  
  const university: InsertUniversity = {
    name: rowObject.name || '',
    country: rowObject.country || '',
    city: rowObject.city || '',
    website: safeString(rowObject.website),
    worldRanking: safeParseInt(rowObject.worldranking),
    degreeLevels: rowObject.degreelevels ? rowObject.degreelevels.split(';').map(level => level.trim()) : undefined,
    specialization: safeString(rowObject.specialization),
    offerLetterFee: safeFeeValue(rowObject.offerletterfee)?.toString() ?? null,
    annualFee: safeFeeValue(rowObject.annualfee)?.toString() ?? null,
    admissionRequirements: {
      minimumGPA: safeString(rowObject.minimumgpa),
      ieltsScore: safeString(rowObject.ieltsscore),
      gmatScore: safeString(rowObject.gmatscore),
    },
    alumni1: safeString(rowObject.alumni1),
    alumni2: safeString(rowObject.alumni2),
    alumni3: safeString(rowObject.alumni3),
    description: safeString(rowObject.description),
  };
  
  // Clean up any NaN values that might slip through
  Object.keys(university).forEach(key => {
    const value = (university as any)[key];
    if (typeof value === 'number' && isNaN(value)) {
      (university as any)[key] = undefined;
    }
  });
  
  return university;
}

export async function bulkImportUniversities(csvContent: string): Promise<{
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string; data?: any }>;
}> {
  const rows = parseCSVContent(csvContent);
  
  if (rows.length < 2) {
    throw new Error("CSV must contain at least a header row and one data row");
  }
  
  const headers = rows[0].map(h => h.toLowerCase().replace(/\s+/g, ''));
  const dataRows = rows.slice(1);
  
  let success = 0;
  let failed = 0;
  const errors: Array<{ row: number; error: string; data?: any }> = [];
  
  for (let i = 0; i < dataRows.length; i++) {
    const rowIndex = i + 2; // +2 because we start from row 2 (after header)
    
    try {
      const university = csvRowToUniversity(dataRows[i], headers);
      
      // Validate the university data
      const validatedUniversity = insertUniversitySchema.parse(university);
      
      // Insert into database using the university repository
      await universityRepository.create(validatedUniversity);
      success++;
      
    } catch (error) {
      failed++;
      errors.push({
        row: rowIndex,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: dataRows[i],
      });
    }
  }
  
  return { success, failed, errors };
}

// Generate sample CSV template
export function generateSampleCSV(): string {
  const headers = [
    'name',
    'country',
    'city',
    'website',
    'worldRanking',
    'degreeLevels',
    'specialization',
    'offerLetterFee',
    'annualFee',
    'minimumGPA',
    'ieltsScore',
    'gmatScore',
    'alumni1',
    'alumni2',
    'alumni3',
    'description'
  ];
  
  const sampleRows = [
    [
      'Harvard University',
      'United States',
      'Cambridge',
      'https://harvard.edu',
      '1',
      'Bachelor;Master;PhD',
      'Business',
      '100',
      '50000',
      '3.8',
      '7.0',
      '700',
      'Barack Obama',
      'Mark Zuckerberg',
      'Bill Gates',
      'A prestigious Ivy League university known for academic excellence and research'
    ],
    [
      'Stanford University',
      'United States',
      'Stanford',
      'https://stanford.edu',
      '3',
      'Bachelor;Master;PhD',
      'Engineering',
      '90',
      '52000',
      '3.7',
      '7.0',
      '650',
      'Sergey Brin',
      'Larry Page',
      'Reed Hastings',
      'Leading research university in Silicon Valley'
    ],
    [
      'MIT',
      'United States',
      'Cambridge',
      'https://mit.edu',
      '2',
      'Bachelor;Master;PhD',
      'Technology',
      '85',
      '53000',
      '3.9',
      '7.5',
      '720',
      'Kofi Annan',
      'Richard Feynman',
      'Tim Berners-Lee',
      'World-renowned institute for technology and engineering education'
    ]
  ];
  
  // Convert to proper CSV format
  function csvEscape(value: string): string {
    // Convert to string and handle special characters
    const str = String(value);
    // If the value contains commas, quotes, or newlines, wrap in quotes and escape internal quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
  
  const csvLines = [headers.map(csvEscape).join(',')];
  sampleRows.forEach(row => {
    csvLines.push(row.map(csvEscape).join(','));
  });
  
  return csvLines.join('\n');
}