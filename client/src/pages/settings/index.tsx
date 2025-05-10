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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SettingsPage() {
  const [selectedTimezone, setSelectedTimezone] = useState("America/New_York");
  const [outboundCallsLimit, setOutboundCallsLimit] = useState("");
  const [ringingDurationLimit, setRingingDurationLimit] = useState("");

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

      <Tabs defaultValue="general">
        <TabsList className="mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="dialer">Dialer</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general">
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
