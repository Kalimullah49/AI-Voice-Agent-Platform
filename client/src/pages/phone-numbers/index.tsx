import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/skeleton";
import { 
  Trash2, 
  PhoneCall, 
  Search, 
  CheckCircle2,
  Loader2,
  Download,
  PhoneMissed
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatPhoneNumber } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { ImportPhoneNumbersDialog } from "@/components/phone-numbers/ImportPhoneNumbersDialog";

export default function PhoneNumbersPage() {
  const [searchAreaCode, setSearchAreaCode] = useState("");
  const [countryCode, setCountryCode] = useState("US");
  const [isSearching, setIsSearching] = useState(false);
  const [availableNumbers, setAvailableNumbers] = useState<any[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [showReleaseConfirmDialog, setShowReleaseConfirmDialog] = useState(false);
  const [numberToRelease, setNumberToRelease] = useState<{id: number, number: string} | null>(null);
  const [assignToAgentId, setAssignToAgentId] = useState("");
  const [showImportDialog, setShowImportDialog] = useState(false);
  
  const queryClient = useQueryClient();
  
  const { data: phoneNumbers, isLoading: isLoadingPhoneNumbers } = useQuery({
    queryKey: ["/api/phone-numbers"],
  });
  
  const { data: agents } = useQuery({
    queryKey: ["/api/agents"],
  });
  
  // Search for available phone numbers
  const searchPhoneNumbers = async () => {
    if (!searchAreaCode.trim()) {
      toast({
        title: "Area code required",
        description: "Please enter an area code to search for numbers",
        variant: "destructive"
      });
      return;
    }
    
    setIsSearching(true);
    try {
      const response = await fetch(`/api/available-twilio-phone-numbers?countryCode=${countryCode}&areaCode=${searchAreaCode}`);
      if (!response.ok) {
        throw new Error('Failed to fetch available numbers');
      }
      const data = await response.json();
      
      // Handle new response format with numbers array and message
      if (data.numbers) {
        setAvailableNumbers(data.numbers);
        
        // Show informative message if fallback numbers were returned
        if (data.fallback) {
          toast({
            title: "Area code unavailable",
            description: data.message,
            variant: "default"
          });
        } else if (data.numbers.length > 0) {
          toast({
            title: "Numbers found",
            description: data.message,
            variant: "default"
          });
        } else {
          toast({
            title: "No numbers available",
            description: data.message,
            variant: "destructive"
          });
        }
      } else {
        // Fallback for old response format (direct array)
        setAvailableNumbers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      toast({
        title: "Search failed",
        description: "Failed to search for available numbers. Please try again.",
        variant: "destructive"
      });
      setAvailableNumbers([]);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Purchase phone number mutation
  const purchaseNumberMutation = useMutation({
    mutationFn: async ({ phoneNumber, agentId }: { phoneNumber: string, agentId?: number }) => {
      const response = await fetch('/api/purchase-twilio-phone-number', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phoneNumber,
          friendlyName: `AimAI Number ${new Date().toISOString()}`,
          agentId
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to purchase phone number');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/phone-numbers"] });
      setShowPurchaseDialog(false);
      setSelectedNumber(null);
      setAvailableNumbers([]);
      setSearchAreaCode("");
      setAssignToAgentId("");
      
      toast({
        title: "Phone number purchased",
        description: "The phone number has been successfully purchased and added to your account."
      });
    },
    onError: (error) => {
      toast({
        title: "Purchase failed",
        description: error.message || "Failed to purchase phone number. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // Release phone number mutation
  const releaseNumberMutation = useMutation({
    mutationFn: async (phoneNumberId: number) => {
      const response = await fetch(`/api/phone-numbers/${phoneNumberId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to release phone number');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/phone-numbers"] });
      setShowReleaseConfirmDialog(false);
      setNumberToRelease(null);
      
      toast({
        title: "Phone number released",
        description: "The phone number has been successfully released from your account."
      });
    },
    onError: () => {
      toast({
        title: "Release failed",
        description: "Failed to release phone number. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // Assign phone number to agent mutation
  const assignPhoneNumberMutation = useMutation({
    mutationFn: async ({ phoneNumberId, agentId }: { phoneNumberId: number, agentId: number | null }) => {
      const response = await fetch(`/api/phone-numbers/${phoneNumberId}/assign`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ agentId })
      });
      
      if (!response.ok) {
        throw new Error('Failed to assign phone number');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/phone-numbers"] });
      toast({
        title: "Assignment updated",
        description: "Phone number assignment has been updated successfully."
      });
    },
    onError: () => {
      toast({
        title: "Assignment failed",
        description: "Failed to update phone number assignment. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // Handle purchasing a number
  const handlePurchaseNumber = () => {
    if (!selectedNumber) return;
    
    const agentId = assignToAgentId && assignToAgentId !== "unassigned" ? parseInt(assignToAgentId) : undefined;
    purchaseNumberMutation.mutate({
      phoneNumber: selectedNumber,
      agentId
    });
  };
  
  // Handle agent assignment
  const handleAssignToAgent = (phoneNumberId: number, e: React.ChangeEvent<HTMLSelectElement>) => {
    const agentId = e.target.value ? parseInt(e.target.value) : null;
    assignPhoneNumberMutation.mutate({ phoneNumberId, agentId });
  };
  
  // Handle number release confirmation dialog
  const confirmReleaseNumber = (id: number, number: string) => {
    setNumberToRelease({ id, number });
    setShowReleaseConfirmDialog(true);
  };
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Phone Numbers</h1>
        <div className="flex gap-2">
          {/* Buy Phone Number button */}
          <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
            <DialogTrigger asChild>
              <Button variant="default" className="bg-blue-600 hover:bg-blue-700 text-white">
                <PhoneCall className="h-4 w-4 mr-2" />
                Buy Phone Number
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Search & Purchase Phone Numbers</DialogTitle>
                <DialogDescription>
                  Search for available numbers by area code to purchase through the default Twilio account.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label htmlFor="country-code" className="text-sm font-medium">Country</label>
                    <Select 
                      value={countryCode} 
                      onValueChange={setCountryCode}
                    >
                      <SelectTrigger id="country-code">
                        <SelectValue placeholder="Select a country" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="US">United States</SelectItem>
                        <SelectItem value="CA">Canada</SelectItem>
                        <SelectItem value="GB">United Kingdom</SelectItem>
                        <SelectItem value="AU">Australia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <label htmlFor="area-code" className="text-sm font-medium">Area Code</label>
                    <div className="flex gap-2">
                      <Input 
                        id="area-code" 
                        placeholder="e.g., 212" 
                        value={searchAreaCode}
                        onChange={(e) => setSearchAreaCode(e.target.value)}
                        className="flex-1"
                      />
                      <Button 
                        onClick={searchPhoneNumbers}
                        disabled={isSearching}
                        variant="outline"
                      >
                        {isSearching ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                
                {availableNumbers.length > 0 && (
                  <div className="grid gap-2">
                    <label htmlFor="assign-agent" className="text-sm font-medium">Assign to Agent (Optional)</label>
                    <Select 
                      value={assignToAgentId} 
                      onValueChange={setAssignToAgentId}
                    >
                      <SelectTrigger id="assign-agent">
                        <SelectValue placeholder="Select an agent (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">No agent assigned</SelectItem>
                        {agents && agents.filter(agent => agent && agent.id).map((agent: any) => (
                          <SelectItem key={agent.id} value={agent.id.toString()}>
                            {agent.name || 'Unnamed Agent'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {availableNumbers.length > 0 && (
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Available Numbers</h3>
                      <Badge variant="outline">{availableNumbers.length} found</Badge>
                    </div>
                    
                    <div className="grid gap-2 max-h-60 overflow-y-auto">
                      {availableNumbers.map((number: any) => (
                        <div 
                          key={number.phoneNumber} 
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedNumber === number.phoneNumber 
                              ? 'bg-blue-50 border-blue-500' 
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => setSelectedNumber(number.phoneNumber)}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{formatPhoneNumber(number.phoneNumber)}</span>
                              {selectedNumber === number.phoneNumber && (
                                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              {number.locality && number.region && `${number.locality}, ${number.region}`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowPurchaseDialog(false);
                    setSelectedNumber(null);
                    setAvailableNumbers([]);
                    setSearchAreaCode("");
                    setAssignToAgentId("");
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handlePurchaseNumber}
                  disabled={!selectedNumber || purchaseNumberMutation.isPending}
                >
                  {purchaseNumberMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Purchasing...
                    </>
                  ) : (
                    'Purchase Number'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Import Phone Numbers button */}
          <ImportPhoneNumbersDialog 
            trigger={
              <Button variant="outline" className="text-blue-600 border-blue-600 hover:bg-blue-50">
                <Download className="h-4 w-4 mr-2" />
                Import Existing Numbers
              </Button>
            }
          />
        </div>
      </div>
      
      {/* Phone Numbers List */}
      <div className="space-y-4">
        {isLoadingPhoneNumbers ? (
          <div className="grid gap-4">
            <TableSkeleton />
          </div>
        ) : phoneNumbers && phoneNumbers.length > 0 ? (
          <div className="grid gap-4">
            {phoneNumbers.map((phoneNumber: any) => (
              <Card key={phoneNumber.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{formatPhoneNumber(phoneNumber.number)}</h3>
                      <Badge variant={phoneNumber.status === 'active' ? 'default' : 'secondary'}>
                        {phoneNumber.status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>AimAI Number {phoneNumber.createdAt}</p>
                      <p>Twilio SID: {phoneNumber.twilioSid ? phoneNumber.twilioSid.substring(0, 8) + '...' : 'N/A'}</p>
                      <p>Status: {phoneNumber.status || 'Active'}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Assigned Agent</p>
                      <Select 
                        value={phoneNumber.agentId ? phoneNumber.agentId.toString() : "unassigned"} 
                        onValueChange={(value) => {
                          const agentId = value === "unassigned" ? null : parseInt(value);
                          assignPhoneNumberMutation.mutate({ phoneNumberId: phoneNumber.id, agentId });
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select an agent" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">No agent assigned</SelectItem>
                          {agents && agents.filter(agent => agent && agent.id).map((agent: any) => (
                            <SelectItem key={agent.id} value={agent.id.toString()}>
                              {agent.name || 'Unnamed Agent'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => confirmReleaseNumber(phoneNumber.id, phoneNumber.number)}
                    disabled={releaseNumberMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
              <PhoneMissed className="h-12 w-12" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No phone numbers found</h3>
            <p className="text-gray-500 mb-4">
              Purchase your first phone number to get started with voice calls
            </p>
            <Button 
              onClick={() => setShowPurchaseDialog(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <PhoneCall className="h-4 w-4 mr-2" />
              Buy Phone Number
            </Button>
          </div>
        )}
      </div>
      
      {/* Release Number Confirmation Dialog */}
      <AlertDialog open={showReleaseConfirmDialog} onOpenChange={setShowReleaseConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to release this number?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently release the phone number "{numberToRelease?.number}" from your account. 
              This action cannot be undone and you will lose access to this number.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (numberToRelease) {
                  releaseNumberMutation.mutate(numberToRelease.id);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Release Number
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}