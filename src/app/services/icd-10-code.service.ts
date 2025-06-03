import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { IICD10Code } from '../shared/models/IICD10Code.model';


@Injectable({
  providedIn: 'root'
})
export class ICD10CodeService {
  private icd10Codes: IICD10Code[] = [];
  private _codes = new BehaviorSubject<IICD10Code[]>([]);
  public codes$ = this._codes.asObservable();
  
  constructor() {
    // Initialize with some example ICD-10 codes
    this.initializeCodesList();
  }

  private initializeCodesList(): void {
    this.icd10Codes = [
        // Endocrine, Nutritional and Metabolic Diseases (E00-E89)
        {
          code: 'E11.9',
          shortDescription: 'Type 2 diabetes mellitus without complications',
          longDescription: 'Type 2 diabetes mellitus without complications',
          category: 'Endocrine',
          subCategory: 'Diabetes',
          isValid: true
        },
        {
          code: 'E10.9',
          shortDescription: 'Type 1 diabetes mellitus without complications',
          longDescription: 'Type 1 diabetes mellitus without complications',
          category: 'Endocrine',
          subCategory: 'Diabetes',
          isValid: true
        },
        {
          code: 'E78.0',
          shortDescription: 'Pure hypercholesterolemia',
          longDescription: 'Pure hypercholesterolemia',
          category: 'Endocrine',
          subCategory: 'Metabolic disorders',
          isValid: true
        },
        {
          code: 'E78.5',
          shortDescription: 'Hyperlipidemia, unspecified',
          longDescription: 'Hyperlipidemia, unspecified',
          category: 'Endocrine',
          subCategory: 'Metabolic disorders',
          isValid: true
        },
        {
          code: 'E66.9',
          shortDescription: 'Obesity, unspecified',
          longDescription: 'Obesity, unspecified',
          category: 'Endocrine',
          subCategory: 'Nutritional disorders',
          isValid: true
        },
        
        // Diseases of the Circulatory System (I00-I99)
        {
          code: 'I10',
          shortDescription: 'Essential (primary) hypertension',
          longDescription: 'Essential (primary) hypertension',
          category: 'Circulatory',
          subCategory: 'Hypertensive diseases',
          isValid: true
        },
        {
          code: 'I25.10',
          shortDescription: 'Atherosclerotic heart disease without angina pectoris',
          longDescription: 'Atherosclerotic heart disease of native coronary artery without angina pectoris',
          category: 'Circulatory',
          subCategory: 'Ischemic heart diseases',
          isValid: true
        },
        {
          code: 'I48.91',
          shortDescription: 'Unspecified atrial fibrillation',
          longDescription: 'Unspecified atrial fibrillation',
          category: 'Circulatory',
          subCategory: 'Cardiac arrhythmias',
          isValid: true
        },
        {
          code: 'I50.9',
          shortDescription: 'Heart failure, unspecified',
          longDescription: 'Heart failure, unspecified',
          category: 'Circulatory',
          subCategory: 'Heart failure',
          isValid: true
        },
        
        // Diseases of the Respiratory System (J00-J99)
        {
          code: 'J45.909',
          shortDescription: 'Unspecified asthma, uncomplicated',
          longDescription: 'Unspecified asthma, uncomplicated',
          category: 'Respiratory',
          subCategory: 'Chronic lower respiratory diseases',
          isValid: true
        },
        {
          code: 'J44.9',
          shortDescription: 'Chronic obstructive pulmonary disease, unspecified',
          longDescription: 'Chronic obstructive pulmonary disease, unspecified',
          category: 'Respiratory',
          subCategory: 'Chronic lower respiratory diseases',
          isValid: true
        },
        {
          code: 'J02.9',
          shortDescription: 'Acute pharyngitis, unspecified',
          longDescription: 'Acute pharyngitis, unspecified',
          category: 'Respiratory',
          subCategory: 'Acute upper respiratory infections',
          isValid: true
        },
        
        // Diseases of the Musculoskeletal System and Connective Tissue (M00-M99)
        {
          code: 'M54.5',
          shortDescription: 'Low back pain',
          longDescription: 'Low back pain',
          category: 'Musculoskeletal',
          subCategory: 'Dorsopathies',
          isValid: true
        },
        {
          code: 'M17.9',
          shortDescription: 'Osteoarthritis of knee, unspecified',
          longDescription: 'Osteoarthritis of knee, unspecified',
          category: 'Musculoskeletal',
          subCategory: 'Arthropathies',
          isValid: true
        },
        {
          code: 'M19.90',
          shortDescription: 'Unspecified osteoarthritis, unspecified site',
          longDescription: 'Unspecified osteoarthritis, unspecified site',
          category: 'Musculoskeletal',
          subCategory: 'Arthropathies',
          isValid: true
        },
        {
          code: 'M79.1',
          shortDescription: 'Myalgia',
          longDescription: 'Myalgia',
          category: 'Musculoskeletal',
          subCategory: 'Soft tissue disorders',
          isValid: true
        },
        
        // Mental, Behavioral and Neurodevelopmental disorders (F01-F99)
        {
          code: 'F41.9',
          shortDescription: 'Anxiety disorder, unspecified',
          longDescription: 'Anxiety disorder, unspecified',
          category: 'Mental',
          subCategory: 'Anxiety disorders',
          isValid: true
        },
        {
          code: 'F32.9',
          shortDescription: 'Major depressive disorder, single episode, unspecified',
          longDescription: 'Major depressive disorder, single episode, unspecified',
          category: 'Mental',
          subCategory: 'Mood disorders',
          isValid: true
        },
        {
          code: 'F90.9',
          shortDescription: 'Attention-deficit hyperactivity disorder, unspecified type',
          longDescription: 'Attention-deficit hyperactivity disorder, unspecified type',
          category: 'Mental',
          subCategory: 'Behavioral disorders',
          isValid: true
        },
        {
          code: 'F43.0',
          shortDescription: 'Acute stress reaction',
          longDescription: 'Acute stress reaction',
          category: 'Mental',
          subCategory: 'Stress-related disorders',
          isValid: true
        },
        
        // Diseases of the Digestive System (K00-K95)
        {
          code: 'K21.9',
          shortDescription: 'Gastro-esophageal reflux disease without esophagitis',
          longDescription: 'Gastro-esophageal reflux disease without esophagitis',
          category: 'Digestive',
          subCategory: 'Diseases of esophagus, stomach and duodenum',
          isValid: true
        },
        {
          code: 'K29.70',
          shortDescription: 'Gastritis, unspecified, without bleeding',
          longDescription: 'Gastritis, unspecified, without bleeding',
          category: 'Digestive',
          subCategory: 'Diseases of esophagus, stomach and duodenum',
          isValid: true
        },
        {
          code: 'K57.30',
          shortDescription: 'Diverticulosis of large intestine without perforation or abscess without bleeding',
          longDescription: 'Diverticulosis of large intestine without perforation or abscess without bleeding',
          category: 'Digestive',
          subCategory: 'Diseases of intestines',
          isValid: true
        },
        
        // Diseases of the Nervous System (G00-G99)
        {
          code: 'G43.909',
          shortDescription: 'Migraine, unspecified, not intractable',
          longDescription: 'Migraine, unspecified, not intractable, without status migrainosus',
          category: 'Nervous',
          subCategory: 'Headache syndromes',
          isValid: true
        },
        {
          code: 'G40.909',
          shortDescription: 'Epilepsy, unspecified, not intractable',
          longDescription: 'Epilepsy, unspecified, not intractable, without status epilepticus',
          category: 'Nervous',
          subCategory: 'Episodic and paroxysmal disorders',
          isValid: true
        },
        {
          code: 'G47.00',
          shortDescription: 'Insomnia, unspecified',
          longDescription: 'Insomnia, unspecified',
          category: 'Nervous',
          subCategory: 'Sleep disorders',
          isValid: true
        },
        
        // Diseases of the Genitourinary System (N00-N99)
        {
          code: 'N39.0',
          shortDescription: 'Urinary tract infection, site not specified',
          longDescription: 'Urinary tract infection, site not specified',
          category: 'Genitourinary',
          subCategory: 'Other disorders of urinary system',
          isValid: true
        },
        {
          code: 'N40.0',
          shortDescription: 'Benign prostatic hyperplasia without lower urinary tract symptoms',
          longDescription: 'Benign prostatic hyperplasia without lower urinary tract symptoms',
          category: 'Genitourinary',
          subCategory: 'Diseases of male genital organs',
          isValid: true
        },
        {
          code: 'N92.0',
          shortDescription: 'Excessive and frequent menstruation with regular cycle',
          longDescription: 'Excessive and frequent menstruation with regular cycle',
          category: 'Genitourinary',
          subCategory: 'Disorders of female genital tract',
          isValid: true
        },
        
        // Symptoms, signs and abnormal clinical and laboratory findings (R00-R99)
        {
          code: 'R53.83',
          shortDescription: 'Other fatigue',
          longDescription: 'Other fatigue',
          category: 'Symptoms',
          subCategory: 'General symptoms and signs',
          isValid: true
        },
        {
          code: 'R42',
          shortDescription: 'Dizziness and giddiness',
          longDescription: 'Dizziness and giddiness',
          category: 'Symptoms',
          subCategory: 'Symptoms involving the nervous system',
          isValid: true
        },
        {
          code: 'R10.9',
          shortDescription: 'Unspecified abdominal pain',
          longDescription: 'Unspecified abdominal pain',
          category: 'Symptoms',
          subCategory: 'Symptoms involving the digestive system',
          isValid: true
        },
        {
          code: 'R06.02',
          shortDescription: 'Shortness of breath',
          longDescription: 'Shortness of breath',
          category: 'Symptoms',
          subCategory: 'Symptoms involving the respiratory system',
          isValid: true
        },
        
        // Diseases of the Skin and Subcutaneous Tissue (L00-L99)
        {
          code: 'L30.9',
          shortDescription: 'Dermatitis, unspecified',
          longDescription: 'Dermatitis, unspecified',
          category: 'Skin',
          subCategory: 'Dermatitis and eczema',
          isValid: true
        },
        {
          code: 'L70.0',
          shortDescription: 'Acne vulgaris',
          longDescription: 'Acne vulgaris',
          category: 'Skin',
          subCategory: 'Disorders of skin appendages',
          isValid: true
        },
        
        // Infectious and Parasitic Diseases (A00-B99)
        {
          code: 'B34.9',
          shortDescription: 'Viral infection, unspecified',
          longDescription: 'Viral infection, unspecified',
          category: 'Infectious',
          subCategory: 'Viral infections',
          isValid: true
        },
        {
          code: 'A09',
          shortDescription: 'Infectious gastroenteritis and colitis, unspecified',
          longDescription: 'Infectious gastroenteritis and colitis, unspecified',
          category: 'Infectious',
          subCategory: 'Intestinal infectious diseases',
          isValid: true
        },
        
        // Invalid codes for demonstration
        {
          code: 'ABC.123',
          shortDescription: 'Invalid code example',
          longDescription: 'This is an example of an invalid ICD-10 code',
          category: 'Invalid',
          isValid: false
        },
        {
          code: 'XYZ.999',
          shortDescription: 'Another invalid code',
          longDescription: 'This is another example of an invalid ICD-10 code format',
          category: 'Invalid',
          isValid: false
        }
      ];
    this._codes.next(this.icd10Codes);
  }

  /**
   * Get all ICD-10 codes
   */
  getAllCodes(): IICD10Code[] {
    return [...this.icd10Codes];
  }

  /**
   * Search for ICD-10 codes by various criteria
   * @param searchTerm The term to search for
   * @param searchBy Field to search in (code, shortDescription, etc.)
   */
  searchCodes(searchTerm: string, searchBy: keyof IICD10Code = 'code'): IICD10Code[] {
    if (!searchTerm) return this.getAllCodes();
    
    searchTerm = searchTerm.toLowerCase();
    return this.icd10Codes.filter(code => {
      const fieldValue = String(code[searchBy]).toLowerCase();
      return fieldValue.includes(searchTerm);
    });
  }

  /**
   * Get codes by category
   * @param category The category to filter by
   */
  getCodesByCategory(category: string): IICD10Code[] {
    return this.icd10Codes.filter(code => code.category === category);
  }

  /**
   * Get only valid ICD-10 codes
   */
  getValidCodes(): IICD10Code[] {
    return this.icd10Codes.filter(code => code.isValid);
  }

  /**
   * Get a specific ICD-10 code by its code value
   * @param codeValue The code to search for
   */
  getCodeByValue(codeValue: string): IICD10Code | undefined {
    return this.icd10Codes.find(code => code.code === codeValue);
  }

  /**
   * Add a new ICD-10 code to the local list
   * @param code The code to add
   */
  addCode(code: IICD10Code): void {
    this.icd10Codes.push(code);
    this._codes.next(this.icd10Codes);
  }

  /**
   * Update an existing ICD-10 code
   * @param updatedCode The updated code
   */
  updateCode(updatedCode: IICD10Code): boolean {
    const index = this.icd10Codes.findIndex(code => code.code === updatedCode.code);
    if (index !== -1) {
      this.icd10Codes[index] = updatedCode;
      this._codes.next(this.icd10Codes);
      return true;
    }
    return false;
  }

  /**
   * Get unique categories
   */
  getUniqueCategories(): string[] {
    const categories = new Set<string>();
    this.icd10Codes.forEach(code => {
      if (code.category) {
        categories.add(code.category);
      }
    });
    return Array.from(categories);
  }

  /**
   * Get codes by subcategory
   * @param subCategory The subcategory to filter by
   */
  getCodesBySubCategory(subCategory: string): IICD10Code[] {
    return this.icd10Codes.filter(code => code.subCategory === subCategory);
  }
}