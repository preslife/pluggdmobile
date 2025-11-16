import { createClient } from '@supabase/supabase-js'

// These would come from your environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseKey)

// Database Types (auto-generated from Supabase)
export interface User {
  id: string
  email: string
  role: 'student' | 'admin' | 'instructor'
  profile: {
    name: string
    avatar_url?: string
    bio?: string
    preferences?: any
  }
  created_at: string
  updated_at: string
  last_login?: string
}

export interface Course {
  id: string
  title: string
  description: string
  instructor_id: string
  instructor?: User
  content_blocks: any[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  duration_hours: number
  price: number
  is_published: boolean
  thumbnail_url?: string
  tags: string[]
  enrollment_count: number
  rating: number
  created_at: string
  updated_at: string
}

export interface Enrollment {
  id: string
  user_id: string
  course_id: string
  progress: number // 0-100
  completed_at?: string
  quiz_scores: any[]
  time_spent_minutes: number
  last_accessed: string
  enrolled_at: string
}

export interface Achievement {
  id: string
  user_id: string
  badge_type: string
  badge_name: string
  description: string
  points_earned: number
  earned_at: string
}

export interface Discussion {
  id: string
  course_id?: string
  user_id: string
  user?: User
  title: string
  content: string
  replies_count: number
  likes_count: number
  is_pinned: boolean
  created_at: string
  updated_at: string
}

export interface UserAnalytics {
  id: string
  user_id: string
  session_data: {
    total_sessions: number
    avg_session_duration: number
    last_session: string
  }
  learning_metrics: {
    courses_completed: number
    total_time_spent: number
    quiz_average: number
    streak_days: number
  }
  ai_insights: {
    learning_style: string
    recommended_topics: string[]
    difficulty_preference: string
  }
  updated_at: string
}

// Auth Helper Functions
export const auth = {
  // Sign up new user
  signUp: async (email: string, password: string, userData: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    })
    return { data, error }
  },

  // Sign in user
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Get current user
  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },

  // Reset password
  resetPassword: async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email)
    return { data, error }
  }
}

// Database Helper Functions
export const db = {
  // Users
  users: {
    getById: async (id: string) => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single()
      return { data, error }
    },

    update: async (id: string, updates: Partial<User>) => {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      return { data, error }
    }
  },

  // Courses
  courses: {
    getAll: async (filters?: { published?: boolean; instructor_id?: string }) => {
      let query = supabase
        .from('courses')
        .select(`
          *,
          instructor:users(id, profile)
        `)
        .order('created_at', { ascending: false })

      if (filters?.published !== undefined) {
        query = query.eq('is_published', filters.published)
      }
      if (filters?.instructor_id) {
        query = query.eq('instructor_id', filters.instructor_id)
      }

      const { data, error } = await query
      return { data, error }
    },

    getById: async (id: string) => {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          instructor:users(id, profile)
        `)
        .eq('id', id)
        .single()
      return { data, error }
    },

    create: async (course: Omit<Course, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('courses')
        .insert(course)
        .select()
        .single()
      return { data, error }
    },

    update: async (id: string, updates: Partial<Course>) => {
      const { data, error } = await supabase
        .from('courses')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      return { data, error }
    }
  },

  // Enrollments
  enrollments: {
    getByUserId: async (userId: string) => {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          *,
          course:courses(*)
        `)
        .eq('user_id', userId)
        .order('enrolled_at', { ascending: false })
      return { data, error }
    },

    enroll: async (userId: string, courseId: string) => {
      const { data, error } = await supabase
        .from('enrollments')
        .insert({
          user_id: userId,
          course_id: courseId,
          progress: 0,
          time_spent_minutes: 0,
          enrolled_at: new Date().toISOString(),
          last_accessed: new Date().toISOString()
        })
        .select()
        .single()
      return { data, error }
    },

    updateProgress: async (userId: string, courseId: string, progress: number, timeSpent?: number) => {
      const updates: any = {
        progress,
        last_accessed: new Date().toISOString()
      }
      
      if (timeSpent !== undefined) {
        updates.time_spent_minutes = timeSpent
      }

      if (progress >= 100) {
        updates.completed_at = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('enrollments')
        .update(updates)
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .select()
        .single()
      return { data, error }
    }
  },

  // Achievements
  achievements: {
    getByUserId: async (userId: string) => {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false })
      return { data, error }
    },

    award: async (userId: string, badgeType: string, badgeName: string, description: string, points: number) => {
      const { data, error } = await supabase
        .from('achievements')
        .insert({
          user_id: userId,
          badge_type: badgeType,
          badge_name: badgeName,
          description,
          points_earned: points,
          earned_at: new Date().toISOString()
        })
        .select()
        .single()
      return { data, error }
    }
  },

  // Discussions
  discussions: {
    getByCourseId: async (courseId: string) => {
      const { data, error } = await supabase
        .from('discussions')
        .select(`
          *,
          user:users(id, profile)
        `)
        .eq('course_id', courseId)
        .order('created_at', { ascending: false })
      return { data, error }
    },

    create: async (discussion: Omit<Discussion, 'id' | 'created_at' | 'updated_at' | 'replies_count' | 'likes_count'>) => {
      const { data, error } = await supabase
        .from('discussions')
        .insert({
          ...discussion,
          replies_count: 0,
          likes_count: 0,
          is_pinned: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      return { data, error }
    }
  },

  // Analytics
  analytics: {
    getByUserId: async (userId: string) => {
      const { data, error } = await supabase
        .from('user_analytics')
        .select('*')
        .eq('user_id', userId)
        .single()
      return { data, error }
    },

    updateMetrics: async (userId: string, metrics: Partial<UserAnalytics>) => {
      const { data, error } = await supabase
        .from('user_analytics')
        .upsert({
          user_id: userId,
          ...metrics,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      return { data, error }
    }
  }
}

// Real-time subscriptions
export const subscriptions = {
  // Subscribe to course updates
  subscribeToCourse: (courseId: string, callback: (payload: any) => void) => {
    return supabase
      .channel(`course:${courseId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'courses',
        filter: `id=eq.${courseId}`
      }, callback)
      .subscribe()
  },

  // Subscribe to user notifications
  subscribeToUserNotifications: (userId: string, callback: (payload: any) => void) => {
    return supabase
      .channel(`user:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, callback)
      .subscribe()
  },

  // Subscribe to discussion updates
  subscribeToDiscussions: (courseId: string, callback: (payload: any) => void) => {
    return supabase
      .channel(`discussions:${courseId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'discussions',
        filter: `course_id=eq.${courseId}`
      }, callback)
      .subscribe()
  }
}

// File upload helpers
export const storage = {
  // Upload course content
  uploadCourseContent: async (file: File, courseId: string, contentType: string) => {
    const fileName = `${courseId}/${contentType}/${Date.now()}-${file.name}`
    const { data, error } = await supabase.storage
      .from('course-content')
      .upload(fileName, file)
    return { data, error }
  },

  // Upload user avatar
  uploadAvatar: async (file: File, userId: string) => {
    const fileName = `avatars/${userId}/${Date.now()}-${file.name}`
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, file)
    return { data, error }
  },

  // Get public URL
  getPublicUrl: (bucket: string, path: string) => {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)
    return data.publicUrl
  }
}

// Utility functions
export const utils = {
  // Check if user is enrolled in course
  isEnrolledInCourse: async (userId: string, courseId: string) => {
    const { data, error } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .single()
    
    return { isEnrolled: !!data && !error, error }
  },

  // Get course completion rate
  getCourseCompletionRate: async (courseId: string) => {
    const { data: enrollments, error } = await supabase
      .from('enrollments')
      .select('progress')
      .eq('course_id', courseId)
    
    if (error || !enrollments?.length) return { completionRate: 0, error }
    
    const completed = enrollments.filter(e => e.progress >= 100).length
    const completionRate = (completed / enrollments.length) * 100
    
    return { completionRate, error: null }
  }
}