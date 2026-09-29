import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  CalendarPlus,
  List,
  History,
  Clock,
  Settings2,
  Menu,
  X,
  Moon,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/bookings/new", label: "New Booking", icon: CalendarPlus },
  { href: "/bookings", label: "All Bookings", icon: List },
  { href: "/history", label: "History", icon: History },
  { href: "/schedule", label: "Schedule", icon: Clock },
  { href: "/rules", label: "Booking Rules", icon: Settings2 },
];

function NavLink({
  href,
  label,
  icon: Icon,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  onClick?: () => void;
}) {
  const [location] = useLocation();
  const isActive = location === href;

  return (
    <Link href={href} onClick={onClick}>
      <div
        data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150 cursor-pointer",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <Icon size={17} />
        {label}
      </div>
    </Link>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 border-r border-sidebar-border bg-sidebar shrink-0 fixed top-0 bottom-0 left-0 z-40">
        <div className="flex items-center gap-2 px-4 h-14 border-b border-sidebar-border">
          <div className="w-7 h-7 bg-primary rounded flex items-center justify-center">
            <span className="text-primary-foreground text-xs font-bold">B</span>
          </div>
          <span className="font-semibold text-sidebar-foreground text-sm">Butchery Admin</span>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>
        <div className="px-3 py-3 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-sidebar-foreground"
            onClick={toggleTheme}
            data-testid="toggle-theme"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
            <span className="text-primary-foreground text-xs font-bold">B</span>
          </div>
          <span className="font-semibold text-sidebar-foreground text-sm">Butchery Admin</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleTheme}>
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setMobileOpen(!mobileOpen)}
            data-testid="mobile-menu-toggle"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </Button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setMobileOpen(false)}>
          <div className="w-56 h-full bg-sidebar border-r border-sidebar-border" onClick={(e) => e.stopPropagation()}>
            <div className="h-14 border-b border-sidebar-border" />
            <nav className="px-2 py-3 space-y-0.5">
              {navItems.map((item) => (
                <NavLink key={item.href} {...item} onClick={() => setMobileOpen(false)} />
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 md:ml-56 pt-14 md:pt-0 min-h-screen overflow-auto">
        <div className="p-4 md:p-6 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
