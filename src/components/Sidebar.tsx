import { useTranslation } from "react-i18next";
import { LayoutDashboard, Package, ShoppingCart, Database, Settings } from "lucide-react";

type TabType = "overview" | "installed" | "marketplace" | "repositories" | "settings";

interface SidebarProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const navItems: { id: TabType; icon: typeof LayoutDashboard; labelKey: string }[] = [
  { id: "overview", icon: LayoutDashboard, labelKey: "nav.overview" },
  { id: "installed", icon: Package, labelKey: "nav.installed" },
  { id: "marketplace", icon: ShoppingCart, labelKey: "nav.marketplace" },
  { id: "repositories", icon: Database, labelKey: "nav.repositories" },
  { id: "settings", icon: Settings, labelKey: "nav.settings" },
];

export function Sidebar({ currentTab, onTabChange }: SidebarProps) {
  const { t } = useTranslation();

  return (
    <aside className="w-[220px] flex-shrink-0 bg-sidebar border-r border-border">
      <nav className="p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`
                sidebar-item w-full
                ${isActive ? "sidebar-item-active" : ""}
              `}
            >
              <Icon className="w-[18px] h-[18px]" />
              <span>{t(item.labelKey)}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
