import React from 'react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { motion } from 'motion/react';
import { 
  BookOpen, 
  Users, 
  BarChart3, 
  Video,
  Award,
  MessageSquare,
  Brain,
  Loader2,
  Sparkles,
  Zap,
  Globe,
  Rocket
} from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'dots' | 'pulse' | 'gradient';
  className?: string;
}

export function LoadingSpinner({ 
  size = 'md', 
  variant = 'default',
  className = '' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  if (variant === 'dots') {
    return (
      <div className={`flex items-center justify-center gap-1 ${className}`}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-blue-500 rounded-full"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.2
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <motion.div
        className={`${sizeClasses[size]} bg-gradient-to-r from-blue-500 to-purple-500 rounded-full ${className}`}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.7, 1, 0.7]
        }}
        transition={{
          duration: 2,
          repeat: Infinity
        }}
      />
    );
  }

  if (variant === 'gradient') {
    return (
      <div className={`relative ${sizeClasses[size]} ${className}`}>
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
        <div className="absolute inset-1 bg-white dark:bg-gray-900 rounded-full" />
      </div>
    );
  }

  return (
    <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-500 ${className}`} />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="p-8 space-y-8 bg-gradient-to-br from-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:to-gray-800 h-full">
      {/* Header Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-8 w-64 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600" />
        <Skeleton className="h-4 w-96 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600" />
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="border-0 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Skeleton className="w-12 h-12 rounded-xl" />
                  <Skeleton className="w-16 h-6 rounded-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-8 w-24 rounded-full" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full rounded-lg" />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
            >
              <Card className="border-0 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Skeleton className="w-10 h-10 rounded-lg" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-3 w-full mb-2" />
                  <Skeleton className="h-3 w-3/4" />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CourseSkeleton() {
  return (
    <div className="p-8 space-y-6">
      {/* Course Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="w-6 h-6 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-10 w-80" />
        <div className="flex items-center gap-4">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>

      {/* Video Player Skeleton */}
      <Card className="border-0 bg-black rounded-xl overflow-hidden">
        <div className="aspect-video relative">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Video className="h-12 w-12 text-gray-400" />
            </motion.div>
          </div>
          <div className="absolute bottom-4 left-4 right-4">
            <Skeleton className="h-2 w-full bg-white/20" />
          </div>
        </div>
      </Card>

      {/* Course Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="border-0 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-6 w-48" />
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
                <Skeleton className="h-4 w-3/4" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-0 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-4 h-4 rounded" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="w-12 h-4" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function PageTransition({ children, isLoading }: { children: React.ReactNode; isLoading?: boolean }) {
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <motion.div
            className="mb-6"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
          </motion.div>
          <motion.h3 
            className="text-lg font-semibold mb-2"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Loading amazing content...
          </motion.h3>
          <p className="text-muted-foreground">Just a moment while we prepare everything</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}

interface FeatureLoadingProps {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  progress?: number;
}

export function FeatureLoading({ icon: Icon, title, description, progress }: FeatureLoadingProps) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center max-w-md">
        <motion.div
          className="mb-6 relative"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto shadow-2xl">
            <Icon className="h-10 w-10 text-white" />
          </div>
          <motion.div
            className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl -z-10"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </motion.div>

        <motion.h3 
          className="text-xl font-semibold mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {title}
        </motion.h3>
        
        <motion.p 
          className="text-muted-foreground mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {description}
        </motion.p>

        {progress !== undefined && (
          <motion.div
            className="space-y-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex justify-between text-sm">
              <span>Loading...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </motion.div>
        )}

        <div className="flex justify-center mt-6">
          <LoadingSpinner variant="gradient" size="md" />
        </div>
      </div>
    </div>
  );
}

export function NetworkError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center max-w-md">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <Globe className="h-10 w-10 text-red-500" />
        </motion.div>

        <h3 className="text-xl font-semibold mb-2">Connection Error</h3>
        <p className="text-muted-foreground mb-6">
          We're having trouble connecting to our servers. Please check your internet connection and try again.
        </p>

        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <button
            onClick={onRetry}
            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all duration-200"
          >
            <Rocket className="h-4 w-4 mr-2 inline" />
            Try Again
          </button>
        </motion.div>
      </div>
    </div>
  );
}