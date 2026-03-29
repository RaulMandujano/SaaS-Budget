import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { asegurarEmpresaId } from "@/lib/firestore/empresas";

export interface AssetIT {
  id: string;
  name: string;
  type: string;
  serialNumber: string;
  status: "available" | "assigned" | "maintenance" | "retired";
  assignedTo: string;
  location: string;
  createdAt?: Date | null;
}

const mapAsset = (docSnap: QueryDocumentSnapshot<DocumentData>): AssetIT => {
  const data = docSnap.data();
  const createdAtRaw = data.createdAt;
  const createdAt =
    createdAtRaw instanceof Timestamp ? createdAtRaw.toDate() : createdAtRaw?.toDate?.() ?? null;

  return {
    id: docSnap.id,
    name: data.name ?? "",
    type: data.type ?? "",
    serialNumber: data.serialNumber ?? "",
    status: (data.status as AssetIT["status"]) ?? "available",
    assignedTo: data.assignedTo ?? "",
    location: data.location ?? "",
    createdAt,
  };
};

export const getAssets = async (empresaIdParam?: string): Promise<AssetIT[]> => {
  const empresaId = asegurarEmpresaId(empresaIdParam);
  const assetsRef = collection(db, "empresas", empresaId, "assets");
  const assetsQuery = query(assetsRef, orderBy("createdAt", "desc"), limit(300));
  const snapshot = await getDocs(assetsQuery);
  return snapshot.docs.map(mapAsset);
};

export const createAsset = async (
  empresaIdParam: string | undefined,
  data: Omit<AssetIT, "id" | "createdAt">,
): Promise<string> => {
  const empresaId = asegurarEmpresaId(empresaIdParam);
  const assetsRef = collection(db, "empresas", empresaId, "assets");
  const payload = {
    ...data,
    createdAt: Timestamp.now(),
  };
  const ref = await addDoc(assetsRef, payload);
  return ref.id;
};
