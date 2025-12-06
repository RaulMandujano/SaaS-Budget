import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";

export interface Empresa {
  id: string;
  nombre: string;
  ruc?: string;
  fechaCreacion?: Date;
}

const mapEmpresa = (doc: any): Empresa => {
  const data = doc.data();

  return {
    id: doc.id,
    nombre: data.nombre,
    ruc: data.ruc || "",
    fechaCreacion:
      data.fechaCreacion instanceof Timestamp
        ? data.fechaCreacion.toDate()
        : undefined,
  };
};

export const obtenerEmpresas = async (): Promise<Empresa[]> => {
  const q = query(
    collection(db, "empresas"),
    orderBy("fechaCreacion", "desc"),
    limit(200)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapEmpresa);
};
