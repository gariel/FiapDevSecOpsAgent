import { useState, useEffect } from "react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from "recharts";
import { AlertTriangle, ShieldCheck, Flame, Search, ExternalLink, Activity as ActivityIcon } from "lucide-react";
import { motion } from "motion/react";

export default function Dashboard() {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setStats(data);
        } else {
          console.error("Dashboard stats data is not an array:", data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch dashboard stats:", err);
        setLoading(false);
      });
  }, []);

  const safeStats = Array.isArray(stats) ? stats : [];

  const totalFindings = safeStats.reduce((acc, curr) => acc + (curr.findingsCount || 0), 0);
  const criticalFindings = safeStats.reduce((acc, curr) => acc + (curr.criticalCount || 0), 0);
  const highFindings = safeStats.reduce((acc, curr) => acc + (curr.highCount || 0), 0);

  const severityData = [
    { name: "Critical", value: criticalFindings, color: "#ef4444" },
    { name: "High", value: highFindings, color: "#f97316" },
    { name: "Normal", value: totalFindings - criticalFindings - highFindings, color: "#10b981" },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <header>
        <h1 className="text-3xl font-bold text-white tracking-tight">Security Intelligence</h1>
        <p className="text-zinc-500 mt-1">Real-time overview of code scan executions and risk distribution.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          label="Total Findings" 
          value={totalFindings} 
          icon={Search} 
          color="zinc" 
        />
        <StatCard 
          label="Critical Threats" 
          value={criticalFindings} 
          icon={Flame} 
          color="red" 
        />
        <StatCard 
          label="High Risk Items" 
          value={highFindings} 
          icon={AlertTriangle} 
          color="orange" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Trend Chart */}
        <div className="bg-zinc-950 p-6 rounded-3xl border border-zinc-800">
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <ActivityIcon className="w-5 h-5 text-emerald-400" />
            Vulnerability Trend
          </h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(val) => new Date(val).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  stroke="#71717a"
                  fontSize={12}
                />
                <YAxis stroke="#71717a" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#09090b", border: "1px solid #27272a", borderRadius: "12px" }}
                />
                <Line 
                  type="monotone" 
                  dataKey="findingsCount" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: "#10b981", strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "#10b981" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribution Chart */}
        <div className="bg-zinc-950 p-6 rounded-3xl border border-zinc-800">
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Risk Distribution
          </h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={severityData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#71717a" fontSize={12} width={80} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#09090b", border: "1px solid #27272a", borderRadius: "12px" }}
                />
                <Bar dataKey="value" radius={[0, 12, 12, 0]} barSize={40}>
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: any = {
    zinc: "text-white bg-zinc-900 border-zinc-800",
    red: "text-red-500 bg-red-500/10 border-red-500/20",
    orange: "text-orange-500 bg-orange-500/10 border-orange-500/20",
  };

  return (
    <div className={`p-6 rounded-3xl border ${colors[color]} flex items-center justify-between group transition-all duration-300 hover:scale-[1.02]`}>
      <div>
        <p className="text-zinc-500 text-sm font-medium uppercase tracking-wider">{label}</p>
        <h3 className="text-4xl font-bold mt-1 tracking-tighter">{value}</h3>
      </div>
      <div className={`p-4 rounded-2xl ${color === 'zinc' ? 'bg-zinc-800' : 'bg-current/10'}`}>
        <Icon className="w-8 h-8" />
      </div>
    </div>
  );
}
