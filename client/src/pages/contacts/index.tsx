import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { PlusIcon, MoreHorizontal, UserPlus } from "lucide-react";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export default function ContactsPage() {
  const [activeTab, setActiveTab] = useState("groups");
  
  const { data: contactGroups, isLoading: groupsLoading, error: groupsError } = useQuery({
    queryKey: ["/api/contact-groups"],
  });
  
  const { data: contacts, isLoading: contactsLoading, error: contactsError } = useQuery({
    queryKey: ["/api/contacts"],
  });

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold tracking-tight">Contacts</h2>
      </div>

      <div className="flex justify-between items-center mb-4">
        <Tabs defaultValue="groups" onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="groups">Groups</TabsTrigger>
            <TabsTrigger value="dnc">DNC</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              Create new group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Contact Group</DialogTitle>
              <DialogDescription>
                Enter a name for your new contact group.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input placeholder="Group name" />
            </div>
            <DialogFooter>
              <Button variant="outline">Cancel</Button>
              <Button>Create Group</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-2">Filters</p>
          <Input
            placeholder="Filter groups..."
            className="max-w-sm"
          />
        </div>
        
        <div className="rounded-md border overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group ID</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group Name</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Number of Contacts</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {groupsLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4">
                    <TableSkeleton />
                  </td>
                </tr>
              ) : groupsError ? (
                <tr>
                  <td colSpan={5} className="text-center text-red-500 py-4">Failed to load contact groups</td>
                </tr>
              ) : contactGroups && contactGroups.length > 0 ? (
                contactGroups.map((group: any) => (
                  <tr key={group.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{group.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{group.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {contacts?.filter((c: any) => c.groupId === group.id).length || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(group.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View Contacts</DropdownMenuItem>
                          <DropdownMenuItem>Edit Group</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">Delete Group</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <UserPlus className="h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-1">You have no contacts list.</h3>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
