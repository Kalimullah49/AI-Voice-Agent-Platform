import { Card, CardContent } from "@/components/ui/card";
import { 
  DollarSign, 
  Clock, 
  Calculator, 
  Phone
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { CardSkeleton } from "../ui/skeleton";

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
}

function MetricCard({ title, value, icon, iconBgColor, iconColor }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="px-4 py-5 sm:p-6">
        <div className="flex items-center">
          <div className={`flex-shrink-0 ${iconBgColor} rounded-md p-3`}>
            <div className={`h-6 w-6 ${iconColor}`}>{icon}</div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd>
                <div className="text-lg font-medium text-gray-900">{value}</div>
              </dd>
            </dl>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardMetrics() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/metrics/dashboard"],
  });

  if (isLoading) {
    return (
      <section className="mb-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="mb-6">
        <Card>
          <CardContent className="px-4 py-5 sm:p-6">
            <div className="text-center text-red-500">
              Failed to load dashboard metrics
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  const { summary } = data;

  return (
    <section className="mb-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Cost"
          value={`$${summary.totalCost}`}
          icon={<DollarSign />}
          iconBgColor="bg-primary-50"
          iconColor="text-primary"
        />
        
        <MetricCard
          title="Total Hours Saved"
          value={summary.totalHoursSaved}
          icon={<Clock />}
          iconBgColor="bg-green-50"
          iconColor="text-green-600"
        />
        
        <MetricCard
          title="Avg. Cost per Call"
          value={`$${summary.avgCostPerCall}`}
          icon={<Calculator />}
          iconBgColor="bg-yellow-50"
          iconColor="text-yellow-600"
        />
        
        <MetricCard
          title="Avg. Call Duration"
          value={`${summary.avgCallDuration} min`}
          icon={<Phone />}
          iconBgColor="bg-indigo-50"
          iconColor="text-primary"
        />
      </div>
    </section>
  );
}
