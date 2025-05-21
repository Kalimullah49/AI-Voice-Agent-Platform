import { useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function WebhookLogs() {
  const [limit, setLimit] = useState("20");
  
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["/api/webhook/logs", { limit }],
    queryFn: async () => {
      const response = await fetch(`/api/webhook/logs?limit=${limit}`);
      if (!response.ok) {
        throw new Error('Failed to fetch webhook logs');
      }
      return response.json();
    }
  });

  const logs = data?.logs || [];
  
  const getStatusBadge = (processed: boolean, error: string) => {
    if (error) {
      return <Badge variant="destructive">Error</Badge>;
    }
    if (processed) {
      return <Badge variant="default">Processed</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  const downloadLogs = () => {
    if (!logs || logs.length === 0) return;
    
    const jsonString = JSON.stringify(logs, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `webhook-logs-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Webhook Logs</h1>
        <div className="flex gap-2">
          <Select 
            value={limit} 
            onValueChange={value => setLimit(value)}
          >
            <SelectTrigger className="w-24">
              <SelectValue placeholder="Limit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            onClick={downloadLogs}
            disabled={!logs || logs.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-36 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No webhook logs found. Webhook logs will appear here after receiving data from Vapi.ai.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {logs.map((log: any) => (
            <Card key={log.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between">
                  <CardTitle className="text-lg">
                    {log.type || 'Unknown Event'} 
                    <span className="ml-2">
                      {getStatusBadge(log.processed, log.error)}
                    </span>
                  </CardTitle>
                  <CardDescription>
                    {formatDate(log.createdAt)}
                  </CardDescription>
                </div>
                {log.error && (
                  <CardDescription className="text-red-500">
                    Error: {log.error}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-md overflow-auto text-xs max-h-60">
                  {JSON.stringify(log.payload, null, 2)}
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}