import React from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  Star, 
  Users, 
  Clock, 
  ArrowRight, 
  PlayCircle,
  Eye,
  ThumbsUp,
  Zap
} from 'lucide-react';
import { motion } from 'motion/react';
import { Recommendation } from './constants/recommendationData';
import { 
  getTypeIcon, 
  getTypeColor, 
  getPriorityColor, 
  getDifficultyColor,
  formatEnrollment 
} from './utils/recommendationHelpers';

interface RecommendationCardProps {
  recommendation: Recommendation;
  index: number;
}

export function RecommendationCard({ recommendation, index }: RecommendationCardProps) {
  const TypeIcon = getTypeIcon(recommendation.type);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -4 }}
    >
      <Card className="border-0 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 group">
        <CardContent className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4 flex-1">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${
                recommendation.priority === 'high' ? 'bg-gradient-to-br from-red-400 to-pink-400' :
                recommendation.priority === 'medium' ? 'bg-gradient-to-br from-yellow-400 to-orange-400' :
                'bg-gradient-to-br from-green-400 to-blue-400'
              } group-hover:scale-110 transition-transform duration-200`}>
                <TypeIcon className="h-6 w-6" />
              </div>
              
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-lg group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors line-clamp-2">
                    {recommendation.title}
                  </h3>
                  <Badge className={`text-xs capitalize ml-2 ${getPriorityColor(recommendation.priority)}`}>
                    {recommendation.priority}
                  </Badge>
                </div>
                
                <p className="text-muted-foreground line-clamp-2">
                  {recommendation.description}
                </p>
              </div>
            </div>
          </div>

          {/* AI Reason */}
          <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="w-5 h-5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <Zap className="h-3 w-3 text-white" />
            </div>
            <p className="text-sm text-purple-700 dark:text-purple-300">{recommendation.reason}</p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Match Score</span>
                <span className="font-medium">{recommendation.matchScore}%</span>
              </div>
              <Progress value={recommendation.matchScore} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Confidence</span>
                <span className="font-medium">{recommendation.confidence}%</span>
              </div>
              <Progress value={recommendation.confidence} className="h-2" />
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {recommendation.estimatedTime}
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {formatEnrollment(recommendation.enrolledCount)}
            </div>
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-current text-yellow-500" />
              {recommendation.rating}
            </div>
          </div>

          {/* Tags & Difficulty */}
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <Badge className={getDifficultyColor(recommendation.difficulty)}>
                {recommendation.difficulty}
              </Badge>
              <Badge className={getTypeColor(recommendation.type)}>
                {recommendation.type.replace('-', ' ')}
              </Badge>
              {recommendation.tags.slice(0, 2).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  #{tag}
                </Badge>
              ))}
              {recommendation.tags.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{recommendation.tags.length - 2}
                </Badge>
              )}
            </div>
          </div>

          {/* Prerequisites & Outcomes */}
          {(recommendation.prerequisites || recommendation.outcomes) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              {recommendation.prerequisites && (
                <div>
                  <p className="text-sm font-medium mb-2">Prerequisites:</p>
                  <div className="space-y-1">
                    {recommendation.prerequisites.slice(0, 2).map(prereq => (
                      <p key={prereq} className="text-xs bg-gray-100 dark:bg-gray-700 rounded px-2 py-1">
                        {prereq}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              
              {recommendation.outcomes && (
                <div>
                  <p className="text-sm font-medium mb-2">You'll learn:</p>
                  <div className="space-y-1">
                    {recommendation.outcomes.slice(0, 2).map(outcome => (
                      <p key={outcome} className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded px-2 py-1">
                        {outcome}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              {recommendation.instructor && (
                <p className="text-sm text-muted-foreground">by {recommendation.instructor}</p>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">
                <ThumbsUp className="h-4 w-4" />
              </Button>
              <Button 
                size="sm"
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                Start Learning
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}