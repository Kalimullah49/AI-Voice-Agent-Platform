import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/skeleton";
import { PlusIcon, Trash2, ExternalLink, PhoneCall, Search } from "lucide-react";
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

export default function PhoneNumbersPage() {
  const [searchAreaCode, setSearchAreaCode] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [assignToAgentId, setAssignToAgentId] = useState("");
  
  const queryClient = useQueryClient();
  
  const { data: phoneNumbers, isLoading, error } = useQuery({
    queryKey: ["/api/phone-numbers"],
  });
  
  const { data: agents } = useQuery({
    queryKey: ["/api/agents"],
  });
  
  // Mutation for purchasing a number
  const purchaseNumberMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string, agentId?: number | null }) => {
      const response = await fetch('/api/phone-numbers/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to purchase number');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate phone numbers query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/phone-numbers"] });
      toast({
        title: "Success",
        description: "Phone number purchased successfully",
      });
      setShowPurchaseDialog(false);
      setAvailableNumbers([]);
      setSearchTerm("");
      setSearchAreaCode("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to purchase number",
        variant: "destructive"
      });
    }
  });
  
  // Function to search for available numbers
  const searchAvailableNumbers = async () => {
    if (!searchAreaCode && !searchTerm) {
      toast({
        title: "Search Error",
        description: "Please enter an area code or search term",
        variant: "destructive"
      });
      return;
    }
    
    setIsSearching(true);
    
    try {
      const response = await fetch(`/api/phone-numbers/available?areaCode=${searchAreaCode}&contains=${searchTerm}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to search for numbers');
      }
      
      const data = await response.json();
      setAvailableNumbers(data.numbers || []);
    } catch (error) {
      toast({
        title: "Search Error",
        description: error instanceof Error ? error.message : "Failed to search for numbers",
        variant: "destructive"
      });
      setAvailableNumbers([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end items-center">
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center">
            <PlusIcon className="h-4 w-4 mr-2" />
            Import phone number
          </Button>
          
          <Button variant="outline" asChild>
            <a href="https://www.twilio.com/console/phone-numbers" target="_blank" rel="noopener noreferrer">
              Twilio Accounts
            </a>
          </Button>
          
          {/* Buy Phone Number button */}
          <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
            <DialogTrigger asChild>
              <Button variant="default" className="bg-blue-600 hover:bg-blue-700 text-white">
                <PhoneCall className="h-4 w-4 mr-2" />
                Buy Phone Number
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Search & Purchase Twilio Numbers</DialogTitle>
                <DialogDescription>
                  Search for available numbers by area code or contains specific digits.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label htmlFor="areaCode" className="text-sm font-medium">Area Code</label>
                    <Input 
                      id="areaCode" 
                      placeholder="e.g. 415" 
                      value={searchAreaCode}
                      onChange={(e) => setSearchAreaCode(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="contains" className="text-sm font-medium">Contains Digits</label>
                    <Input 
                      id="contains" 
                      placeholder="e.g. 9999" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="flex justify-center">
                  <Button 
                    onClick={searchAvailableNumbers} 
                    disabled={isSearching}
                    className="w-full md:w-auto"
                  >
                    {isSearching ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></div>
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Search Available Numbers
                      </>
                    )}
                  </Button>
                </div>
                
                {availableNumbers.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium mb-2">Available Numbers</h3>
                    <div className="border rounded-md overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Number</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {availableNumbers.map((number: any, index: number) => (
                            <tr key={index} className={selectedNumber === number.phoneNumber ? "bg-blue-50" : ""}>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">{formatPhoneNumber(number.phoneNumber)}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">{number.locality || number.region || 'N/A'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">{number.capabilities?.voice ? 'Voice' : ''}{number.capabilities?.sms ? (number.capabilities?.voice ? '/SMS' : 'SMS') : ''}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                                <Button 
                                  size="sm" 
                                  variant={selectedNumber === number.phoneNumber ? "default" : "outline"}
                                  onClick={() => setSelectedNumber(number.phoneNumber)}
                                >
                                  Select
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                
                {selectedNumber && (
                  <div className="mt-4 border-t pt-4">
                    <h3 className="text-sm font-medium mb-2">Assign to Agent (Optional)</h3>
                    <Select value={assignToAgentId} onValueChange={setAssignToAgentId}>
                      <SelectTrigger id="agent">
                        <SelectValue placeholder="Select an agent" />
                      </SelectTrigger>
                      <SelectContent>
                        {agents?.map((agent: any) => (
                          <SelectItem key={agent.id} value={agent.id.toString()}>
                            {agent.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowPurchaseDialog(false);
                    setAvailableNumbers([]);
                    setSearchTerm("");
                    setSearchAreaCode("");
                    setSelectedNumber(null);
                    setAssignToAgentId("");
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  disabled={!selectedNumber || purchaseNumberMutation.isPending} 
                  onClick={() => {
                    if (selectedNumber) {
                      purchaseNumberMutation.mutate({
                        phoneNumber: selectedNumber,
                        agentId: assignToAgentId ? parseInt(assignToAgentId) : null
                      });
                    }
                  }}
                >
                  {purchaseNumberMutation.isPending ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></div>
                      Purchasing...
                    </>
                  ) : (
                    'Purchase Number'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          

        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Phone Numbers</CardTitle>
          <CardDescription>
            Manage phone numbers for your agents and campaigns
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <TableSkeleton />
          ) : error ? (
            <div className="text-center text-red-500 py-4">Failed to load phone numbers</div>
          ) : phoneNumbers && phoneNumbers.length > 0 ? (
            <div className="space-y-4">
              {phoneNumbers.map((phoneNumber: any) => {
                const assignedAgent = agents?.find((a: any) => a.id === phoneNumber.agentId);
                
                return (
                  <div key={phoneNumber.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-50 flex items-center justify-center">
                        <svg className="h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-lg font-medium text-gray-900">{formatPhoneNumber(phoneNumber.number)}</p>
                        <p className="text-sm text-gray-500">
                          {assignedAgent 
                            ? `Assigned to: ${assignedAgent.name}` 
                            : 'Unassigned'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {phoneNumber.active ? (
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-100 text-gray-800">Inactive</Badge>
                      )}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            Assign
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Assign Phone Number</DialogTitle>
                            <DialogDescription>
                              Assign this phone number to an agent.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-4">
                            <Select defaultValue={phoneNumber.agentId?.toString()}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select an agent" />
                              </SelectTrigger>
                              <SelectContent>
                                {agents?.map((agent: any) => (
                                  <SelectItem key={agent.id} value={agent.id.toString()}>
                                    {agent.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <DialogFooter>
                            <Button variant="outline">Cancel</Button>
                            <Button>Assign Number</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Button variant="ghost" size="sm" className="text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                <svg className="h-12 w-12" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No phone numbers found</h3>
              <p className="text-gray-500 mb-4">
                Import phone numbers from your Twilio account to assign to your agents.
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" className="flex items-center">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Import phone number
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
