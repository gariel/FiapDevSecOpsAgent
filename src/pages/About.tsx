import { ABOUT_INFO } from "../lib/constants";
import { Users, GraduationCap, Shield } from "lucide-react";
import { motion } from "motion/react";

export default function About() {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-4xl mx-auto space-y-12 py-10"
    >
      <div className="text-center space-y-4">
        <div className="inline-flex p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
          <Shield className="w-12 h-12 text-emerald-500" />
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase">{ABOUT_INFO.title}</h1>
        <p className="text-2xl font-serif italic text-emerald-400 opacity-80">{ABOUT_INFO.subtitle}</p>
      </div>

      <div className="grid gap-6">
        <div className="flex items-center gap-4 text-zinc-500 uppercase tracking-[0.2em] text-sm font-bold border-b border-zinc-800 pb-4">
          <Users className="w-5 h-5 text-emerald-500" />
          <span>Project Contributors</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ABOUT_INFO.members.map((member, idx) => (
            <div 
              key={idx} 
              className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl flex items-center justify-between group hover:border-emerald-500/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-emerald-500 group-hover:bg-emerald-500/10 transition-all">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-white font-bold tracking-tight">{member.name}</h3>
                  <p className="text-zinc-500 text-xs font-mono">{member.rm}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </motion.div>
  );
}
