import { openDB, type IDBPDatabase } from 'idb';
import type { Conversation } from '../types';

const DB_NAME = 'archive_viewer_db';
const DB_VERSION = 1;
const STORE_META = 'profiles_meta';
const STORE_DATA = 'profiles_data';

export interface ProfileMeta {
  id: string;
  name: string;
  createdAt: number;
}

// Sync helper to allow UI to know if profiles exist before DB loads
const updateProfileHint = (count: number) => {
    if (count > 0) {
        localStorage.setItem('archive_has_profiles', 'true');
    } else {
        localStorage.removeItem('archive_has_profiles');
    }
};

const getDB = async (): Promise<IDBPDatabase> => {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_META)) {
                db.createObjectStore(STORE_META, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORE_DATA)) {
                db.createObjectStore(STORE_DATA, { keyPath: 'id' });
            }
        },
    });
};

export const addProfile = async (name: string, conversations: Conversation[]): Promise<ProfileMeta> => {
  const db = await getDB();
  const id = crypto.randomUUID();
  const meta: ProfileMeta = {
    id,
    name,
    createdAt: Date.now(),
  };

  const tx = db.transaction([STORE_META, STORE_DATA], 'readwrite');
  await Promise.all([
      tx.objectStore(STORE_META).add(meta),
      tx.objectStore(STORE_DATA).add({ id, conversations }),
      tx.done
  ]);

  localStorage.setItem('archive_has_profiles', 'true');
  return meta;
};

export const getProfileList = async (): Promise<ProfileMeta[]> => {
  const db = await getDB();
  const list = await db.getAll(STORE_META);
  updateProfileHint(list.length);
  return list.sort((a, b) => b.createdAt - a.createdAt);
};

export const getProfileData = async (id: string): Promise<Conversation[]> => {
  const db = await getDB();
  const data = await db.get(STORE_DATA, id);
  return data?.conversations || [];
};

export const deleteProfile = async (id: string): Promise<void> => {
  const db = await getDB();
  const tx = db.transaction([STORE_META, STORE_DATA], 'readwrite');
  await Promise.all([
      tx.objectStore(STORE_META).delete(id),
      tx.objectStore(STORE_DATA).delete(id),
      tx.done
  ]);
  
  // Update hint
  const count = await db.count(STORE_META);
  updateProfileHint(count);
};

export const renameProfile = async (id: string, newName: string): Promise<void> => {
  const db = await getDB();
  const tx = db.transaction(STORE_META, 'readwrite');
  const store = tx.objectStore(STORE_META);
  const data = await store.get(id);
  if (data) {
      data.name = newName;
      await store.put(data);
  }
  await tx.done;
};