import { useGlobalShifts } from "@/hooks/useShifts"
import { useAvailableDrops, useIncomingSwaps, useClaimDrop, useRespondToSwap } from "@/hooks/useStaffFeatures"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LoaderIcon, MapPinIcon, ClockIcon, ArrowRightIcon, CheckIcon, XIcon } from "lucide-react"
import { DateTime } from "luxon"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function SwapBoard() {
  const { data: shifts = [], isLoading: shiftsLoading } = useGlobalShifts();
  const { data: availableDrops = [], isLoading: dropsLoading } = useAvailableDrops();
  const { data: incomingSwaps = [], isLoading: swapsLoading } = useIncomingSwaps();
  
  const { mutate: claimDrop, isPending: claimingDrop } = useClaimDrop();
  const { mutate: respondToSwap, isPending: respondingSwap } = useRespondToSwap();

  
  // An open shift is one that has NO assignments and is PUBLISHED
  const openShifts = shifts.filter((s: any) => 
    s.status === 'PUBLISHED' && (!s.assignments || s.assignments.length === 0)
  );

  const isLoading = shiftsLoading || dropsLoading || swapsLoading;

  const handleClaimOpenShift = (shiftId: string) => {
    alert('In a fully integrated version, this would assign the open shift to your Staff Profile ID!');
  }

  const handleClaimDrop = (requestId: string) => {
    claimDrop(requestId);
  }

  const handleRespondSwap = (requestId: string, accept: boolean) => {
    respondToSwap({ requestId, accept });
  }

  return (
    <div className="flex flex-1 flex-col py-4 md:py-6">
      <div className="px-4 lg:px-6 mb-6">
        <h1 className="text-3xl font-bold">Swap Board</h1>
        <p className="text-muted-foreground">Pick up available shifts or respond to swap requests.</p>
      </div>

      <div className="px-4 lg:px-6">
        <Tabs defaultValue="available" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="available">Available Shifts ({openShifts.length + availableDrops.length})</TabsTrigger>
            <TabsTrigger value="requests">Swap Requests ({incomingSwaps.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="available">
            {isLoading ? (
              <div className="flex justify-center p-12">
                <LoaderIcon className="animate-spin w-8 h-8 text-primary" />
              </div>
            ) : openShifts.length === 0 && availableDrops.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                  <ClockIcon className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-xl font-semibold">No Available Shifts</h3>
                  <p className="text-muted-foreground">Check back later for dropped or open shifts.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Available Drops */}
                {availableDrops.map((drop: any) => {
                  const shift = drop.shift;
                  const start = DateTime.fromISO(shift.startAt).setZone(shift.location.timezone);
                  const end = DateTime.fromISO(shift.endAt).setZone(shift.location.timezone);
                  
                  return (
                    <Card key={`drop-${drop.id}`} className="flex flex-col border-primary/20 bg-primary/5">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start mb-2">
                          <Badge className="bg-primary">{shift.requiredSkill.replace(/_/g, ' ')}</Badge>
                          <Badge variant="outline">Dropped by {drop.staff.firstName}</Badge>
                        </div>
                        <CardTitle className="text-lg">{start.toFormat('EEEE, MMM d')}</CardTitle>
                        <CardDescription className="flex items-center gap-1.5 text-foreground font-medium">
                          <ClockIcon className="w-4 h-4 text-muted-foreground" />
                          {start.toFormat('h:mm a')} - {end.toFormat('h:mm a')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPinIcon className="w-4 h-4" />
                          {shift.location.name}
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button 
                          className="w-full" 
                          onClick={() => handleClaimDrop(drop.id)}
                          disabled={claimingDrop}
                        >
                          Claim Drop
                        </Button>
                      </CardFooter>
                    </Card>
                  )
                })}

                {/* Open Shifts */}
                {openShifts.map((shift: any) => {
                  const start = DateTime.fromISO(shift.startAt).setZone(shift.location.timezone);
                  const end = DateTime.fromISO(shift.endAt).setZone(shift.location.timezone);
                  
                  return (
                    <Card key={`open-${shift.id}`} className="flex flex-col">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant="outline" className="bg-primary/5">{shift.requiredSkill.replace(/_/g, ' ')}</Badge>
                          <span className="text-sm font-medium text-primary">{end.diff(start, 'hours').hours}h</span>
                        </div>
                        <CardTitle className="text-lg">{start.toFormat('EEEE, MMM d')}</CardTitle>
                        <CardDescription className="flex items-center gap-1.5 text-foreground font-medium">
                          <ClockIcon className="w-4 h-4 text-muted-foreground" />
                          {start.toFormat('h:mm a')} - {end.toFormat('h:mm a')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPinIcon className="w-4 h-4" />
                          {shift.location.name}
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button 
                          variant="secondary"
                          className="w-full" 
                          onClick={() => handleClaimOpenShift(shift.id)}
                        >
                          Claim Open Shift
                        </Button>
                      </CardFooter>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests">
            {isLoading ? (
              <div className="flex justify-center p-12">
                <LoaderIcon className="animate-spin w-8 h-8 text-primary" />
              </div>
            ) : incomingSwaps.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                  <ArrowRightIcon className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-xl font-semibold">No Swap Requests</h3>
                  <p className="text-muted-foreground">You don't have any pending swap requests from coworkers.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {incomingSwaps.map((swap: any) => {
                  const shift = swap.shift;
                  const start = DateTime.fromISO(shift.startAt).setZone(shift.location.timezone);
                  const end = DateTime.fromISO(shift.endAt).setZone(shift.location.timezone);
                  
                  return (
                    <Card key={swap.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">Swap Request</Badge>
                          <span className="text-sm font-medium">From: {swap.fromStaff.firstName} {swap.fromStaff.lastName}</span>
                        </div>
                        <CardTitle className="mt-2">{start.toFormat('EEEE, MMM d')}</CardTitle>
                        <CardDescription>{shift.requiredSkill.replace(/_/g, ' ')}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <ClockIcon className="w-4 h-4 text-muted-foreground" />
                            {start.toFormat('h:mm a')} - {end.toFormat('h:mm a')}
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPinIcon className="w-4 h-4 text-muted-foreground" />
                            {shift.location.name}
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex gap-2">
                        <Button 
                          variant="default" 
                          className="flex-1"
                          onClick={() => handleRespondSwap(swap.id, true)}
                          disabled={respondingSwap}
                        >
                          <CheckIcon className="w-4 h-4 mr-2" /> Accept
                        </Button>
                        <Button 
                          variant="destructive" 
                          className="flex-1"
                          onClick={() => handleRespondSwap(swap.id, false)}
                          disabled={respondingSwap}
                        >
                          <XIcon className="w-4 h-4 mr-2" /> Decline
                        </Button>
                      </CardFooter>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

