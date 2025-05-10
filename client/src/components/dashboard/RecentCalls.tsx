import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "../ui/skeleton";
import { formatDuration } from "@/lib/utils";

export default function RecentCalls() {
  const { data: callsData, isLoading, error } = useQuery({
    queryKey: ["/api/calls"],
  });

  if (isLoading) {
    return (
      <TableSkeleton />
    );
  }

  if (error || !callsData) {
    return (
      <Card>
        <CardContent className="px-4 py-5 sm:p-6">
          <div className="text-center text-red-500">
            Failed to load call data
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort calls by startedAt (newest first) and take the first 5
  const recentCalls = [...callsData]
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 5);

  return (
    <section>
      <Card>
        <CardHeader className="px-4 py-5 sm:px-6 flex-row justify-between items-center">
          <div>
            <CardTitle className="text-base font-semibold leading-6 text-gray-900">Recent Calls</CardTitle>
            <CardDescription className="mt-1 max-w-2xl text-sm text-gray-500">Your last 5 call activities</CardDescription>
          </div>
          <Button variant="link" className="text-sm font-medium text-primary hover:text-primary/80" asChild>
            <a href="/calls/history">View all</a>
          </Button>
        </CardHeader>
        
        <div className="border-t border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th scope="col" className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
                <th scope="col" className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                <th scope="col" className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Direction</th>
                <th scope="col" className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                <th scope="col" className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Outcome</th>
                <th scope="col" className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentCalls.map((call) => (
                <tr key={call.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{call.fromNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Recovery Agent</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <Badge variant="outline" className={call.direction === 'inbound' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                      {call.direction === 'inbound' ? 'Inbound' : 'Outbound'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDuration(call.duration)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{call.outcome === 'transferred' ? 'Transferred' : call.endedReason}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${call.cost.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}
