import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthContext } from '@/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface PendingStartup {
  id: string;
  name: string;
  description: string;
  url: string;
  logoUrl: string;
  status: 'pending' | 'approved' | 'rejected' | 'live';
  listingType?: 'regular' | 'premium' | 'boosted';
  createdAt: Date;
  scheduledFor: Date;
  userId: string;
}

// List of admin UIDs - in a real app, this should be in Firestore or env vars
const ADMIN_UIDS = ['fZmR4IVFKDOD4mmQzrk7haIGwyi1'];

export function AdminDashboard() {
  const [startups, setStartups] = useState<PendingStartup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
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

    fetchStartups();
  }, [user, isAdmin, navigate]);

  const fetchStartups = async () => {
    try {
      const startupsRef = collection(db, 'startups');
      const q = query(startupsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const fetchedStartups: PendingStartup[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.name && data.description && data.url && data.logoUrl) {
          fetchedStartups.push({
            id: doc.id,
            name: data.name,
            description: data.description,
            url: data.url,
            logoUrl: data.logoUrl,
            status: data.status || 'pending',
            listingType: data.listingType || 'regular',
            createdAt: data.createdAt?.toDate() || new Date(),
            scheduledFor: data.scheduledFor?.toDate() || new Date(),
            userId: data.userId
          });
        }
      });

      setStartups(fetchedStartups);
    } catch (error) {
      console.error('Error fetching startups:', error);
      toast({
        title: 'Error',
        description: 'Failed to load startups. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (startupId: string, newStatus: 'approved' | 'rejected' | 'live') => {
    try {
      const startupRef = doc(db, 'startups', startupId);
      
      const updateData = {
        status: newStatus,
        updatedAt: Timestamp.now(),
        ...(newStatus === 'live' && { scheduledFor: Timestamp.now() }),
        ...(newStatus === 'rejected' && { scheduledFor: null })
      };

      await updateDoc(startupRef, updateData);
      
      setStartups(prevStartups =>
        prevStartups.map(startup =>
          startup.id === startupId
            ? { ...startup, status: newStatus }
            : startup
        )
      );

      toast({
        title: 'Success',
        description: `Startup ${newStatus === 'approved' ? 'approved' : newStatus === 'live' ? 'launched' : 'rejected'} successfully`,
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

  const handleListingTypeUpdate = async (startupId: string, newType: 'regular' | 'premium' | 'boosted') => {
    try {
      const startupRef = doc(db, 'startups', startupId);
      
      await updateDoc(startupRef, {
        listingType: newType,
        updatedAt: Timestamp.now()
      });
      
      setStartups(prevStartups =>
        prevStartups.map(startup =>
          startup.id === startupId
            ? { ...startup, listingType: newType }
            : startup
        )
      );

      toast({
        title: 'Success',
        description: `Listing type updated to ${newType} successfully`,
      });
    } catch (error) {
      console.error('Error updating listing type:', error);
      toast({
        title: 'Error',
        description: 'Failed to update listing type. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'destructive';
      case 'live':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getListingTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'premium':
        return 'purple';
      case 'boosted':
        return 'yellow';
      default:
        return 'secondary';
    }
  };

  const filteredStartups = startups.filter(startup => {
    switch (activeTab) {
      case 'pending':
        return startup.status === 'pending';
      case 'approved':
        return startup.status === 'approved';
      case 'live':
        return startup.status === 'live';
      case 'rejected':
        return startup.status === 'rejected';
      default:
        return true;
    }
  });

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
            <CardDescription>Manage startup submissions and listings</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4 mb-8">
                <TabsTrigger value="pending">
                  Pending ({startups.filter(s => s.status === 'pending').length})
                </TabsTrigger>
                <TabsTrigger value="approved">
                  Approved ({startups.filter(s => s.status === 'approved').length})
                </TabsTrigger>
                <TabsTrigger value="live">
                  Live ({startups.filter(s => s.status === 'live').length})
                </TabsTrigger>
                <TabsTrigger value="rejected">
                  Rejected ({startups.filter(s => s.status === 'rejected').length})
                </TabsTrigger>
              </TabsList>

              <div className="space-y-6">
                {filteredStartups.length > 0 ? (
                  filteredStartups.map((startup) => (
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
                              variant={getStatusBadgeVariant(startup.status)}
                            >
                              {startup.status}
                            </Badge>
                            <Badge
                              variant={getListingTypeBadgeVariant(startup.listingType || 'regular')}
                            >
                              {startup.listingType || 'regular'}
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
                                {startup.status === 'live' ? 'Launched' : 'Scheduled'} for:{' '}
                                {startup.scheduledFor.toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap gap-2 mt-4">
                            {startup.status === 'pending' && (
                              <>
                                <Button
                                  onClick={() => handleStatusUpdate(startup.id, 'approved')}
                                  variant="default"
                                >
                                  Approve
                                </Button>
                                <Button
                                  onClick={() => handleStatusUpdate(startup.id, 'rejected')}
                                  variant="destructive"
                                >
                                  Reject
                                </Button>
                                <Button
                                  onClick={() => handleStatusUpdate(startup.id, 'live')}
                                  variant="outline"
                                >
                                  Launch Now
                                </Button>
                              </>
                            )}
                            
                            {(startup.status === 'approved' || startup.status === 'live') && (
                              <Select
                                defaultValue={startup.listingType || 'regular'}
                                onValueChange={(value: 'regular' | 'premium' | 'boosted') => 
                                  handleListingTypeUpdate(startup.id, value)
                                }
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue placeholder="Select listing type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="regular">Regular</SelectItem>
                                  <SelectItem value="premium">Premium</SelectItem>
                                  <SelectItem value="boosted">Boosted</SelectItem>
                                </SelectContent>
                              </Select>
                            )}

                            {startup.status === 'approved' && (
                              <Button
                                onClick={() => handleStatusUpdate(startup.id, 'live')}
                                variant="outline"
                              >
                                Launch Now
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No startups found in this category
                  </div>
                )}
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
