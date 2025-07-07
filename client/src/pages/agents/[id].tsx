import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WebCallScript } from "../../components/agents/WebCallScript";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
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

// Add global type definition for Vapi SDK
declare global {
  interface Window {
    vapiSDK: {
      run: (config: {
        apiKey: string;
        assistant: string;
        config?: {
          position?: 'left' | 'right' | 'center';
          size?: 'small' | 'medium' | 'large';
          chatWidget?: boolean;
          customText?: string;
          [key: string]: any;
        };
      }) => any;
      destroy: () => void;
    };
  }
}

export default function AgentDetailPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [callNumberDialogOpen, setCallNumberDialogOpen] = useState(false);
  const [callToNumber, setCallToNumber] = useState("");
  const [isCallingLoading, setIsCallingLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [isWebCallActive, setIsWebCallActive] = useState(false);
  
  // Get agent data
  const { 
    data: agent, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ["/api/agents", id],
    queryFn: () => apiRequest("GET", `/api/agents/${id}`).then(res => res.json()),
  });

  // Get phone numbers assigned to this agent
  const {
    data: assignedPhoneNumbers,
    isLoading: isLoadingPhoneNumbers
  } = useQuery({
    queryKey: ["/api/phone-numbers", "agent", id],
    queryFn: () => apiRequest("GET", `/api/phone-numbers?agentId=${id}`).then(res => res.json()),
    enabled: !!id
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
    voiceId: "",
    voiceGuidance: 1,
    speed: 10,
    temperature: 0.4,
    textGuidance: 0.8,
    backgroundNoise: false,
    officeAmbience: false,
    keyboard: false,
    phoneRinging: false,
    // Voice selection state
    voicesLoading: false,
    availableVoices: [],
    selectedVoice: null,
    // Action settings
    silenceThreshold: 4.0,
    summaryEmails: "",
    endCallTool: false,
  });
  
  // Fetch available voices function
  const fetchVoices = () => {
    // Set state to indicate loading
    setAgentData(prev => ({
      ...prev,
      voicesLoading: true
    }));
    
    // Fetch available voices from API
    fetch('/api/vapi/voices')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.voices && data.voices.length > 0) {
          setAgentData(prev => ({
            ...prev,
            availableVoices: data.voices,
            voicesLoading: false
          }));
          console.log("Successfully loaded voices:", data.voices.length);
        } else {
          setAgentData(prev => ({
            ...prev,
            availableVoices: [],
            voicesLoading: false
          }));
          console.error("Failed to load voices:", data.message);
        }
      })
      .catch(err => {
        setAgentData(prev => ({
          ...prev,
          voicesLoading: false
        }));
        console.error("Error fetching voices:", err);
      });
  };
  
  // Function to make an outbound call
  const makeOutboundCall = async () => {
    if (!callToNumber) {
      toast({
        title: "Phone Number Required",
        description: "Please enter a phone number to call.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCallingLoading(true);
      
      const phoneNumber = assignedPhoneNumbers?.[0]?.number;
      
      if (!phoneNumber) {
        toast({
          title: "No Phone Number Assigned",
          description: "This agent doesn't have a phone number assigned. Please assign a phone number first.",
          variant: "destructive",
        });
        setIsCallingLoading(false);
        return;
      }
      
      // Make API call to start an outbound call
      const response = await apiRequest("POST", `/api/vapi/call`, {
        agentId: id,
        fromNumber: phoneNumber,
        toNumber: callToNumber
      });
      
      if (response.ok) {
        toast({
          title: "Call Initiated",
          description: `A call to ${callToNumber} has been started.`,
        });
        
        // Close the dialog and reset state
        setCallNumberDialogOpen(false);
        setCallToNumber("");
      } else {
        const data = await response.json();
        throw new Error(data.message || "Failed to initiate call");
      }
    } catch (error) {
      toast({
        title: "Call Failed",
        description: error.message || "Failed to initiate call. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCallingLoading(false);
    }
  };

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
      
      // Fetch voices when the agent details are loaded
      fetchVoices();
    }
  }, [agent]);
  
  // Update agent mutation
  const updateAgentMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest("PATCH", `/api/agents/${id}`, data).then(res => res.json()),
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
  
  // Helper function to map intelligence levels to OpenAI models
  const getOpenAIModel = (intelligenceLevel: string): string => {
    switch (intelligenceLevel) {
      case "Genius Mode":
        return "gpt-4";
      case "Enhanced Mode":
        return "gpt-4o";
      case "Standard Mode":
        return "gpt-3.5-turbo";
      case "Basic Mode":
        return "gpt-3.5-turbo";
      default:
        return "gpt-4o"; // Default to gpt-4o if unspecified
    }
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
          {/* Test call button - always available */}
          <Button 
            variant={isWebCallActive ? "destructive" : "outline"}
            size="sm" 
            className="mr-2" 
            onClick={() => {
              if (!agentData.vapiAssistantId) {
                // If no Vapi Assistant ID, publish first then test
                toast({
                  title: "Publish Agent First",
                  description: "You need to publish your agent before testing. Click 'Publish' then try the test call again.",
                  variant: "destructive"
                });
                return;
              }
                if (isWebCallActive) {
                  // Cleaner approach to removing the widget
                  try {
                    // First, try multiple approaches to end any active calls
                    // Method 1: Look for the specific End call button
                    const endCallButton = document.querySelector('button[aria-label="End call"]');
                    if (endCallButton) {
                      console.log("Found active call button, hanging up call...");
                      (endCallButton as HTMLButtonElement).click();
                    }
                    
                    // Method 2: Look for any vapi call button that might be active
                    const vapiCallButtons = document.querySelectorAll('button[class*="vapi"]');
                    vapiCallButtons.forEach(button => {
                      console.log("Clicking potential call control button");
                      (button as HTMLButtonElement).click();
                    });
                    
                    // Method 3: Try to find hangup button by text content
                    const allButtons = document.querySelectorAll('button');
                    for (const button of allButtons) {
                      if (button.textContent?.toLowerCase().includes('hang up') || 
                          button.textContent?.toLowerCase().includes('end') ||
                          button.textContent?.toLowerCase().includes('cancel')) {
                        console.log("Found button with hang up text:", button.textContent);
                        (button as HTMLButtonElement).click();
                      }
                    }
                    
                    // Method 4: Force disconnect by setting a global variable vapi uses
                    try {
                      const disconnectScript = document.createElement('script');
                      disconnectScript.textContent = `
                        try {
                          // Try multiple ways to force call termination
                          if (window.vapiSDK && window.vapiSDK.hangup) {
                            window.vapiSDK.hangup();
                          }
                          
                          // Force any ongoing call to disconnect
                          if (window.vapiCurrentInstance && window.vapiCurrentInstance.hangup) {
                            window.vapiCurrentInstance.hangup();
                          }
                          
                          // Set global flag to help clean up
                          window.vapiCallEnded = true;
                        } catch(e) { console.warn("Error in hangup script:", e); }
                      `;
                      document.head.appendChild(disconnectScript);
                    } catch (err) {
                      console.warn("Error injecting disconnect script:", err);
                    }
                    
                    // Method 1: Try direct destroy
                    if (window.vapiSDK) {
                      try {
                        window.vapiSDK.destroy();
                      } catch (err) {
                        console.warn("Could not destroy using vapiSDK:", err);
                      }
                    }
                    
                    // Method 2: Remove all Vapi-related elements from DOM
                    document.querySelectorAll('[id^="vapi"]').forEach(el => {
                      if (el && el.parentNode) {
                        el.parentNode.removeChild(el);
                      }
                    });
                    
                    // Remove any other Vapi elements that might have different IDs
                    document.querySelectorAll('div[class*="vapi"]').forEach(el => {
                      if (el && el.parentNode) {
                        el.parentNode.removeChild(el);
                      }
                    });
                    
                    // Method 3: Remove our script tags
                    const scriptSelectors = [
                      '#vapi-test-script',
                      '#vapi-sdk-loader',
                      '#vapi-init-script',
                      'script[src*="vapi"]'
                    ];
                    
                    scriptSelectors.forEach(selector => {
                      const elements = document.querySelectorAll(selector);
                      elements.forEach(el => {
                        if (el && el.parentNode) {
                          el.parentNode.removeChild(el);
                        }
                      });
                    });
                    
                    // Reload the CSS to fix any style issues
                    const links = document.getElementsByTagName('link');
                    for (let i = 0; i < links.length; i++) {
                      const link = links[i];
                      if (link.rel === 'stylesheet') {
                        link.href = link.href.replace(/\?.*|$/, '?' + new Date().getTime());
                      }
                    }
                    
                    toast({
                      title: "Test Call Widget Removed",
                      description: "The call widget has been removed from the page",
                    });
                  } catch (error) {
                    console.error("Error removing Vapi widget:", error);
                    toast({
                      title: "Widget partially removed",
                      description: "Some elements may remain. Refresh the page if needed.",
                      variant: "destructive"
                    });
                  } finally {
                    // Always update state even if there was an error
                    setIsWebCallActive(false);
                  }
                } else {
                  // First, make sure we've properly cleaned up any existing instances
                  try {
                    // Remove all existing Vapi scripts first
                    document.querySelectorAll('script[src*="vapi"]').forEach(el => {
                      if (el && el.parentNode) {
                        el.parentNode.removeChild(el);
                      }
                    });
                    
                    // Remove all Vapi-related elements
                    document.querySelectorAll('[id^="vapi"]').forEach(el => {
                      if (el && el.parentNode) {
                        el.parentNode.removeChild(el);
                      }
                    });
                  } catch (err) {
                    console.warn("Error during cleanup:", err);
                  }
                  
                  // Now add the fresh Vapi script directly
                  const script = document.createElement('script');
                  script.src = "https://cdn.jsdelivr.net/gh/VapiAI/html-script-tag@latest/dist/assets/index.js";
                  script.defer = true;
                  script.async = true;
                  script.id = 'vapi-sdk-loader';
                  
                  // Handle script load error
                  script.onerror = () => {
                    toast({
                      title: "Failed to load Vapi SDK",
                      description: "Could not load the call widget. Please try again later.",
                      variant: "destructive"
                    });
                    setIsWebCallActive(false);
                  };
                  
                  // Initialization script
                  const initScript = document.createElement('script');
                  initScript.id = 'vapi-init-script';
                  
                  // Wait for SDK to load before running init
                  script.onload = () => {
                    // Add the actual initialization script
                    initScript.innerHTML = `
                      (async function() {
                        try {
                          const assistant = "${agentData.vapiAssistantId}";
                          
                          // Fetch the public key from the server
                          const response = await fetch('/api/vapi/public-key', {
                            credentials: 'include'
                          });
                          const data = await response.json();
                          
                          if (!data.success || !data.publicKey) {
                            console.error("Failed to get VAPI public key:", data.message);
                            return;
                          }
                          
                          const apiKey = data.publicKey;
                          
                          // Run the Vapi SDK with the proper configuration
                          if (window.vapiSDK) {
                            window.vapiSDK.run({
                              apiKey: apiKey,
                              assistant: assistant,
                            });
                          } else {
                            console.error("Vapi SDK not available");
                          }
                        } catch (err) {
                          console.error("Error initializing Vapi widget:", err);
                        }
                      })();
                    `;
                    document.body.appendChild(initScript);
                  };
                  
                  // Add the script to the page
                  document.body.appendChild(script);
                  setIsWebCallActive(true);
                  
                  toast({
                    title: "Test Call Widget Added",
                    description: "Look for the call button on the bottom right of the page to start a test call",
                  });
                }
              }}
            >
              <PhoneCall className="h-4 w-4 mr-2" />
              {isWebCallActive ? "Stop Web Test Call" : "Test Web Call"}
            </Button>
          
          <Button 
            variant="default" 
            size="sm" 
            onClick={() => {
              // Combined save and deploy operation
              const saveData = {
                ...agentData,
                responseIntelligenceLevel: agentData.responseIntelligenceLevel || "Enhanced Mode",
                temperature: agentData.temperature || 0.4,
                voiceId: agentData.voiceId || agentData.selectedVoice?.voice_id || "EXAVITQu4vr4xnSDxMaL",
                initialMessage: agentData.initialMessage || "Hello, how can I assist you today?",
              };

              // First save the agent
              updateAgentMutation.mutate(saveData, {
                onSuccess: () => {
                  // Then deploy to Vapi
                  const assistantParams = {
                    name: saveData.name,
                    firstMessage: saveData.initialMessage,
                    endCallMessage: "Thank you for calling. Goodbye!",
                    recordingEnabled: true,
                    voicemailDetectionEnabled: true,
                    endCallFunctionEnabled: true,
                    metadata: {
                      agentId: id,
                      createdFrom: "AimAI Platform",
                    },
                    model: {
                      provider: "openai",
                      model: getOpenAIModel(saveData.responseIntelligenceLevel),
                      temperature: 0.7,
                      systemPrompt: (() => {
                        // Build system prompt using only provided fields
                        let prompt = '';
                        
                        // Only add sections that have content
                        if (saveData.persona) {
                          prompt += `## Persona ##\n${saveData.persona}\n\n`;
                        }
                        
                        if (saveData.companyBackground) {
                          prompt += `## Company Background ##\n${saveData.companyBackground}\n\n`;
                        }
                        
                        if (saveData.agentRules) {
                          prompt += `## Agent Rules ##\n${saveData.agentRules}\n\n`;
                        }
                        
                        if (saveData.script) {
                          prompt += `## Script ##\n${saveData.script}\n\n`;
                        }
                        
                        if (saveData.edgeCases) {
                          prompt += `## Edge Cases ##\n${saveData.edgeCases}\n\n`;
                        }
                        
                        if (saveData.faqs) {
                          prompt += `## FAQs ##\n${saveData.faqs}\n\n`;
                        }
                        
                        // If no content was provided at all, add minimal instruction
                        if (prompt.trim() === '') {
                          prompt = 'You are a helpful AI assistant that answers questions clearly and honestly.';
                        }
                        
                        return prompt.trim();
                      })()
                    },
                    voice: {
                      provider: "11labs",
                      voiceId: saveData.voiceId,
                      speed: Math.min(1.2, (agentData.speed || 10) / 10),
                      stability: saveData.temperature || 0.4
                    },
                    transcriber: {
                      provider: "deepgram",
                      model: "nova-2-general",
                      language: "en"
                    }
                  };
                  
                  // Deploy to Vapi
                  fetch('/api/vapi/assistants', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(assistantParams)
                  })
                  .then(res => res.json())
                  .then(data => {
                    if (data.success) {
                      toast({
                        title: "Published Successfully",
                        description: "Agent published successfully!",
                      });
                      // Update agent with Vapi assistant ID
                      if (data.assistant && data.assistant.id) {
                        const finalUpdateData = {
                          ...saveData,
                          vapiAssistantId: data.assistant.id
                        };
                        updateAgentMutation.mutate(finalUpdateData);
                      }
                    } else {
                      toast({
                        title: "Partial Success",
                        description: "Agent saved but Vapi deployment failed. " + (data.message || ""),
                        variant: "destructive"
                      });
                    }
                  })
                  .catch(error => {
                    toast({
                      title: "Partial Success", 
                      description: "Agent saved but Vapi deployment failed. Please try again.",
                      variant: "destructive"
                    });
                    console.error("Vapi deployment error:", error);
                  });
                }
              });
            }}
            disabled={updateAgentMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {updateAgentMutation.isPending ? "Publishing..." : "Publish"}
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
              {/* Agent Type */}
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Agent Type</h3>
                <p className="text-sm text-muted-foreground">
                  Select how this agent will handle calls. Inbound agents answer incoming calls, outbound agents make calls, and both can do either.
                </p>
                <div className="pt-2">
                  <select 
                    className="w-full p-2 border rounded-md"
                    name="type"
                    value={agentData.type}
                    onChange={(e) => handleChange({
                      target: {
                        name: "type",
                        value: e.target.value
                      }
                    } as any)}
                  >
                    <option value="inbound">Inbound Only - Answer incoming calls</option>
                    <option value="outbound">Outbound Only - Make outgoing calls</option>
                    <option value="both">Both Inbound & Outbound - Handle all call types</option>
                  </select>
                </div>
              </div>
              
              {/* AI Response Style */}
              <div className="space-y-2 mt-4">
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
                <div className="flex flex-col space-y-4 pt-2">
                  <div className="flex items-center space-x-2">
                    {agentData.voicesLoading ? (
                      <div className="flex items-center">
                        <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
                        <span>Loading voices...</span>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        {agentData.availableVoices && agentData.availableVoices.length > 0 
                          ? `${agentData.availableVoices.length} voices available - click on any voice to select it`
                          : "No voices found - check your ElevenLabs API key in the .env file"
                        }
                      </div>
                    )}
                    {agentData.selectedVoice && (
                      <div className="flex items-center gap-2 bg-muted rounded-md px-4 py-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                          {agentData.selectedVoice.name?.charAt(0) || "V"}
                        </div>
                        <span>{agentData.selectedVoice.name || "Default Voice"}</span>
                      </div>
                    )}
                  </div>
                  
                  {agentData.availableVoices && agentData.availableVoices.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {agentData.availableVoices.map((voice: any) => (
                        <div 
                          key={voice.voice_id}
                          className={`p-3 border rounded-md cursor-pointer hover:bg-muted/50 transition-colors ${
                            agentData.selectedVoice?.voice_id === voice.voice_id ? 'border-primary bg-primary/10' : ''
                          }`}
                          onClick={() => {
                            setAgentData(prev => ({
                              ...prev,
                              selectedVoice: voice,
                              voiceId: voice.voice_id
                            }));
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                                {voice.name.charAt(0)}
                              </div>
                              <div>
                                <div className="font-medium">{voice.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {voice.gender && voice.accent 
                                    ? `${voice.gender}, ${voice.accent} accent` 
                                    : voice.category || ''}
                                </div>
                              </div>
                            </div>
                            {voice.preview_url && (
                              <button
                                className="p-1 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors voice-preview-btn"
                                data-voice-id={voice.voice_id}
                                data-preview-url={voice.preview_url}
                                data-playing="false"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const button = e.currentTarget;
                                  const isPlaying = button.getAttribute('data-playing') === 'true';
                                  const voiceId = button.getAttribute('data-voice-id');
                                  const previewUrl = button.getAttribute('data-preview-url');
                                  
                                  // Stop all other playing previews first
                                  document.querySelectorAll('.voice-preview-btn').forEach((btn: any) => {
                                    if (btn !== button && btn.getAttribute('data-playing') === 'true') {
                                      btn.setAttribute('data-playing', 'false');
                                      btn.innerHTML = `
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                        </svg>
                                      `;
                                      
                                      // Stop the playing audio
                                      const audioId = `preview-audio-${btn.getAttribute('data-voice-id')}`;
                                      const existingAudio = document.getElementById(audioId) as HTMLAudioElement;
                                      if (existingAudio) {
                                        existingAudio.pause();
                                        existingAudio.currentTime = 0;
                                      }
                                    }
                                  });
                                  
                                  if (isPlaying) {
                                    // If already playing, pause it
                                    button.setAttribute('data-playing', 'false');
                                    button.innerHTML = `
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                      </svg>
                                    `;
                                    
                                    const audioId = `preview-audio-${voiceId}`;
                                    const existingAudio = document.getElementById(audioId) as HTMLAudioElement;
                                    if (existingAudio) {
                                      existingAudio.pause();
                                      existingAudio.currentTime = 0;
                                    }
                                  } else {
                                    // If not playing, start playing
                                    button.setAttribute('data-playing', 'true');
                                    button.innerHTML = `
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="6" y="4" width="4" height="16"></rect>
                                        <rect x="14" y="4" width="4" height="16"></rect>
                                      </svg>
                                    `;
                                    
                                    // Create or get audio element
                                    const audioId = `preview-audio-${voiceId}`;
                                    let audioElement = document.getElementById(audioId) as HTMLAudioElement;
                                    
                                    if (!audioElement) {
                                      audioElement = document.createElement('audio');
                                      audioElement.id = audioId;
                                      audioElement.style.display = 'none';
                                      audioElement.src = previewUrl || '';
                                      
                                      // When audio ends, reset the button
                                      audioElement.addEventListener('ended', () => {
                                        button.setAttribute('data-playing', 'false');
                                        button.innerHTML = `
                                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                          </svg>
                                        `;
                                      });
                                      
                                      document.body.appendChild(audioElement);
                                    } else {
                                      // Reset existing audio element
                                      audioElement.currentTime = 0;
                                    }
                                    
                                    // Play the audio
                                    audioElement.play();
                                  }
                                }}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
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
                  )}
                </div>
              </div>
              
              <Separator />
              
              {/* Voice Guidance */}
              {/* Voice Synthesis Test */}
              <div className="mb-6 p-4 border rounded-md bg-muted/30">
                <h3 className="text-lg font-medium mb-2">Test Voice Synthesis</h3>
                <div className="flex flex-col space-y-4">
                  <div>
                    <label className="block text-sm mb-1">Test text to synthesize</label>
                    <textarea 
                      className="w-full p-2 border rounded-md" 
                      rows={2}
                      placeholder="Enter text to hear with this voice..."
                      id="testVoiceText"
                      defaultValue="Hello, this is a test of the voice synthesis system using ElevenLabs. How does it sound?"
                    ></textarea>
                  </div>
                  <div className="flex space-x-2 flex-wrap gap-2">
                    <button
                      id="generateVoiceBtn"
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                      onClick={() => {
                        const text = (document.getElementById('testVoiceText') as HTMLTextAreaElement).value;
                        if (!text) {
                          toast({
                            title: "Error",
                            description: "Please enter text to synthesize",
                            variant: "destructive"
                          });
                          return;
                        }
                        
                        // Check if a voice is selected
                        if (!agentData.voiceId && !agentData.selectedVoice?.voice_id) {
                          toast({
                            title: "Error",
                            description: "Please select a voice first",
                            variant: "destructive"
                          });
                          return;
                        }
                        
                        // Set loading state
                        const button = document.getElementById('generateVoiceBtn') as HTMLButtonElement;
                        const originalText = button.innerText;
                        button.innerText = 'Generating...';
                        button.disabled = true;
                        
                        // Make API request to synthesize speech
                        fetch('/api/vapi/synthesize', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            text,
                            voiceId: agentData.voiceId || agentData.selectedVoice?.voice_id,
                            speed: agentData.speed,
                            temperature: agentData.temperature,
                            textGuidance: agentData.textGuidance,
                            voiceGuidance: agentData.voiceGuidance,
                            backgroundNoise: {
                              officeAmbience: agentData.officeAmbience,
                              keyboard: agentData.keyboard,
                              phoneRinging: agentData.phoneRinging
                            }
                          })
                        })
                        .then(res => res.json())
                        .then(data => {
                          if (data.success && data.audioUrl) {
                            // Update audio element and play the synthesized speech
                            const audioPlayer = document.getElementById('audioPlayer') as HTMLAudioElement;
                            
                            // Set up audio controls behavior
                            audioPlayer.src = data.audioUrl;
                            audioPlayer.oncanplay = () => {
                              audioPlayer.style.display = 'block';
                              audioPlayer.play();
                              
                              // Update audio control buttons
                              const playPauseBtn = document.getElementById('playPauseBtn');
                              if (playPauseBtn) {
                                playPauseBtn.innerHTML = `
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="6" y="4" width="4" height="16"></rect>
                                    <rect x="14" y="4" width="4" height="16"></rect>
                                  </svg>
                                `;
                                playPauseBtn.setAttribute('data-state', 'playing');
                                playPauseBtn.style.display = 'inline-flex';
                              }
                            };
                            
                            toast({
                              title: "Voice Generated",
                              description: "Successfully generated voice audio",
                            });
                          } else {
                            toast({
                              title: "Voice Synthesis Failed",
                              description: data.message || "Could not generate speech. Please check your ElevenLabs API key.",
                              variant: "destructive"
                            });
                          }
                        })
                        .catch(err => {
                          toast({
                            title: "Error",
                            description: "Failed to connect to the voice synthesis service.",
                            variant: "destructive"
                          });
                          console.error("Voice synthesis error:", err);
                        })
                        .finally(() => {
                          // Reset button state
                          button.innerText = originalText;
                          button.disabled = false;
                        });
                      }}
                    >
                      Generate & Play
                    </button>
                    
                    <button
                      id="playPauseBtn"
                      className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors ml-2"
                      data-state="paused"
                      style={{ display: 'none' }}
                      onClick={(e) => {
                        const audioPlayer = document.getElementById('audioPlayer') as HTMLAudioElement;
                        const button = e.currentTarget;
                        const state = button.getAttribute('data-state');
                        
                        if (state === 'paused') {
                          audioPlayer.play();
                          button.setAttribute('data-state', 'playing');
                          button.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="6" y="4" width="4" height="16"></rect>
                              <rect x="14" y="4" width="4" height="16"></rect>
                            </svg>
                          `;
                        } else {
                          audioPlayer.pause();
                          button.setAttribute('data-state', 'paused');
                          button.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                          `;
                        }
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                      </svg>
                    </button>
                  </div>
                  
                  {/* Hide the default audio controls and use our custom controls instead */}
                  <audio 
                    id="audioPlayer" 
                    className="w-full hidden" 
                    onEnded={() => {
                      const playPauseBtn = document.getElementById('playPauseBtn');
                      if (playPauseBtn) {
                        playPauseBtn.setAttribute('data-state', 'paused');
                        playPauseBtn.innerHTML = `
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                          </svg>
                        `;
                      }
                    }}
                  />
                  
                  <div className="text-xs text-muted-foreground mt-2">
                    Note: Voice synthesis uses your selected voice via ElevenLabs API. Make sure a voice is selected first.
                  </div>
                </div>
              </div>
              
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
                      <h3 className="font-medium">Silence threshold ({agentData.silenceThreshold} minutes)</h3>
                      <p className="text-sm text-muted-foreground">
                        An alert that tells if the agent has been silent for a certain number of seconds.
                      </p>
                    </div>
                    <div className="text-xl font-medium">{agentData.silenceThreshold}</div>
                  </div>
                  <div className="pt-4">
                    <Slider
                      value={[agentData.silenceThreshold]}
                      min={0}
                      max={10}
                      step={0.5}
                      onValueChange={(value) => handleSliderChange("silenceThreshold", value)}
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
                <div className="flex items-center gap-4">
                  <Button 
                    onClick={() => setCallNumberDialogOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <PhoneCall className="h-4 w-4" />
                    Call Phone Number
                  </Button>
                </div>
              </div>
              
              {isLoadingPhoneNumbers ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : assignedPhoneNumbers && assignedPhoneNumbers.length > 0 ? (
                <div className="mb-8">
                  <h3 className="text-lg font-medium mb-4">Assigned Phone Number</h3>
                  <div className="border rounded-md p-6 bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="bg-primary/10 rounded-full p-3">
                          <Phone className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <div className="text-xl font-medium">{assignedPhoneNumbers[0].number}</div>
                          <div className="text-sm text-muted-foreground">
                            Number ID: {assignedPhoneNumbers[0].id}
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        className="flex items-center gap-2"
                        onClick={() => setCallNumberDialogOpen(true)}
                      >
                        <PhoneCall className="h-4 w-4" />
                        Make Call
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 border rounded-md">
                  <Phone className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No phone numbers assigned</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    This agent doesn't have any phone numbers assigned yet.
                  </p>
                </div>
              )}
              
              {/* Call Number Dialog */}
              <Dialog open={callNumberDialogOpen} onOpenChange={setCallNumberDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Make Outbound Call</DialogTitle>
                    <DialogDescription>
                      Enter the phone number you want to call. The call will be made from this agent's assigned phone number.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="py-4">
                    <Label htmlFor="phoneNumber">Phone Number to Call</Label>
                    <Input 
                      id="phoneNumber" 
                      placeholder="+12345678900" 
                      value={callToNumber}
                      onChange={(e) => setCallToNumber(e.target.value)}
                    />
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCallNumberDialogOpen(false)}>Cancel</Button>
                    <Button 
                      onClick={makeOutboundCall} 
                      disabled={isCallingLoading || !callToNumber}
                    >
                      {isCallingLoading ? "Initiating Call..." : "Call Now"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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