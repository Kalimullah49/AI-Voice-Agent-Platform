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
  PlusIcon, 
  Trash2, 
  ExternalLink, 
  PhoneCall, 
  Search, 
  Settings, 
  CheckCircle2,
  CreditCard,
  Key,
  Globe,
  ListFilter
} from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

export default function PhoneNumbersPage() {
  const [searchAreaCode, setSearchAreaCode] = useState("");
  const [countryCode, setCountryCode] = useState("US");
  const [isSearching, setIsSearching] = useState(false);
  const [availableNumbers, setAvailableNumbers] = useState<any[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [showTwilioAccountDialog, setShowTwilioAccountDialog] = useState(false);
  const [selectedTwilioAccountId, setSelectedTwilioAccountId] = useState<number | null>(null);
  const [assignToAgentId, setAssignToAgentId] = useState("");
  
  const queryClient = useQueryClient();
  
  const { data: phoneNumbers, isLoading: isLoadingPhoneNumbers, error: phoneNumbersError } = useQuery({
    queryKey: ["/api/phone-numbers"],
  });
  
  const { data: twilioAccounts, isLoading: isLoadingTwilioAccounts } = useQuery({
    queryKey: ["/api/twilio-accounts"],
  });
  
  const { data: agents } = useQuery({
    queryKey: ["/api/agents"],
  });
  
  // Form schema for Twilio account
  const twilioAccountFormSchema = z.object({
    accountName: z.string().min(1, "Account name is required"),
    accountSid: z.string().min(1, "Account SID is required"),
    authToken: z.string().min(1, "Auth token is required"),
    isDefault: z.boolean().default(false),
  });

  // Create account form
  const twilioAccountForm = useForm<z.infer<typeof twilioAccountFormSchema>>({
    resolver: zodResolver(twilioAccountFormSchema),
    defaultValues: {
      accountName: "",
      accountSid: "",
      authToken: "",
      isDefault: false,
    },
  });
  
  // Automatically search for available numbers when the dialog opens and a Twilio account is selected
  useEffect(() => {
    if (showPurchaseDialog && selectedTwilioAccountId && !isSearching && availableNumbers.length === 0) {
      // Short delay to let the dialog open fully
      const timer = setTimeout(() => {
        searchAvailableTwilioNumbers();
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [showPurchaseDialog, selectedTwilioAccountId]);

  // Mutation for creating a Twilio account
  const createTwilioAccountMutation = useMutation({
    mutationFn: async (data: z.infer<typeof twilioAccountFormSchema>) => {
      const response = await fetch('/api/twilio-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create Twilio account');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate Twilio accounts query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/twilio-accounts"] });
      toast({
        title: "Success",
        description: "Twilio account added successfully",
      });
      setShowTwilioAccountDialog(false);
      twilioAccountForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add Twilio account",
        variant: "destructive"
      });
    }
  });

  // Mutation for setting an account as default
  const setDefaultAccountMutation = useMutation({
    mutationFn: async (accountId: number) => {
      const response = await fetch(`/api/twilio-accounts/${accountId}/set-default`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to set account as default');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate Twilio accounts query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/twilio-accounts"] });
      toast({
        title: "Success",
        description: "Default account updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update default account",
        variant: "destructive"
      });
    }
  });

  // Mutation for deleting a Twilio account
  const deleteTwilioAccountMutation = useMutation({
    mutationFn: async (accountId: number) => {
      const response = await fetch(`/api/twilio-accounts/${accountId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete Twilio account');
      }
      
      return response.status === 204 ? null : response.json();
    },
    onSuccess: () => {
      // Invalidate Twilio accounts query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/twilio-accounts"] });
      toast({
        title: "Success",
        description: "Twilio account deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete Twilio account",
        variant: "destructive"
      });
    }
  });

  // Mutation for purchasing a Twilio number
  const purchaseTwilioNumberMutation = useMutation({
    mutationFn: async (data: { accountId: number, phoneNumber: string, friendlyName?: string, agentId?: number | null }) => {
      const response = await fetch('/api/purchase-twilio-phone-number', {
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
      setSearchAreaCode("");
      setSelectedNumber(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to purchase number",
        variant: "destructive"
      });
    }
  });
  
  // Mutation for releasing a phone number
  const releasePhoneNumberMutation = useMutation({
    mutationFn: async (phoneNumberId: number) => {
      const response = await fetch(`/api/phone-numbers/${phoneNumberId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to release phone number');
      }
      
      return response.status === 204 ? null : response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/phone-numbers"] });
      toast({
        title: "Success",
        description: "Phone number released successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to release phone number",
        variant: "destructive"
      });
    }
  });
  
  // Mutation for assigning a phone number to an agent
  const assignPhoneNumberMutation = useMutation({
    mutationFn: async ({id, agentId}: {id: number, agentId: number | null}) => {
      const response = await fetch(`/api/phone-numbers/${id}/assign`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ agentId })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to assign phone number');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/phone-numbers"] });
      toast({
        title: "Success",
        description: "Phone number assignment updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign phone number",
        variant: "destructive"
      });
    }
  });
  
  // Function to search for available Twilio numbers
  const searchAvailableTwilioNumbers = async () => {
    if (!selectedTwilioAccountId) {
      toast({
        title: "Error",
        description: "Please select a Twilio account",
        variant: "destructive"
      });
      return;
    }
    
    setIsSearching(true);
    
    try {
      // Build the URL with required parameters
      let url = `/api/available-twilio-phone-numbers?accountId=${selectedTwilioAccountId}&countryCode=${countryCode}`;
      
      // Add area code if provided
      if (searchAreaCode) {
        url += `&areaCode=${searchAreaCode}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to search for numbers');
      }
      
      const data = await response.json();
      setAvailableNumbers(data || []);
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

  // Handle Twilio account form submission
  const onTwilioAccountSubmit = (data: z.infer<typeof twilioAccountFormSchema>) => {
    createTwilioAccountMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Phone Numbers</h1>
        <div className="flex gap-2">          
          {/* Manage Twilio Accounts button */}
          <Dialog open={showTwilioAccountDialog} onOpenChange={setShowTwilioAccountDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center">
                <Settings className="h-4 w-4 mr-2" />
                Manage Twilio Accounts
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Twilio Account Management</DialogTitle>
                <DialogDescription>
                  Manage your Twilio accounts to purchase and use phone numbers.
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="accounts">
                <TabsList className="mb-4">
                  <TabsTrigger value="accounts">Your Accounts</TabsTrigger>
                  <TabsTrigger value="add">Add New Account</TabsTrigger>
                </TabsList>
                
                <TabsContent value="accounts">
                  {isLoadingTwilioAccounts ? (
                    <div className="py-4 flex justify-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"></div>
                    </div>
                  ) : twilioAccounts && Array.isArray(twilioAccounts) && twilioAccounts.length > 0 ? (
                    <div className="space-y-4">
                      {twilioAccounts.map((account: any) => (
                        <div key={account.id} className="p-4 border rounded-lg flex justify-between items-center">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{account.accountName}</h3>
                              {account.isDefault && (
                                <Badge className="bg-green-100 text-green-800">Default</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">SID: {account.accountSid.substring(0, 10)}...</p>
                          </div>
                          <div className="flex gap-2">
                            {!account.isDefault && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setDefaultAccountMutation.mutate(account.id)}
                                disabled={setDefaultAccountMutation.isPending}
                              >
                                Set Default
                              </Button>
                            )}
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => deleteTwilioAccountMutation.mutate(account.id)}
                              disabled={deleteTwilioAccountMutation.isPending}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                        <Key className="h-12 w-12" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">No Twilio accounts found</h3>
                      <p className="text-gray-500 mb-4">
                        Add a Twilio account to start purchasing phone numbers
                      </p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="add">
                  <Form {...twilioAccountForm}>
                    <form onSubmit={twilioAccountForm.handleSubmit(onTwilioAccountSubmit)} className="space-y-4">
                      <FormField
                        control={twilioAccountForm.control}
                        name="accountName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account Name</FormLabel>
                            <FormControl>
                              <Input placeholder="My Twilio Account" {...field} />
                            </FormControl>
                            <FormDescription>
                              A friendly name to identify this account
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={twilioAccountForm.control}
                        name="accountSid"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account SID</FormLabel>
                            <FormControl>
                              <Input placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" {...field} />
                            </FormControl>
                            <FormDescription>
                              Your Twilio Account SID from the Twilio Console
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={twilioAccountForm.control}
                        name="authToken"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Auth Token</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Your Twilio Auth Token" {...field} />
                            </FormControl>
                            <FormDescription>
                              Your Twilio Auth Token from the Twilio Console
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={twilioAccountForm.control}
                        name="isDefault"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={field.onChange}
                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Set as default account</FormLabel>
                              <FormDescription>
                                This account will be used by default for purchasing numbers
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={createTwilioAccountMutation.isPending}
                      >
                        {createTwilioAccountMutation.isPending ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></div>
                            Adding Account...
                          </>
                        ) : (
                          'Add Twilio Account'
                        )}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
          
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
                  Search for available numbers by area code to purchase through your Twilio account.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-6 py-4">
                {twilioAccounts && twilioAccounts.length > 0 ? (
                  <>
                    <div className="grid gap-2">
                      <label htmlFor="twilio-account" className="text-sm font-medium">Select Twilio Account</label>
                      <Select 
                        value={selectedTwilioAccountId?.toString() || ""} 
                        onValueChange={(value) => setSelectedTwilioAccountId(parseInt(value))}
                      >
                        <SelectTrigger id="twilio-account">
                          <SelectValue placeholder="Select a Twilio account" />
                        </SelectTrigger>
                        <SelectContent>
                          {twilioAccounts.map((account: any) => (
                            <SelectItem key={account.id} value={account.id.toString()}>
                              {account.accountName} {account.isDefault && "(Default)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <label htmlFor="country-code" className="text-sm font-medium">Country</label>
                        <Select 
                          value={countryCode} 
                          onValueChange={setCountryCode}
                        >
                          <SelectTrigger id="country-code">
                            <SelectValue placeholder="Select country" />
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
                        <label htmlFor="areaCode" className="text-sm font-medium">Area Code</label>
                        <Input 
                          id="areaCode" 
                          placeholder="e.g. 415" 
                          value={searchAreaCode}
                          onChange={(e) => setSearchAreaCode(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-center">
                      <Button 
                        onClick={searchAvailableTwilioNumbers} 
                        disabled={isSearching || !selectedTwilioAccountId}
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
                        <div className="border rounded-md">
                          <div className="max-h-[300px] overflow-y-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50 sticky top-0 z-10">
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
                                        {selectedNumber === number.phoneNumber ? "Selected" : "Select"}
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
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
                    
                    <DialogFooter>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setShowPurchaseDialog(false);
                          setAvailableNumbers([]);
                          setSearchAreaCode("");
                          setSelectedNumber(null);
                          setAssignToAgentId("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        disabled={!selectedNumber || !selectedTwilioAccountId || purchaseTwilioNumberMutation.isPending} 
                        onClick={() => {
                          if (selectedNumber && selectedTwilioAccountId) {
                            purchaseTwilioNumberMutation.mutate({
                              accountId: selectedTwilioAccountId,
                              phoneNumber: selectedNumber,
                              agentId: assignToAgentId ? parseInt(assignToAgentId) : null
                            });
                          }
                        }}
                      >
                        {purchaseTwilioNumberMutation.isPending ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></div>
                            Purchasing...
                          </>
                        ) : (
                          'Purchase Number'
                        )}
                      </Button>
                    </DialogFooter>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                      <CreditCard className="h-12 w-12" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No Twilio accounts found</h3>
                    <p className="text-gray-500 mb-4">
                      Add a Twilio account to purchase phone numbers
                    </p>
                    <Button 
                      onClick={() => {
                        setShowPurchaseDialog(false);
                        setShowTwilioAccountDialog(true);
                      }}
                    >
                      Add Twilio Account
                    </Button>
                  </div>
                )}
              </div>
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
          {isLoadingPhoneNumbers ? (
            <TableSkeleton />
          ) : phoneNumbersError ? (
            <div className="text-center py-8">
              <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                <PhoneCall className="h-12 w-12" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No Phone Numbers Available</h3>
              <p className="text-gray-500 mb-4">
                Add a Twilio account to get started with phone numbers.
              </p>
              <Button 
                onClick={() => setShowTwilioAccountDialog(true)}
                className="flex items-center"
              >
                <Settings className="h-4 w-4 mr-2" />
                Add Twilio Account
              </Button>
            </div>
          ) : phoneNumbers && Array.isArray(phoneNumbers) && phoneNumbers.length > 0 ? (
            <div className="overflow-hidden border rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone Number</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Twilio Account</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Agent</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {phoneNumbers.map((phoneNumber: any) => {
                    const assignedAgent = agents && Array.isArray(agents) ? 
                      agents.find((a: any) => a.id === phoneNumber.agentId) : null;
                    const twilioAccount = twilioAccounts && Array.isArray(twilioAccounts) ? 
                      twilioAccounts.find((a: any) => a.id === phoneNumber.twilioAccountId) : null;
                    
                    return (
                      <tr key={phoneNumber.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{formatPhoneNumber(phoneNumber.number)}</div>
                          {phoneNumber.friendlyName && (
                            <div className="text-xs text-gray-500">{phoneNumber.friendlyName}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            className={phoneNumber.active 
                              ? "bg-green-100 text-green-800" 
                              : "bg-gray-100 text-gray-800"}
                          >
                            {phoneNumber.active ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {twilioAccount ? (
                            <div className="text-sm text-gray-900">
                              {twilioAccount.accountName}
                              {twilioAccount.isDefault && (
                                <Badge className="ml-2 bg-blue-100 text-blue-800">Default</Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {assignedAgent ? (
                            <div className="text-sm text-gray-900">{assignedAgent.name}</div>
                          ) : (
                            <span className="text-sm text-gray-500">Not assigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex justify-end space-x-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
                                  Assign Agent
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
                                  {/* Using a state variable instead of defaultValue for controlled component */}
                                  <div className="mb-2">
                                    <p className="text-sm">
                                      <strong>Phone Number:</strong> {formatPhoneNumber(phoneNumber.number)}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">
                                      {phoneNumber.agentId 
                                        ? `Currently assigned to: ${assignedAgent?.name || 'Unknown agent'}`
                                        : 'Not currently assigned to any agent'}
                                    </p>
                                  </div>
                                  
                                  <div className="mt-4">
                                    <label className="text-sm font-medium mb-2 block">Select Agent</label>
                                    <Select 
                                      value={phoneNumber.agentId?.toString() || ""}
                                      onValueChange={(value) => {
                                        // Use the mutation function directly here with the selected value
                                        assignPhoneNumberMutation.mutate({
                                          id: phoneNumber.id,
                                          agentId: value ? parseInt(value) : null
                                        });
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select an agent" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="">None (Unassign)</SelectItem>
                                        {agents && Array.isArray(agents) 
                                          ? agents.map((agent: any) => (
                                              <SelectItem key={agent.id} value={agent.id.toString()}>
                                                {agent.name}
                                              </SelectItem>
                                            )) 
                                          : null}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button 
                                    disabled={assignPhoneNumberMutation.isPending}
                                  >
                                    {assignPhoneNumberMutation.isPending ? 'Updating...' : 'Close'}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              className="h-8 px-2 text-xs"
                              onClick={() => {
                                if (confirm(`Are you sure you want to release this phone number (${formatPhoneNumber(phoneNumber.number)})? This action cannot be undone.`)) {
                                  releasePhoneNumberMutation.mutate(phoneNumber.id);
                                }
                              }}
                              disabled={releasePhoneNumberMutation.isPending}
                            >
                              {releasePhoneNumberMutation.isPending ? (
                                <>
                                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-t-transparent mr-1"></div>
                                  Releasing...
                                </>
                              ) : (
                                <>
                                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                                  Release
                                </>
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                <PhoneCall className="h-12 w-12" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No phone numbers found</h3>
              <p className="text-gray-500 mb-4">
                Purchase phone numbers through your Twilio account to assign to your agents.
              </p>
              <Button 
                onClick={() => setShowPurchaseDialog(true)}
                className="flex items-center"
              >
                <PhoneCall className="h-4 w-4 mr-2" />
                Buy Phone Number
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
