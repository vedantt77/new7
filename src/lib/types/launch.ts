export interface Launch {
  id: string;
  name: string;
  logo: string;
  description: string;
  launchDate: string;
  website: string;
  category: string;
  listingType?: 'premium' | 'boosted' | 'regular';
  doFollowBacklink?: boolean;
  status?: 'pending' | 'approved' | 'rejected';
  submittedAt?: string;
  scheduledFor?: string;
}
