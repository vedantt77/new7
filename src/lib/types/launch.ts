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
  submissionDate?: string; // When the startup was submitted
  status?: 'pending' | 'approved' | 'rejected' | 'scheduled' | 'live';
  scheduledFor?: string; // The date when it will go live
}