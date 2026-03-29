import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

export const BASE_MODULES = ["dashboard", "gastos", "viajes", "it"] as const;

export interface EnsureMembershipInput {
  uid: string;
  empresaId: string;
  role: string;
  status?: "active" | "invited" | "suspended";
}

export interface EnsureMembershipResult {
  created: boolean;
}

export const ensureMembershipForUser = async ({
  uid,
  empresaId,
  role,
  status = "active",
}: EnsureMembershipInput): Promise<EnsureMembershipResult> => {
  const firestore = admin.firestore();
  const membershipRef = firestore
    .collection("empresas")
    .doc(empresaId)
    .collection("membresias")
    .doc(uid);

  const existingMembership = await membershipRef.get();

  const payload: Record<string, unknown> = {
    uid,
    empresaId,
    role,
    status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (!existingMembership.exists) {
    payload.createdAt = admin.firestore.FieldValue.serverTimestamp();
  }

  await membershipRef.set(payload, { merge: true });

  return { created: !existingMembership.exists };
};

export const ensureBaseModulesForEmpresa = async (empresaId: string): Promise<string[]> => {
  const firestore = admin.firestore();
  const createdModules: string[] = [];

  for (const moduleId of BASE_MODULES) {
    const moduleRef = firestore.collection("empresas").doc(empresaId).collection("modulos").doc(moduleId);
    const moduleSnap = await moduleRef.get();

    if (moduleSnap.exists) {
      continue;
    }

    await moduleRef.set({
      enabled: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    createdModules.push(moduleId);
  }

  return createdModules;
};

export interface EnsureTenantInfrastructureInput {
  uid: string;
  empresaId: string;
  role: string;
  status?: "active" | "invited" | "suspended";
}

export interface EnsureTenantInfrastructureResult {
  membershipCreated: boolean;
  createdModules: string[];
}

export const ensureTenantInfrastructureForUser = async ({
  uid,
  empresaId,
  role,
  status = "active",
}: EnsureTenantInfrastructureInput): Promise<EnsureTenantInfrastructureResult> => {
  const [membershipResult, createdModules] = await Promise.all([
    ensureMembershipForUser({ uid, empresaId, role, status }),
    ensureBaseModulesForEmpresa(empresaId),
  ]);

  return {
    membershipCreated: membershipResult.created,
    createdModules,
  };
};
