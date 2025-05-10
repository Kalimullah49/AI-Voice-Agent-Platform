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

export default function SettingsPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [callRecording, setCallRecording] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [browserNotifications, setBrowserNotifications] = useState(true);
  const [outboundCallsLimit, setOutboundCallsLimit] = useState("");
  const [ringingDurationLimit, setRingingDurationLimit] = useState("");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="crm">CRM</TabsTrigger>
          <TabsTrigger value="dialer">Dialer</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general">
          <Card>
            <CardContent className="pt-6 space-y-8">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Appearance</h3>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="theme-mode" 
                    checked={darkMode}
                    onCheckedChange={setDarkMode}
                  />
                  <Label htmlFor="theme-mode">Enable dark mode</Label>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Call Recording</h3>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="call-recording" 
                    checked={callRecording}
                    onCheckedChange={setCallRecording}
                  />
                  <Label htmlFor="call-recording">Enable call recording</Label>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  All calls will be recorded and stored securely for quality and training purposes.
                </p>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Notifications</h3>
                <div className="flex flex-col space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="email-notifications" 
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                    />
                    <Label htmlFor="email-notifications">Email notifications</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="browser-notifications" 
                      checked={browserNotifications}
                      onCheckedChange={setBrowserNotifications}
                    />
                    <Label htmlFor="browser-notifications">Browser notifications</Label>
                  </div>
                </div>
              </div>
              
              <Button className="mt-8">Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="crm">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center py-8 text-gray-500">CRM settings will be configured here.</p>
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
