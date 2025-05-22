import DashboardMetrics from "@/components/dashboard/DashboardMetrics";
import CallActivityChart from "@/components/dashboard/CallActivityChart";
import AnalyticsChart from "@/components/dashboard/AnalyticsChart";
import RecentCalls from "@/components/dashboard/RecentCalls";
import ClearCallsButton from "./ClearCallsButton";
import { useRealTime } from "@/hooks/use-real-time";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  // Connect to real-time updates
  const { isConnected } = useRealTime();
  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <Badge variant={isConnected ? "default" : "secondary"} className="text-xs">
            {isConnected ? "Live Updates Active" : "Connecting..."}
          </Badge>
        </div>
        <ClearCallsButton />
      </div>
      
      <DashboardMetrics />
      
      <section className="mb-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <CallActivityChart type="inbound" />
          <CallActivityChart type="outbound" />
        </div>
      </section>
      
      <section className="mb-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <AnalyticsChart type="durationVsCost" />
          <AnalyticsChart type="callOutcomes" />
        </div>
      </section>
      
      <RecentCalls />
    </>
  );
}
