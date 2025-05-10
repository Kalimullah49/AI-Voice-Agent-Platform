import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { CardSkeleton } from "../ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from "recharts";

interface AnalyticsChartProps {
  type: "durationVsCost" | "callOutcomes";
}

export default function AnalyticsChart({ type }: AnalyticsChartProps) {
  const { data, isLoading, error } = useQuery<any>({
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
            Failed to load analytics data
          </div>
        </CardContent>
      </Card>
    );
  }

  if (type === "durationVsCost") {
    const chartData = data.durationVsCost.labels.map((label: string, index: number) => ({
      name: label,
      duration: data.durationVsCost.duration[index],
      cost: data.durationVsCost.cost[index]
    }));

    return (
      <Card>
        <CardContent className="px-4 py-5 sm:p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Duration vs. Cost</h3>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" orientation="left" hide />
                <YAxis yAxisId="right" orientation="right" hide />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === "duration") return [`${value} min`, "Duration"];
                    if (name === "cost") return [`$${value}`, "Cost"];
                    return [value, name];
                  }}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.375rem',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                  }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="duration" name="Duration" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="cost" name="Cost" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Call Outcomes Chart
  const callOutcomes = [
    { name: "Customer\nEnded Call", value: data.callOutcomes.customerEnded, color: "#EAB308" }, // Gold color
    { name: "Transferred", value: data.callOutcomes.transferred, color: "#8B5CF6" }, // Purple color
    { name: "Agent\nEnded Call", value: data.callOutcomes.agentEnded, color: "#3B82F6" } // Blue color
  ];

  return (
    <Card>
      <CardContent className="px-4 py-5 sm:p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Calls Outcome</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={callOutcomes}
              layout="horizontal"
              margin={{ top: 5, right: 15, left: 15, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false}
                height={60}
                tick={{ fontSize: 11 }}
              />
              <YAxis 
                type="number"
                axisLine={false} 
                tickLine={false}
                label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
              />
              <Tooltip
                formatter={(value) => [`${value} calls`, "Calls"]}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                }}
              />
              <Bar 
                dataKey="value" 
                radius={[4, 4, 0, 0]}
                fill="#8884d8"
              >
                {
                  callOutcomes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))
                }
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
