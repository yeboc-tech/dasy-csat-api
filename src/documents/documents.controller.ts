import { Controller, Get, Param, Query } from '@nestjs/common';
import { DocumentsService, Document, DocumentFilters } from './documents.service';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  async getAllDocuments(): Promise<{ success: boolean; data: Document[]; count: number }> {
    try {
      const documents = await this.documentsService.getAllDocuments();
      return {
        success: true,
        data: documents,
        count: documents.length,
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        count: 0,
      };
    }
  }

  @Get('filtered')
  async getDocumentsWithFilters(
    @Query('grade_levels') gradeLevels?: string,
    @Query('categories') categories?: string,
    @Query('exam_years') examYears?: string,
    @Query('exam_months') examMonths?: string,
  ): Promise<{ success: boolean; data: Document[]; count: number }> {
    try {
      const filters: DocumentFilters = {};

      // Parse query parameters
      if (gradeLevels) {
        filters.grade_levels = gradeLevels.split(',').map(level => level.trim());
      }

      if (categories) {
        filters.categories = categories.split(',').map(category => category.trim());
      }

      if (examYears) {
        filters.exam_years = examYears.split(',').map(year => parseInt(year.trim(), 10));
      }

      if (examMonths) {
        filters.exam_months = examMonths.split(',').map(month => parseInt(month.trim(), 10));
      }

      const documents = await this.documentsService.getDocumentsWithFilters(filters);
      return {
        success: true,
        data: documents,
        count: documents.length,
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        count: 0,
      };
    }
  }

  @Get('filters/available')
  async getAvailableFilterValues(): Promise<{
    success: boolean;
    data: {
      gradeLevels: string[];
      categories: string[];
      examYears: number[];
      examMonths: number[];
    };
  }> {
    try {
      const filterValues = await this.documentsService.getAvailableFilterValues();
      return {
        success: true,
        data: {
          gradeLevels: filterValues.grade_levels,
          categories: filterValues.categories,
          examYears: filterValues.exam_years,
          examMonths: filterValues.exam_months,
        },
      };
    } catch (error) {
      return {
        success: false,
        data: {
          gradeLevels: [],
          categories: [],
          examYears: [],
          examMonths: [],
        },
      };
    }
  }

  @Get('categories/list')
  async getAvailableCategories(): Promise<{ success: boolean; data: string[] }> {
    try {
      const documents = await this.documentsService.getAllDocuments();
      // Use exam_type for categories since that contains "수능", "모의고사", etc.
      const categories = [...new Set(documents.map(doc => doc.exam_type))];
      return {
        success: true,
        data: categories,
      };
    } catch (error) {
      return {
        success: false,
        data: [],
      };
    }
  }

  @Get('subjects/list')
  async getAvailableSubjects(): Promise<{ success: boolean; data: string[] }> {
    try {
      const documents = await this.documentsService.getAllDocuments();
      const subjects = [...new Set(documents.map(doc => doc.subject))];
      return {
        success: true,
        data: subjects,
      };
    } catch (error) {
      return {
        success: false,
        data: [],
      };
    }
  }

  @Get('debug/categories')
  async debugCategories(): Promise<{ success: boolean; data: any }> {
    try {
      const documents = await this.documentsService.getAllDocuments();
      const categories = documents.map(doc => ({ 
        id: doc.id, 
        category: doc.category, 
        exam_type: doc.exam_type,
        categoryLength: doc.category.length 
      }));
      return {
        success: true,
        data: categories,
      };
    } catch (error) {
      return {
        success: false,
        data: { error: error.message },
      };
    }
  }

  @Get('category/:category')
  async getDocumentsByCategory(
    @Param('category') category: string,
  ): Promise<{ success: boolean; data: Document[]; count: number; debug?: string }> {
    try {
      console.log('Searching for category:', category);
      const documents = await this.documentsService.getDocumentsByCategory(category);
      console.log('Found documents:', documents.length);
      return {
        success: true,
        data: documents,
        count: documents.length,
        debug: `Searched for category: ${category}, found: ${documents.length} documents`
      };
    } catch (error) {
      console.error('Error in getDocumentsByCategory:', error);
      return {
        success: false,
        data: [],
        count: 0,
        debug: `Error: ${error.message}`
      };
    }
  }

  @Get('subject/:subject')
  async getDocumentsBySubject(
    @Param('subject') subject: string,
  ): Promise<{ success: boolean; data: Document[]; count: number }> {
    try {
      const documents = await this.documentsService.getDocumentsBySubject(subject);
      return {
        success: true,
        data: documents,
        count: documents.length,
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        count: 0,
      };
    }
  }

  @Get(':id')
  async getDocumentById(
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: Document | null }> {
    try {
      const document = await this.documentsService.getDocumentById(id);
      return {
        success: true,
        data: document,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
      };
    }
  }


} 