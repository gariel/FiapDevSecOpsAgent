import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, ShieldAlert, AlertTriangle, Info, AlertCircle } from "lucide-react";
import { motion } from "motion/react";

const SEVERITY_RESOURCES: any = {
  Critical: { icon: ShieldAlert, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20" },
  High: { icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  Medium: { icon: AlertCircle, color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
  Low: { icon: Info, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
};

export default function ScanDetail() {
  const { scanId } = useParams();
  const navigate = useNavigate();
  const [scan, setScan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/scans/${scanId}`)
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setScan(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [scanId]);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!scan) return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <ShieldAlert className="w-12 h-12 text-zinc-800" />
      <p className="text-zinc-500 font-mono">Scan execution not found or failed to load.</p>
      <button onClick={() => navigate(-1)} className="text-emerald-500 text-sm font-bold uppercase tracking-widest">Go Back</button>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 pb-20"
    >
      <header className="flex flex-col gap-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-zinc-500 hover:text-emerald-400 transition-colors group text-left">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium uppercase tracking-widest">Back</span>
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Scan Execution Findings</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm">
            <span className="text-zinc-400 uppercase tracking-widest font-mono text-xs">{scan.repo}</span>
            <span className="text-zinc-700 font-bold">/</span>
            <span className="text-emerald-500 font-mono text-xs">{scan.commitHash?.substring(0, 7)}</span>
            <span className="text-zinc-700 font-bold">•</span>
            <span className="text-zinc-500">
              {(() => {
                if (!scan.timestamp) return "Unknown Date";
                if (typeof scan.timestamp === "string") return new Date(scan.timestamp).toLocaleString();
                if (typeof scan.timestamp === "object" && scan.timestamp._seconds) {
                  return new Date(scan.timestamp._seconds * 1000).toLocaleString();
                }
                return new Date(scan.timestamp).toLocaleString();
              })()}
            </span>
          </div>
        </div>
      </header>

      <div className="grid gap-6">
        {scan.findings?.length === 0 ? (
          <div className="py-20 text-center bg-emerald-500/5 border border-emerald-500/20 rounded-3xl">
             <ShieldAlert className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
             <h3 className="text-white font-bold text-xl">Clean Scan!</h3>
             <p className="text-zinc-500 mt-2">No security vulnerabilities were detected in this execution.</p>
          </div>
        ) : (
          scan.findings.map((finding: any, idx: number) => {
            const res = SEVERITY_RESOURCES[finding.severity] || SEVERITY_RESOURCES.Low;
            const Icon = res.icon;
            return (
              <div 
                key={idx}
                className={`bg-zinc-950 border ${res.border} rounded-3xl overflow-hidden shadow-2xl shadow-black/50`}
              >
                <div className={`px-6 py-3 ${res.bg} border-b ${res.border} flex items-center justify-between`}>
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${res.color}`} />
                    <span className={`text-xs font-bold uppercase tracking-widest ${res.color}`}>{finding.severity} RISK</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 opacity-70 uppercase tracking-widest">{finding.category || "General Security"}</span>
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-white text-lg font-medium leading-relaxed">{finding.description}</h4>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-zinc-500 text-xs font-mono">{finding.filePath}</span>
                      {finding.lineNumber && <span className="text-zinc-600 text-xs font-mono">: L{finding.lineNumber}</span>}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-900 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Technical detail placeholders could go here */}
                    </div>
                    <a 
                      href={finding.githubUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all text-xs font-bold uppercase tracking-widest"
                    >
                      View on GitHub <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
