"use client"

import { useState } from "react"
import { LoaderIcon, AlertTriangleIcon, UsersIcon, ClockIcon, TrendingUpIcon, MinusIcon, AlertCircleIcon, CheckCircleIcon } from "lucide-react"
import { useAnalytics } from "@/hooks/useDashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SectionCards } from "@/components/section-cards"
import { Button } from "@/components/ui/button"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from "recharts"

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
]

interface OvertimeRisk {
  staffId: string
  name: string
  desiredHours: number
  assignedHours: number
  percentage: number
  isOverLimit: boolean
  isNearLimit: boolean
}

interface ConstraintViolation {
  type: string
  severity: string
  staffId: string
  staffName: string
  message: string
  shiftId?: string
  day?: string
  requiredSkill?: string
  staffSkills?: string[]
}

interface FairnessMetrics {
  totalStaff: number
  totalHours: number
  avgHours: number
  stdDev: number
  minHours: number
  maxHours: number
  fairnessScore: number
}

interface Warning {
  type: string
  severity: string
  count: number
  message: string
}

interface AnalyticsData {
  overtimeRisks: OvertimeRisk[]
  constraintViolations: ConstraintViolation[]
  fairnessMetrics: FairnessMetrics
  warnings: Warning[]
}

function SeverityBadge({ severity }: { severity: string }) {
  const configs = {
    HIGH: { variant: "destructive" as const, icon: <AlertCircleIcon className="h-3 w-3" /> },
    MEDIUM: { variant: "secondary" as const, icon: <AlertTriangleIcon className="h-3 w-3" /> },
    LOW: { variant: "outline" as const, icon: <MinusIcon className="h-3 w-3" /> },
  }
  const config = configs[severity as keyof typeof configs] || configs.LOW
  return (
    <Badge variant={config.variant} className="gap-1">
      {config.icon} {severity}
    </Badge>
  )
}

function OvertimeRiskCard({ risk }: { risk: OvertimeRisk }) {
  const isOver = risk.isOverLimit
  const isNear = risk.isNearLimit && !isOver

  return (
    <Card className={isOver ? "border-red-200 bg-red-50" : isNear ? "border-yellow-200 bg-yellow-50" : ""}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">{risk.name}</h4>
            <p className="text-sm text-muted-foreground">
              {risk.assignedHours}h / {risk.desiredHours}h ({risk.percentage}%)
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isOver && <Badge variant="destructive">Over Limit</Badge>}
            {isNear && <Badge variant="secondary">Near Limit</Badge>}
            {!isOver && !isNear && <Badge variant="outline">OK</Badge>}
          </div>
        </div>
        <Progress value={Math.min(risk.percentage, 100)} className="mt-2 h-2" />
      </CardContent>
    </Card>
  )
}

function ViolationCard({ violation }: { violation: ConstraintViolation }) {
  const typeLabels: Record<string, string> = {
    DOUBLE_BOOKING: "Double Booking",
    SKILL_MISMATCH: "Skill Mismatch",
    AVAILABILITY_CONFLICT: "Availability Conflict",
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline">{typeLabels[violation.type] || violation.type}</Badge>
              <SeverityBadge severity={violation.severity} />
            </div>
            <p className="font-medium">{violation.staffName}</p>
            <p className="text-sm text-muted-foreground">{violation.message}</p>
            {violation.requiredSkill && (
              <p className="text-xs text-muted-foreground mt-1">
                Required: {violation.requiredSkill} | Staff skills: {violation.staffSkills?.join(", ") || "none"}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function BarChartComponent({ data }: { data: { name: string; hours: number }[] }) {
  const chartConfig: ChartConfig = {
    hours: { label: "Hours", color: "var(--primary)" },
  }

  return (
    <ChartContainer config={chartConfig} className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis type="number" tickFormatter={(v) => `${v}h`} />
          <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value: number | undefined) => [value !== undefined ? `${value}h` : "0h", "Hours"]}
              />
            }
          />
          <Bar dataKey="hours" radius={[0, 4, 4, 0]}>
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}

export function AnalyticsDashboard() {
  const { data, isLoading } = useAnalytics()
  const [activeTab, setActiveTab] = useState("overview")

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 py-4 md:py-6">
        <div className="px-4 lg:px-6">
          <h1 className="text-3xl font-bold">Analytics & Fairness</h1>
        </div>
        <div className="flex items-center justify-center flex-1">
          <LoaderIcon className="animate-spin size-8 text-primary" />
        </div>
      </div>
    )
  }

  const analytics = data as AnalyticsData
  const { overtimeRisks, constraintViolations, fairnessMetrics, warnings } = analytics

  const overLimitCount = overtimeRisks.filter(r => r.isOverLimit).length
  const nearLimitCount = overtimeRisks.filter(r => r.isNearLimit).length
  const okCount = overtimeRisks.filter(r => !r.isOverLimit && !r.isNearLimit).length

  const highViolations = constraintViolations.filter(v => v.severity === 'HIGH').length
  const mediumViolations = constraintViolations.filter(v => v.severity === 'MEDIUM').length

  return (
    <div className="flex flex-1 flex-col gap-6 py-4 md:py-6">
      <div className="px-4 lg:px-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <TrendingUpIcon className="h-8 w-8" />
          Analytics & Fairness
        </h1>
        <p className="text-muted-foreground">Monitor staff workload, constraint violations, and schedule fairness.</p>
      </div>

      {/* Warning Banner */}
      {warnings.length > 0 && (
        <div className="px-4 lg:px-6 space-y-2">
          {warnings.map((warning, i) => (
            <Card key={i} className={warning.severity === 'HIGH' ? "border-red-200 bg-red-50" : "border-yellow-200 bg-yellow-50"}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  {warning.severity === 'HIGH' ? (
                    <AlertCircleIcon className="h-5 w-5 text-red-500" />
                  ) : (
                    <AlertTriangleIcon className="h-5 w-5 text-yellow-500" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{warning.message}</p>
                    <p className="text-sm text-muted-foreground">{warning.type} • {warning.count} issue(s)</p>
                  </div>
                  <SeverityBadge severity={warning.severity} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Overview Metrics */}
      <SectionCards
        metrics={[
          { title: 'Staff Over Limit', value: overLimitCount, footer: 'Exceeding maximum hours', badge: 'Critical', trend: 'down' },
          { title: 'Staff Near Limit', value: nearLimitCount, footer: 'Above 80% capacity', badge: 'Warning', trend: 'neutral' },
          { title: 'Constraint Violations', value: highViolations + mediumViolations, footer: `${highViolations} high, ${mediumViolations} medium`, badge: 'Review', trend: 'down' },
          { title: 'Fairness Score', value: `${Math.round(fairnessMetrics.fairnessScore)}%`, footer: 'Hours distribution equity', badge: fairnessMetrics.fairnessScore > 80 ? 'Good' : 'Needs Work', trend: fairnessMetrics.fairnessScore > 80 ? 'up' : 'down' },
        ]}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4 lg:px-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="overtime">Overtime Risks</TabsTrigger>
          <TabsTrigger value="violations">Constraint Violations</TabsTrigger>
          <TabsTrigger value="fairness">Fairness Metrics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Hours Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChartComponent 
                  data={overtimeRisks.map(r => ({ name: r.name, hours: r.assignedHours }))} 
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fairness Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Staff</p>
                    <p className="text-2xl font-bold">{fairnessMetrics.totalStaff}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Hours</p>
                    <p className="text-2xl font-bold">{fairnessMetrics.totalHours}h</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Average Hours</p>
                    <p className="text-2xl font-bold">{fairnessMetrics.avgHours}h</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Std Deviation</p>
                    <p className="text-2xl font-bold">{fairnessMetrics.stdDev}h</p>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground">Range: {fairnessMetrics.minHours}h - {fairnessMetrics.maxHours}h</p>
                  <Progress value={fairnessMetrics.fairnessScore} className="mt-2 h-2" />
                  <p className="text-sm text-muted-foreground mt-1">Fairness Score: {Math.round(fairnessMetrics.fairnessScore)}%</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Overtime Risk Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircleIcon className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="font-medium text-red-800">{overLimitCount} Over Limit</p>
                    <p className="text-sm text-red-600">Immediate action required</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertTriangleIcon className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="font-medium text-yellow-800">{nearLimitCount} Near Limit</p>
                    <p className="text-sm text-yellow-600">Monitor closely</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium text-green-800">{okCount} Within Limits</p>
                    <p className="text-sm text-green-600">No concerns</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overtime Risks Tab */}
        <TabsContent value="overtime" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Overtime Risk Details</CardTitle>
            </CardHeader>
            <CardContent>
              {overtimeRisks.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No overtime risks detected</p>
              ) : (
                <div className="space-y-3">
                  {overtimeRisks.map(risk => (
                    <OvertimeRiskCard key={risk.staffId} risk={risk} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Constraint Violations Tab */}
        <TabsContent value="violations" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Constraint Violations</CardTitle>
            </CardHeader>
            <CardContent>
              {constraintViolations.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No constraint violations detected</p>
              ) : (
                <div className="space-y-3">
                  {constraintViolations.map((violation, i) => (
                    <ViolationCard key={i} violation={violation} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fairness Tab */}
        <TabsContent value="fairness" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Hours Distribution Fairness</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChartComponent 
                data={overtimeRisks.map(r => ({ name: r.name, hours: r.assignedHours }))} 
              />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribution Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Min Hours</span>
                  <span className="font-bold">{fairnessMetrics.minHours}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Hours</span>
                  <span className="font-bold">{fairnessMetrics.maxHours}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Average</span>
                  <span className="font-bold">{fairnessMetrics.avgHours}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Std Deviation</span>
                  <span className="font-bold">{fairnessMetrics.stdDev}h</span>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <span className="text-muted-foreground">Fairness Score</span>
                  <span className="font-bold text-lg">{Math.round(fairnessMetrics.fairnessScore)}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {fairnessMetrics.fairnessScore < 70 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <AlertTriangleIcon className="inline h-4 w-4 mr-1" />
                      Low fairness score. Consider redistributing hours more evenly across staff.
                    </p>
                  </div>
                )}
                {overLimitCount > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">
                      <AlertCircleIcon className="inline h-4 w-4 mr-1" />
                      {overLimitCount} staff over limit. Reassign shifts or increase their max hours.
                    </p>
                  </div>
                )}
                {highViolations > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">
                      <AlertCircleIcon className="inline h-4 w-4 mr-1" />
                      {highViolations} high-severity violations. Review double bookings and availability conflicts.
                    </p>
                  </div>
                )}
                {fairnessMetrics.fairnessScore >= 70 && overLimitCount === 0 && highViolations === 0 && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      <CheckCircleIcon className="inline h-4 w-4 mr-1" />
                      Schedule looks well-balanced with no critical issues.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-start" variant="outline">
                  <UsersIcon className="mr-2 h-4 w-4" />
                  View Staff Directory
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <ClockIcon className="mr-2 h-4 w-4" />
                  Open Schedule Builder
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <AlertTriangleIcon className="mr-2 h-4 w-4" />
                  Review All Violations
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}