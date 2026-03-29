import { collection, doc, getDocs, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { moduleConfig } from "@/lib/moduleConfig";

export interface CompanyModuleState {
  enabled: boolean;
  requiredRole?: string;
}

export type CompanyModulesMap = Record<string, CompanyModuleState>;

export const getCompanyModules = async (empresaId: string): Promise<CompanyModulesMap> => {
  if (!empresaId) return {};

  const modulesRef = collection(db, "empresas", empresaId, "modulos");
  const snapshot = await getDocs(modulesRef);

  const modules: CompanyModulesMap = {};

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    modules[docSnap.id] = {
      enabled: data.enabled === true,
      requiredRole: typeof data.requiredRole === "string" ? data.requiredRole : undefined,
    };
  });

  return modules;
};

export const subscribeCompanyModules = (
  empresaId: string,
  onChange: (modules: CompanyModulesMap) => void,
) => {
  if (!empresaId) {
    onChange({});
    return () => undefined;
  }

  const modulesRef = collection(db, "empresas", empresaId, "modulos");

  return onSnapshot(modulesRef, (snapshot) => {
    const modules: CompanyModulesMap = {};

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      modules[docSnap.id] = {
        enabled: data.enabled === true,
        requiredRole: typeof data.requiredRole === "string" ? data.requiredRole : undefined,
      };
    });

    onChange(modules);
  });
};

export const saveCompanyModules = async (
  empresaId: string,
  modules: CompanyModulesMap,
): Promise<void> => {
  if (!empresaId) {
    throw new Error("No hay empresa seleccionada para guardar módulos.");
  }

  const knownModuleIds = Object.keys(moduleConfig);

  for (const moduleId of knownModuleIds) {
    const moduleRef = doc(db, "empresas", empresaId, "modulos", moduleId);
    const moduleState = modules[moduleId];

    await setDoc(
      moduleRef,
      {
        enabled: moduleState?.enabled === true,
        requiredRole: moduleState?.requiredRole ?? null,
      },
      { merge: true },
    );
  }
};
