import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface Document {
  id: string;
  title: string;
  subject: string;
  category: string;
  exam_year: number;
  exam_month: number;
  exam_type: string;
  selection: string;
  grade_level: string;
  filename: string;
  storage_path: string;
  created_at: string;
  source?: string;
}

export interface DocumentFilters {
  grade_levels?: string[];
  categories?: string[];
  exam_years?: number[];
  exam_months?: number[];
}

@Injectable()
export class DocumentsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Normalize Korean characters to handle encoding issues
   * This function converts decomposed Hangul characters (NFD) to precomposed form (NFC)
   */
  private normalizeKoreanText(text: string): string {
    if (!text) return text;
    
    // Normalize to NFC (precomposed form)
    // This converts characters like 국어 to 국어
    return text.normalize('NFC');
  }

  /**
   * Normalize input text for consistent Korean character handling
   * This should be used for all user inputs and search queries
   */
  public normalizeInput(text: string): string {
    if (!text) return text;
    
    // Trim whitespace and normalize to NFC
    return text.trim().normalize('NFC');
  }



  async getAllDocuments(): Promise<Document[]> {
    try {
      const supabase = this.supabaseService.getClient();
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch documents: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw new Error(`Error fetching documents: ${error.message}`);
    }
  }

  async getDocumentsWithFilters(filters: DocumentFilters): Promise<Document[]> {
    try {
      const supabase = this.supabaseService.getClient();
      let query = supabase.from('documents').select('*');

      // Apply filters if they exist
      if (filters.grade_levels && filters.grade_levels.length > 0) {
        // Normalize the filter values to ensure proper matching
        const normalizedGradeLevels = filters.grade_levels.map(level => 
          this.normalizeKoreanText(level)
        );
        query = query.in('grade_level', normalizedGradeLevels);
      }

      if (filters.categories && filters.categories.length > 0) {
        // Normalize the filter values to ensure proper matching
        const normalizedCategories = filters.categories.map(category => 
          this.normalizeKoreanText(category)
        );
        query = query.in('category', normalizedCategories);
      }

      if (filters.exam_years && filters.exam_years.length > 0) {
        query = query.in('exam_year', filters.exam_years);
      }

      if (filters.exam_months && filters.exam_months.length > 0) {
        query = query.in('exam_month', filters.exam_months);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch documents with filters: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw new Error(`Error fetching documents with filters: ${error.message}`);
    }
  }

  async getAvailableFilterValues(): Promise<{
    grade_levels: string[];
    categories: string[];
    exam_years: number[];
    exam_months: number[];
  }> {
    try {
      const documents = await this.getAllDocuments();
      
      // Normalize the values to fix encoding issues
      const grade_levels = [...new Set(documents.map(doc => 
        this.normalizeKoreanText(doc.grade_level)
      ))].sort();
      
      // Use exam_type for categories since that contains "수능", "모의고사", etc.
      const categories = [...new Set(documents.map(doc => 
        this.normalizeKoreanText(doc.category)
      ))].sort();
      
      const exam_years = [...new Set(documents.map(doc => doc.exam_year))].sort((a, b) => b - a);
      const exam_months = [...new Set(documents.map(doc => doc.exam_month))].sort((a, b) => a - b);

      return {
        grade_levels,
        categories,
        exam_years,
        exam_months,
      };
    } catch (error) {
      throw new Error(`Error fetching available filter values: ${error.message}`);
    }
  }

  async getDocumentsByCategory(category: string): Promise<Document[]> {
    try {
      const supabase = this.supabaseService.getClient();
      // Normalize the category parameter to ensure proper matching
      const normalizedCategory = this.normalizeKoreanText(category);
      
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('category', normalizedCategory)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch documents by category: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw new Error(`Error fetching documents by category: ${error.message}`);
    }
  }

  async getDocumentsBySubject(subject: string): Promise<Document[]> {
    try {
      const supabase = this.supabaseService.getClient();
      // Normalize the subject parameter to ensure proper matching
      const normalizedSubject = this.normalizeKoreanText(subject);
      
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('subject', normalizedSubject)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch documents by subject: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw new Error(`Error fetching documents by subject: ${error.message}`);
    }
  }

  async getDocumentById(id: string): Promise<Document | null> {
    try {
      const supabase = this.supabaseService.getClient();
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw new Error(`Failed to fetch document: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw new Error(`Error fetching document: ${error.message}`);
    }
  }
} 