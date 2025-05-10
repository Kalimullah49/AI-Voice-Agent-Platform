import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableSkeleton } from "@/components/ui/skeleton";
import { DownloadIcon, Filter } from "lucide-react";
import { formatDuration, formatPhoneNumber } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";

export default function CallsHistoryPage() {
  // State for filters
  const [minDuration, setMinDuration] = useState<number>(5);
  const [maxDuration, setMaxDuration] = useState<number>(10);
  const [callerPhoneFilter, setCallerPhoneFilter] = useState<string>("");
  const [calleePhoneFilter, setCalleePhoneFilter] = useState<string>("");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [endedReasonFilter, setEndedReasonFilter] = useState<string>("all");
  const [outcomeFilter, setOutcomeFilter] = useState<string>("all");
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  
  const { data: calls, isLoading, error } = useQuery<any[]>({
    queryKey: ["/api/calls"],
  });
  
  // Filter the calls based on the current filters
  const filteredCalls = calls?.filter((call) => {
    // Filter by duration
    const callDurationMinutes = Math.floor(call.duration / 60);
    if (callDurationMinutes < minDuration || callDurationMinutes > maxDuration) {
      return false;
    }
    
    // Filter by caller phone number
    if (callerPhoneFilter && !call.fromNumber.includes(callerPhoneFilter)) {
      return false;
    }
    
    // Filter by callee phone number
    if (calleePhoneFilter && !call.toNumber.includes(calleePhoneFilter)) {
      return false;
    }
    
    // Filter by agent
    if (agentFilter !== "all" && call.agent !== agentFilter) {
      return false;
    }
    
    // Filter by ended reason
    if (endedReasonFilter !== "all" && call.endedReason !== (
      endedReasonFilter === "agent" ? "Agent Ended Call" : 
      endedReasonFilter === "customer" ? "Customer Ended Call" : 
      endedReasonFilter
    )) {
      return false;
    }
    
    // Filter by outcome
    if (outcomeFilter !== "all" && 
        (outcomeFilter === "no-outcome" ? call.outcome !== null : call.outcome !== outcomeFilter)) {
      return false;
    }
    
    // Filter by direction
    if (directionFilter !== "all" && call.direction !== directionFilter) {
      return false;
    }
    
    return true;
  }) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Calls</h2>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="text-sm font-medium mb-4">Filters</div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Filter caller phone number:</label>
              <Input 
                placeholder="Caller phone number" 
                value={callerPhoneFilter}
                onChange={(e) => setCallerPhoneFilter(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Filter callee phone number:</label>
              <Input 
                placeholder="Callee phone number" 
                value={calleePhoneFilter}
                onChange={(e) => setCalleePhoneFilter(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Filter Agents:</label>
              <Select value={agentFilter} onValueChange={setAgentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All agents</SelectItem>
                  <SelectItem value="ava">Ava</SelectItem>
                  <SelectItem value="recovery">Recovery Agent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Filter Ended Reason:</label>
              <Select value={endedReasonFilter} onValueChange={setEndedReasonFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All reasons" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All reasons</SelectItem>
                  <SelectItem value="agent">Agent Ended Call</SelectItem>
                  <SelectItem value="customer">Customer Ended Call</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Filter Outcome:</label>
              <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All outcomes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All outcomes</SelectItem>
                  <SelectItem value="no-outcome">No outcome</SelectItem>
                  <SelectItem value="transferred">Transferred</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Filter Direction:</label>
              <Select value={directionFilter} onValueChange={setDirectionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All directions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All directions</SelectItem>
                  <SelectItem value="inbound">Inbound</SelectItem>
                  <SelectItem value="outbound">Outbound</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="mb-6">
            <div className="flex flex-col space-y-6 mb-4">
              <div>
                <div className="text-xs text-gray-500 mb-2">Min duration: {minDuration} mins</div>
                <Slider
                  defaultValue={[minDuration]}
                  min={0}
                  max={60}
                  step={1}
                  value={[minDuration]}
                  onValueChange={(values) => setMinDuration(values[0])}
                  className="w-full bg-blue-100"
                />
              </div>
              
              <div>
                <div className="text-xs text-gray-500 mb-2">Max duration: {maxDuration} mins</div>
                <Slider
                  defaultValue={[maxDuration]}
                  min={0}
                  max={60}
                  step={1}
                  value={[maxDuration]}
                  onValueChange={(values) => setMaxDuration(values[0])}
                  className="w-full bg-blue-100"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex space-x-4 items-center">
                <div className="text-xs text-gray-500">Columns</div>
                <Select>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select columns" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All columns</SelectItem>
                    <SelectItem value="minimal">Minimal view</SelectItem>
                    <SelectItem value="custom">Custom selection</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center">
                <div className="bg-white px-3 py-1 border rounded-md text-sm mr-4 flex items-center">
                  <span className="text-xs mr-2">May 03, 2025 - May 10, 2025</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar">
                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                    <line x1="16" x2="16" y1="2" y2="6" />
                    <line x1="8" x2="8" y1="2" y2="6" />
                    <line x1="3" x2="21" y1="10" y2="10" />
                  </svg>
                </div>
                <Button variant="outline" size="sm">
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Download as CSV
                </Button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <TableSkeleton />
          ) : error ? (
            <div className="text-center text-red-500 py-4">Failed to load call history</div>
          ) : filteredCalls.length > 0 ? (
            <div className="rounded-md border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To</th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Direction</th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ended Reason</th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Outcome</th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Started At</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCalls.map((call: any) => (
                      <tr key={call.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatPhoneNumber(call.fromNumber)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatPhoneNumber(call.toNumber)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          Recovery Agent
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <Badge 
                            variant="outline" 
                            className={call.direction === 'inbound' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}
                          >
                            {call.direction === 'inbound' ? 'Inbound' : 'Outbound'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDuration(call.duration)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {call.endedReason || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {call.outcome === 'transferred' ? 'Transferred' : 'No outcome'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ${call.cost.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(call.startedAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No call records found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
