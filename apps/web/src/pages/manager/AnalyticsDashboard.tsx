"use client"

import { LoaderIcon, AlertTriangleIcon, TrendingUpIcon, MinusIcon, AlertCircleIcon, CheckCircleIcon, ShieldAlertIcon, ScaleIcon, BarChart3Icon } from "lucide-react"
import { useAnalytics } from "@/hooks/useDashboard"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { SectionCards } from "@/components/section-cards"
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

function BarChartComponent({ data }: { data: { name: string; hours: number }[] }) {
  const chartConfig: ChartConfig = {
    hours: { label: "Hours", color: "var(--primary)" },
  }

  const chartHeight = Math.max(300, data.length * 40)

  return (
    <ChartContainer config={chartConfig} style={{ height: chartHeight }} className="w-full min-h-75 aspect-auto">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis type="number" tickFormatter={(v) => `${v}h`} />
          <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value: any) => [value !== undefined ? `${value}h` : "0h", "Hours"]}
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

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 py-4 md:py-6">
        <div className="px-4 lg:px-6">
          <h1 className="text-3xl font-bold">Analytics &amp; Fairness</h1>
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

  const typeLabels: Record<string, string> = {
    DOUBLE_BOOKING: "Double Booking",
    SKILL_MISMATCH: "Skill Mismatch",
    AVAILABILITY_CONFLICT: "Availability Conflict",
  }

  return (
    <div className="flex flex-1 flex-col gap-8 py-4 md:py-6">
      {/* Page Header */}
      <div className="px-4 lg:px-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <TrendingUpIcon className="h-8 w-8" />
          Analytics &amp; Fairness
        </h1>
        <p className="text-muted-foreground mt-1">Monitor staff workload, constraint violations, and schedule fairness.</p>
      </div>

      {/* Warning Banners */}
      {warnings.length > 0 && (
        <div className="px-4 lg:px-6 space-y-2">
          {warnings.map((warning, i) => (
            <Card key={i} className={warning.severity === 'HIGH' ? "border-red-200 bg-red-50" : "border-yellow-200 bg-yellow-50"}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  {warning.severity === 'HIGH' ? (
                    <AlertCircleIcon className="h-5 w-5 text-red-500 shrink-0" />
                  ) : (
                    <AlertTriangleIcon className="h-5 w-5 text-yellow-500 shrink-0" />
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

      {/* KPI Summary Cards */}
      <SectionCards
        metrics={[
          { title: 'Staff Over Limit', value: overLimitCount, footer: 'Exceeding maximum hours', badge: 'Critical', trend: 'down' },
          { title: 'Staff Near Limit', value: nearLimitCount, footer: 'Above 80% capacity', badge: 'Warning', trend: 'neutral' },
          { title: 'Constraint Violations', value: highViolations + mediumViolations, footer: `${highViolations} high, ${mediumViolations} medium`, badge: 'Review', trend: 'down' },
          { title: 'Fairness Score', value: `${Math.round(fairnessMetrics.fairnessScore)}%`, footer: 'Hours distribution equity', badge: fairnessMetrics.fairnessScore > 80 ? 'Good' : 'Needs Work', trend: fairnessMetrics.fairnessScore > 80 ? 'up' : 'down' },
        ]}
      />

      {/* Hours Distribution Chart */}
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3Icon className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Hours Distribution</CardTitle>
                <CardDescription>Assigned hours per staff member</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <BarChartComponent
              data={overtimeRisks.map(r => ({ name: r.name, hours: r.assignedHours }))}
            />
          </CardContent>
        </Card>
      </div>

      {/* Overtime Risks + Fairness — side by side on large screens */}
      <div className="px-4 lg:px-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overtime Risks */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangleIcon className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Overtime Risks</CardTitle>
                <CardDescription>
                  {overLimitCount > 0
                    ? `${overLimitCount} over limit, ${nearLimitCount} near limit`
                    : nearLimitCount > 0
                    ? `${nearLimitCount} near limit, ${okCount} within limits`
                    : `All ${okCount} staff within limits`}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {overtimeRisks.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No overtime risks detected</p>
            ) : (
              <div className="space-y-3">
                {overtimeRisks.map(risk => {
                  const isOver = risk.isOverLimit
                  const isNear = risk.isNearLimit && !isOver

                  return (
                    <div
                      key={risk.staffId}
                      className={`flex items-center justify-between gap-4 rounded-lg border p-3 ${
                        isOver ? "border-red-200 bg-red-50" : isNear ? "border-yellow-200 bg-yellow-50" : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{risk.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {risk.assignedHours}h / {risk.desiredHours}h
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-medium tabular-nums">{risk.percentage}%</span>
                        {isOver && <Badge variant="destructive">Over</Badge>}
                        {isNear && <Badge variant="secondary">Near</Badge>}
                        {!isOver && !isNear && <Badge variant="outline">OK</Badge>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fairness Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ScaleIcon className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Fairness Overview</CardTitle>
                <CardDescription>Hours distribution equity across staff</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Score */}
            <div className="text-center">
              <p className="text-5xl font-bold tabular-nums">{Math.round(fairnessMetrics.fairnessScore)}%</p>
              <p className="text-sm text-muted-foreground mt-1">Fairness Score</p>
              <Progress value={fairnessMetrics.fairnessScore} className="mt-3 h-2" />
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-4 border-t pt-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Staff</p>
                <p className="text-xl font-bold">{fairnessMetrics.totalStaff}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-xl font-bold">{fairnessMetrics.totalHours}h</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Average</p>
                <p className="text-xl font-bold">{fairnessMetrics.avgHours}h</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Std Deviation</p>
                <p className="text-xl font-bold">{fairnessMetrics.stdDev}h</p>
              </div>
            </div>

            {/* Range */}
            <div className="flex justify-between text-sm border-t pt-4">
              <span className="text-muted-foreground">Min: <span className="font-medium text-foreground">{fairnessMetrics.minHours}h</span></span>
              <span className="text-muted-foreground">Max: <span className="font-medium text-foreground">{fairnessMetrics.maxHours}h</span></span>
            </div>

            {/* Inline recommendation */}
            {fairnessMetrics.fairnessScore < 70 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <AlertTriangleIcon className="inline h-4 w-4 mr-1" />
                  Low fairness score. Consider redistributing hours more evenly across staff.
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
      </div>

      {/* Constraint Violations */}
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlertIcon className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Constraint Violations</CardTitle>
                <CardDescription>
                  {constraintViolations.length === 0
                    ? "No violations detected"
                    : `${highViolations} high, ${mediumViolations} medium severity`}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {constraintViolations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircleIcon className="h-10 w-10 text-green-500 mb-2" />
                <p className="text-muted-foreground">No constraint violations detected</p>
              </div>
            ) : (
              <div className="space-y-3">
                {constraintViolations.map((violation, i) => (
                  <div key={i} className="flex items-start justify-between gap-4 rounded-lg border p-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}