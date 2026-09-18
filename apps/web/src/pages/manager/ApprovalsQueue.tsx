"use client"

import { useState } from "react"
import { LoaderIcon, RefreshCwIcon, CheckCircleIcon, XCircleIcon, ClockIcon, UserIcon, MapPinIcon, CalendarIcon, AlertTriangleIcon } from "lucide-react"
import { useApprovals, useApproveSwap, useDenySwap, useApproveDrop, useDenyDrop, type SwapRequest, type DropRequest } from "@/hooks/useApprovals"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DateTime } from 'luxon'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

const statusColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  PENDING: { bg: "bg-yellow-100 text-yellow-800", text: "Pending", icon: <ClockIcon className="h-3 w-3" /> },
  APPROVED: { bg: "bg-green-100 text-green-800", text: "Approved", icon: <CheckCircleIcon className="h-3 w-3" /> },
  REJECTED: { bg: "bg-red-100 text-red-800", text: "Denied", icon: <XCircleIcon className="h-3 w-3" /> },
  ACCEPTED: { bg: "bg-blue-100 text-blue-800", text: "Accepted", icon: <CheckCircleIcon className="h-3 w-3" /> },
  CANCELLED: { bg: "bg-gray-100 text-gray-800", text: "Cancelled", icon: <XCircleIcon className="h-3 w-3" /> },
  EXPIRED: { bg: "bg-orange-100 text-orange-800", text: "Expired", icon: <ClockIcon className="h-3 w-3" /> },
}

function StatusBadge({ status }: { status: string }) {
  const config = statusColors[status] || { bg: "bg-gray-100 text-gray-800", text: status, icon: <ClockIcon className="h-3 w-3" /> }
  return (
    <Badge variant="secondary" className={`${config.bg} gap-1`}>
      {config.icon} {config.text}
    </Badge>
  )
}

function SwapRequestCard({ request, onApprove, onDeny }: { request: SwapRequest; onApprove: () => void; onDeny: () => void }) {
  const shift = request.shift
  const fromName = `${request.fromStaff.firstName} ${request.fromStaff.lastName}`
  const toName = request.toStaff ? `${request.toStaff.firstName} ${request.toStaff.lastName}` : "Open Drop"
  const assignedStaff = shift.assignments[0]?.staff?.user
  const currentAssignee = assignedStaff ? `${assignedStaff.firstName} ${assignedStaff.lastName}` : "Unassigned"

  return (
    <Card className="mb-4">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <StatusBadge status={request.status} />
              <span className="text-sm text-muted-foreground">
                {DateTime.fromISO(request.createdAt).toFormat('MMM d, yyyy h:mm a')}
              </span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarIcon className="h-4 w-4" />
                <span>{DateTime.fromISO(shift.startAt).toFormat('ccc, MMM d')}</span>
                <span className="mx-1">|</span>
                <span>{DateTime.fromISO(shift.startAt).toFormat('h:mm a')} - {DateTime.fromISO(shift.endAt).toFormat('h:mm a')}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPinIcon className="h-4 w-4" />
                <span>{shift.location.name}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <UserIcon className="h-4 w-4" />
                <span>Role: {shift.requiredSkill.replace(/_/g, " ")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Requester:</span>
                <span className="font-medium">{fromName}</span>
                <span className="text-muted-foreground mx-1">→</span>
                <span className="font-medium">{toName}</span>
                {request.toStaff === null && (
                  <Badge variant="outline" className="ml-2 text-xs">Open Drop</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>Currently assigned:</span>
                <span className="font-medium">{currentAssignee}</span>
              </div>
            </div>
          </div>
          {request.status === "PENDING" && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onDeny} className="text-red-600 border-red-300 hover:bg-red-50">
                <XCircleIcon className="mr-1 h-3 w-3" /> Deny
              </Button>
              <Button size="sm" onClick={onApprove} className="bg-green-600 hover:bg-green-700">
                <CheckCircleIcon className="mr-1 h-3 w-3" /> Approve
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function DropRequestCard({ request, onApprove, onDeny }: { request: DropRequest; onApprove: () => void; onDeny: () => void }) {
  const shift = request.shift
  const staffName = `${request.staff.firstName} ${request.staff.lastName}`
  const assignedStaff = shift.assignments[0]?.staff?.user
  const currentAssignee = assignedStaff ? `${assignedStaff.firstName} ${assignedStaff.lastName}` : "Unassigned"

  return (
    <Card className="mb-4 border-orange-200">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <StatusBadge status={request.status} />
              <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                <AlertTriangleIcon className="mr-1 h-3 w-3" /> Drop Request
              </Badge>
              <span className="text-sm text-muted-foreground">
                {DateTime.fromISO(request.createdAt).toFormat('MMM d, yyyy h:mm a')}
              </span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarIcon className="h-4 w-4" />
                <span>{DateTime.fromISO(shift.startAt).toFormat('ccc, MMM d')}</span>
                <span className="mx-1">|</span>
                <span>{DateTime.fromISO(shift.startAt).toFormat('h:mm a')} - {DateTime.fromISO(shift.endAt).toFormat('h:mm a')}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPinIcon className="h-4 w-4" />
                <span>{shift.location.name}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <UserIcon className="h-4 w-4" />
                <span>Role: {shift.requiredSkill.replace(/_/g, " ")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Staff dropping shift:</span>
                <span className="font-medium">{staffName}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>Currently assigned:</span>
                <span className="font-medium">{currentAssignee}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <ClockIcon className="h-4 w-4" />
                <span>Expires: {DateTime.fromISO(request.expiresAt).toFormat('MMM d, h:mm a')}</span>
              </div>
            </div>
          </div>
          {request.status === "PENDING" && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onDeny} className="text-red-600 border-red-300 hover:bg-red-50">
                <XCircleIcon className="mr-1 h-3 w-3" /> Deny
              </Button>
              <Button size="sm" onClick={onApprove} className="bg-green-600 hover:bg-green-700">
                <CheckCircleIcon className="mr-1 h-3 w-3" /> Approve
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function ApprovalsQueue() {
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [denyDialogOpen, setDenyDialogOpen] = useState(false)
  const [denyTarget, setDenyTarget] = useState<{ type: 'swap' | 'drop'; id: string } | null>(null)
  const [denyReason, setDenyReason] = useState("")

  const { data, isLoading } = useApprovals(statusFilter !== "all" ? statusFilter : undefined)
  const approveSwap = useApproveSwap()
  const denySwap = useDenySwap()
  const approveDrop = useApproveDrop()
  const denyDrop = useDenyDrop()

  const handleDeny = (type: 'swap' | 'drop', id: string) => {
    setDenyTarget({ type, id })
    setDenyReason("")
    setDenyDialogOpen(true)
  }

  const handleConfirmDeny = () => {
    if (!denyTarget) return
    if (denyTarget.type === 'swap') {
      denySwap.mutate({ id: denyTarget.id, reason: denyReason })
    } else {
      denyDrop.mutate({ id: denyTarget.id, reason: denyReason })
    }
    setDenyDialogOpen(false)
    setDenyTarget(null)
  }

  const swapRequests = data?.swapRequests || []
  const dropRequests = data?.dropRequests || []

  const pendingSwaps = swapRequests.filter(r => r.status === 'PENDING').length
  const pendingDrops = dropRequests.filter(r => r.status === 'PENDING').length

  return (
    <div className="flex flex-1 flex-col gap-6 py-4 md:py-6">
      <div className="px-4 lg:px-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <RefreshCwIcon className="h-8 w-8" />
          Approvals Queue
        </h1>
        <p className="text-muted-foreground">Review and manage swap and drop requests from staff.</p>
      </div>

      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Filters</CardTitle>
            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-auto">
              <TabsList>
                <TabsTrigger value="all">All ({swapRequests.length + dropRequests.length})</TabsTrigger>
                <TabsTrigger value="PENDING">Pending ({pendingSwaps + pendingDrops})</TabsTrigger>
                <TabsTrigger value="APPROVED">Approved</TabsTrigger>
                <TabsTrigger value="REJECTED">Denied</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoaderIcon className="animate-spin size-8 text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Swap Requests */}
                {swapRequests.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <RefreshCwIcon className="h-5 w-5" />
                      Swap Requests ({swapRequests.length})
                    </h3>
                    <div className="space-y-2">
                      {swapRequests.map(request => (
                        <SwapRequestCard
                          key={request.id}
                          request={request}
                          onApprove={() => approveSwap.mutate(request.id)}
                          onDeny={() => handleDeny('swap', request.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Drop Requests */}
                {dropRequests.length > 0 && (
                  <div className={swapRequests.length > 0 ? "mt-6 pt-6 border-t" : ""}>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <AlertTriangleIcon className="h-5 w-5 text-orange-500" />
                      Drop Requests ({dropRequests.length})
                    </h3>
                    <div className="space-y-2">
                      {dropRequests.map(request => (
                        <DropRequestCard
                          key={request.id}
                          request={request}
                          onApprove={() => approveDrop.mutate(request.id)}
                          onDeny={() => handleDeny('drop', request.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {(swapRequests.length === 0 && dropRequests.length === 0) && (
                  <div className="text-center py-12 text-muted-foreground">
                    <RefreshCwIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">No approval requests found</p>
                    <p className="text-sm">Requests will appear here when staff submit swaps or drops</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Deny Dialog */}
      <Dialog open={denyDialogOpen} onOpenChange={setDenyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deny Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for denying this request. The staff member will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="deny-reason">Reason</Label>
              <Textarea
                id="deny-reason"
                placeholder="Enter reason for denial..."
                value={denyReason}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDenyReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDenyDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDeny} disabled={!denyReason.trim()}>
              Confirm Deny
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}