import { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import { PlusIcon } from "lucide-react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  
  // Timezone options
  const timezones = [
    "America/Los_Angeles",
    "America/Denver",
    "America/Chicago",
    "America/New_York",
    "Europe/London",
    "Europe/Paris",
    "Asia/Tokyo",
    "Australia/Sydney"
  ];

  // CRM Outcomes for display
  const outcomes = [
    { id: 1, name: "Appointment Set", color: "green" },
    { id: 2, name: "Not Interested", color: "red" },
    { id: 3, name: "Call Back Later", color: "yellow" }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="crm">CRM Settings</TabsTrigger>
          <TabsTrigger value="dialer">Dialer Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Configure application-wide settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select defaultValue="America/Los_Angeles">
                  <SelectTrigger id="timezone" className="w-full sm:w-[300px]">
                    <SelectValue placeholder="Select your timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map((timezone) => (
                      <SelectItem key={timezone} value={timezone}>
                        {timezone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500 mt-1">
                  This will affect how dates and times are displayed throughout the application.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Appearance</Label>
                <div className="flex items-center space-x-2">
                  <Switch id="theme-mode" />
                  <Label htmlFor="theme-mode">Enable dark mode</Label>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Call Recording</Label>
                <div className="flex items-center space-x-2">
                  <Switch id="call-recording" defaultChecked />
                  <Label htmlFor="call-recording">Enable call recording</Label>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  All calls will be recorded and stored securely for quality and training purposes.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Notifications</Label>
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch id="email-notifications" defaultChecked />
                    <Label htmlFor="email-notifications">Email notifications</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="browser-notifications" defaultChecked />
                    <Label htmlFor="browser-notifications">Browser notifications</Label>
                  </div>
                </div>
              </div>
              
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="crm">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>CRM Integration</CardTitle>
                  <CardDescription>
                    Manage CRM outcomes and integrations
                  </CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add Outcome
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Outcome</DialogTitle>
                      <DialogDescription>
                        Create a new outcome for tracking call results.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="outcome-name">Outcome Name</Label>
                        <Input id="outcome-name" placeholder="Enter outcome name" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="outcome-color">Color</Label>
                        <Select>
                          <SelectTrigger id="outcome-color">
                            <SelectValue placeholder="Select color" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="green">Green</SelectItem>
                            <SelectItem value="yellow">Yellow</SelectItem>
                            <SelectItem value="red">Red</SelectItem>
                            <SelectItem value="blue">Blue</SelectItem>
                            <SelectItem value="purple">Purple</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline">Cancel</Button>
                      <Button>Add Outcome</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Call Outcomes</h3>
                  {outcomes.length > 0 ? (
                    <div className="space-y-3">
                      {outcomes.map((outcome) => (
                        <div 
                          key={outcome.id} 
                          className="flex items-center justify-between p-3 border rounded-md"
                        >
                          <div className="flex items-center">
                            <div 
                              className={`h-4 w-4 rounded-full bg-${outcome.color}-500 mr-3`}
                            ></div>
                            <span>{outcome.name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm">Edit</Button>
                            <Button variant="ghost" size="sm" className="text-red-600">Delete</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 border rounded-md">
                      <p className="text-gray-500 mb-4">No outcomes configured yet.</p>
                      <Button>
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Add Outcome
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">CRM Integration</h3>
                  <div className="p-4 border rounded-md">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-medium">Salesforce Integration</h4>
                        <p className="text-sm text-gray-500">Connect to your Salesforce instance</p>
                      </div>
                      <Switch id="salesforce-integration" />
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label htmlFor="salesforce-url">Salesforce URL</Label>
                        <Input 
                          id="salesforce-url" 
                          placeholder="https://yourinstance.my.salesforce.com" 
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="salesforce-api-key">API Key</Label>
                        <Input 
                          id="salesforce-api-key" 
                          type="password"
                          placeholder="Enter your API key" 
                        />
                      </div>
                      <Button className="mt-2">Connect</Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="dialer">
          <Card>
            <CardHeader>
              <CardTitle>Dialer Settings</CardTitle>
              <CardDescription>
                Configure settings for outbound dialing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4 border rounded-md p-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-medium">Outbound Calls Limit per DID</h3>
                      <p className="text-sm text-gray-500">
                        Limit the number of concurrent outbound calls per phone number
                      </p>
                    </div>
                    <Switch id="outbound-limit" defaultChecked />
                  </div>
                  <div className="flex items-center mt-3">
                    <Input 
                      id="outbound-limit-value" 
                      type="number" 
                      defaultValue="5"
                      className="w-20 mr-4" 
                    />
                    <Button>Save</Button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4 border rounded-md p-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-medium">Ringing Duration Limit</h3>
                      <p className="text-sm text-gray-500">
                        Time in seconds an outbound call will ring before being canceled
                      </p>
                    </div>
                    <Switch id="ringing-limit" defaultChecked />
                  </div>
                  <div className="flex items-center mt-3">
                    <Input 
                      id="ringing-limit-value" 
                      type="number" 
                      defaultValue="30"
                      min="10"
                      max="600"
                      className="w-20 mr-4" 
                    />
                    <span className="text-sm text-gray-500 mr-4">seconds (10-600)</span>
                    <Button>Save</Button>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    If a call is not answered within this duration, it will be automatically ended.
                    This helps optimize agent time and system resources.
                  </p>
                </div>
              </div>
              
              <div className="space-y-4 border rounded-md p-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-medium">Call Retry Settings</h3>
                      <p className="text-sm text-gray-500">
                        Configure automated retry attempts for unanswered calls
                      </p>
                    </div>
                    <Switch id="call-retry" />
                  </div>
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center">
                      <Label htmlFor="retry-attempts" className="w-40">Max Retry Attempts:</Label>
                      <Input 
                        id="retry-attempts" 
                        type="number" 
                        defaultValue="3"
                        className="w-20 mr-4" 
                      />
                    </div>
                    <div className="flex items-center">
                      <Label htmlFor="retry-interval" className="w-40">Retry Interval:</Label>
                      <Input 
                        id="retry-interval" 
                        type="number" 
                        defaultValue="60"
                        className="w-20 mr-4" 
                      />
                      <span className="text-sm text-gray-500">minutes</span>
                    </div>
                    <Button className="mt-2">Save Retry Settings</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
