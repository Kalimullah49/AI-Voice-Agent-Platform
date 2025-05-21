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
  Settings, 
  CheckCircle2,
  Key,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ImportPhoneNumbersDialog } from "@/components/phone-numbers/ImportPhoneNumbersDialog";

export default function PhoneNumbersPage() {
  const [searchAreaCode, setSearchAreaCode] = useState("");
  const [countryCode, setCountryCode] = useState("US");
  const [isSearching, setIsSearching] = useState(false);
  const [availableNumbers, setAvailableNumbers] = useState<any[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [showTwilioAccountDialog, setShowTwilioAccountDialog] = useState(false);
  const [showReleaseConfirmDialog, setShowReleaseConfirmDialog] = useState(false);
  const [numberToRelease, setNumberToRelease] = useState<{id: number, number: string} | null>(null);
  const [selectedTwilioAccountId, setSelectedTwilioAccountId] = useState<number | null>(null);
  const [assignToAgentId, setAssignToAgentId] = useState("");
  const [showImportDialog, setShowImportDialog] = useState(false);
  
  const queryClient = useQueryClient();
  
  const { data: phoneNumbers, isLoading: isLoadingPhoneNumbers } = useQuery({
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
      isDefault: false
    }
  });
  
  // Handle form submission for Twilio account
  const onTwilioAccountSubmit = (data: z.infer<typeof twilioAccountFormSchema>) => {
    createTwilioAccountMutation.mutate(data);
  };
  
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
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/twilio-accounts'] });
      setShowTwilioAccountDialog(false);
      twilioAccountForm.reset();
      toast({
        title: "Account added",
        description: "Twilio account has been successfully added.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add account",
        description: error.message || "An error occurred while adding Twilio account.",
        variant: "destructive"
      });
    }
  });
  
  // Mutation for setting a Twilio account as default
  const setDefaultAccountMutation = useMutation({
    mutationFn: async (accountId: number) => {
      const response = await fetch(`/api/twilio-accounts/${accountId}/set-default`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to set as default');
      }
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/twilio-accounts'] });
      toast({
        title: "Default account updated",
        description: "This account will now be used by default for phone number operations.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update default account",
        description: error.message || "An error occurred while updating default account.",
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
        throw new Error(errorData.message || 'Failed to delete account');
      }
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/twilio-accounts'] });
      toast({
        title: "Account deleted",
        description: "Twilio account has been successfully deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete account",
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
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/phone-numbers'] });
      setShowPurchaseDialog(false);
      setSelectedNumber(null);
      setAvailableNumbers([]);
      setSearchAreaCode("");
      toast({
        title: "Phone number purchased",
        description: "The phone number has been successfully purchased and added to your account.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to purchase phone number",
        description: error.message || "An error occurred while purchasing the phone number.",
        variant: "destructive"
      });
    }
  });
  
  // Mutation for assigning a phone number to an agent
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
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to assign phone number');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/phone-numbers'] });
      toast({
        title: "Phone number assigned",
        description: "The phone number has been successfully assigned to the selected agent.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to assign phone number",
        description: error.message || "An error occurred while assigning the phone number.",
        variant: "destructive"
      });
    }
  });
  
  // Mutation for releasing a Twilio number
  const releasePhoneNumberMutation = useMutation({
    mutationFn: async (phoneNumberId: number) => {
      const response = await fetch(`/api/phone-numbers/${phoneNumberId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to release phone number');
      }
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/phone-numbers'] });
      setShowReleaseConfirmDialog(false);
      setNumberToRelease(null);
      toast({
        title: "Phone number released",
        description: "The phone number has been successfully released from your Twilio account.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to release phone number",
        description: error.message || "An error occurred while releasing the phone number.",
        variant: "destructive"
      });
    }
  });
  
  // Search for available Twilio numbers
  const searchNumbers = async () => {
    if (!selectedTwilioAccountId) {
      toast({
        title: "Select an account",
        description: "Please select a Twilio account first.",
        variant: "destructive"
      });
      return;
    }
    
    // Always allow search with or without area code
    // Empty area code will fetch any available numbers
    
    setIsSearching(true);
    setAvailableNumbers([]);
    
    try {
      const params = new URLSearchParams();
      params.append('accountId', selectedTwilioAccountId.toString());
      params.append('countryCode', countryCode);
      if (searchAreaCode) params.append('areaCode', searchAreaCode);
      
      const response = await fetch(`/api/available-twilio-phone-numbers?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch available numbers');
      }
      
      const data = await response.json();
      setAvailableNumbers(data);
    } catch (error: any) {
      toast({
        title: "Search failed",
        description: error.message || "Failed to search for available numbers",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };
  
  // Effect to auto-search for numbers when dialog opens
  useEffect(() => {
    if (showPurchaseDialog && selectedTwilioAccountId) {
      // Set empty area code first for US searches to get all available numbers
      if (countryCode === 'US') {
        setSearchAreaCode('');
      }
      
      // Use a short timeout to let the dialog fully open
      const timer = setTimeout(() => {
        searchNumbers();
      }, 300);
      
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPurchaseDialog, selectedTwilioAccountId]);
  
  // Effect to set default account when dialog opens
  useEffect(() => {
    if (showPurchaseDialog && twilioAccounts && Array.isArray(twilioAccounts) && twilioAccounts.length > 0) {
      const defaultAccount = twilioAccounts.find((account: any) => account.isDefault);
      if (defaultAccount) {
        setSelectedTwilioAccountId(defaultAccount.id);
      } else if (twilioAccounts.length > 0) {
        setSelectedTwilioAccountId(twilioAccounts[0].id);
      }
    }
  }, [showPurchaseDialog, twilioAccounts]);
  
  // Handle number purchase
  const handlePurchaseNumber = () => {
    if (!selectedTwilioAccountId || !selectedNumber) {
      toast({
        title: "Missing information",
        description: "Please select an account and a phone number.",
        variant: "destructive"
      });
      return;
    }
    
    const agentId = assignToAgentId ? parseInt(assignToAgentId) : null;
    
    purchaseTwilioNumberMutation.mutate({
      accountId: selectedTwilioAccountId,
      phoneNumber: selectedNumber,
      friendlyName: `AimAI Number ${new Date().toISOString()}`,
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
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Search & Purchase Twilio Numbers</DialogTitle>
                <DialogDescription>
                  Search for available numbers by area code to purchase through your Twilio account.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-6 py-4">
                {twilioAccounts && Array.isArray(twilioAccounts) && twilioAccounts.length > 0 ? (
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
                          {twilioAccounts.filter(account => account && account.id).map((account: any) => (
                            <SelectItem key={account.id} value={account.id.toString()}>
                              {account.accountName || "Unnamed Account"} {account.isDefault ? "(Default)" : ""}
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
                            value={searchAreaCode} 
                            onChange={(e) => setSearchAreaCode(e.target.value)} 
                            placeholder="e.g. 415"
                            className="flex-grow"
                          />
                          <Button 
                            type="button" 
                            onClick={searchNumbers}
                            disabled={isSearching}
                            className="shrink-0"
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
                    
                    {/* Available numbers list */}
                    <div className="border rounded-md p-2 max-h-[40vh] md:max-h-[50vh] overflow-y-auto">
                      <div className="sticky top-0 bg-white p-2 border-b mb-2 z-10 flex justify-between items-center">
                        <h3 className="font-medium">Available Phone Numbers</h3>
                        {availableNumbers.length > 0 && (
                          <span className="text-xs text-gray-500">
                            {availableNumbers.length} number{availableNumbers.length !== 1 ? 's' : ''} found
                          </span>
                        )}
                      </div>
                      
                      {isSearching ? (
                        <div className="py-8 flex flex-col justify-center items-center">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent mb-2"></div>
                          <span className="text-sm text-gray-500">Searching for available numbers...</span>
                        </div>
                      ) : availableNumbers.length > 0 ? (
                        <div className="space-y-2">
                          {availableNumbers.map((number) => (
                            <div 
                              key={number.phoneNumber} 
                              className={`p-2 border rounded-md flex justify-between items-center cursor-pointer
                                ${selectedNumber === number.phoneNumber ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'}`}
                              onClick={() => setSelectedNumber(number.phoneNumber)}
                            >
                              <div>
                                <div className="font-medium">{formatPhoneNumber(number.phoneNumber)}</div>
                                <div className="text-xs text-gray-500">Location: {number.locality || 'Unknown'}</div>
                              </div>
                              {selectedNumber === number.phoneNumber && (
                                <CheckCircle2 className="h-5 w-5 text-blue-500" />
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-8 text-center text-gray-500">
                          {searchAreaCode ? (
                            'No phone numbers found with this area code. Try another area code or clear the area code to see all available numbers.'
                          ) : (
                            'Searching for available numbers...'
                          )}
                        </div>
                      )}
                    </div>
                    
                    {selectedNumber && (
                      <div className="grid gap-2">
                        <label htmlFor="assign-agent" className="text-sm font-medium">Assign to Agent (Optional)</label>
                        <Select 
                          value={assignToAgentId} 
                          onValueChange={setAssignToAgentId}
                        >
                          <SelectTrigger id="assign-agent">
                            <SelectValue placeholder="Select an agent" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {agents && Array.isArray(agents) && agents
                              .filter(agent => {
                                // Only show agents that don't already have a phone number assigned
                                if (!agent || !agent.id) return false;
                                const hasPhoneNumber = phoneNumbers.some(pn => pn.agentId === agent.id);
                                return !hasPhoneNumber;
                              })
                              .map((agent: any) => (
                                <SelectItem key={agent.id} value={agent.id.toString()}>
                                  {agent.name || "Unnamed Agent"}
                                </SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                      <Key className="h-12 w-12" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No Twilio accounts found</h3>
                    <p className="text-gray-500 mb-4">
                      Add a Twilio account first to purchase phone numbers
                    </p>
                    <Button 
                      variant="outline"
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
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setShowPurchaseDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handlePurchaseNumber}
                  disabled={!selectedNumber || !selectedTwilioAccountId || purchaseTwilioNumberMutation.isPending}
                >
                  {purchaseTwilioNumberMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Purchasing...
                    </>
                  ) : (
                    'Purchase Number'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Import Existing Numbers button */}
          <Button 
            variant="outline" 
            className="border-blue-500 text-blue-600 hover:bg-blue-50"
            onClick={() => setShowImportDialog(true)}
          >
            <Download className="h-4 w-4 mr-2" />
            Import Existing Numbers
          </Button>
        </div>
      </div>
      
      {/* Confirmation dialog for releasing a phone number */}
      <AlertDialog open={showReleaseConfirmDialog} onOpenChange={setShowReleaseConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Release Phone Number</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to release the phone number <span className="font-semibold">{numberToRelease?.number ? formatPhoneNumber(numberToRelease.number) : ''}</span>?
              <br /><br />
              This will remove the number from your Twilio account and you will no longer be charged for it.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (numberToRelease) {
                  releasePhoneNumberMutation.mutate(numberToRelease.id);
                }
              }}
              disabled={releasePhoneNumberMutation.isPending}
            >
              {releasePhoneNumberMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Releasing...
                </>
              ) : (
                'Release Number'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Main content */}
      {isLoadingPhoneNumbers ? (
        <TableSkeleton columns={4} rows={3} className="mt-6" />
      ) : phoneNumbers && Array.isArray(phoneNumbers) && phoneNumbers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {phoneNumbers.map((phoneNumber: any) => (
            <Card key={phoneNumber.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="flex justify-between items-center">
                  <span className="text-lg">{formatPhoneNumber(phoneNumber.number)}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-800 hover:bg-red-50 ml-2 h-8 w-8 p-0"
                    onClick={() => confirmReleaseNumber(phoneNumber.id, phoneNumber.number)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </CardTitle>
                <CardDescription>
                  {phoneNumber.friendlyName || 'No friendly name'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col space-y-2">
                  <div className="text-sm text-gray-500">
                    <span className="font-medium">Twilio SID:</span>{' '}
                    {phoneNumber.twilioSid ? (
                      <span className="font-mono text-xs">
                        {phoneNumber.twilioSid.substring(0, 8)}...
                      </span>
                    ) : 'N/A'}
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    <span className="font-medium">Status:</span>{' '}
                    <Badge variant={phoneNumber.active ? "success" : "secondary"}>
                      {phoneNumber.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <label htmlFor={`assign-agent-${phoneNumber.id}`} className="block text-sm font-medium mb-2">
                    Assigned Agent
                  </label>
                  <Select 
                    value={phoneNumber.agentId?.toString() || ""} 
                    onValueChange={(value) => handleAssignToAgent(phoneNumber.id, { target: { value } } as any)}
                  >
                    <SelectTrigger id={`assign-agent-${phoneNumber.id}`}>
                      <SelectValue placeholder="Select an agent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {agents && Array.isArray(agents) && agents
                        .filter(agent => {
                          // Include this agent if it's already assigned to this phone number
                          if (phoneNumber.agentId === agent.id) return true;
                          
                          // Check if this agent already has a phone number assigned to it
                          // If so, don't include it in the dropdown to prevent multiple phone numbers assigned to the same agent
                          const hasPhoneNumber = phoneNumbers.some(pn => 
                            pn.agentId === agent.id && pn.id !== phoneNumber.id
                          );
                          return !hasPhoneNumber;
                        })
                        .map((agent: any) => (
                          <SelectItem key={agent.id} value={agent.id.toString()}>
                            {agent.name}
                          </SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border rounded-md mt-6">
          <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
            <PhoneMissed className="h-12 w-12" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No phone numbers found</h3>
          <p className="text-gray-500 mb-4">
            You don't have any phone numbers yet. Purchase a number or import existing numbers.
          </p>
          <div className="flex justify-center gap-4">
            <Button 
              onClick={() => setShowPurchaseDialog(true)}
              disabled={!twilioAccounts || !Array.isArray(twilioAccounts) || twilioAccounts.length === 0}
            >
              <PhoneCall className="h-4 w-4 mr-2" />
              Buy Phone Number
            </Button>
            <Button 
              variant="outline"
              onClick={() => setShowImportDialog(true)}
              disabled={!twilioAccounts || !Array.isArray(twilioAccounts) || twilioAccounts.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Import Existing Numbers
            </Button>
          </div>
        </div>
      )}
      
      {/* Import Numbers Dialog */}
      <ImportPhoneNumbersDialog 
        open={showImportDialog} 
        onOpenChange={setShowImportDialog} 
        twilioAccounts={twilioAccounts || []}
      />
    </div>
  );
}