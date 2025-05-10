import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusIcon } from "lucide-react";
import { TableSkeleton } from "@/components/ui/skeleton";

export default function ActionsPage() {
  const { data: actions, isLoading, error } = useQuery({
    queryKey: ["/api/actions"],
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Action Management</h2>
        <Button>
          <PlusIcon className="h-4 w-4 mr-2" />
          Create new action
        </Button>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : error ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-500">Failed to load actions</div>
          </CardContent>
        </Card>
      ) : actions && actions.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {actions.map((action: any) => (
            <Card key={action.id}>
              <CardHeader>
                <CardTitle>{action.name}</CardTitle>
                <CardDescription>{action.description || 'No description'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Type:</span> {action.type}
                  </div>
                  {action.endpoint && (
                    <div>
                      <span className="font-medium">Endpoint:</span> {action.endpoint}
                    </div>
                  )}
                  {action.method && (
                    <div>
                      <span className="font-medium">Method:</span> {action.method}
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <Button variant="outline" size="sm" className="w-full">
                    Edit Action
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center">
          <CardHeader>
            <CardTitle>No Actions Created Yet</CardTitle>
            <CardDescription>
              Create your first action to enable integrations with external services.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-6 flex justify-center">
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              Create new action
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
