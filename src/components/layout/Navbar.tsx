import { Link, useLocation } from "react-router-dom";
import { Shield, LayoutDashboard, Database, Info, Activity } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Navbar() {
  const location = useLocation();

  const links = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/projects", icon: Database, label: "Projects" },
    { to: "/about", icon: Info, label: "About" },
  ];

  return (
    <nav className="fixed left-0 top-0 h-screen w-64 bg-zinc-950 border-r border-zinc-800 p-6 flex flex-col gap-8 z-50">
      <div className="flex items-center gap-3 px-2">
        <div className="bg-emerald-500/10 p-2 rounded-lg">
          <Shield className="w-8 h-8 text-emerald-500" />
        </div>
        <div>
          <h1 className="text-white font-bold tracking-tight">Kilo Agent</h1>
          <p className="text-zinc-500 text-xs font-mono">DevSecOps AI</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive 
                  ? "bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.2)]" 
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive ? "text-white" : "text-zinc-500 group-hover:text-emerald-400")} />
              <span className="font-medium">{link.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="mt-auto">
        <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-zinc-400 text-xs font-mono uppercase tracking-widest">Scanner Active</span>
        </div>
      </div>
    </nav>
  );
}
