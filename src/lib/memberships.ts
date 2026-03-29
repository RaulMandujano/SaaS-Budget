import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export interface UserMembership {
  uid: string;
  empresaId: string;
  role: string;
  status: string;
  createdAt?: Date | null;
}

export const getUserMembership = async (
  empresaId: string,
  uid: string,
): Promise<UserMembership | null> => {
  if (!empresaId || !uid) return null;

  const membershipRef = doc(db, "empresas", empresaId, "membresias", uid);
  const membershipSnap = await getDoc(membershipRef);

  if (!membershipSnap.exists()) {
    return null;
  }

  const data = membershipSnap.data();

  return {
    uid: (data.uid as string | undefined) ?? uid,
    empresaId: (data.empresaId as string | undefined) ?? empresaId,
    role: (data.role as string | undefined) ?? "admin",
    status: (data.status as string | undefined) ?? "active",
    createdAt: data.createdAt?.toDate?.() ?? null,
  };
};
