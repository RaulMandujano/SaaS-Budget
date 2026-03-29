import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  Timestamp,
  where,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { createActivityLog } from "@/lib/firestore/activityLogs";
import { asegurarEmpresaId } from "@/lib/firestore/empresas";

export interface InventarioItem {
  id: string;
  nombre: string;
  sku: string;
  cantidad: number;
  ubicacion: string;
  tipo: string;
  createdAt?: Date | null;
}

const normalizarSku = (sku: string) => sku.trim().toUpperCase();

const mapInventarioItem = (docSnap: QueryDocumentSnapshot<DocumentData>): InventarioItem => {
  const data = docSnap.data();
  const createdAtRaw = data.createdAt;
  const createdAt =
    createdAtRaw instanceof Timestamp ? createdAtRaw.toDate() : createdAtRaw?.toDate?.() ?? null;

  return {
    id: docSnap.id,
    nombre: data.nombre ?? "",
    sku: data.sku ?? "",
    cantidad: Number(data.cantidad ?? 0),
    ubicacion: data.ubicacion ?? "",
    tipo: data.tipo ?? "",
    createdAt,
  };
};

export const getInventario = async (empresaIdParam?: string): Promise<InventarioItem[]> => {
  const empresaId = asegurarEmpresaId(empresaIdParam);
  const inventarioRef = collection(db, "empresas", empresaId, "inventario");
  const inventarioQuery = query(inventarioRef, orderBy("createdAt", "desc"), limit(300));
  const snapshot = await getDocs(inventarioQuery);
  return snapshot.docs.map(mapInventarioItem);
};

export const createInventarioItem = async (
  empresaIdParam: string | undefined,
  data: Omit<InventarioItem, "id" | "createdAt">,
  userId?: string,
): Promise<string> => {
  const empresaId = asegurarEmpresaId(empresaIdParam);
  const sku = normalizarSku(data.sku);
  const cantidad = Number(data.cantidad ?? 0);

  if (!data.nombre.trim()) {
    throw new Error("El nombre del producto es obligatorio.");
  }
  if (!sku) {
    throw new Error("El SKU es obligatorio.");
  }
  if (!Number.isFinite(cantidad) || cantidad < 0) {
    throw new Error("La cantidad debe ser un número válido mayor o igual a 0.");
  }

  const inventarioRef = collection(db, "empresas", empresaId, "inventario");
  const skuQuery = query(inventarioRef, where("sku", "==", sku), limit(1));
  const skuSnapshot = await getDocs(skuQuery);

  if (!skuSnapshot.empty) {
    throw new Error("Ya existe un producto con ese SKU.");
  }

  const ref = await addDoc(inventarioRef, {
    nombre: data.nombre.trim(),
    sku,
    cantidad,
    ubicacion: data.ubicacion.trim(),
    tipo: data.tipo.trim(),
    createdAt: Timestamp.now(),
  });

  if (userId) {
    await createActivityLog(empresaId, {
      tipo: "inventario",
      accion: "created",
      descripcion: `Se creó el item de inventario ${data.nombre.trim()} (${sku}).`,
      userId,
    });
  }

  return ref.id;
};

export const updateStock = async (
  empresaIdParam: string | undefined,
  itemId: string,
  cantidadNueva: number,
  userId?: string,
): Promise<void> => {
  const empresaId = asegurarEmpresaId(empresaIdParam);

  if (!Number.isFinite(cantidadNueva) || cantidadNueva < 0) {
    throw new Error("No se permite stock negativo.");
  }

  const itemRef = doc(db, "empresas", empresaId, "inventario", itemId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(itemRef);
    if (!snap.exists()) {
      throw new Error("El item de inventario no existe.");
    }
    transaction.update(itemRef, { cantidad: cantidadNueva });
  });

  if (userId) {
    await createActivityLog(empresaId, {
      tipo: "inventario",
      accion: "stock_updated",
      descripcion: `Se actualizó el stock del item ${itemId} a ${cantidadNueva}.`,
      userId,
    });
  }
};
