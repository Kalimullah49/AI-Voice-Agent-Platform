import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRealTime } from "@/hooks/use-real-time";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
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
import { DownloadIcon, CalendarIcon, FileAudio } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDuration, formatPhoneNumber } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { format, addDays, subDays } from "date-fns";

export default function CallsHistoryPage() {
  // Function to handle CSV download
  const handleDownloadCSV = (calls: any[]) => {
    // Define CSV headers
    const headers = [
      "From",
      "To",
      "Agent Name",
      "Direction",
      "Duration (mins)",
      "Ended Reason",
      "Outcome",
      "Total cost",
      "Started At"
    ];
    
    // Format call data for CSV
    const csvData = calls.map(call => [
      formatPhoneNumber(call.fromNumber),
      formatPhoneNumber(call.toNumber),
      call.agent || "Recovery Agent",
      call.direction === 'inbound' ? 'Inbound' : 'Outbound',
      formatDuration(call.duration),
      call.endedReason || 'N/A',
      call.outcome === 'transferred' ? 'Transferred' : 'No outcome',
      `$${call.cost.toFixed(2)}`,
      new Date(call.startedAt).toLocaleString()
    ]);
    
    // Combine headers and data
    const csvContent = [
      headers.join(","),
      ...csvData.map(row => row.join(","))
    ].join("\n");
    
    // Create and download the CSV file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `call_history_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  // State for filters - no default duration restrictions
  const [minDuration, setMinDuration] = useState<number>(0);
  const [maxDuration, setMaxDuration] = useState<number>(999);
  const [callerPhoneFilter, setCallerPhoneFilter] = useState<string>("");
  const [calleePhoneFilter, setCalleePhoneFilter] = useState<string>("");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [endedReasonFilter, setEndedReasonFilter] = useState<string>("all");
  const [outcomeFilter, setOutcomeFilter] = useState<string>("all");
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  
  // State for table display
  
  // State for date range - no default filter, show all data
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  
  // Real-time updates for calls
  useRealTime();

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
    
    // Filter by date range
    if (dateRange?.from && dateRange?.to) {
      const callDate = new Date(call.startedAt);
      const startOfFromDay = new Date(dateRange.from);
      startOfFromDay.setHours(0, 0, 0, 0);
      
      const endOfToDay = new Date(dateRange.to);
      endOfToDay.setHours(23, 59, 59, 999);
      
      if (callDate < startOfFromDay || callDate > endOfToDay) {
        return false;
      }
    }
    
    return true;
  }) || [];

  return (
    <div className="space-y-6">

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
            
            <div className="flex items-center justify-end mb-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="bg-white px-3 py-1 border rounded-md text-sm mr-4 flex items-center h-9">
                    <span className="text-xs mr-2">
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "MMM dd, yyyy")} - {format(dateRange.to, "MMM dd, yyyy")}
                          </>
                        ) : (
                          format(dateRange.from, "MMM dd, yyyy")
                        )
                      ) : (
                        "Select date range"
                      )}
                    </span>
                    <CalendarIcon className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleDownloadCSV(filteredCalls)}
              >
                <DownloadIcon className="h-4 w-4 mr-2" />
                Download as CSV
              </Button>
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
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent Name</th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Direction</th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration (mins)</th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ended Reason</th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Outcome</th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total cost</th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Started At</th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recording</th>
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
                          {call.agent || "Recovery Agent"}
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <DownloadRecordingButton callId={call.id} />
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

// Component for downloading call recordings with enhanced play/pause/stop functionality
function DownloadRecordingButton({ callId }: { callId: number }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [playState, setPlayState] = useState<'stopped' | 'playing' | 'paused'>('stopped');
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const fetchRecordingUrl = async () => {
    try {
      const response = await fetch(`/api/calls/${callId}/recording`);
      const data = await response.json();
      
      if (data.success && data.recordingUrl) {
        setRecordingUrl(data.recordingUrl);
        return data.recordingUrl;
      } else {
        toast({
          title: "Recording Not Available",
          description: data.message || "No recording available for this call",
          variant: "destructive",
        });
        return null;
      }
    } catch (error) {
      toast({
        title: "Failed to Load Recording",
        description: "Failed to load call recording",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const url = recordingUrl || await fetchRecordingUrl();
      
      if (url) {
        // Create a temporary link to download the recording
        const link = document.createElement('a');
        link.href = url;
        link.download = `call-recording-${callId}.mp3`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
          title: "Recording Downloaded",
          description: "Call recording downloaded successfully",
        });
      }
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download call recording",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePlayPause = async () => {
    try {
      if (playState === 'stopped') {
        // Start playing
        const url = recordingUrl || await fetchRecordingUrl();
        
        if (url) {
          const audio = new Audio(url);
          setAudioElement(audio);
          setPlayState('playing');
          
          audio.onended = () => {
            setPlayState('stopped');
            setAudioElement(null);
          };
          
          audio.onerror = () => {
            setPlayState('stopped');
            setAudioElement(null);
            toast({
              title: "Playback Failed",
              description: "Failed to play call recording",
              variant: "destructive",
            });
          };
          
          audio.play();
        }
      } else if (playState === 'playing') {
        // Pause
        if (audioElement) {
          audioElement.pause();
          setPlayState('paused');
        }
      } else if (playState === 'paused') {
        // Resume
        if (audioElement) {
          audioElement.play();
          setPlayState('playing');
        }
      }
    } catch (error) {
      setPlayState('stopped');
      setAudioElement(null);
      toast({
        title: "Playback Failed",
        description: "Failed to play call recording",
        variant: "destructive",
      });
    }
  };

  const handleStop = () => {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
      setAudioElement(null);
    }
    setPlayState('stopped');
  };

  const getPlayIcon = () => {
    if (playState === 'playing') {
      return (
        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="4" width="4" height="16"></rect>
          <rect x="14" y="4" width="4" height="16"></rect>
        </svg>
      );
    } else {
      return (
        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
      );
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={handlePlayPause}
        className="flex items-center gap-1 px-2"
        title={playState === 'playing' ? 'Pause' : 'Play'}
      >
        {getPlayIcon()}
      </Button>
      
      {playState !== 'stopped' && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleStop}
          className="flex items-center gap-1 px-2"
          title="Stop"
        >
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          </svg>
        </Button>
      )}
      
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownload}
        disabled={isDownloading}
        className="flex items-center gap-1 px-2"
        title="Download"
      >
        {isDownloading ? (
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
        ) : (
          <FileAudio className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}
