import { useState, useEffect } from "react";
import { useParams, useLocation, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { 
  PhoneCall, 
  Mic, 
  Zap,
  BookOpen,
  Phone,
  Goal,
  Settings,
  Save,
  Sparkles,
  UserCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AgentDetailPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("general");
  
  // Get agent data
  const { 
    data: agent, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ["/api/agents", id],
    queryFn: () => apiRequest(`/api/agents/${id}`),
  });
  
  // State for form fields
  const [agentData, setAgentData] = useState({
    name: "",
    type: "inbound",
    persona: "",
    toneStyle: "",
    initialMessage: "",
    companyBackground: "",
    agentRules: "",
    edgeCases: "",
    script: "",
    summarizerPrompt: "",
    responseIntelligenceLevel: "Genius Mode",
    active: true,
    // Voice settings
    voiceGuidance: 1,
    speed: 10,
    temperature: 0.4,
    textGuidance: 0.8,
    backgroundNoise: false,
    officeAmbience: false,
    keyboard: false,
    phoneRinging: false,
  });
  
  // Update local state when agent data is loaded
  useEffect(() => {
    if (agent) {
      setAgentData({
        ...agentData,
        ...agent,
        // Default voice settings if not present in agent data
        voiceGuidance: agent.voiceGuidance || 1,
        speed: agent.speed || 10,
        temperature: agent.temperature || 0.4,
        textGuidance: agent.textGuidance || 0.8,
        backgroundNoise: agent.backgroundNoise || false,
        officeAmbience: agent.officeAmbience || false,
        keyboard: agent.keyboard || false,
        phoneRinging: agent.phoneRinging || false,
      });
    }
  }, [agent]);
  
  // Update agent mutation
  const updateAgentMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest(`/api/agents/${id}`, {
        method: "PATCH",
        data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents", id] });
      toast({
        title: "Agent updated",
        description: "Agent settings have been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update agent settings.",
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission for each tab
  const handleSave = () => {
    const dataToUpdate = { ...agentData };
    updateAgentMutation.mutate(dataToUpdate);
  };
  
  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAgentData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle slider changes
  const handleSliderChange = (name: string, value: number[]) => {
    setAgentData(prev => ({
      ...prev,
      [name]: value[0]
    }));
  };
  
  // Handle switch changes
  const handleSwitchChange = (name: string, checked: boolean) => {
    setAgentData(prev => ({
      ...prev,
      [name]: checked
    }));
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error loading agent details. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Agent header */}
      <Card className="bg-white">
        <CardContent className="pt-6 pb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              <UserCircle className="w-16 h-16 text-gray-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">{agentData.name || "Blank Agent"}</h1>
              <p className="text-gray-500 text-sm">ID: {id}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Agent settings */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Agent Settings</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <PhoneCall className="h-4 w-4 mr-2" />
            Call
          </Button>
          <Button variant="outline" size="sm">
            <Sparkles className="h-4 w-4 mr-2" />
            Improve with AI
          </Button>
          <Button variant="default" size="sm" onClick={handleSave} disabled={updateAgentMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {updateAgentMutation.isPending ? "Saving..." : "Publish"}
          </Button>
        </div>
      </div>
      
      {/* Settings tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted mb-4">
          <TabsTrigger value="general">
            <Settings className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="voice">
            <Mic className="h-4 w-4 mr-2" />
            Voice
          </TabsTrigger>
          <TabsTrigger value="actions">
            <Zap className="h-4 w-4 mr-2" />
            Actions
          </TabsTrigger>
          <TabsTrigger value="knowledge">
            <BookOpen className="h-4 w-4 mr-2" />
            Knowledge
          </TabsTrigger>
          <TabsTrigger value="inboundNumbers">
            <Phone className="h-4 w-4 mr-2" />
            Inbound Numbers
          </TabsTrigger>
          <TabsTrigger value="outcomes">
            <Goal className="h-4 w-4 mr-2" />
            Outcomes
          </TabsTrigger>
        </TabsList>
        
        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-6">
              {/* AI Response Style */}
              <div className="space-y-2">
                <h3 className="text-lg font-medium">AI Response Style and Intelligence Level</h3>
                <p className="text-sm text-muted-foreground">
                  Choose the response style that best matches your needs. Faster answers are great for everyday questions, while a bit more waiting can provide deeper, more thoughtful insights.
                </p>
                <div className="pt-2">
                  <select 
                    className="w-full p-2 border rounded-md"
                    name="responseIntelligenceLevel"
                    value={agentData.responseIntelligenceLevel}
                    onChange={(e) => handleChange({
                      target: {
                        name: "responseIntelligenceLevel",
                        value: e.target.value
                      }
                    } as any)}
                  >
                    <option value="Standard Mode">Standard Mode - Fast responses for simple questions</option>
                    <option value="Enhanced Mode">Enhanced Mode - Balanced between speed and quality</option>
                    <option value="Genius Mode">Genius Mode - Intelligent, in-depth insights for complex challenges</option>
                  </select>
                </div>
              </div>
              
              {/* Initial Message */}
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Initial Message</h3>
                <p className="text-sm text-muted-foreground">
                  This is the message that the assistant will say in the beginning of the call.
                </p>
                <div className="pt-2">
                  <Textarea
                    name="initialMessage"
                    value={agentData.initialMessage || ""}
                    onChange={handleChange}
                    placeholder="Enter initial message"
                    className="min-h-[100px]"
                  />
                </div>
              </div>
              
              {/* Company Background */}
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Company Background <span className="text-muted-foreground text-sm">(Optional)</span></h3>
                <p className="text-sm text-muted-foreground">
                  Here you can describe the company background.
                </p>
                <div className="pt-2">
                  <Textarea
                    name="companyBackground"
                    value={agentData.companyBackground || ""}
                    onChange={handleChange}
                    placeholder="Write a summary of your company (for example, when you started, the price of your product, inception date, hours of operation, etc.)"
                    className="min-h-[120px]"
                  />
                </div>
              </div>
              
              {/* Persona */}
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Persona <span className="text-muted-foreground text-sm">(Optional)</span></h3>
                <p className="text-sm text-muted-foreground">
                  Here you can describe the persona of the agent.
                </p>
                <div className="pt-2">
                  <Textarea
                    name="persona"
                    value={agentData.persona || ""}
                    onChange={handleChange}
                    placeholder="Enter persona for the agent"
                    className="min-h-[100px]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Voice Tab */}
        <TabsContent value="voice" className="space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-6">
              {/* Voice selection */}
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Voice</h3>
                <div className="flex items-center space-x-4 pt-2">
                  <div className="flex items-center gap-2 bg-muted rounded-md px-4 py-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                      R
                    </div>
                    <span>Richie</span>
                  </div>
                  <Button variant="outline" size="sm">Emir Cowan (M)</Button>
                  <Button variant="outline" size="sm">Male - Agent 1</Button>
                  <Button variant="outline" size="sm">Female</Button>
                </div>
              </div>
              
              <Separator />
              
              {/* Voice Guidance */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Voice Guidance</h3>
                      <p className="text-sm text-muted-foreground">
                        Use lower numbers to make sure your chosen voice will be compared to other voices. Higher numbers will maximize its individuality.
                      </p>
                    </div>
                    <div className="text-xl font-medium">{agentData.voiceGuidance}</div>
                  </div>
                  <div className="pt-4">
                    <Slider
                      value={[agentData.voiceGuidance]}
                      min={0}
                      max={2}
                      step={0.1}
                      onValueChange={(value) => handleSliderChange("voiceGuidance", value)}
                      className="w-full"
                    />
                  </div>
                </div>
                
                {/* Speed */}
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Speed</h3>
                      <p className="text-sm text-muted-foreground">
                        Controls how fast the generated audio should be. A number greater than 0 and less than or equal to 10; normal speed is 10.
                      </p>
                    </div>
                    <div className="text-xl font-medium">{agentData.speed}</div>
                  </div>
                  <div className="pt-4">
                    <Slider
                      value={[agentData.speed]}
                      min={0.1}
                      max={10}
                      step={0.1}
                      onValueChange={(value) => handleSliderChange("speed", value)}
                      className="w-full"
                    />
                  </div>
                </div>
                
                {/* Temperature */}
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Temperature</h3>
                      <p className="text-sm text-muted-foreground">
                        The temperature parameter controls variance. Lower temperatures result in more predictable results, higher temperatures make each run differ to stay niche, so the voice may sound like the baseline voice.
                      </p>
                    </div>
                    <div className="text-xl font-medium">{agentData.temperature}</div>
                  </div>
                  <div className="pt-4">
                    <Slider
                      value={[agentData.temperature]}
                      min={0}
                      max={1}
                      step={0.1}
                      onValueChange={(value) => handleSliderChange("temperature", value)}
                      className="w-full"
                    />
                  </div>
                </div>
                
                {/* Text Guidance */}
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Text Guidance</h3>
                      <p className="text-sm text-muted-foreground">
                        The text guidance parameter controls how closely the generated speech adheres to the input text. Low values create more free speech, but with a higher chance of deviating from the input text. Higher numbers make the generated speech more accurate to the input text, ensuring that the words spoken align closely.
                      </p>
                    </div>
                    <div className="text-xl font-medium">{agentData.textGuidance}</div>
                  </div>
                  <div className="pt-4">
                    <Slider
                      value={[agentData.textGuidance]}
                      min={0}
                      max={1}
                      step={0.1}
                      onValueChange={(value) => handleSliderChange("textGuidance", value)}
                      className="w-full"
                    />
                  </div>
                </div>
                
                <Separator />
                
                {/* Background Noise */}
                <div>
                  <h3 className="font-medium mb-4">Background Noise</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="officeAmbience">Office Ambience</Label>
                      <Switch
                        id="officeAmbience"
                        checked={agentData.officeAmbience}
                        onCheckedChange={(checked) => handleSwitchChange("officeAmbience", checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="keyboard">Keyboard</Label>
                      <Switch
                        id="keyboard"
                        checked={agentData.keyboard}
                        onCheckedChange={(checked) => handleSwitchChange("keyboard", checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="phoneRinging">Phone Ringing</Label>
                      <Switch
                        id="phoneRinging"
                        checked={agentData.phoneRinging}
                        onCheckedChange={(checked) => handleSwitchChange("phoneRinging", checked)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Actions Tab */}
        <TabsContent value="actions" className="space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-6">
              <h3 className="text-lg font-medium">Predefined Actions</h3>
              
              {/* Silence threshold */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Silence threshold (4.0 minutes)</h3>
                      <p className="text-sm text-muted-foreground">
                        An alert that tells if the agent has been silent for a certain number of seconds.
                      </p>
                    </div>
                  </div>
                  <div className="pt-4">
                    <Slider
                      value={[4]}
                      min={0}
                      max={10}
                      step={0.5}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
              
              {/* Summary Email addresses */}
              <div className="space-y-2">
                <h3 className="font-medium">Summary Email addresses</h3>
                <p className="text-sm text-muted-foreground">
                  A list of comma-separated email addresses to send conversation summary to.
                </p>
                <Input 
                  placeholder="Email Addresses"
                  value={agentData.summaryEmails || ""}
                  onChange={(e) => handleChange({
                    target: {
                      name: "summaryEmails",
                      value: e.target.value
                    }
                  } as any)}
                />
              </div>
              
              {/* End Call Tool */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">End Call Tool</h3>
                  <p className="text-sm text-muted-foreground">
                    This will allow the agent to end the call.
                  </p>
                </div>
                <Switch
                  checked={agentData.endCallTool || false}
                  onCheckedChange={(checked) => handleSwitchChange("endCallTool", checked)}
                />
              </div>
              
              {/* Transfer Call Tool */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Transfer Call Tool</h3>
                  <p className="text-sm text-muted-foreground">
                    This will allow the agent to transfer the call.
                  </p>
                </div>
                <Switch
                  checked={agentData.transferCallTool || false}
                  onCheckedChange={(checked) => handleSwitchChange("transferCallTool", checked)}
                />
              </div>
              
              {/* In-Call Email */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">In-Call Email</h3>
                  <p className="text-sm text-muted-foreground">
                    This will allow the agent to email the customer information during the call.
                  </p>
                </div>
                <Switch
                  checked={agentData.inCallEmail || false}
                  onCheckedChange={(checked) => handleSwitchChange("inCallEmail", checked)}
                />
              </div>
              
              <Separator />
              
              <h3 className="text-lg font-medium">Your Actions</h3>
              <p className="text-sm text-muted-foreground">
                No custom actions have been created yet.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Knowledge Tab */}
        <TabsContent value="knowledge" className="space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-6">
              <h3 className="text-lg font-medium">FAQs</h3>
              <p className="text-sm text-muted-foreground">
                Here you can write all your FAQs.
              </p>
              <Textarea
                name="faqs"
                value={agentData.faqs || ""}
                onChange={handleChange}
                placeholder="Enter FAQs"
                className="min-h-[200px]"
              />
              
              <div className="pt-4 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Agent Rules <span className="text-muted-foreground text-sm">(Optional)</span></h3>
                  <p className="text-sm text-muted-foreground">
                    Here you can describe the rules for the agent.
                  </p>
                  <Textarea
                    name="agentRules"
                    value={agentData.agentRules || ""}
                    onChange={handleChange}
                    placeholder="Enter rules for the agent"
                    className="min-h-[150px]"
                  />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Agent Script <span className="text-muted-foreground text-sm">(Required)</span></h3>
                  <p className="text-sm text-muted-foreground">
                    This is the script that the agent will use to generate responses.
                  </p>
                  <Textarea
                    name="script"
                    value={agentData.script || ""}
                    onChange={handleChange}
                    placeholder="Enter agent script"
                    className="min-h-[150px]"
                  />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Edge Cases <span className="text-muted-foreground text-sm">(Optional)</span></h3>
                  <p className="text-sm text-muted-foreground">
                    Here you can describe the edge cases for the agent.
                  </p>
                  <Textarea
                    name="edgeCases"
                    value={agentData.edgeCases || ""}
                    onChange={handleChange}
                    placeholder="Enter edge cases for the agent"
                    className="min-h-[150px]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Inbound Numbers Tab */}
        <TabsContent value="inboundNumbers" className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between mb-6">
                <Input 
                  placeholder="Search phone numbers..."
                  className="w-[300px]"
                />
                <select className="p-2 border rounded-md">
                  <option>All</option>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>
              
              <div className="border rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Number</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">3484</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">+14248551030</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <Button variant="destructive" size="sm">Delete</Button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-700">
                  Number of rows: 10
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" disabled>Previous</Button>
                  <Button variant="outline" size="sm" disabled>Next</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Outcomes Tab */}
        <TabsContent value="outcomes" className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-center items-center py-8 text-muted-foreground">
                This agent has no outcomes
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}