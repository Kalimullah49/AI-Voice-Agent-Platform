import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  PlusIcon, 
  Search, 
  MoreHorizontal, 
  PlayCircle, 
  PauseCircle, 
  Settings
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createCampaign, getContactGroups, getPhoneNumbers } from "@/lib/api";

export default function CampaignsPage() {
  // State for campaign creation form
  const [campaignName, setCampaignName] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [localAreaPresence, setLocalAreaPresence] = useState(false);
  const [selectedPhoneNumberId, setSelectedPhoneNumberId] = useState<string>("");
  const [concurrentCalls, setConcurrentCalls] = useState<string>("1");
  const [scrubNationalBlacklists, setScrubNationalBlacklists] = useState(false);
  
  const queryClient = useQueryClient();
  
  // Queries
  const { data: campaigns, isLoading, error } = useQuery({
    queryKey: ["/api/campaigns"],
  });
  
  const { data: agents } = useQuery({
    queryKey: ["/api/agents"],
  });
  
  const { data: contactGroups } = useQuery({
    queryKey: ["/api/contact-groups"],
  });
  
  const { data: phoneNumbers } = useQuery({
    queryKey: ["/api/phone-numbers"],
  });
  
  // Mutation for creating campaign
  const createCampaignMutation = useMutation({
    mutationFn: async (campaignData: any) => {
      const response = await createCampaign(campaignData);
      return response;
    },
    onSuccess: () => {
      // Reset form
      setCampaignName("");
      setSelectedAgentId("");
      setSelectedGroupId("");
      setLocalAreaPresence(false);
      setSelectedPhoneNumberId("");
      setConcurrentCalls("1");
      setScrubNationalBlacklists(false);
      
      // Invalidate cache to refetch campaigns
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-100 text-yellow-800">Paused</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Campaigns Management</h2>
        <div className="flex gap-2">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Dialer Settings
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="h-4 w-4 mr-2" />
                Create new campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create new Campaign</DialogTitle>
                <DialogDescription>
                  Enter the name of the new campaign and the associated agent and contact group.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-5">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">Name</label>
                  <Input 
                    id="name" 
                    placeholder="Enter campaign name" 
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="agent" className="text-sm font-medium">Agent</label>
                  <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                    <SelectTrigger id="agent" className="w-full">
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
                
                <div className="space-y-2">
                  <label htmlFor="contactGroup" className="text-sm font-medium">Contact Group</label>
                  <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                    <SelectTrigger id="contactGroup" className="w-full">
                      <SelectValue placeholder="Select a contact group" />
                    </SelectTrigger>
                    <SelectContent>
                      {contactGroups?.map((group: any) => (
                        <SelectItem key={group.id} value={group.id.toString()}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center justify-between space-y-0">
                  <label htmlFor="localAreaPresence" className="text-sm font-medium">
                    Local Area Presence
                  </label>
                  <Switch 
                    id="localAreaPresence"
                    checked={localAreaPresence}
                    onCheckedChange={setLocalAreaPresence}
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="phoneNumber" className="text-sm font-medium">Phone Number</label>
                  <Select value={selectedPhoneNumberId} onValueChange={setSelectedPhoneNumberId}>
                    <SelectTrigger id="phoneNumber" className="w-full">
                      <SelectValue placeholder="Select a phone number" />
                    </SelectTrigger>
                    <SelectContent>
                      {phoneNumbers?.map((phone: any) => (
                        <SelectItem key={phone.id} value={phone.id.toString()}>
                          {phone.number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="concurrentCalls" className="text-sm font-medium">Concurrent Calls</label>
                  <Select 
                    value={concurrentCalls} 
                    onValueChange={setConcurrentCalls}
                  >
                    <SelectTrigger id="concurrentCalls" className="w-full">
                      <SelectValue placeholder="1" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center justify-between space-y-0">
                  <label htmlFor="scrubNationalBlacklists" className="text-sm font-medium">
                    Scrub National Blacklists
                  </label>
                  <Switch 
                    id="scrubNationalBlacklists"
                    checked={scrubNationalBlacklists}
                    onCheckedChange={setScrubNationalBlacklists}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  onClick={() => {
                    if (!campaignName || !selectedAgentId) return;
                    
                    // Create campaign data object
                    const campaignData = {
                      name: campaignName,
                      agentId: parseInt(selectedAgentId),
                      groupId: selectedGroupId ? parseInt(selectedGroupId) : null,
                      localAreaPresence,
                      phoneNumberId: selectedPhoneNumberId ? parseInt(selectedPhoneNumberId) : null,
                      concurrentCalls: parseInt(concurrentCalls),
                      scrubNationalBlacklists,
                      status: 'draft'
                    };
                    
                    // Submit data
                    createCampaignMutation.mutate(campaignData);
                  }}
                  disabled={!campaignName || !selectedAgentId || createCampaignMutation.isPending}
                >
                  {createCampaignMutation.isPending ? 'Creating...' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle>Campaign List</CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Input
                  type="search"
                  placeholder="Search campaigns..."
                  className="w-[200px] md:w-[300px]"
                />
                <Select>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All agents" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All agents</SelectItem>
                    {agents?.map((agent: any) => (
                      <SelectItem key={agent.id} value={agent.id.toString()}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <CardDescription>
            Manage your outbound calling campaigns
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <TableSkeleton />
          ) : error ? (
            <div className="text-center text-red-500 py-4">Failed to load campaigns</div>
          ) : campaigns && campaigns.length > 0 ? (
            <div className="rounded-md border overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign ID</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign Name</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated At</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {campaigns.map((campaign: any) => (
                    <tr key={campaign.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{campaign.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{campaign.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getStatusBadge(campaign.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {agents?.find((a: any) => a.id === campaign.agentId)?.name || 'Unassigned'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(campaign.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(campaign.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          {campaign.status === 'active' ? (
                            <Button variant="ghost" size="sm" className="text-yellow-600">
                              <PauseCircle className="h-4 w-4 mr-1" />
                              Pause
                            </Button>
                          ) : campaign.status === 'paused' || campaign.status === 'draft' ? (
                            <Button variant="ghost" size="sm" className="text-green-600">
                              <PlayCircle className="h-4 w-4 mr-1" />
                              Start
                            </Button>
                          ) : null}
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem>Edit Campaign</DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">Delete Campaign</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                <Megaphone className="h-12 w-12" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No campaigns found</h3>
              <p className="text-gray-500 mb-4">Create your first campaign to start making outbound calls.</p>
              <Button>
                <PlusIcon className="h-4 w-4 mr-2" />
                Create new campaign
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { Megaphone } from "lucide-react";
