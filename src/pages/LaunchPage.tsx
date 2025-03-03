import { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LaunchListItem } from '@/components/launch/LaunchListItem';
import { PremiumListing } from '@/components/launch/PremiumListing';
import { AnimatedHeader } from '@/components/launch/AnimatedHeader';
import { getLaunches, getWeeklyLaunches } from '@/lib/data/launches';
import { WeeklyCountdownTimer } from '@/components/WeeklyCountdownTimer';
import { Launch } from '@/lib/types/launch';

interface ListItem extends Launch {
  uniqueKey: string;
}

const ROTATION_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds

export function LaunchPage() {
  const [activeTab, setActiveTab] = useState('weekly');
  const [rotatedWeeklyLaunches, setRotatedWeeklyLaunches] = useState<Launch[]>([]);
  const [rotatedRegularLaunches, setRotatedRegularLaunches] = useState<Launch[]>([]);
  const [rotatedBoostedLaunches, setRotatedBoostedLaunches] = useState<Launch[]>([]);
  
  // Memoize these values to prevent unnecessary re-renders
  const allLaunches = useMemo(() => getLaunches(), []);
  const premiumLaunches = useMemo(() => allLaunches.filter(launch => launch.listingType === 'premium'), [allLaunches]);
  const boostedLaunches = useMemo(() => allLaunches.filter(launch => launch.listingType === 'boosted'), [allLaunches]);
  const regularLaunches = useMemo(() => allLaunches.filter(launch => !launch.listingType || launch.listingType === 'regular'), [allLaunches]);
  const weeklyRegularLaunches = useMemo(() => 
    getWeeklyLaunches().filter(launch => !launch.listingType || launch.listingType === 'regular'),
    []
  );

  // Function to get current rotation index based on timestamp
  const getCurrentRotationIndex = (listLength: number) => {
    if (listLength <= 1) return 0;
    const currentTime = Date.now();
    const rotationCount = Math.floor(currentTime / ROTATION_INTERVAL);
    return rotationCount % listLength;
  };

  // Function to rotate array by index
  const rotateArrayByIndex = (array: Launch[], index: number) => {
    if (array.length <= 1) return [...array];
    return [...array.slice(index), ...array.slice(0, index)];
  };

  const insertBoostedLaunches = (launches: Launch[], section: 'weekly' | 'all'): ListItem[] => {
    if (!rotatedBoostedLaunches.length || !launches.length) {
      return launches.map((launch, index) => ({
        ...launch,
        uniqueKey: `${section}-regular-${launch.id}-${index}`
      }));
    }

    const result: ListItem[] = [];
    const spacing = Math.max(Math.floor(launches.length / rotatedBoostedLaunches.length), 2);
    let boostedIndex = 0;
    const timestamp = Math.floor(Date.now() / ROTATION_INTERVAL) * ROTATION_INTERVAL;

    launches.forEach((launch, index) => {
      result.push({
        ...launch,
        uniqueKey: `${section}-regular-${launch.id}-${index}-${timestamp}`
      });
      
      if ((index + 1) % spacing === 0 && boostedIndex < rotatedBoostedLaunches.length) {
        const boostedLaunch = rotatedBoostedLaunches[boostedIndex];
        result.push({
          ...boostedLaunch,
          uniqueKey: `${section}-boosted-${boostedLaunch.id}-${index}-${timestamp}`
        });
        boostedIndex++;
      }
    });

    // Add any remaining boosted launches
    while (boostedIndex < rotatedBoostedLaunches.length) {
      const boostedLaunch = rotatedBoostedLaunches[boostedIndex];
      result.push({
        ...boostedLaunch,
        uniqueKey: `${section}-boosted-${boostedLaunch.id}-remaining-${boostedIndex}-${timestamp}`
      });
      boostedIndex++;
    }

    return result;
  };

  // Update rotations based on current time
  useEffect(() => {
    const updateRotations = () => {
      const weeklyIndex = getCurrentRotationIndex(weeklyRegularLaunches.length);
      const regularIndex = getCurrentRotationIndex(regularLaunches.length);
      const boostedIndex = getCurrentRotationIndex(boostedLaunches.length);

      setRotatedWeeklyLaunches(rotateArrayByIndex(weeklyRegularLaunches, weeklyIndex));
      setRotatedRegularLaunches(rotateArrayByIndex(regularLaunches, regularIndex));
      setRotatedBoostedLaunches(rotateArrayByIndex(boostedLaunches, boostedIndex));
    };

    // Initial update
    updateRotations();

    // Calculate time until next rotation
    const now = Date.now();
    const nextRotation = Math.ceil(now / ROTATION_INTERVAL) * ROTATION_INTERVAL;
    const timeUntilNextRotation = nextRotation - now;

    // Set timeout for first rotation
    const initialTimeout = setTimeout(() => {
      updateRotations();
      // Then set interval for subsequent rotations
      const interval = setInterval(updateRotations, ROTATION_INTERVAL);
      return () => clearInterval(interval);
    }, timeUntilNextRotation);

    return () => clearTimeout(initialTimeout);
  }, [weeklyRegularLaunches, regularLaunches, boostedLaunches]); // Include regularLaunches in dependencies

  return (
    <div className="min-h-screen">
      <div className="px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto">
          <AnimatedHeader />
          
          <h2 className="text-base sm:text-xl text-muted-foreground text-center mb-6 sm:mb-8">
            Submit today and receive quality traffic and backlink! Our unique rotation system ensures equal exposure for all startups by rotating listings every 10 minutes - no upvotes needed. 🔄✨
          </h2>

          <WeeklyCountdownTimer />

          {/* Premium listings */}
          <div className="space-y-8 mb-12">
            {premiumLaunches.map((launch) => (
              <PremiumListing 
                key={`premium-${launch.id}`} 
                launch={launch} 
              />
            ))}
          </div>

          <Tabs defaultValue="weekly" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-[300px] sm:max-w-[400px] grid-cols-2 mx-auto mb-6 sm:mb-8">
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>

            <TabsContent value="weekly" className="mt-4 sm:mt-6">
              <div className="space-y-4">
                {insertBoostedLaunches(rotatedWeeklyLaunches, 'weekly').map((launch) => (
                  <LaunchListItem 
                    key={launch.uniqueKey}
                    launch={launch}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="all" className="mt-4 sm:mt-6">
              <div className="space-y-4">
                {insertBoostedLaunches(rotatedRegularLaunches, 'all').map((launch) => (
                  <LaunchListItem 
                    key={launch.uniqueKey}
                    launch={launch}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
