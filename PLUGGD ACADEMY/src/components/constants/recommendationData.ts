// Clean recommendation data - only types and empty arrays
export interface RecommendationItem {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  rating: number;
  enrollments: number;
  thumbnail: string;
  instructor: string;
  price: number;
  tags: string[];
  lastUpdated: string;
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  courses: string[];
  estimatedDuration: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  category: string;
}

// Empty data arrays - will be populated by Supabase or user actions
export const mockRecommendations: RecommendationItem[] = [];
export const mockLearningPaths: LearningPath[] = [];
export const mockCategories: string[] = [];
export const mockSkills: string[] = [];

// Helper functions remain but return empty results
export const getRecommendationsByCategory = (category: string): RecommendationItem[] => {
  return [];
};

export const getRecommendationsByDifficulty = (difficulty: string): RecommendationItem[] => {
  return [];
};

export const searchRecommendations = (query: string): RecommendationItem[] => {
  return [];
};

export const getPopularRecommendations = (): RecommendationItem[] => {
  return [];
};

export const getRecommendationsForUser = (userPreferences: any): RecommendationItem[] => {
  return [];
};