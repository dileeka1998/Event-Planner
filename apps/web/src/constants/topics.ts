/**
 * Available session topics/categories
 * This list should match the backend validation in CreateSessionDto
 */
export const SESSION_TOPICS = [
  'Technology',
  'Development',
  'Design',
  'Data',
  'Security',
  'General',
] as const;

export type SessionTopic = typeof SESSION_TOPICS[number];
