import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ClearCallsButton() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const clearCallsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/calls/clear");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Cleared ${data.count} call records. The dashboard will now only show real call metrics.`,
        variant: "default",
      });
      
      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/calls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics/dashboard"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to clear call records: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const handleClearCalls = () => {
    if (window.confirm("Are you sure you want to clear all call records? This action cannot be undone.")) {
      clearCallsMutation.mutate();
    }
  };
  
  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleClearCalls}
      disabled={clearCallsMutation.isPending}
    >
      {clearCallsMutation.isPending ? (
        "Clearing..."
      ) : (
        <>
          <Trash2 className="mr-2 h-4 w-4" />
          Clear Call Records
        </>
      )}
    </Button>
  );
}