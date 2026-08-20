import * as React from "react"
import { Link, useLocation } from "wouter"
import { Database, FileText, Activity, Server, FileCheck, Layers, Settings, FileSearch, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: Activity },
  { href: "/records", label: "Records", icon: FileSearch },
  { href: "/consolidation", label: "Consolidation", icon: Layers },
  { href: "/completeness", label: "Completeness", icon: FileCheck },
  { href: "/architecture", label: "Architecture", icon: ShieldCheck },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r bg-card flex flex-col">
        <div className="h-14 flex items-center px-6 border-b shrink-0">
          <div className="flex items-center gap-2 text-primary font-bold tracking-tight">
            <Database className="w-5 h-5" />
            <span>FPS-Archief</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3">
            {NAV_ITEMS.map((item) => {
              const active = location === item.href;
              return (
                <Link key={item.href} href={item.href} className="block">
                  <div
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="p-4 border-t text-xs text-muted-foreground">
          <p className="flex items-center gap-2 mb-1"><Server className="w-3 h-3"/> NAS Boundary Ready</p>
          <p className="flex items-center gap-2"><Settings className="w-3 h-3"/> Immutable Storage</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
