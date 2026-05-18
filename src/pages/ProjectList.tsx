import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Folder, ChevronRight, Github } from "lucide-react";
import { motion } from "motion/react";

export default function ProjectList() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setProjects(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <header>
        <h1 className="text-3xl font-bold text-white tracking-tight">Authenticated Projects</h1>
        <p className="text-zinc-500 mt-1">Repositories integrated with the Kilo AI Scanner.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {projects.length === 0 ? (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-zinc-800 rounded-3xl">
            <p className="text-zinc-600 font-mono italic">No projects scanned yet. Trigger your first scan via GitHub Actions.</p>
          </div>
        ) : (
          projects.map((project, idx) => (
            <Link 
              key={idx}
              to={`/projects/${project.owner}/${project.repo}`}
              className="group bg-zinc-950 border border-zinc-800 p-6 rounded-3xl hover:border-emerald-500/50 transition-all duration-300 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Github className="w-16 h-16 text-white" />
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="bg-zinc-900 p-3 rounded-2xl group-hover:bg-emerald-500/10 transition-colors">
                  <Folder className="w-6 h-6 text-zinc-400 group-hover:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold tracking-tight text-lg">{project.repo}</h3>
                  <p className="text-zinc-500 text-sm">{project.owner}</p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-8">
                <div className="flex items-center gap-1 text-emerald-500 text-sm font-medium group-hover:translate-x-1 transition-transform ml-auto">
                  View Repository <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </motion.div>
  );
}
