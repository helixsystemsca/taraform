import type { LocalNote } from "@/components/notes/types";

const DB_NAME = "taraform_notes_db";
const DB_VERSION = 1;
const NOTES_STORE = "notes";

type NotesIndexRow = {
  id: string;
  updated_at: number;
  created_at: number;
  chapter_id: string | null;
  title?: string;
};

function supportsIndexedDb() {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(NOTES_STORE)) {
        const store = db.createObjectStore(NOTES_STORE, { keyPath: "id" });
        store.createIndex("by_updated_at", "updated_at", { unique: false });
        store.createIndex("by_chapter_updated", ["chapter_id", "updated_at"], { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Could not open notes database."));
  });
}

function txDone(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted."));
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed."));
  });
}

export async function putLocalNote(note: LocalNote): Promise<void> {
  if (!supportsIndexedDb()) {
    const key = `taraform:note:${note.id}`;
    localStorage.setItem(key, JSON.stringify(note));
    return;
  }
  const db = await openDb();
  const tx = db.transaction(NOTES_STORE, "readwrite");
  tx.objectStore(NOTES_STORE).put(note);
  await txDone(tx);
  db.close();
}

export async function getLocalNote(id: string): Promise<LocalNote | null> {
  if (!supportsIndexedDb()) {
    const raw = localStorage.getItem(`taraform:note:${id}`);
    return raw ? (JSON.parse(raw) as LocalNote) : null;
  }
  const db = await openDb();
  const tx = db.transaction(NOTES_STORE, "readonly");
  const req = tx.objectStore(NOTES_STORE).get(id);
  const result = await new Promise<LocalNote | null>((resolve, reject) => {
    req.onsuccess = () => resolve((req.result as LocalNote | undefined) ?? null);
    req.onerror = () => reject(req.error ?? new Error("Could not load note."));
  });
  db.close();
  return result;
}

export async function deleteLocalNote(id: string): Promise<void> {
  if (!supportsIndexedDb()) {
    localStorage.removeItem(`taraform:note:${id}`);
    return;
  }
  const db = await openDb();
  const tx = db.transaction(NOTES_STORE, "readwrite");
  tx.objectStore(NOTES_STORE).delete(id);
  await txDone(tx);
  db.close();
}

export async function listLocalNotes(chapter_id: string | null): Promise<NotesIndexRow[]> {
  if (!supportsIndexedDb()) {
    const rows: NotesIndexRow[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith("taraform:note:")) continue;
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const n = JSON.parse(raw) as LocalNote;
      if ((chapter_id ?? null) !== (n.chapter_id ?? null)) continue;
      rows.push({
        id: n.id,
        updated_at: n.updated_at,
        created_at: n.created_at,
        chapter_id: n.chapter_id ?? null,
        title: n.title,
      });
    }
    rows.sort((a, b) => b.updated_at - a.updated_at);
    return rows;
  }

  const db = await openDb();
  const tx = db.transaction(NOTES_STORE, "readonly");
  const store = tx.objectStore(NOTES_STORE);
  const idx = store.index("by_chapter_updated");

  const keyRange = IDBKeyRange.bound([chapter_id, 0], [chapter_id, Number.MAX_SAFE_INTEGER]);
  const out: NotesIndexRow[] = [];

  await new Promise<void>((resolve, reject) => {
    const cursorReq = idx.openCursor(keyRange, "prev");
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (!cursor) return resolve();
      const n = cursor.value as LocalNote;
      out.push({
        id: n.id,
        updated_at: n.updated_at,
        created_at: n.created_at,
        chapter_id: n.chapter_id ?? null,
        title: n.title,
      });
      cursor.continue();
    };
    cursorReq.onerror = () => reject(cursorReq.error ?? new Error("Could not list notes."));
  });

  db.close();
  return out;
}

export function newNoteId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `note_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

