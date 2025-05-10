import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TableSkeleton } from "@/components/ui/skeleton";
import { DownloadIcon, Filter } from "lucide-react";
import { formatDuration, formatPhoneNumber } from "@/lib/utils";

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
  
  // State for selected columns
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    "from", "to", "agentName", "type", "duration", 
    "endedReason", "outcomeIds", "cost", "startedAt"
  ]);
  
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Min Duration:</label>
                <Select value={String(minDuration)} onValueChange={(value) => setMinDuration(Number(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Min duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0 minutes</SelectItem>
                    <SelectItem value="1">1 minute</SelectItem>
                    <SelectItem value="2">2 minutes</SelectItem>
                    <SelectItem value="3">3 minutes</SelectItem>
                    <SelectItem value="4">4 minutes</SelectItem>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="6">6 minutes</SelectItem>
                    <SelectItem value="7">7 minutes</SelectItem>
                    <SelectItem value="8">8 minutes</SelectItem>
                    <SelectItem value="9">9 minutes</SelectItem>
                    <SelectItem value="10">10 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Max Duration:</label>
                <Select value={String(maxDuration)} onValueChange={(value) => setMaxDuration(Number(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Max duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 minute</SelectItem>
                    <SelectItem value="2">2 minutes</SelectItem>
                    <SelectItem value="3">3 minutes</SelectItem>
                    <SelectItem value="4">4 minutes</SelectItem>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="6">6 minutes</SelectItem>
                    <SelectItem value="7">7 minutes</SelectItem>
                    <SelectItem value="8">8 minutes</SelectItem>
                    <SelectItem value="9">9 minutes</SelectItem>
                    <SelectItem value="10">10 minutes</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="20">20 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex space-x-4 items-center">
                <div className="text-xs text-gray-500">Columns</div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[200px] justify-between">
                      Columns
                      <Filter className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[220px] p-0" align="start">
                    <div className="p-4 space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="column-id" 
                          checked={selectedColumns.includes('id')}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedColumns([...selectedColumns, 'id']);
                            } else {
                              setSelectedColumns(selectedColumns.filter(col => col !== 'id'));
                            }
                          }}
                        />
                        <label htmlFor="column-id" className="text-sm cursor-pointer">
                          Id
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="column-agentId" 
                          checked={selectedColumns.includes('agentId')}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedColumns([...selectedColumns, 'agentId']);
                            } else {
                              setSelectedColumns(selectedColumns.filter(col => col !== 'agentId'));
                            }
                          }}
                        />
                        <label htmlFor="column-agentId" className="text-sm cursor-pointer">
                          AgentId
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="column-from" 
                          checked={selectedColumns.includes('from')}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedColumns([...selectedColumns, 'from']);
                            } else {
                              setSelectedColumns(selectedColumns.filter(col => col !== 'from'));
                            }
                          }}
                        />
                        <label htmlFor="column-from" className="text-sm cursor-pointer">
                          From
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="column-to" 
                          checked={selectedColumns.includes('to')}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedColumns([...selectedColumns, 'to']);
                            } else {
                              setSelectedColumns(selectedColumns.filter(col => col !== 'to'));
                            }
                          }}
                        />
                        <label htmlFor="column-to" className="text-sm cursor-pointer">
                          To
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="column-agentName" 
                          checked={selectedColumns.includes('agentName')}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedColumns([...selectedColumns, 'agentName']);
                            } else {
                              setSelectedColumns(selectedColumns.filter(col => col !== 'agentName'));
                            }
                          }}
                        />
                        <label htmlFor="column-agentName" className="text-sm cursor-pointer">
                          AgentName
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="column-type" 
                          checked={selectedColumns.includes('type')}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedColumns([...selectedColumns, 'type']);
                            } else {
                              setSelectedColumns(selectedColumns.filter(col => col !== 'type'));
                            }
                          }}
                        />
                        <label htmlFor="column-type" className="text-sm cursor-pointer">
                          Type
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="column-duration" 
                          checked={selectedColumns.includes('duration')}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedColumns([...selectedColumns, 'duration']);
                            } else {
                              setSelectedColumns(selectedColumns.filter(col => col !== 'duration'));
                            }
                          }}
                        />
                        <label htmlFor="column-duration" className="text-sm cursor-pointer">
                          Duration
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="column-endedReason" 
                          checked={selectedColumns.includes('endedReason')}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedColumns([...selectedColumns, 'endedReason']);
                            } else {
                              setSelectedColumns(selectedColumns.filter(col => col !== 'endedReason'));
                            }
                          }}
                        />
                        <label htmlFor="column-endedReason" className="text-sm cursor-pointer">
                          EndedReason
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="column-outcomeIds" 
                          checked={selectedColumns.includes('outcomeIds')}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedColumns([...selectedColumns, 'outcomeIds']);
                            } else {
                              setSelectedColumns(selectedColumns.filter(col => col !== 'outcomeIds'));
                            }
                          }}
                        />
                        <label htmlFor="column-outcomeIds" className="text-sm cursor-pointer">
                          OutcomeIds
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="column-cost" 
                          checked={selectedColumns.includes('cost')}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedColumns([...selectedColumns, 'cost']);
                            } else {
                              setSelectedColumns(selectedColumns.filter(col => col !== 'cost'));
                            }
                          }}
                        />
                        <label htmlFor="column-cost" className="text-sm cursor-pointer">
                          Cost
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="column-startedAt" 
                          checked={selectedColumns.includes('startedAt')}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedColumns([...selectedColumns, 'startedAt']);
                            } else {
                              setSelectedColumns(selectedColumns.filter(col => col !== 'startedAt'));
                            }
                          }}
                        />
                        <label htmlFor="column-startedAt" className="text-sm cursor-pointer">
                          StartedAt
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="column-endedAt" 
                          checked={selectedColumns.includes('endedAt')}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedColumns([...selectedColumns, 'endedAt']);
                            } else {
                              setSelectedColumns(selectedColumns.filter(col => col !== 'endedAt'));
                            }
                          }}
                        />
                        <label htmlFor="column-endedAt" className="text-sm cursor-pointer">
                          EndedAt
                        </label>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
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
