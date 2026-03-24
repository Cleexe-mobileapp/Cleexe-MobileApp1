export type Profile = {
  id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  /** Preset category label (Athlete, Student, …) */
  category: string | null;
  website: string | null;
  is_premium: boolean;
  is_creator: boolean;
  referral_code: string | null;
  streak_visibility: 'public' | 'private';
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
};

export type JournalEntry = {
  id: string;
  user_id: string;
  content: string;
  media_url: string[] | null;
  date: string;
  is_public: boolean;
  created_at: string;
};

export type Goal = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  target_days: number;
  current_streak: number;
  longest_streak: number;
  frequency: 'daily' | 'weekly' | 'custom';
  is_active: boolean;
  created_at: string;
};

export type Follow = {
  follower_id: string;
  followed_id: string;
  created_at: string;
};

export type Circle = {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  creator_id: string;
  avatar_url: string | null;
  member_count: number;
  created_at: string;
};

export type CircleMember = {
  circle_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
};

export type AchievementKey =
  | 'first_streak'
  | 'goal_setter'
  | 'team_player'
  | 'mindful_month'
  | 'century_club';

export type Achievement = {
  id: string;
  user_id: string;
  achievement_key: AchievementKey;
  unlocked: boolean;
  unlocked_at: string | null;
};

export type Referral = {
  id: string;
  referrer_id: string;
  referred_id: string;
  stripe_payment_id: string | null;
  commission: number;
  status: 'pending' | 'paid';
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Omit<Profile, 'created_at' | 'updated_at'>; Update: Partial<Omit<Profile, 'id' | 'created_at'>> };
      journal_entries: { Row: JournalEntry; Insert: Omit<JournalEntry, 'id' | 'created_at'>; Update: Partial<Omit<JournalEntry, 'id' | 'user_id' | 'created_at'>> };
      goals: { Row: Goal; Insert: Omit<Goal, 'id' | 'current_streak' | 'longest_streak' | 'created_at'>; Update: Partial<Omit<Goal, 'id' | 'user_id' | 'created_at'>> };
      follows: { Row: Follow; Insert: Pick<Follow, 'follower_id' | 'followed_id'>; Update: never };
      circles: { Row: Circle; Insert: Omit<Circle, 'id' | 'member_count' | 'created_at'>; Update: Partial<Omit<Circle, 'id' | 'creator_id' | 'created_at'>> };
      circle_members: { Row: CircleMember; Insert: Pick<CircleMember, 'circle_id' | 'user_id'>; Update: Partial<Pick<CircleMember, 'role'>> };
      achievements: { Row: Achievement; Insert: Pick<Achievement, 'user_id' | 'achievement_key'>; Update: Partial<Pick<Achievement, 'unlocked' | 'unlocked_at'>> };
      referrals: { Row: Referral; Insert: Omit<Referral, 'id' | 'created_at'>; Update: Partial<Pick<Referral, 'stripe_payment_id' | 'commission' | 'status'>> };
    };
  };
};
