import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableSkeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";

export default function CallsMonitorPage() {
  const { data: agents, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/agents"],
  });

  const refreshData = () => {
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Calls Monitor</h2>
        <Button variant="outline" onClick={refreshData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : error ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-500">Failed to load monitoring data</div>
          </CardContent>
        </Card>
      ) : agents && agents.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent: any) => (
            <Card key={agent.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  {agent.name}
                  <span className={`h-3 w-3 rounded-full ${agent.active ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-2 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-500">Inbound Calls</p>
                    <p className="text-xl font-semibold">0</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-500">Outbound Calls</p>
                    <p className="text-xl font-semibold">0</p>
                  </div>
                </div>
                <div className="flex justify-between">
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                  <Button variant="ghost" size="sm">
                    Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Active Agents</CardTitle>
          </CardHeader>
          <CardContent className="text-center pb-6">
            <p className="text-gray-500 mb-4">There are no active agents to monitor at this time.</p>
            <Button variant="outline" asChild>
              <a href="/agents">Manage Agents</a>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
