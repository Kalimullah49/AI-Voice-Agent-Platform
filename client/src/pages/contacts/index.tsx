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
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedGroupName, setSelectedGroupName] = useState<string>("");
  
  const { data: contactGroups, isLoading: groupsLoading, error: groupsError } = useQuery({
    queryKey: ["/api/contact-groups"],
  });
  
  const { data: contacts, isLoading: contactsLoading, error: contactsError } = useQuery({
    queryKey: ["/api/contacts"],
  });
  
  // Function to view a contact group's details
  const viewContactGroup = (groupId: number, groupName: string) => {
    setSelectedGroupId(groupId);
    setSelectedGroupName(groupName);
  };
  
  // Function to go back to groups list
  const backToGroups = () => {
    setSelectedGroupId(null);
    setSelectedGroupName("");
  };

  return (
    <div className="space-y-6">
      {!selectedGroupId ? (
        // Groups list view
        <>
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
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create new group</DialogTitle>
                  <DialogDescription>
                    Enter the name of the new group then click Create
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="group-name" className="text-sm font-medium">Group Name</label>
                      <Input id="group-name" placeholder="Enter group name" />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button className="w-full">Create</Button>
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <Button 
                            variant="link" 
                            className="p-0 h-auto font-normal" 
                            onClick={() => viewContactGroup(group.id, group.name)}
                          >
                            {group.name}
                          </Button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {contacts?.filter((c: any) => c.groupId === group.id).length || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(group.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <Button variant="ghost" size="sm" className="p-0 h-auto bg-red-500 w-8 h-8 rounded-md">
                            <MoreHorizontal className="h-4 w-4 text-white" />
                          </Button>
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
        </>
      ) : (
        // Contact group detail view
        <>
          <div className="flex items-center mb-4">
            <Button variant="ghost" className="mr-2" onClick={backToGroups}>
              ← Contacts
            </Button>
            <h2 className="text-2xl font-bold tracking-tight">{selectedGroupName}</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <Input placeholder="Filter first name" />
            <Input placeholder="Filter last name" />
            <Input placeholder="Filter phone number" />
            <Input placeholder="Filter address" />
            <Input placeholder="Filter state" />
            <Input placeholder="Filter zip code" />
            <Input placeholder="Filter DNC" />
          </div>
          
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm font-medium">Actions</div>
            <Button className="bg-blue-600">
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </div>
          
          <div className="flex items-center justify-center mb-4">
            <Button variant="outline" className="text-gray-600 flex items-center gap-2">
              <PlusIcon className="h-4 w-4" />
              Import from CSV
            </Button>
          </div>
          
          {contactsLoading ? (
            <TableSkeleton />
          ) : contactsError ? (
            <div className="text-center text-red-500 py-4">Failed to load contacts</div>
          ) : contacts?.filter((c: any) => c.groupId === selectedGroupId).length > 0 ? (
            <div className="rounded-md border overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DNC</th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {contacts.filter((c: any) => c.groupId === selectedGroupId).map((contact: any) => (
                    <tr key={contact.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{contact.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contact.phoneNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contact.address || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contact.dnc ? 'Yes' : 'No'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <Button variant="ghost" size="sm" className="p-0 h-auto bg-red-500 w-8 h-8 rounded-md">
                          <MoreHorizontal className="h-4 w-4 text-white" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-500">You have no contacts.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
