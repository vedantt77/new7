import { Launch } from '../types/launch';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

// Get all launches including the scheduled ones for the current week
export async function getLaunches(): Promise<Launch[]> {
  try {
    const startupsRef = collection(db, 'startups');
    const now = new Date();
    
    // Get startups that are scheduled for this week or already live
    const q = query(
      startupsRef, 
      where('status', 'in', ['scheduled', 'live'])
    );
    
    const querySnapshot = await getDocs(q);
    const launches: Launch[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      launches.push({
        id: doc.id,
        name: data.name,
        logo: data.logoUrl,
        description: data.description,
        launchDate: data.scheduledFor || data.createdAt.toDate().toISOString(),
        website: data.url,
        category: data.category,
        listingType: data.listingType || 'regular',
        status: data.status,
        submissionDate: data.createdAt.toDate().toISOString(),
        scheduledFor: data.scheduledFor
      });
    });

    return launches;
  } catch (error) {
    console.error('Error fetching launches:', error);
    return [];
  }
}

// Get launches specifically for the current week
export async function getWeeklyLaunches(): Promise<Launch[]> {
  try {
    const startupsRef = collection(db, 'startups');
    const now = new Date();
    
    // Calculate the start and end of the current week
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    // Query for startups scheduled for this week
    const q = query(
      startupsRef,
      where('scheduledFor', '>=', startOfWeek.toISOString()),
      where('scheduledFor', '<=', endOfWeek.toISOString()),
      where('status', '==', 'scheduled')
    );
    
    const querySnapshot = await getDocs(q);
    const launches: Launch[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      launches.push({
        id: doc.id,
        name: data.name,
        logo: data.logoUrl,
        description: data.description,
        launchDate: data.scheduledFor,
        website: data.url,
        category: data.category,
        listingType: data.listingType || 'regular',
        status: data.status,
        submissionDate: data.createdAt.toDate().toISOString(),
        scheduledFor: data.scheduledFor
      });
    });

    return launches;
  } catch (error) {
    console.error('Error fetching weekly launches:', error);
    return [];
  }
}