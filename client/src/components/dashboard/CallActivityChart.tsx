import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CardSkeleton } from "../ui/skeleton";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from "recharts";

interface CallActivityProps {
  type: "inbound" | "outbound";
}

export default function CallActivityChart({ type }: CallActivityProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/metrics/dashboard"],
  });

  if (isLoading) {
    return <CardSkeleton height="sm" />;
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="px-4 py-5 sm:p-6">
          <div className="text-center text-red-500">
            Failed to load call activity data
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.callsDaily[type].labels.map((label: string, index: number) => ({
    name: label,
    calls: data.callsDaily[type].values[index]
  }));

  const metrics = type === "inbound" ? data.inboundCalls : data.outboundCalls;
  const color = type === "inbound" ? "#10B981" : "#3B82F6";
  const bgColor = type === "inbound" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800";
  const title = type === "inbound" ? "Inbound Calls" : "Outbound Calls";

  return (
    <Card>
      <CardContent className="px-4 py-5 sm:p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <Badge variant="outline" className={bgColor}>
            Today: {metrics.todayCount}
          </Badge>
        </div>
        
        <div className="h-[180px] mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis hide={true} />
              <Tooltip 
                formatter={(value) => [`${value} calls`, "Calls"]}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                }}
              />
              <Bar dataKey="calls" fill={color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Calls</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">{metrics.totalCalls}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Avg. Duration</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">{metrics.avgDuration} min</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Conversion</p>
            <p className={`mt-1 text-lg font-semibold ${metrics.conversionRate > 0 ? 'text-primary' : 'text-gray-400'}`}>
              {metrics.conversionRate}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
