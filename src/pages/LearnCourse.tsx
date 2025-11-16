import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Circle, Lock, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { featureFlags, FeatureFlag } from '@/config/featureFlags';
import { useLmsCourseDetail } from '@/features/learn/hooks/useLmsCourseDetail';
import { useLmsQuizzes } from '@/features/learn/hooks/useLmsQuizzes';
import {
  grantCourseEntitlement,
  recordCoursePurchase,
  recordLessonProgress,
  setCoursePricing,
  submitQuizAttempt,
} from '@/features/learn/api/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import type { LmsCourseAccess, LmsCoursePricing } from '@/features/learn/api/types';
import { getAcademyBasePath, getAcademyCoursePath } from '@/lib/academyRoutes';

const LearnCourse = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const fallbackAcademyPath = getAcademyBasePath();
  const fallbackCourseLink = getAcademyCoursePath(slug ?? '');

  const detailQuery = useLmsCourseDetail(slug);
  const courseId = detailQuery.data?.course.id;
  const accessMeta = detailQuery.data?.access;
  const canAccess = accessMeta?.granted ?? true;
  const quizzesQuery = useLmsQuizzes(courseId, canAccess);

  const mutation = useMutation({
    mutationFn: recordLessonProgress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lms-course-detail', slug] });
      toast({
        title: 'Progress updated',
        description: 'Your lesson progress has been synced to Supabase.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Unable to record progress',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const pricingMutation = useMutation({
    mutationFn: setCoursePricing,
    onSuccess: () => {
      toast({ title: 'Pricing saved', description: 'Course pricing updated successfully.' });
      queryClient.invalidateQueries({ queryKey: ['lms-course-detail', slug] });
    },
    onError: (error: Error) => {
      toast({ title: 'Unable to save pricing', description: error.message, variant: 'destructive' });
    },
  });

  const grantMutation = useMutation({
    mutationFn: grantCourseEntitlement,
    onSuccess: () => {
      toast({ title: 'Access granted', description: 'Learner can now view the course.' });
      setGrantUserId('');
      queryClient.invalidateQueries({ queryKey: ['lms-course-detail', slug] });
    },
    onError: (error: Error) => {
      toast({ title: 'Unable to grant access', description: error.message, variant: 'destructive' });
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: recordCoursePurchase,
    onSuccess: () => {
      toast({
        title: 'Purchase recorded',
        description: 'Access has been unlocked for this course.',
      });
      queryClient.invalidateQueries({ queryKey: ['lms-course-detail', slug] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Purchase failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const quizMutation = useMutation({
    mutationFn: (quizId: string) =>
      submitQuizAttempt({
        quizId,
        answers: {
          score: 100,
          responses: [],
          submitted_via: 'learn_course_quick_complete',
        },
      }),
    onSuccess: () => {
      toast({
        title: 'Quiz logged',
        description: 'Attempt stored in Supabase. Refreshing stats…',
      });
      if (courseId) {
        queryClient.invalidateQueries({ queryKey: ['lms-quizzes', courseId] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Unable to submit quiz attempt',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const [grantUserId, setGrantUserId] = useState('');
  const [pricingForm, setPricingForm] = useState({
    isMembershipOnly: false,
    requiredTier: 'free' as 'free' | 'creator' | 'pro',
    oneTimePrice: '',
    currency: 'usd',
  });

  const handleQuickQuizComplete = (quizId: string) => {
    if (!canAccess) {
      toast({
        title: 'Course locked',
        description: 'Unlock the course before submitting quiz attempts.',
        variant: 'destructive',
      });
      return;
    }
    if (!user) {
      toast({
        title: 'Please sign in',
        description: 'Authenticate to record quiz attempts.',
        variant: 'destructive',
      });
      return;
    }
    quizMutation.mutate(quizId);
  };

  const progress = detailQuery.data?.progress;
  const pricing = detailQuery.data?.course.pricing;
  const completedLessons = useMemo(() => new Set(progress?.completed_lesson_ids ?? []), [progress?.completed_lesson_ids]);
  useEffect(() => {
    if (!detailQuery.data?.course) return;
    setPricingForm({
      isMembershipOnly: detailQuery.data.course.pricing?.is_membership_only ?? false,
      requiredTier: detailQuery.data.course.pricing?.required_tier ?? 'free',
      oneTimePrice: detailQuery.data.course.pricing?.one_time_price_cents
        ? (detailQuery.data.course.pricing.one_time_price_cents / 100).toString()
        : '',
      currency: detailQuery.data.course.pricing?.currency ?? 'usd',
    });
  }, [detailQuery.data?.course?.id, detailQuery.data?.course?.pricing]);

  const handleToggleLesson = (lessonId: string) => {
    if (!detailQuery.data?.course) return;
    if (!canAccess) {
      toast({
        title: 'Course locked',
        description: 'Purchase or upgrade to unlock all lessons.',
        variant: 'destructive',
      });
      return;
    }
    if (!user) {
      toast({
        title: 'Please sign in',
        description: 'You need to be logged in to track progress.',
        variant: 'destructive',
      });
      return;
    }

    const isCompleted = completedLessons.has(lessonId);
    mutation.mutate({
      courseId: detailQuery.data.course.id,
      lessonId,
      completed: !isCompleted,
    });
  };

  if (!featureFlags[FeatureFlag.LMS]) {
    return <Navigate to={fallbackAcademyPath} replace />;
  }

  if (detailQuery.isLoading) {
    return <LearnCourseSkeleton onBack={() => navigate('/learn')} />;
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="px-4 py-10 md:px-8">
        <div className="mx-auto max-w-4xl rounded-3xl border bg-card p-10 text-center">
          <p className="text-lg font-semibold">We couldn’t load that course.</p>
          <p className="mt-2 text-sm text-muted-foreground">The slug may be incorrect or the course is still private.</p>
          <Button className="mt-6" onClick={() => navigate('/learn')}>
            Go back to catalog
          </Button>
        </div>
      </div>
    );
  }

  const { course, lessons } = detailQuery.data;
  const percentComplete = progress?.percent_complete ?? 0;
  const isInstructor = user?.id === course.instructor?.id;

  const handlePurchase = () => {
    if (!user) {
      toast({
        title: 'Please sign in',
        description: 'Authenticate to purchase this course.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }
    if (!course.pricing?.one_time_price_cents || course.pricing.one_time_price_cents <= 0) {
      toast({
        title: 'Course not for sale',
        description: 'This course is controlled via membership rather than a purchase.',
      });
      return;
    }
    purchaseMutation.mutate({
      courseId: course.id,
      amountCents: course.pricing.one_time_price_cents,
      currency: course.pricing.currency ?? 'usd',
    });
  };

  const handleAccessCta = () => {
    if (!accessMeta) {
      navigate(fallbackCourseLink);
      return;
    }
    if (accessMeta.requires_auth) {
      navigate('/auth');
      return;
    }
    if (accessMeta.requires_membership) {
      navigate('/subscription');
      return;
    }
    if (accessMeta.requires_purchase) {
      handlePurchase();
      return;
    }
    navigate(fallbackCourseLink);
  };

  const handleSavePricing = () => {
    if (!course) return;
    const cents =
      pricingForm.oneTimePrice.trim() === ''
        ? null
        : Math.round(parseFloat(pricingForm.oneTimePrice) * 100);
    if (cents !== null && (Number.isNaN(cents) || cents < 0)) {
      toast({
        title: 'Invalid price',
        description: 'Enter a valid numeric price.',
        variant: 'destructive',
      });
      return;
    }
    pricingMutation.mutate({
      courseId: course.id,
      isMembershipOnly: pricingForm.isMembershipOnly,
      requiredTier: pricingForm.requiredTier as 'free' | 'creator' | 'pro',
      oneTimePriceCents: cents,
      currency: pricingForm.currency || 'usd',
      metadata: {},
    });
  };

  const handleGrantAccess = () => {
    if (!course) return;
    if (!grantUserId.trim()) {
      toast({
        title: 'User ID required',
        description: 'Provide a user ID (UUID) to grant access.',
        variant: 'destructive',
      });
      return;
    }
    grantMutation.mutate({
      courseId: course.id,
      userId: grantUserId.trim(),
    });
  };

  return (
    <div className="space-y-8 px-4 py-8 md:px-8">
      <button
        onClick={() => navigate('/learn')}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to catalog
      </button>

      <section className="rounded-3xl border bg-card shadow-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-[2fr,1fr] lg:p-10">
          <div className="space-y-6">
            <Badge variant="secondary" className="bg-muted text-xs uppercase tracking-wide">
              {course.difficulty}
            </Badge>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">{course.title}</h1>
            {course.subtitle && <p className="text-lg text-muted-foreground">{course.subtitle}</p>}
            {course.description && <p className="text-sm leading-relaxed text-muted-foreground">{course.description}</p>}
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span>{course.lesson_count} lessons</span>
              <span>•</span>
              <span>{Math.round((course.duration_minutes ?? 0) / 60) || '<1'} hours</span>
              {course.topics.length > 0 && (
                <>
                  <span>•</span>
                  <span className="flex flex-wrap gap-2">
                    {course.topics.slice(0, 3).map((topic) => (
                      <Badge key={topic} variant="outline" className="rounded-full border-muted text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="space-y-4 rounded-2xl border border-dashed border-muted bg-muted/30 p-5">
            <div>
              <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                <span>Progress</span>
                <span>{percentComplete}%</span>
              </div>
              <Progress value={percentComplete} className="mt-2" />
            </div>
            <div className="text-sm text-muted-foreground">
              Last accessed: {progress?.last_accessed ? new Date(progress.last_accessed).toLocaleString() : 'Never'}
            </div>
            {!canAccess && (
              <Button variant="secondary" onClick={handleAccessCta}>
                {getGateCtaLabel(accessMeta)}
              </Button>
            )}
            {!user && (
              <Button variant="secondary" onClick={() => navigate('/auth')}>
                Sign in to track progress
              </Button>
            )}
            {user && lessons.length > 0 && canAccess && (
              <Button onClick={() => handleToggleLesson(lessons[0].id)} disabled={mutation.isLoading}>
                {completedLessons.has(lessons[0].id) ? 'Restart first lesson' : 'Mark first lesson complete'}
              </Button>
            )}
          </div>
        </div>
      </section>

      {!canAccess && (
        <GateNotice access={accessMeta} pricing={pricing} onCta={handleAccessCta} />
      )}

      <section className="space-y-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Lesson plan</p>
          <h2 className="text-2xl font-semibold text-foreground">Lessons & Materials</h2>
          <p className="text-sm text-muted-foreground">
            {canAccess
              ? 'Every lesson below lives in lms_lessons. Use the complete button to sync progress directly via Supabase.'
              : 'Only preview lessons are visible until you unlock full access.'}
          </p>
        </div>

        <div className="space-y-4">
          {lessons.map((lesson, index) => {
            const isCompleted = completedLessons.has(lesson.id);
            return (
              <Card key={lesson.id} className={cn('border-l-4', isCompleted ? 'border-l-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20' : 'border-l-transparent')}>
                <CardHeader className="flex flex-row items-start gap-4">
                  <div className="mt-1 text-muted-foreground">{String(index + 1).padStart(2, '0')}</div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{lesson.title}</h3>
                      {lesson.is_preview && <Badge variant="outline">Preview</Badge>}
                    </div>
                    {lesson.summary && <p className="text-sm text-muted-foreground">{lesson.summary}</p>}
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <ClockIcon />
                        {lesson.estimated_minutes} min
                      </span>
                      {lesson.video_asset_url && (
                        <span className="inline-flex items-center gap-1">
                          <Play className="h-3.5 w-3.5" />
                          Video available
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {lesson.download_urls && lesson.download_urls.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Resources: {lesson.download_urls.length} attachment{lesson.download_urls.length > 1 ? 's' : ''}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex items-center justify-between border-t bg-muted/30 px-6 py-4">
                  <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    {isCompleted ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4" />}
                    {isCompleted ? 'Completed' : 'Not started'}
                  </div>
                  <Button
                    size="sm"
                    variant={isCompleted ? 'outline' : 'default'}
                    onClick={() => handleToggleLesson(lesson.id)}
                    disabled={mutation.isLoading || !canAccess}
                  >
                    {isCompleted ? 'Mark incomplete' : 'Mark complete'}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
          {lessons.length === 0 && (
            <div className="rounded-2xl border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              Lessons for this course haven’t been published yet. Once the Studio team adds them, this section will populate automatically from `lms_lessons`.
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Quizzes & Assessments</p>
          <h2 className="text-2xl font-semibold text-foreground">Test your knowledge</h2>
          <p className="text-sm text-muted-foreground">
            Quiz metadata and attempt stats come straight from `lms_quizzes` and `lms_quiz_attempts`. Use the quick-log button to post an attempt via the Supabase RPC (no mock data).
          </p>
        </div>
        {quizzesQuery.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(2)].map((_, idx) => (
              <Skeleton key={idx} className="h-32 w-full rounded-2xl" />
            ))}
          </div>
        ) : quizzesQuery.data && quizzesQuery.data.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {quizzesQuery.data.map((quiz) => (
              <Card key={quiz.id} className="flex flex-col justify-between border-muted bg-card/80">
                <CardHeader className="space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">{quiz.title}</h3>
                      {quiz.description && <p className="text-sm text-muted-foreground">{quiz.description}</p>}
                    </div>
                    <Badge variant="outline">Attempts {quiz.stats?.attempt_count ?? 0}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Passing score {quiz.passing_score}% • Max attempts {quiz.max_attempts}
                  </div>
                </CardHeader>
                <CardFooter className="flex items-center justify-between border-t bg-muted/30 text-sm text-muted-foreground">
                  <div>
                    Best score: {quiz.stats?.best_score ?? '—'}%<br />
                    Last attempt:{' '}
                    {quiz.stats?.last_attempt_at ? new Date(quiz.stats.last_attempt_at).toLocaleString() : 'Never'}
                  </div>
                  <Button size="sm" onClick={() => handleQuickQuizComplete(quiz.id)} disabled={!canAccess || !user || quizMutation.isLoading}>
                    Log perfect attempt
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            No quizzes have been published for this course yet.
          </div>
        )}
      </section>

      {isInstructor && (
        <section className="space-y-6 rounded-3xl border bg-card p-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Instructor controls</p>
            <h2 className="text-2xl font-semibold text-foreground">Pricing & Access</h2>
            <p className="text-sm text-muted-foreground">
              Configure course pricing and entitlements via the Supabase RPCs we added for Phase F.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="requiredTier">Membership tier required</Label>
              <select
                id="requiredTier"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={pricingForm.requiredTier}
                onChange={(event) =>
                  setPricingForm((prev) => ({ ...prev, requiredTier: event.target.value as 'free' | 'creator' | 'pro' }))
                }
              >
                <option value="free">Free</option>
                <option value="creator">Creator</option>
                <option value="pro">Pro</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                value={pricingForm.currency}
                onChange={(event) => setPricingForm((prev) => ({ ...prev, currency: event.target.value }))}
                placeholder="usd"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">One-time price</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={pricingForm.oneTimePrice}
                onChange={(event) => setPricingForm((prev) => ({ ...prev, oneTimePrice: event.target.value }))}
                placeholder="e.g. 49.99"
              />
              <p className="text-xs text-muted-foreground">Leave blank if this course should only follow membership rules.</p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={pricingForm.isMembershipOnly}
                  onChange={(event) => setPricingForm((prev) => ({ ...prev, isMembershipOnly: event.target.checked }))}
                />
                Require membership
              </Label>
              <p className="text-xs text-muted-foreground">
                When checked, fans must be on the selected tier (or higher) unless they purchase directly.
              </p>
            </div>
          </div>
          <Button onClick={handleSavePricing} disabled={pricingMutation.isLoading}>
            {pricingMutation.isLoading ? 'Saving…' : 'Save pricing'}
          </Button>
          <div className="space-y-3 border-t pt-4">
            <Label htmlFor="grantUser">Grant manual access</Label>
            <div className="flex flex-col gap-3 md:flex-row">
              <Input
                id="grantUser"
                placeholder="Learner user_id (UUID)"
                value={grantUserId}
                onChange={(event) => setGrantUserId(event.target.value)}
              />
              <Button onClick={handleGrantAccess} disabled={grantMutation.isLoading}>
                {grantMutation.isLoading ? 'Granting…' : 'Grant access'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">This calls `grant_lms_course_entitlement` and unlocks the course immediately.</p>
          </div>
        </section>
      )}
    </div>
  );
};

const LearnCourseSkeleton = ({ onBack }: { onBack: () => void }) => (
  <div className="space-y-8 px-4 py-8 md:px-8">
    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      <ArrowLeft className="h-4 w-4" />
      Back to catalog
    </button>
    <div className="rounded-3xl border bg-card p-10">
      <Skeleton className="h-6 w-28" />
      <Skeleton className="mt-4 h-10 w-2/3" />
      <Skeleton className="mt-3 h-6 w-1/2" />
      <Skeleton className="mt-6 h-32 w-full" />
    </div>
    <Skeleton className="h-10 w-40" />
    <div className="space-y-4">
      {[...Array(3)].map((_, index) => (
        <Skeleton key={index} className="h-32 w-full rounded-2xl" />
      ))}
    </div>
  </div>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

interface GateNoticeProps {
  access?: LmsCourseAccess | null;
  pricing?: LmsCoursePricing | null;
  onCta: () => void;
}

const GateNotice = ({ access, pricing, onCta }: GateNoticeProps) => (
  <section className="rounded-3xl border border-amber-300 bg-amber-50 p-6 text-amber-900 dark:border-amber-500/60 dark:bg-amber-950/20">
    <div className="flex items-start gap-4">
      <div className="rounded-full bg-white/70 p-2 text-amber-600 dark:bg-amber-500/10">
        <Lock className="h-5 w-5" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">This course is locked</h3>
        <p className="text-sm">
          {access?.requires_auth
            ? 'Sign in to see if this course is included with your membership.'
            : access?.requires_membership
            ? `Upgrade to the ${access.required_tier} tier or get a manual grant from the instructor.`
            : 'Purchase access to unlock all lessons and track your progress.'}
        </p>
        {pricing && pricing.one_time_price_cents ? (
          <p className="text-sm font-semibold">
            One-time price: ${(pricing.one_time_price_cents / 100).toFixed(2)} {pricing.currency?.toUpperCase() ?? 'USD'}
          </p>
        ) : null}
        <Button className="mt-2" onClick={onCta}>
          {getGateCtaLabel(access)}
        </Button>
      </div>
    </div>
  </section>
);

const getGateCtaLabel = (access?: LmsCourseAccess | null) => {
  if (access?.requires_auth) return 'Sign in to continue';
  if (access?.requires_membership) return 'Upgrade membership';
  return 'Purchase course access';
};

export default LearnCourse;
