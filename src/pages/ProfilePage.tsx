import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { doc, setDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuthContext } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface StartupFormData {
  name: string;
  url: string;
  socialHandle: string;
  description: string;
  logo: FileList;
}

interface SubmittedStartup {
  name: string;
  url: string;
  socialHandle: string;
  description: string;
  logoUrl: string;
  submittedAt: Date;
  status: string;
}

export function ProfilePage() {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submittedStartup, setSubmittedStartup] = useState<SubmittedStartup | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<StartupFormData>();

  // Fetch startup data when component mounts or user changes
  useEffect(() => {
    async function fetchStartupData() {
      if (!user) return;

      try {
        const startupRef = doc(db, 'startups', user.uid);
        const startupDoc = await getDoc(startupRef);

        if (startupDoc.exists()) {
          const data = startupDoc.data();
          setSubmittedStartup({
            name: data.name,
            url: data.url,
            socialHandle: data.socialHandle,
            description: data.description,
            logoUrl: data.logoUrl,
            submittedAt: data.createdAt.toDate(),
            status: data.status
          });
        }
      } catch (error) {
        console.error('Error fetching startup data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load startup data',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchStartupData();
  }, [user, toast]);

  const onSubmit = async (data: StartupFormData) => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      // Validate file size and type
      const file = data.logo[0];
      if (!file) {
        throw new Error('Please select a logo file');
      }

      if (file.size > 200 * 1024) {
        throw new Error('Logo file size must be less than 200KB');
      }

      if (!file.type.startsWith('image/')) {
        throw new Error('Logo must be an image file');
      }

      // Create a unique filename
      const fileExtension = file.name.split('.').pop();
      const fileName = `${user.uid}-${Date.now()}.${fileExtension}`;

      // Upload logo to Firebase Storage
      const storageRef = ref(storage, `startup-logos/${fileName}`);
      const uploadResult = await uploadBytes(storageRef, file);
      const logoUrl = await getDownloadURL(uploadResult.ref);

      // Calculate next week's launch date
      const now = new Date();
      const nextWeekStart = new Date(now);
      nextWeekStart.setDate(now.getDate() + (7 - now.getDay()));
      nextWeekStart.setHours(0, 0, 0, 0);

      // Save startup data to Firestore
      const startupRef = doc(db, 'startups', user.uid);
      const timestamp = serverTimestamp();
      const startupData = {
        name: data.name,
        url: data.url,
        socialHandle: data.socialHandle,
        description: data.description,
        logoUrl,
        userId: user.uid,
        createdAt: timestamp,
        status: 'pending',
        updatedAt: timestamp,
        scheduledFor: Timestamp.fromDate(nextWeekStart) // Schedule for next week
      };

      await setDoc(startupRef, startupData);

      // Set submitted startup data
      setSubmittedStartup({
        ...startupData,
        submittedAt: new Date(),
        status: 'pending'
      });

      toast({
        title: 'Success!',
        description: 'Your startup has been submitted for review and will be scheduled for next week\'s launch.',
      });

      reset();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error submitting startup:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to submit startup. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    navigate('/login');
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
      <div className="container max-w-4xl mx-auto">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Welcome back!</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Email</Label>
                <p className="text-muted-foreground">{user.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {submittedStartup && (
          <Card className="mb-8 border-2 border-primary/20">
            <CardHeader>
              <CardTitle>Your Latest Submission</CardTitle>
              <CardDescription>
                Submitted on {submittedStartup.submittedAt.toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <img 
                  src={submittedStartup.logoUrl} 
                  alt={submittedStartup.name} 
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{submittedStartup.name}</h3>
                  <a 
                    href={submittedStartup.url}
                    target="_blank"
                    rel="noopener noreferrer" 
                    className="text-primary hover:underline"
                  >
                    {submittedStartup.url}
                  </a>
                  <p className="text-muted-foreground mt-2">{submittedStartup.description}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Social Handle: {submittedStartup.socialHandle}
                  </p>
                </div>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Status: <span className="font-medium text-primary capitalize">{submittedStartup.status}</span>
                </p>
                <p className="text-sm mt-2">
                  We'll review your submission and get back to you soon.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="w-full md:w-auto">
              Submit Your Startup
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Submit Your Startup</DialogTitle>
              <DialogDescription>
                Fill out the form below to submit your startup for review.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Startup Name</Label>
                <Input
                  id="name"
                  {...register('name', { required: 'Startup name is required' })}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">Website URL</Label>
                <Input
                  id="url"
                  type="url"
                  {...register('url', { 
                    required: 'Website URL is required',
                    pattern: {
                      value: /^https?:\/\/.+/,
                      message: 'Please enter a valid URL starting with http:// or https://'
                    }
                  })}
                />
                {errors.url && (
                  <p className="text-sm text-destructive">{errors.url.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="socialHandle">Social Media Handle</Label>
                <Input
                  id="socialHandle"
                  {...register('socialHandle', { required: 'Social media handle is required' })}
                />
                {errors.socialHandle && (
                  <p className="text-sm text-destructive">{errors.socialHandle.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Short Description</Label>
                <Textarea
                  id="description"
                  {...register('description', { 
                    required: 'Description is required',
                    maxLength: {
                      value: 200,
                      message: 'Description must be less than 200 characters'
                    }
                  })}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo">Logo (Max 200KB)</Label>
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  {...register('logo', { 
                    required: 'Logo is required',
                    validate: {
                      fileSize: (files) => 
                        !files[0] || files[0].size <= 200 * 1024 || 
                        'Logo must be less than 200KB',
                      fileType: (files) =>
                        !files[0] || files[0].type.startsWith('image/') ||
                        'Logo must be an image file'
                    }
                  })}
                />
                {errors.logo && (
                  <p className="text-sm text-destructive">{errors.logo.message}</p>
                )}
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
