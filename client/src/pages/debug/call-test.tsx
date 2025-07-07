import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function CallTestPage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const { toast } = useToast();

  // Fetch agents
  const { data: agents } = useQuery({
    queryKey: ["/api/agents"],
  });

  // Test call mutation
  const testCallMutation = useMutation({
    mutationFn: async ({ phoneNumber, agentId }: { phoneNumber: string; agentId: number }) => {
      const response = await fetch("/api/test-call", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phoneNumber, agentId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to initiate test call");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Test call initiated",
        description: `Call ID: ${data.callId} - Status: ${data.status}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Test call failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTestCall = () => {
    if (!phoneNumber || !selectedAgentId) {
      toast({
        title: "Missing information",
        description: "Please enter a phone number and select an agent",
        variant: "destructive",
      });
      return;
    }

    testCallMutation.mutate({
      phoneNumber,
      agentId: parseInt(selectedAgentId),
    });
  };

  return (
    <div className="container mx-auto py-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Call Test Debug</h1>
          <p className="text-muted-foreground">
            Test individual calls to debug campaign calling issues
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Test Call Configuration</CardTitle>
            <CardDescription>
              Use this to test calls before running full campaigns
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone-number">Phone Number</Label>
              <Input
                id="phone-number"
                placeholder="+1234567890 or +923285606918"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Include country code (e.g., +1 for US, +92 for Pakistan)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent">Select Agent</Label>
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents && agents.filter(agent => agent && agent.id && agent.vapiAssistantId).map((agent: any) => (
                    <SelectItem key={agent.id} value={agent.id.toString()}>
                      {agent.name} {!agent.vapiAssistantId && "(Not published)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleTestCall} 
              disabled={testCallMutation.isPending}
              className="w-full"
            >
              {testCallMutation.isPending ? "Initiating Call..." : "Test Call"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Troubleshooting Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>International calls:</strong> US numbers can call most countries, but some may have restrictions</p>
            <p><strong>Pakistan numbers:</strong> Format should be +92XXXXXXXXXX (starting with +92)</p>
            <p><strong>US numbers:</strong> Format should be +1XXXXXXXXXX (starting with +1)</p>
            <p><strong>Call not received:</strong> Check if the number accepts international calls or has call blocking enabled</p>
            <p><strong>Agent not published:</strong> Make sure the agent has been published to Vapi.ai before testing</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}