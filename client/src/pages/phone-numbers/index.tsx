import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/skeleton";
import { PlusIcon, Trash2, ExternalLink } from "lucide-react";
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

export default function PhoneNumbersPage() {
  const { data: phoneNumbers, isLoading, error } = useQuery({
    queryKey: ["/api/phone-numbers"],
  });
  
  const { data: agents } = useQuery({
    queryKey: ["/api/agents"],
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Phone Numbers</h2>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="https://www.twilio.com/console/phone-numbers" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Twilio Accounts
            </a>
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <PlusIcon className="h-4 w-4 mr-2" />
                Import Phone Number
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Phone Number</DialogTitle>
                <DialogDescription>
                  Enter a phone number to import from your Twilio account.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label htmlFor="phone" className="text-sm font-medium">Phone Number</label>
                  <Input id="phone" placeholder="+1 (415) 555-1234" />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="agent" className="text-sm font-medium">Assign to Agent</label>
                  <Select>
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
              </div>
              <DialogFooter>
                <Button variant="outline">Cancel</Button>
                <Button>Import Number</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button>
            <PlusIcon className="h-4 w-4 mr-2" />
            Buy Phone Number
          </Button>
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
                Buy or import phone numbers to assign to your agents.
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline">Import Number</Button>
                <Button>Buy Number</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
