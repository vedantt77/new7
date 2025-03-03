import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthContext } from '@/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface PendingStartup {
  id: string;
  name: string;
  description: string;
  url: string;
  logoUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  scheduledFor: Date;
  userId: string;
}

// List of admin UIDs - in a real app, this should be in Firestore or env vars
const ADMIN_UIDS = ['fZmR4IVFKDOD4mmQzrk7haIGwyi1'];

export function AdminDashboard() {
  const [pendingStartups, setPendingStartups] = useState<PendingStartup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if current user is admin
  const isAdmin = user && ADMIN_UIDS.includes(user.uid);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!isAdmin) {
      navigate('/');
      return;
    }

    fetchPendingStartups();
  }, [user, isAdmin, navigate]);

  const fetchPendingStartups = async () => {
    try {
      const startupsRef = collection(db, 'startups');
      const q = query(startupsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const startups: PendingStartup[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Only add if the document has the required fields
        if (data.name && data.description && data.url && data.logoUrl) {
          startups.push({
            id: doc.id,
            name: data.name,
            description: data.description,
            url: data.url,
            logoUrl: data.logoUrl,
            status: data.status || 'pending',
            createdAt: data.createdAt?.toDate() || new Date(),
            scheduledFor: data.scheduledFor?.toDate() || new Date(),
            userId: data.userId
          });
        }
      });

      setPendingStartups(startups);
    } catch (error) {
      console.error('Error fetching startups:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pending startups. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (startupId: string, newStatus: 'approved' | 'rejected') => {
    try {
      const startupRef = doc(db, 'startups', startupId);
      
      // If approving, keep the scheduled date. If rejecting, clear it
      const updateData = {
        status: newStatus,
        updatedAt: Timestamp.now(),
        ...(newStatus === 'rejected' && { scheduledFor: null })
      };

      await updateDoc(startupRef, updateData);
      
      // Update local state
      setPendingStartups(prevStartups =>
        prevStartups.map(startup =>
          startup.id === startupId
            ? { ...startup, status: newStatus }
            : startup
        )
      );

      toast({
        title: 'Success',
        description: `Startup ${newStatus === 'approved' ? 'approved' : 'rejected'} successfully`,
      });
    } catch (error) {
      console.error('Error updating startup status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update startup status. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (!isAdmin) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="container max-w-6xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Admin Dashboard</CardTitle>
            <CardDescription>Manage startup submissions and approvals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {pendingStartups.length > 0 ? (
                pendingStartups.map((startup) => (
                  <Card key={startup.id} className="p-6">
                    <div className="flex items-start gap-4">
                      <img
                        src={startup.logoUrl}
                        alt={startup.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{startup.name}</h3>
                          <Badge
                            variant={
                              startup.status === 'approved'
                                ? 'success'
                                : startup.status === 'rejected'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {startup.status}
                          </Badge>
                        </div>
                        <a
                          href={startup.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {startup.url}
                        </a>
                        <p className="text-muted-foreground mt-2">
                          {startup.description}
                        </p>
                        <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                          <span>
                            Submitted: {startup.createdAt.toLocaleDateString()}
                          </span>
                          {startup.scheduledFor && (
                            <span>
                              Scheduled for:{' '}
                              {startup.scheduledFor.toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {startup.status === 'pending' && (
                          <div className="flex gap-2 mt-4">
                            <Button
                              onClick={() =>
                                handleStatusUpdate(startup.id, 'approved')
                              }
                              variant="default"
                            >
                              Approve
                            </Button>
                            <Button
                              onClick={() =>
                                handleStatusUpdate(startup.id, 'rejected')
                              }
                              variant="destructive"
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No pending startups to review
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
