import { useGetDashboardStats, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Truck, Inbox, CheckCircle, AlertTriangle, Box } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  
  const { data: stats, isLoading } = useGetDashboardStats(
    { hubId: user?.role !== "SUPER_ADMIN" ? user?.hubId || undefined : undefined },
    { query: { queryKey: getGetDashboardStatsQueryKey({ hubId: user?.role !== "SUPER_ADMIN" ? user?.hubId || undefined : undefined }) } }
  );

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of today's operations {user?.hubName ? `for ${user.hubName}` : ''}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Today's Bookings"
          value={stats?.todayBookings || 0}
          icon={Box}
          color="text-blue-500"
        />
        <StatCard
          title="Incoming Parcels"
          value={stats?.incomingParcels || 0}
          icon={Inbox}
          color="text-cyan-500"
        />
        <StatCard
          title="Outgoing / In Transit"
          value={stats?.outgoingParcels || 0}
          icon={Truck}
          color="text-amber-500"
        />
        <StatCard
          title="Ready for Pickup"
          value={stats?.readyForPickup || 0}
          icon={Package}
          color="text-purple-500"
        />
        <StatCard
          title="Delivered Today"
          value={stats?.deliveredToday || 0}
          icon={CheckCircle}
          color="text-green-500"
        />
        <StatCard
          title="Open Complaints"
          value={stats?.openComplaints || 0}
          icon={AlertTriangle}
          color="text-red-500"
        />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: { title: string, value: number, icon: any, color: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`w-4 h-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
