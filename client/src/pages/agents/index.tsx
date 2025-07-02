import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusIcon, Search, UserPlus, PhoneCall, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { toast } from "@/hooks/use-toast";
import { TestCallModal } from "@/components/agents/TestCallModal";
import { CreateAgentDialog } from "@/components/agents/CreateAgentDialog";
import { useState } from "react";

export default function AgentsPage() {
  const [_, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [testCallModalOpen, setTestCallModalOpen] = useState(false);
  const [createAgentDialogOpen, setCreateAgentDialogOpen] = useState(false);
  const [selectedAssistantId, setSelectedAssistantId] = useState<string | undefined>();
  const { data: agents = [], isLoading, error } = useQuery<any[]>({
    queryKey: ["/api/agents"],
  });
  
  // Mutation for deleting an agent
  const deleteAgentMutation = useMutation({
    mutationFn: async (agentId: number) => {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete agent');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate the agents query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      toast({
        title: "Agent deleted",
        description: "The agent has been successfully deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete agent. Please try again.",
        variant: "destructive"
      });
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div></div>
        <div className="flex items-center gap-2">
          {/* Buttons removed as requested by user */}
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
      ) : agents && Array.isArray(agents) && agents.length > 0 ? (
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
                  <div className="flex space-x-2">
                    <Button 
                      variant="destructive" 
                      size="sm"
                      disabled={deleteAgentMutation.isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Are you sure you want to delete the agent "${agent.name}"?`)) {
                          deleteAgentMutation.mutate(agent.id);
                        }
                      }}
                    >
                      {deleteAgentMutation.isPending ? (
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-t-transparent" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
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
              No AI voice agents have been created yet.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
      
      {/* Test Call Modal */}
      <TestCallModal
        open={testCallModalOpen}
        onClose={() => {
          setTestCallModalOpen(false);
          setSelectedAssistantId(undefined);
        }}
        assistantId={selectedAssistantId}
      />
      
      {/* Create Agent Dialog */}
      <CreateAgentDialog
        open={createAgentDialogOpen}
        onOpenChange={setCreateAgentDialogOpen}
      />
    </div>
  );
}
