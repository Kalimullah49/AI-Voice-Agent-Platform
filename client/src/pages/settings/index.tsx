import { useState, useEffect } from "react";
import { useLocation } from "wouter";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const [selectedTimezone, setSelectedTimezone] = useState("America/New_York");
  const [outboundCallsLimit, setOutboundCallsLimit] = useState("");
  const [ringingDurationLimit, setRingingDurationLimit] = useState("");
  const [activeTab, setActiveTab] = useState("general");
  const [isLoading, setIsLoading] = useState(false);
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  
  useEffect(() => {
    // Check if there's a tab parameter in the URL
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam === 'dialer') {
      setActiveTab('dialer');
    }
  }, [location]);
  
  // Function to clear all data
  const clearAllData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/clear-all-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "All data has been cleared successfully",
          variant: "default",
        });
        // Navigate to dashboard to see cleared data
        navigate("/");
      } else {
        const data = await response.json();
        toast({
          title: "Error",
          description: data.message || "Failed to clear data",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error clearing data:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="dialer">Dialer</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general">
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Timezone</h3>
                  <Select 
                    value={selectedTimezone} 
                    onValueChange={setSelectedTimezone}
                  >
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
                
                <Button className="mt-8">Save Changes</Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Reset Application Data</CardTitle>
                <CardDescription>
                  Clear all data in the application. This action cannot be undone.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isLoading}>
                      {isLoading ? "Clearing data..." : "Reset All Data"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action will delete all data in the application including agents, calls, contacts, campaigns, and phone numbers. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={clearAllData}>
                        Yes, delete everything
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="dialer">
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4 border rounded-md p-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-medium">Outbound calls limit per DID</h3>
                      <p className="text-sm text-gray-500">
                        Control how many outbound calls a phone number can make in a day.
                      </p>
                    </div>
                    <Switch id="outbound-limit" defaultChecked />
                  </div>
                  <div className="flex items-center mt-3">
                    <Input 
                      id="outbound-limit-value" 
                      type="text" 
                      placeholder="Enter a number"
                      value={outboundCallsLimit}
                      onChange={(e) => setOutboundCallsLimit(e.target.value)}
                      className="w-40 mr-4" 
                    />
                    <Button>Save</Button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4 border rounded-md p-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-medium">Ringing duration limit</h3>
                      <p className="text-sm text-gray-500">
                        The number of seconds that we should allow the phone to ring before assuming there is no answer. The minimum is 10 seconds and the maximum is 600 seconds. Note that the actual timeout can be off by a few seconds. You can set this to a short time, such as 15 seconds, to hang up before reaching an answering machine or voicemail.
                      </p>
                    </div>
                    <Switch id="ringing-limit" defaultChecked />
                  </div>
                  <div className="flex items-center mt-3">
                    <Input 
                      id="ringing-limit-value" 
                      type="text" 
                      placeholder="Enter a number"
                      value={ringingDurationLimit}
                      onChange={(e) => setRingingDurationLimit(e.target.value)}
                      className="w-40 mr-4" 
                    />
                    <Button>Save</Button>
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
