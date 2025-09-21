export type ContestLike = {
  start_date: string | Date;
  end_date: string | Date;
  voting_end_date?: string | Date | null;
};

export type ContestStatus = 'upcoming' | 'active' | 'voting' | 'completed';

// Determine current contest status based on dates
export const getContestStatus = (contest: ContestLike): ContestStatus => {
  const now = new Date();
  const startDate = new Date(contest.start_date);
  const endDate = new Date(contest.end_date);
  const votingEndDate = contest.voting_end_date ? new Date(contest.voting_end_date) : null;

  if (now < startDate) return 'upcoming';
  if (now >= startDate && now < endDate) return 'active';
  if (votingEndDate && now >= endDate && now < votingEndDate) return 'voting';
  return 'completed';
};

// Human-friendly remaining time until next phase
export const getTimeRemaining = (contest: ContestLike): string => {
  const now = new Date();
  const status = getContestStatus(contest);

  let targetDate: Date;
  if (status === 'upcoming') targetDate = new Date(contest.start_date);
  else if (status === 'active') targetDate = new Date(contest.end_date);
  else if (status === 'voting') targetDate = new Date(contest.voting_end_date!);
  else return 'Ended';

  const diff = targetDate.getTime() - now.getTime();
  if (diff <= 0) return 'Ended';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};
