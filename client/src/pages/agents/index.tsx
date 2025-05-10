import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusIcon, Search, UserPlus, PhoneCall } from "lucide-react";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

export default function AgentsPage() {
  const [_, navigate] = useLocation();
  const { data: agents, isLoading, error } = useQuery({
    queryKey: ["/api/agents"],
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div></div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={() => {
              // Will be implemented later with AI integration
              alert('AI generation feature coming soon');
            }}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Generate with AI
          </Button>
          <Button
            onClick={() => {
              // Create a new empty agent with default values
              fetch('/api/agents', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  name: "New Agent",
                  type: "inbound",
                  active: false
                })
              })
              .then(response => response.json())
              .then(data => {
                // Navigate to the newly created agent's detail page
                navigate(`/agents/${data.id}`);
              })
              .catch(error => {
                console.error("Error creating agent:", error);
                alert('Failed to create agent. Please try again.');
              });
            }}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create new agent
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search agents..."
            className="pl-8 w-full md:w-[300px] lg:w-[400px]"
          />
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : error ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-500">Failed to load agents</div>
          </CardContent>
        </Card>
      ) : agents && agents.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent: any) => (
            <Card key={agent.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                    {agent.name.charAt(0)}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{agent.name}</CardTitle>
                    <CardDescription>ID: {agent.id}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type:</span> {agent.type}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>{" "}
                    <span className={agent.active ? "text-green-600" : "text-red-600"}>
                      {agent.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="col-span-2 mt-2">
                    <span className="text-muted-foreground">Intelligence:</span>{" "}
                    {agent.responseIntelligenceLevel || "Standard"}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <div className="flex justify-between w-full">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/agents/${agent.id}`)}
                  >
                    View Details
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => {
                      // Test call functionality would go here
                      alert('Test call feature coming soon');
                    }}
                  >
                    <PhoneCall className="h-3 w-3 mr-1" />
                    Test Call
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Agents Found</CardTitle>
            <CardDescription>
              Create your first AI voice agent to start handling calls automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              Create new agent
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
