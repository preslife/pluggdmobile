import { useMemo } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CalendarClock, CheckCircle2, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  DEFAULT_SCHEDULING_FORM_PATH,
  DEFAULT_SCHEDULING_HELP_PATH,
  FormattedSchedule,
  ScheduleInput,
  formatSchedule,
} from "@/lib/live/formatSchedule";

export interface SessionTemplate {
  id: string;
  label: string;
  title: string;
  description?: string;
  scheduledAt: string;
  durationMinutes: number;
}

export interface LivePreviewSession extends ScheduleInput {
  id: string;
  status?: string;
}

interface LivePreviewProps {
  sessions: LivePreviewSession[];
  loading?: boolean;
  onApplyTemplate?: (template: SessionTemplate) => void;
  onOpenScheduling?: () => void;
  schedulingFormPath?: string;
  helpArticlePath?: string;
}

const TEMPLATE_BLUEPRINTS = [
  {
    id: "tonight-hangout",
    label: "Tonight 7pm hangout",
    title: "Evening hangout",
    description: "Casual check-in with your community.",
    hour: 19,
    durationMinutes: 60,
  },
  {
    id: "weekend-workshop",
    label: "Saturday workshop",
    title: "Weekend workshop",
    description: "Teach something new in 45 minutes.",
    hour: 11,
    durationMinutes: 45,
    daysOffset: 5,
  },
  {
    id: "qa-session",
    label: "30 min AMA",
    title: "Live AMA",
    description: "Answer community questions live.",
    hour: 15,
    durationMinutes: 30,
    daysOffset: 2,
  },
] as const;

const computeFutureSlot = (daysOffset = 0, hour = 18) => {
  const now = new Date();
  const slot = new Date(now);
  slot.setMinutes(0, 0, 0);
  slot.setHours(hour);
  slot.setDate(slot.getDate() + daysOffset);

  if (slot <= now) {
    slot.setDate(slot.getDate() + 1);
  }

  return slot.toISOString();
};

const mapSessionsToValidation = (
  sessions: LivePreviewSession[],
  schedulingFormPath: string,
  helpArticlePath: string,
) =>
  sessions.map((session) => ({
    session,
    validation: formatSchedule(
      {
        title: session.title,
        scheduledAt: session.scheduledAt,
        durationMinutes: session.durationMinutes,
      },
      {
        schedulingFormPath,
        helpArticlePath,
      },
    ),
  }));

export const LivePreview = ({
  sessions,
  loading = false,
  onApplyTemplate,
  onOpenScheduling,
  schedulingFormPath = DEFAULT_SCHEDULING_FORM_PATH,
  helpArticlePath = DEFAULT_SCHEDULING_HELP_PATH,
}: LivePreviewProps) => {
  const validations = useMemo(
    () => mapSessionsToValidation(sessions, schedulingFormPath, helpArticlePath),
    [sessions, schedulingFormPath, helpArticlePath],
  );

  const incomplete = validations.filter(({ validation }) => !validation.isComplete);

  const templates = useMemo<SessionTemplate[]>(
    () =>
      TEMPLATE_BLUEPRINTS.map((blueprint) => ({
        id: blueprint.id,
        label: blueprint.label,
        title: blueprint.title,
        description: blueprint.description,
        durationMinutes: blueprint.durationMinutes,
        scheduledAt: computeFutureSlot(blueprint.daysOffset, blueprint.hour),
      })),
    [],
  );

  if (loading) {
    return null;
  }

  const renderValidation = ({ session, validation }: { session: LivePreviewSession; validation: FormattedSchedule }) => (
    <div key={session.id} className="rounded-md border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">{session.title?.trim() || "Untitled session"}</p>
          <p className="text-xs text-muted-foreground">
            {validation.dateLabel}
            {validation.timeLabel ? ` · ${validation.timeLabel}` : ""}
          </p>
          {!validation.isComplete && validation.warningMessage && (
            <p className="text-xs text-destructive">{validation.warningMessage}</p>
          )}
        </div>
        <Badge variant={validation.isComplete ? "secondary" : "destructive"}>
          {validation.isComplete ? "Ready" : "Needs schedule"}
        </Badge>
      </div>
    </div>
  );

  return (
    <section className="space-y-4" aria-label="Live session preview">
      {incomplete.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Complete your schedule</AlertTitle>
          <AlertDescription>
            <p>
              {incomplete.length === 1
                ? "We found a session that still needs scheduling details."
                : `We found ${incomplete.length} sessions that still need scheduling details.`}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {onOpenScheduling ? (
                <Button size="sm" onClick={onOpenScheduling}>
                  Finish in form
                </Button>
              ) : (
                <Button asChild size="sm">
                  <Link to={schedulingFormPath}>Finish in form</Link>
                </Button>
              )}
              <Button variant="outline" size="sm" asChild>
                <Link to={helpArticlePath} target="_blank" rel="noreferrer">
                  View help docs
                </Link>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {validations.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CalendarClock className="h-4 w-4" />
            Upcoming schedule overview
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {validations.slice(0, 4).map((validation) => renderValidation(validation))}
          </div>
        </div>
      )}

      {onApplyTemplate && (
        <div className="rounded-md border p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            Quick create a timeslot
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Drop scheduling placeholders into the form so you can tweak and publish faster.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {templates.map((template) => (
              <Button
                key={template.id}
                size="sm"
                variant="outline"
                onClick={() => onApplyTemplate(template)}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {template.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
