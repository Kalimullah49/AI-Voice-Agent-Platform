import DashboardMetrics from "@/components/dashboard/DashboardMetrics";
import CallActivityChart from "@/components/dashboard/CallActivityChart";
import AnalyticsChart from "@/components/dashboard/AnalyticsChart";
import RecentCalls from "@/components/dashboard/RecentCalls";

export default function Dashboard() {
  return (
    <>
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
