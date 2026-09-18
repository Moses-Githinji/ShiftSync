import * as React from "react"
import { useAvailability, useSetAvailabilityWindows, useAddAvailabilityException } from "@/hooks/useStaffFeatures"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { LoaderIcon, PlusIcon } from "lucide-react"

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export function AvailabilityManager() {
  const { data, isLoading } = useAvailability()
  const { mutate: setWindows, isPending: savingWindows } = useSetAvailabilityWindows()
  const { mutate: addException, isPending: addingException } = useAddAvailabilityException()
  
  const [windows, setLocalWindows] = React.useState<any[]>([])
  
  // Exception form state
  const [exDate, setExDate] = React.useState("")
  const [exIsAvailable, setExIsAvailable] = React.useState("false")
  const [exStart, setExStart] = React.useState("")
  const [exEnd, setExEnd] = React.useState("")

  React.useEffect(() => {
    if (data?.availabilityWindows) {
      setLocalWindows(data.availabilityWindows)
    }
  }, [data])

  const handleSaveWindows = () => {
    setWindows(windows)
  }

  const handleWindowChange = (dayOfWeek: number, field: string, value: string) => {
    setLocalWindows(prev => {
      const copy = [...prev]
      const existingIdx = copy.findIndex(w => w.dayOfWeek === dayOfWeek)
      
      if (existingIdx >= 0) {
        if (!value && field === 'startTime') {
          // removing window
          copy.splice(existingIdx, 1)
        } else {
          copy[existingIdx] = { ...copy[existingIdx], [field]: value }
        }
      } else {
        copy.push({
          dayOfWeek,
          startTime: field === 'startTime' ? value : '09:00',
          endTime: field === 'endTime' ? value : '17:00'
        })
      }
      return copy
    })
  }

  const handleAddException = (e: React.FormEvent) => {
    e.preventDefault()
    if (!exDate) return;

    addException({
      date: exDate,
      isAvailable: exIsAvailable === "true",
      startTime: exIsAvailable === "true" ? exStart : null,
      endTime: exIsAvailable === "true" ? exEnd : null
    }, {
      onSuccess: () => {
        setExDate("")
        setExStart("")
        setExEnd("")
      }
    })
  }

  if (isLoading) {
    return <div className="flex justify-center p-12"><LoaderIcon className="animate-spin text-primary w-8 h-8" /></div>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Weekly Availability</CardTitle>
          <CardDescription>Set your standard weekly working hours.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {DAYS_OF_WEEK.map((day, idx) => {
            const window = windows.find(w => w.dayOfWeek === idx)
            const isWorking = !!window
            
            return (
              <div key={day} className="flex items-center justify-between gap-4">
                <div className="w-24 font-medium">{day}</div>
                <div className="flex-1 flex items-center gap-2">
                  <Input 
                    type="time" 
                    value={window?.startTime || ''} 
                    onChange={(e) => handleWindowChange(idx, 'startTime', e.target.value)}
                    className="w-32"
                  />
                  <span>to</span>
                  <Input 
                    type="time" 
                    value={window?.endTime || ''} 
                    onChange={(e) => handleWindowChange(idx, 'endTime', e.target.value)}
                    className="w-32"
                    disabled={!isWorking}
                  />
                </div>
              </div>
            )
          })}
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveWindows} disabled={savingWindows}>
            {savingWindows ? "Saving..." : "Save Weekly Hours"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Time Off & Exceptions</CardTitle>
          <CardDescription>Add specific dates where you are unavailable.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddException} className="space-y-4 border p-4 rounded-md mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={exDate} onChange={e => setExDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Available?</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={exIsAvailable} 
                  onChange={e => setExIsAvailable(e.target.value)}
                >
                  <option value="false">Time Off (Unavailable)</option>
                  <option value="true">Available (Override)</option>
                </select>
              </div>
            </div>
            
            {exIsAvailable === "true" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input type="time" value={exStart} onChange={e => setExStart(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input type="time" value={exEnd} onChange={e => setExEnd(e.target.value)} required />
                </div>
              </div>
            )}
            
            <Button type="submit" variant="secondary" className="w-full" disabled={addingException}>
              <PlusIcon className="w-4 h-4 mr-2" /> {addingException ? "Adding..." : "Add Exception"}
            </Button>
          </form>

          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Upcoming Exceptions</h4>
            {data?.availabilityExceptions?.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming exceptions.</p>
            ) : (
              <ul className="space-y-2">
                {data?.availabilityExceptions?.map((ex: any) => (
                  <li key={ex.id} className="text-sm p-2 border rounded-md flex justify-between items-center">
                    <div>
                      <span className="font-medium">{new Date(ex.date).toLocaleDateString()}</span>
                      <span className="ml-2 text-muted-foreground">
                        {ex.isAvailable ? `Available: ${ex.startTime} - ${ex.endTime}` : 'Time Off'}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
// trigger IDE refresh
