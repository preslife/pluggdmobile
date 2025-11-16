import { BookOpen, Map, Target, AlertCircle, TrendingUp, Crown } from 'lucide-react';

export const getTypeIcon = (type: string) => {
  switch (type) {
    case 'course': return BookOpen;
    case 'skill-path': return Map;
    case 'practice': return Target;
    case 'review': return AlertCircle;
    default: return BookOpen;
  }
};

export const getTypeColor = (type: string) => {
  switch (type) {
    case 'course': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    case 'skill-path': return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
    case 'practice': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case 'review': return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
    default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
  }
};

export const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900 dark:text-red-300 dark:border-red-700';
    case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-300 dark:border-yellow-700';
    case 'low': return 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-700';
    default: return 'bg-gray-100 text-gray-700 border-gray-300';
  }
};

export const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'Beginner': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case 'Intermediate': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
    case 'Advanced': return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
  }
};

export const getTrendIcon = (trend: string) => {
  switch (trend) {
    case 'up': return <TrendingUp className="h-3 w-3 text-green-500" />;
    case 'down': return <TrendingUp className="h-3 w-3 text-red-500 rotate-180" />;
    default: return <div className="h-3 w-3 bg-gray-400 rounded-full" />;
  }
};

export const formatConfidence = (confidence: number) => {
  return `${confidence}% match`;
};

export const formatEnrollment = (count: number) => {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k students`;
  }
  return `${count} students`;
};

export const getSkillLevelLabel = (level: number, maxLevel: number) => {
  const percentage = (level / maxLevel) * 100;
  if (percentage >= 80) return 'Expert';
  if (percentage >= 60) return 'Proficient';
  if (percentage >= 40) return 'Intermediate';
  if (percentage >= 20) return 'Beginner';
  return 'Novice';
};

export const filters = [
  { id: 'all', label: 'All Recommendations', icon: 'Sparkles' },
  { id: 'course', label: 'Courses', icon: 'BookOpen' },
  { id: 'skill-path', label: 'Learning Paths', icon: 'Map' },
  { id: 'practice', label: 'Practice Projects', icon: 'Target' },
  { id: 'review', label: 'Review & Strengthen', icon: 'AlertCircle' }
];