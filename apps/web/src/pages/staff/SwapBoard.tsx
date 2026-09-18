"use client"

import { useGlobalShifts } from "@/hooks/useShifts"
import { useAvailableDrops, useIncomingSwaps, useClaimDrop, useRespondToSwap, useClaimOpenShift, useMyRequests } from "@/hooks/useStaffFeatures"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LoaderIcon, MapPinIcon, ClockIcon, ArrowRightLeftIcon, CheckIcon, XIcon, AlertCircleIcon, UsersIcon } from "lucide-react"
import { DateTime } from "luxon"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function SwapBoard() {
  const { data: shifts = [], isLoading: shiftsLoading } = useGlobalShifts();
  const { data: availableDrops = [], isLoading: dropsLoading } = useAvailableDrops();
  const { data: incomingSwaps = [], isLoading: swapsLoading } = useIncomingSwaps();
  const { data: myRequests } = useMyRequests();

  const { mutate: claimDrop, isPending: claimingDrop } = useClaimDrop();
  const { mutate: respondToSwap, isPending: respondingSwap } = useRespondToSwap();
  const { mutate: claimOpenShift, isPending: claimingOpen } = useClaimOpenShift();

  // Open shifts: PUBLISHED + no assignments + future
  const now = new Date();
  const openShifts = shifts.filter((s: any) =>
    s.status === 'PUBLISHED' &&
    (!s.assignments || s.assignments.length === 0) &&
    new Date(s.startAt) > now
  );

  // Pending request count for limit warning
  const allMyRequests = [
    ...(myRequests?.swapRequests || []),
    ...(myRequests?.dropRequests || []),
  ];
  const pendingCount = allMyRequests.filter((r: any) =>
    r.status === 'PENDING' || r.status === 'ACCEPTED'
  ).length;

  const isLoading = shiftsLoading || dropsLoading || swapsLoading;

  return (
    <div className="flex flex-1 flex-col py-4 md:py-6">
      <div className="px-4 lg:px-6 mb-6">
        <div className="flex items-center gap-3 mb-1">
          <ArrowRightLeftIcon className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-bold">Swap Board</h1>
        </div>
        <p className="text-muted-foreground">Pick up available shifts or respond to incoming swap requests.</p>
      </div>

      {/* 3-request limit warning */}
      {pendingCount >= 3 && (
        <div className="px-4 lg:px-6 mb-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
            <AlertCircleIcon className="w-4 h-4 shrink-0" />
            You have {pendingCount}/3 pending requests. Resolve existing requests before submitting new ones.
          </div>
        </div>
      )}

      <div className="px-4 lg:px-6">
        <Tabs defaultValue="drops" className="w-full flex gap-1 flex-col h-[calc(100vh-200px)]">
          <TabsList className="mb-4 gap-1 bg-none">
            <TabsTrigger value="drops">
              Dropped Shifts
              {availableDrops.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">{availableDrops.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="open">
              Open Shifts
              {openShifts.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">{openShifts.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="requests">
              Swap Requests
              {incomingSwaps.length > 0 && (
                <Badge className="ml-1.5 h-5 px-1.5 text-xs">{incomingSwaps.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ─── Dropped Shifts Tab ─── */}
          <TabsContent value="drops">
            {isLoading ? (
              <div className="flex justify-center p-12">
                <LoaderIcon className="animate-spin w-8 h-8 text-primary" />
              </div>
            ) : availableDrops.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                  <ArrowRightLeftIcon className="w-12 h-12 text-muted-foreground/40 mb-4" />
                  <h3 className="text-xl font-semibold">No Dropped Shifts</h3>
                  <p className="text-muted-foreground">No coworkers have dropped shifts that you can pick up right now.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableDrops.map((drop: any) => {
                  const shift = drop.shift;
                  const start = DateTime.fromISO(shift.startAt).setZone(shift.location.timezone);
                  const end = DateTime.fromISO(shift.endAt).setZone(shift.location.timezone);
                  const expiresIn = DateTime.fromISO(drop.expiresAt).toRelative();
                  const hours = end.diff(start, 'hours').hours;

                  return (
                    <Card key={`drop-${drop.id}`} className="flex flex-col border-orange-500/20 bg-orange-500/5">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start mb-2">
                          <Badge className="bg-orange-500 hover:bg-orange-600">{shift.requiredSkill.replace(/_/g, ' ')}</Badge>
                          <span className="text-xs text-muted-foreground">{hours}h shift</span>
                        </div>
                        <CardTitle className="text-lg">{start.toFormat('EEEE, MMM d')}</CardTitle>
                        <CardDescription className="flex items-center gap-1.5 text-foreground font-medium">
                          <ClockIcon className="w-4 h-4 text-muted-foreground" />
                          {start.toFormat('h:mm a')} – {end.toFormat('h:mm a')} ({start.offsetNameShort})
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPinIcon className="w-4 h-4" />
                          {shift.location.name}
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <UsersIcon className="w-4 h-4" />
                          Dropped by {drop.staff.firstName} {drop.staff.lastName}
                        </div>
                        <p className="text-xs text-orange-600 font-medium mt-2">Expires {expiresIn}</p>
                      </CardContent>
                      <CardFooter>
                        <Button
                          className="w-full"
                          onClick={() => claimDrop(drop.id)}
                          disabled={claimingDrop || pendingCount >= 3}
                        >
                          {claimingDrop ? <LoaderIcon className="animate-spin w-4 h-4 mr-2" /> : null}
                          Claim Dropped Shift
                        </Button>
                      </CardFooter>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* ─── Open Shifts Tab ─── */}
          <TabsContent value="open">
            {shiftsLoading ? (
              <div className="flex justify-center p-12">
                <LoaderIcon className="animate-spin w-8 h-8 text-primary" />
              </div>
            ) : openShifts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                  <ClockIcon className="w-12 h-12 text-muted-foreground/40 mb-4" />
                  <h3 className="text-xl font-semibold">No Open Shifts</h3>
                  <p className="text-muted-foreground">All shifts at your location are currently covered.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {openShifts.map((shift: any) => {
                  const start = DateTime.fromISO(shift.startAt).setZone(shift.location.timezone);
                  const end = DateTime.fromISO(shift.endAt).setZone(shift.location.timezone);
                  const hours = end.diff(start, 'hours').hours;

                  return (
                    <Card key={`open-${shift.id}`} className="flex flex-col border-primary/20">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant="outline" className="border-primary/40 text-primary">{shift.requiredSkill.replace(/_/g, ' ')}</Badge>
                          <span className="text-sm font-semibold text-primary">{hours}h</span>
                        </div>
                        <CardTitle className="text-lg">{start.toFormat('EEEE, MMM d')}</CardTitle>
                        <CardDescription className="flex items-center gap-1.5 text-foreground font-medium">
                          <ClockIcon className="w-4 h-4 text-muted-foreground" />
                          {start.toFormat('h:mm a')} – {end.toFormat('h:mm a')} ({start.offsetNameShort})
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
                          onClick={() => claimOpenShift(shift.id)}
                          disabled={claimingOpen}
                        >
                          {claimingOpen ? <LoaderIcon className="animate-spin w-4 h-4 mr-2" /> : null}
                          Claim Open Shift
                        </Button>
                      </CardFooter>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* ─── Incoming Swap Requests Tab ─── */}
          <TabsContent value="requests">
            {swapsLoading ? (
              <div className="flex justify-center p-12">
                <LoaderIcon className="animate-spin w-8 h-8 text-primary" />
              </div>
            ) : incomingSwaps.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                  <ArrowRightLeftIcon className="w-12 h-12 text-muted-foreground/40 mb-4" />
                  <h3 className="text-xl font-semibold">No Incoming Requests</h3>
                  <p className="text-muted-foreground">No coworkers have requested a shift swap with you.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {incomingSwaps.map((swap: any) => {
                  const shift = swap.shift;
                  const start = DateTime.fromISO(shift.startAt).setZone(shift.location.timezone);
                  const end = DateTime.fromISO(shift.endAt).setZone(shift.location.timezone);

                  return (
                    <Card key={swap.id} className="border-blue-500/20 bg-blue-500/5">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="border-blue-500/40 text-blue-600">Swap Request</Badge>
                          <span className="text-sm font-medium text-muted-foreground">
                            From: {swap.fromStaff.firstName} {swap.fromStaff.lastName}
                          </span>
                        </div>
                        <CardTitle className="mt-2 text-lg">{start.toFormat('EEEE, MMM d')}</CardTitle>
                        <CardDescription className="font-medium text-foreground">
                          {shift.requiredSkill.replace(/_/g, ' ')} at {shift.location.name}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <ClockIcon className="w-4 h-4" />
                            {start.toFormat('h:mm a')} – {end.toFormat('h:mm a')} ({start.offsetNameShort})
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPinIcon className="w-4 h-4" />
                            {shift.location.name}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-3">
                          If you accept, a manager will need to approve the final change.
                        </p>
                      </CardContent>
                      <CardFooter className="flex gap-2">
                        <Button
                          variant="default"
                          className="flex-1"
                          onClick={() => respondToSwap({ requestId: swap.id, accept: true })}
                          disabled={respondingSwap}
                        >
                          <CheckIcon className="w-4 h-4 mr-2" /> Accept
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1"
                          onClick={() => respondToSwap({ requestId: swap.id, accept: false })}
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
