export interface ModuleConfigItem {
  label: string;
  icon: string;
  path: string;
  requiredRole?: string;
}

export const moduleConfig: Record<string, ModuleConfigItem> = {
  dashboard: {
    label: "Dashboard",
    icon: "home",
    path: "/dashboard",
  },
  gastos: {
    label: "Gastos",
    icon: "money",
    path: "/gastos",
    requiredRole: "admin",
  },
  viajes: {
    label: "Viajes",
    icon: "map",
    path: "/viajes",
    requiredRole: "admin",
  },
  it: {
    label: "IT",
    icon: "computer",
    path: "/it",
  },
};
