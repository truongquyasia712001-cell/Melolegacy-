export type LocalScoreSnapshot = {
  version: 1
  savedAt: string
  notes: unknown[]
  title: string
  layout: string
  clef: string
  time: string
  keySig: string
  tempo: number
  dynamic: string
  sourceMusicXml: string | null
}

const DATABASE_NAME = 'melolegacy-local'
const DATABASE_VERSION = 1
const STORE_NAME = 'scores'
const ACTIVE_SCORE_KEY = 'active-score'
const FALLBACK_KEY = 'melo-local-score-v1'
const LEGACY_NOTES_KEY = 'melo-composer-notes-v2'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Thiết bị hoặc trình duyệt không hỗ trợ IndexedDB.'))
      return
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Không mở được kho dữ liệu cục bộ.'))
    request.onblocked = () => reject(new Error('Kho dữ liệu đang bị chặn bởi một phiên MeloLegacy khác.'))
  })
}

function isSnapshot(value: unknown): value is LocalScoreSnapshot {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<LocalScoreSnapshot>
  return candidate.version === 1
    && Array.isArray(candidate.notes)
    && typeof candidate.title === 'string'
    && typeof candidate.layout === 'string'
    && typeof candidate.clef === 'string'
    && typeof candidate.time === 'string'
    && typeof candidate.keySig === 'string'
    && typeof candidate.tempo === 'number'
    && typeof candidate.dynamic === 'string'
    && (typeof candidate.sourceMusicXml === 'string' || candidate.sourceMusicXml === null)
}

export async function loadLocalScore(): Promise<LocalScoreSnapshot | null> {
  try {
    const database = await openDatabase()
    try {
      const snapshot = await new Promise<unknown>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, 'readonly')
        const request = transaction.objectStore(STORE_NAME).get(ACTIVE_SCORE_KEY)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error ?? new Error('Không đọc được bản nhạc đã lưu.'))
      })
      if (isSnapshot(snapshot)) return snapshot
    } finally {
      database.close()
    }
  } catch {
    // Continue to the localStorage fallback when IndexedDB is unavailable.
  }

  try {
    const fallback = localStorage.getItem(FALLBACK_KEY)
    if (fallback) {
      const parsed: unknown = JSON.parse(fallback)
      if (isSnapshot(parsed)) return parsed
    }

    // One-time compatibility path for scores saved by the earlier composer.
    const legacyNotes = localStorage.getItem(LEGACY_NOTES_KEY)
    if (legacyNotes) {
      const notes: unknown = JSON.parse(legacyNotes)
      if (Array.isArray(notes)) {
        return {
          version: 1,
          savedAt: new Date().toISOString(),
          notes,
          title: 'Tác phẩm mới',
          layout: 'solo',
          clef: 'treble',
          time: '4/4',
          keySig: 'C',
          tempo: 80,
          dynamic: 'mf',
          sourceMusicXml: null,
        }
      }
    }
  } catch {
    throw new Error('Dữ liệu lưu cục bộ hiện không đọc được. Không ghi đè dữ liệu cũ.')
  }

  return null
}

export async function saveLocalScore(
  value: Omit<LocalScoreSnapshot, 'version' | 'savedAt'>,
): Promise<void> {
  const snapshot: LocalScoreSnapshot = {
    ...value,
    version: 1,
    savedAt: new Date().toISOString(),
  }

  try {
    const database = await openDatabase()
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, 'readwrite')
        transaction.objectStore(STORE_NAME).put(snapshot, ACTIVE_SCORE_KEY)
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error ?? new Error('Không ghi được dữ liệu vào IndexedDB.'))
        transaction.onabort = () => reject(transaction.error ?? new Error('Lưu dữ liệu đã bị hủy.'))
      })
      return
    } finally {
      database.close()
    }
  } catch (indexedDbError) {
    try {
      localStorage.setItem(FALLBACK_KEY, JSON.stringify(snapshot))
      return
    } catch {
      const reason = indexedDbError instanceof Error ? indexedDbError.message : 'IndexedDB không khả dụng.'
      throw new Error('Không thể lưu bản nhạc trên thiết bị. ' + reason)
    }
  }
}
