import { format } from "date-fns";

type MissingField = "title" | "scheduledAt" | "durationMinutes";

export interface ScheduleInput {
  title?: string | null;
  scheduledAt?: string | null;
  durationMinutes?: number | null;
}

export interface FormatScheduleOptions {
  schedulingFormPath?: string;
  helpArticlePath?: string;
}

export interface ScheduleCta {
  label: string;
  href: string;
}

export interface FormattedSchedule {
  dateLabel: string;
  timeLabel: string;
  isComplete: boolean;
  missingFields: MissingField[];
  warningMessage?: string;
  primaryCta: ScheduleCta;
  secondaryCta: ScheduleCta;
}

export const DEFAULT_SCHEDULING_FORM_PATH = "/live";
export const DEFAULT_SCHEDULING_HELP_PATH = "/docs/live-scheduling";

const missingFieldLabels: Record<MissingField, string> = {
  title: "title",
  scheduledAt: "date & time",
  durationMinutes: "duration",
};

const joinWithOxfordComma = (values: string[]): string => {
  if (values.length === 0) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
};

const normaliseScheduledAt = (value?: string | null): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
};

/**
 * Format schedule metadata for a live session while validating required fields.
 */
export const formatSchedule = (
  input: ScheduleInput,
  options: FormatScheduleOptions = {},
): FormattedSchedule => {
  const schedulingFormPath = options.schedulingFormPath ?? DEFAULT_SCHEDULING_FORM_PATH;
  const helpArticlePath = options.helpArticlePath ?? DEFAULT_SCHEDULING_HELP_PATH;

  const missingFields: MissingField[] = [];

  const trimmedTitle = input.title?.trim();
  if (!trimmedTitle) {
    missingFields.push("title");
  }

  const durationMinutes =
    typeof input.durationMinutes === "number" && input.durationMinutes > 0
      ? input.durationMinutes
      : null;
  if (durationMinutes === null) {
    missingFields.push("durationMinutes");
  }

  const parsedDate = normaliseScheduledAt(input.scheduledAt ?? null);
  if (!parsedDate) {
    missingFields.push("scheduledAt");
  }

  const formattedDate = parsedDate ? format(parsedDate, "PPP") : "TBD";
  const formattedTime = parsedDate ? format(parsedDate, "p") : "";

  const uniqueMissing = Array.from(new Set(missingFields));
  const isComplete = uniqueMissing.length === 0;

  const warningMessage = !isComplete
    ? `Add ${joinWithOxfordComma(uniqueMissing.map((field) => missingFieldLabels[field]))} to finish scheduling.`
    : undefined;

  return {
    dateLabel: formattedDate,
    timeLabel: formattedTime,
    isComplete,
    missingFields: uniqueMissing,
    warningMessage,
    primaryCta: {
      label: isComplete ? "Manage schedule" : "Finish scheduling",
      href: schedulingFormPath,
    },
    secondaryCta: {
      label: "View scheduling help",
      href: helpArticlePath,
    },
  };
};

export type { MissingField };
