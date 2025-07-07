import { useState, useRef, ChangeEvent } from "react";
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
import { PlusIcon, Trash2, UserPlus, UploadCloud } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
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
  const [newGroupName, setNewGroupName] = useState<string>("");
  
  // Form states for adding a contact
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [state, setState] = useState<string>("");
  const [country, setCountry] = useState<string>("");
  const [zipCode, setZipCode] = useState<string>("");
  
  // State for file upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [uploadStep, setUploadStep] = useState<number>(1);
  const [showUploadDialog, setShowUploadDialog] = useState<boolean>(false);
  const [isCreateContactDialogOpen, setIsCreateContactDialogOpen] = useState<boolean>(false);
  const [isCreateGroupDialogOpen, setIsCreateGroupDialogOpen] = useState<boolean>(false);
  
  const queryClient = useQueryClient();
  
  const { data: contactGroups, isLoading: groupsLoading, error: groupsError } = useQuery({
    queryKey: ["/api/contact-groups"],
  });
  
  const { data: contacts, isLoading: contactsLoading, error: contactsError } = useQuery({
    queryKey: ["/api/contacts"],
  });
  
  // Mutation for creating a new contact group
  const createGroupMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch('/api/contact-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create contact group');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate the contact groups query to refetch the data
      queryClient.invalidateQueries({ queryKey: ["/api/contact-groups"] });
      setNewGroupName("");
      setIsCreateGroupDialogOpen(false);
      toast({
        title: "Group created",
        description: "Contact group created successfully."
      });
    }
  });
  
  // Mutation for creating a new contact
  const createContactMutation = useMutation({
    mutationFn: async (contactData: any) => {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create contact');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate the contacts query to refetch the data
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      // Reset form fields
      setPhoneNumber("");
      setFirstName("");
      setLastName("");
      setAddress("");
      setCity("");
      setState("");
      setCountry("");
      setZipCode("");
      // Close the dialog
      setIsCreateContactDialogOpen(false);
    }
  });
  
  // Mutation for deleting a contact group
  const deleteGroupMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/contact-groups/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete contact group');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate the contact groups query to refetch the data
      queryClient.invalidateQueries({ queryKey: ["/api/contact-groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      
      if (selectedGroupId) {
        setSelectedGroupId(null);
        setSelectedGroupName("");
      }
      
      toast({
        title: "Group deleted",
        description: "The contact group has been deleted successfully."
      });
    }
  });
  
  // Mutation for deleting a contact
  const deleteContactMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/contacts/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete contact');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate the contacts query to refetch the data
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      
      toast({
        title: "Contact deleted",
        description: "The contact has been deleted successfully."
      });
    }
  });
  
  // Mutation for uploading a CSV file
  const uploadCsvMutation = useMutation({
    mutationFn: async (data: { contacts: any[], groupId: number }) => {
      const response = await fetch('/api/contacts/csv-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload CSV file');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate the contacts query to refetch the data
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      
      // Reset upload state
      setShowUploadDialog(false);
      setUploadStep(1);
      setUploadedFile(null);
      setCsvData([]);
      
      toast({
        title: "Contacts imported",
        description: `Successfully imported contacts from the CSV file.`
      });
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "Failed to upload CSV file. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // Function to handle creating a new group
  const handleCreateGroup = () => {
    if (newGroupName.trim()) {
      createGroupMutation.mutate(newGroupName);
    }
  };
  
  // Function to handle creating a new contact
  const handleCreateContact = () => {
    if (phoneNumber.trim() && selectedGroupId) {
      const contactData = {
        groupId: selectedGroupId,
        phoneNumber,
        name: `${firstName} ${lastName}`.trim(),
        address,
        city,
        state,
        country,
        zipCode
      };
      
      createContactMutation.mutate(contactData);
    }
  };
  
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
          <div className="flex justify-between items-center mb-4">
            <div></div>
            
            <Dialog open={isCreateGroupDialogOpen} onOpenChange={setIsCreateGroupDialogOpen}>
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
                      <Input 
                        id="group-name" 
                        placeholder="Enter group name" 
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    className="w-full" 
                    onClick={handleCreateGroup}
                    disabled={createGroupMutation.isPending || !newGroupName.trim()}
                  >
                    {createGroupMutation.isPending ? 'Creating...' : 'Create'}
                  </Button>
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
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="p-0 h-auto bg-red-500 w-8 h-8 rounded-md"
                            onClick={() => deleteGroupMutation.mutate(group.id)}
                          >
                            <Trash2 className="h-4 w-4 text-white" />
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
          </div>
          
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm font-medium">Actions</div>
            <Dialog open={isCreateContactDialogOpen} onOpenChange={setIsCreateContactDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Contact</DialogTitle>
                  <button className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                    <span className="text-lg">×</span>
                  </button>
                </DialogHeader>
                <div className="py-2 space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="phone-number" className="text-sm font-medium">Phone Number</label>
                    <Input 
                      id="phone-number" 
                      placeholder="Enter phone number" 
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="first-name" className="text-sm font-medium">First Name</label>
                      <Input 
                        id="first-name" 
                        placeholder="Enter first name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="last-name" className="text-sm font-medium">Last Name</label>
                      <Input 
                        id="last-name" 
                        placeholder="Enter last name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="address" className="text-sm font-medium">Address</label>
                    <Input 
                      id="address" 
                      placeholder="Enter address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="city" className="text-sm font-medium">City</label>
                    <Input 
                      id="city" 
                      placeholder="Enter city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="state" className="text-sm font-medium">State</label>
                    <Input 
                      id="state" 
                      placeholder="Enter state"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="country" className="text-sm font-medium">Country</label>
                    <Input 
                      id="country" 
                      placeholder="Enter country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="zip-code" className="text-sm font-medium">Zip Code</label>
                    <Input 
                      id="zip-code" 
                      placeholder="Enter zip code"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    className="w-full bg-blue-500" 
                    onClick={handleCreateContact}
                    disabled={createContactMutation.isPending || !phoneNumber.trim()}
                  >
                    {createContactMutation.isPending ? 'Creating...' : 'Create'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="flex items-center justify-center mb-4">
            <Button 
              variant="outline" 
              className="text-gray-600 flex items-center gap-2"
              onClick={() => setShowUploadDialog(true)}
            >
              <UploadCloud className="h-4 w-4" />
              Import from CSV
            </Button>
            
            {/* CSV Upload Dialog */}
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Import Contacts from CSV</DialogTitle>
                  <DialogDescription>
                    Upload a CSV file with contact information
                  </DialogDescription>
                </DialogHeader>
                
                <div className="py-4">
                  {uploadStep === 1 && (
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-12">
                      <input
                        type="file"
                        accept=".csv"
                        ref={fileInputRef}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0];
                            setUploadedFile(file);
                            
                            // Read the file
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                try {
                                  // Parse CSV data
                                  const text = event.target.result as string;
                                  const lines = text.split('\n');
                                  const headers = lines[0].split(',').map(h => h.trim());
                                  
                                  const parsedData = [];
                                  for (let i = 1; i < lines.length; i++) {
                                    if (lines[i].trim() === '') continue;
                                    
                                    const values = lines[i].split(',').map(v => v.trim());
                                    const entry: any = {};
                                    
                                    headers.forEach((header, index) => {
                                      entry[header] = values[index] || '';
                                    });
                                    
                                    parsedData.push(entry);
                                  }
                                  
                                  setCsvData(parsedData);
                                  setUploadStep(2);
                                } catch (error) {
                                  toast({
                                    title: "Error parsing CSV",
                                    description: "Please make sure the file is a valid CSV format.",
                                    variant: "destructive"
                                  });
                                }
                              }
                            };
                            reader.readAsText(file);
                          }
                        }}
                        className="hidden"
                      />
                      <UploadCloud className="h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-1">Drag 'n' drop files here, or click to select</h3>
                      <p className="text-sm text-gray-500 mb-4">You can upload a CSV file (up to 120 MB each)</p>
                      <Button 
                        variant="outline" 
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Select File
                      </Button>
                    </div>
                  )}
                  
                  {uploadStep === 2 && (
                    <div>
                      <h3 className="text-lg font-medium mb-4">Review your data</h3>
                      <div className="border rounded-md overflow-hidden mb-4">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead>
                            <tr>
                              <th className="px-4 py-2 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">First Name</th>
                              <th className="px-4 py-2 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">Last Name</th>
                              <th className="px-4 py-2 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">Phone Number</th>
                              <th className="px-4 py-2 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {csvData.slice(0, 5).map((row, index) => (
                              <tr key={index}>
                                <td className="px-4 py-2 text-sm text-gray-500">{row.firstName || row["First Name"] || "-"}</td>
                                <td className="px-4 py-2 text-sm text-gray-500">{row.lastName || row["Last Name"] || "-"}</td>
                                <td className="px-4 py-2 text-sm text-gray-500">{row.phoneNumber || row["Phone Number"] || "-"}</td>
                                <td className="px-4 py-2 text-sm text-gray-500">{row.address || row["Address"] || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="text-sm text-gray-500 mb-4">
                        {csvData.length > 5 && `Showing 5 of ${csvData.length} contacts`}
                      </div>
                      
                      <div className="flex gap-2 justify-end">
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setUploadStep(1);
                            setUploadedFile(null);
                            setCsvData([]);
                          }}
                        >
                          Back
                        </Button>
                        <Button 
                          onClick={() => {
                            // Format contacts for upload
                            const contacts = csvData.map(row => {
                              return {
                                name: `${row.firstName || row["First Name"] || ''} ${row.lastName || row["Last Name"] || ''}`.trim(),
                                firstName: row.firstName || row["First Name"] || '',
                                lastName: row.lastName || row["Last Name"] || '',
                                phoneNumber: row.phoneNumber || row["Phone Number"] || '',
                                address: row.address || row["Address"] || '',
                                city: row.city || row["City"] || '',
                                state: row.state || row["State"] || '',
                                zipCode: row.zipCode || row["Zip Code"] || '',
                                country: row.country || row["Country"] || ''
                              };
                            });
                            
                            if (selectedGroupId) {
                              uploadCsvMutation.mutate({
                                contacts,
                                groupId: selectedGroupId
                              });
                            }
                          }}
                          disabled={uploadCsvMutation.isPending || !selectedGroupId}
                        >
                          {uploadCsvMutation.isPending ? 'Uploading...' : 'Upload Contacts'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
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
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {contacts.filter((c: any) => c.groupId === selectedGroupId).map((contact: any) => (
                    <tr key={contact.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{contact.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contact.phoneNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contact.address || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="p-0 h-auto bg-red-500 w-8 h-8 rounded-md"
                          onClick={() => deleteContactMutation.mutate(contact.id)}
                        >
                          <Trash2 className="h-4 w-4 text-white" />
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
