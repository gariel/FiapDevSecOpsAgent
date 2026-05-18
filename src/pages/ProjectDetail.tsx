import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Calendar, GitCommit, User, ChevronRight, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";

export default function ProjectDetail() {
  const { owner, repo } = useParams();
  const [scans, setScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeBranch, setActiveBranch] = useState<string>("");

  useEffect(() => {
    fetch(`/api/projects/${owner}/${repo}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setScans(data);
          const branches = Array.from(new Set(data.map((scan: any) => scan.branch).filter(Boolean)));
          if (branches.length > 0) {
            setActiveBranch(branches[0] as string);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [owner, repo]);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const branches = Array.from(new Set(scans.map((scan: any) => scan.branch).filter(Boolean))) as string[];
  const branchScans = scans.filter((scan: any) => scan.branch === activeBranch);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <header className="flex flex-col gap-4">
        <Link to="/projects" className="flex items-center gap-2 text-zinc-500 hover:text-emerald-400 transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium uppercase tracking-widest">Back to Projects</span>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">{repo}</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-zinc-500">{owner}</span>
          </div>
        </div>
      </header>

      {/* Branch selector tabs */}
      {branches.length > 0 && (
        <div className="flex border-b border-zinc-800 gap-4 overflow-x-auto pb-px">
          {branches.map(branchName => (
            <button
              key={branchName}
              onClick={() => setActiveBranch(branchName)}
              className={`py-3 px-1 border-b-2 font-mono text-sm tracking-widest uppercase transition-all whitespace-nowrap ${
                activeBranch === branchName
                  ? "border-emerald-500 text-emerald-400 font-semibold"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {branchName}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4">
        {branchScans.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-zinc-800 rounded-3xl">
            <p className="text-zinc-600 font-mono italic">No scans found for this branch.</p>
          </div>
        ) : (
          branchScans.map((scan) => (
            <Link
              key={scan.id}
              to={`/scans/${scan.id}`}
              className="group bg-zinc-950 border border-zinc-800 p-6 rounded-3xl hover:bg-zinc-900/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="flex items-start gap-6">
                <div className="bg-zinc-900 p-4 rounded-2xl">
                  <GitCommit className="w-8 h-8 text-zinc-500" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-white font-mono text-sm font-semibold">{scan.commitHash.substring(0, 7)}</h3>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] uppercase font-bold tracking-widest">COMMIT</span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
                    <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />{scan.author}</span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
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
              </div>

              <div className="flex items-center gap-8">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Findings</p>
                    <p className="text-white font-bold">{scan.findingsCount || 0}</p>
                  </div>
                  <div className="w-px h-8 bg-zinc-800" />
                  <div className="text-center">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Critical</p>
                    <p className={scan.criticalCount > 0 ? "text-red-500 font-bold" : "text-zinc-600 font-bold"}>{scan.criticalCount || 0}</p>
                  </div>
                  <div className="w-px h-8 bg-zinc-800" />
                  <div className="text-center">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">High</p>
                    <p className={scan.highCount > 0 ? "text-orange-500 font-bold" : "text-zinc-600 font-bold"}>{scan.highCount || 0}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-700 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          ))
        )}
      </div>
    </motion.div>
  );
}
