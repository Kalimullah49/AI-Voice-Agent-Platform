import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CreateActionPage() {
  const [activeTab, setActiveTab] = useState("custom");
  const [step, setStep] = useState(activeTab === "calcom" ? "api" : "details");
  const [actionData, setActionData] = useState({
    name: "",
    description: "",
    type: "Custom Action",
    url: "",
    method: "GET",
    waitMessage: "",
    defaultValues: "{\n  \"header\":\"\", \n  \"body\":\"\", \n  \"query\":\"\" \n}",
    extractSchema: "{}",
    calcomApiKey: ""
  });
  
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  
  const createAction = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/actions", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      } as RequestInit);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
      navigate("/actions");
    }
  });
  
  const handleInputChange = (field: string, value: string) => {
    setActionData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSubmit = () => {
    // Transform the data as needed before submission
    const submissionData = {
      ...actionData,
      type: activeTab === "calcom" ? "Cal.com" : actionData.type
    };
    
    createAction.mutate(submissionData);
  };
  
  const handleNextStep = () => {
    if (activeTab === "calcom" && step === "api") {
      // In a real app, you would validate the API key here
      handleSubmit();
    } else {
      setStep("confirmation");
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={() => navigate("/actions")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h2 className="text-2xl font-bold tracking-tight">Create new action</h2>
      </div>
      
      <Tabs defaultValue="custom" className="w-full" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="custom">Custom Action</TabsTrigger>
          <TabsTrigger value="calcom">Cal.com</TabsTrigger>
        </TabsList>
        
        <TabsContent value="custom">
          {step === "details" && (
            <Card>
              <CardContent className="pt-6">
                <div className="grid gap-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input 
                        id="name" 
                        placeholder="Enter name" 
                        value={actionData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="actionType">Action Type</Label>
                      <Select 
                        value={actionData.type} 
                        onValueChange={(value) => handleInputChange("type", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select action type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Custom Action">Custom Action</SelectItem>
                          <SelectItem value="Link Call Action">Link Call Action</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea 
                      id="description" 
                      placeholder="Enter description" 
                      className="min-h-[100px]"
                      value={actionData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="url">URL</Label>
                    <Input 
                      id="url" 
                      placeholder="Enter URL" 
                      value={actionData.url}
                      onChange={(e) => handleInputChange("url", e.target.value)}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="method">Method</Label>
                      <Select 
                        value={actionData.method} 
                        onValueChange={(value) => handleInputChange("method", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GET">GET</SelectItem>
                          <SelectItem value="POST">POST</SelectItem>
                          <SelectItem value="PUT">PUT</SelectItem>
                          <SelectItem value="DELETE">DELETE</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="waitMessage">Wait Message</Label>
                    <Textarea 
                      id="waitMessage" 
                      placeholder="Enter message to show while waiting for the action to complete" 
                      className="min-h-[100px]"
                      value={actionData.waitMessage}
                      onChange={(e) => handleInputChange("waitMessage", e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="defaultValues" className="flex items-center gap-2">
                      Default Values
                      <span className="text-xs text-gray-500">JSON format</span>
                    </Label>
                    <Textarea 
                      id="defaultValues" 
                      className="font-mono text-sm min-h-[150px]"
                      value={actionData.defaultValues}
                      onChange={(e) => handleInputChange("defaultValues", e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="extractSchema" className="flex items-center gap-2">
                      Data To Extract Schema
                      <span className="text-xs text-gray-500">JSON format</span>
                    </Label>
                    <Textarea 
                      id="extractSchema" 
                      className="font-mono text-sm min-h-[150px]"
                      value={actionData.extractSchema}
                      onChange={(e) => handleInputChange("extractSchema", e.target.value)}
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    <Button onClick={handleSubmit}>
                      Create Action
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="calcom">
          <Card>
            <CardContent className="pt-6 flex flex-col items-center">
              <div className="text-5xl font-bold my-10">Cal.com</div>
              
              <div className="w-full max-w-md space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="calcomApiKey">Cal.com API key</Label>
                  <Input 
                    id="calcomApiKey" 
                    placeholder="Enter your Cal.com API key" 
                    value={actionData.calcomApiKey}
                    onChange={(e) => handleInputChange("calcomApiKey", e.target.value)}
                  />
                </div>
                
                <div className="flex justify-end">
                  <Button onClick={handleNextStep}>
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}