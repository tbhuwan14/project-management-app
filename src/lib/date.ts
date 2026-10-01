const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

export const formatDue = (iso: string): string => formatter.format(new Date(iso));

export const isOverdue = (iso: string): boolean => new Date(iso).getTime() < Date.now();
