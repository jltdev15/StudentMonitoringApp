import {
  collection,
  doc,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  serverTimestamp,
} from '@react-native-firebase/firestore';
import {db} from '../config/firebase';

export const now = () => serverTimestamp();

export const col = (path: string) => collection(db, path);

export const docRef = (path: string, id?: string) =>
  id ? doc(db, path, id) : doc(col(path));

export const mapDoc = <T extends {id: string}>(
  snapshot: QueryDocumentSnapshot | DocumentSnapshot,
) =>
  ({
    id: snapshot.id,
    ...snapshot.data(),
  } as T);
