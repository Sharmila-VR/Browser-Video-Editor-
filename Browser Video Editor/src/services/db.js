const DB_NAME = 'BrowserVideoEditorDB'
const DB_VERSION = 1

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('media')) {
        db.createObjectStore('media', { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveProjectToDB(projectData) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('projects', 'readwrite')
    const store = tx.objectStore('projects')
    store.put(projectData)
    tx.oncomplete = () => resolve(true)
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadProjectFromDB(projectId = 'default-project') {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('projects', 'readonly')
    const store = tx.objectStore('projects')
    const request = store.get(projectId)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

export async function saveMediaItemToDB(mediaItem) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('media', 'readwrite')
    const store = tx.objectStore('media')
    store.put(mediaItem)
    tx.oncomplete = () => resolve(true)
    tx.onerror = () => reject(tx.error)
  })
}

export async function getAllMediaFromDB() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('media', 'readonly')
    const store = tx.objectStore('media')
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

export async function deleteMediaFromDB(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('media', 'readwrite')
    const store = tx.objectStore('media')
    store.delete(id)
    tx.oncomplete = () => resolve(true)
    tx.onerror = () => reject(tx.error)
  })
}

export async function clearAllDB() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['projects', 'media'], 'readwrite')
    tx.objectStore('projects').clear()
    tx.objectStore('media').clear()
    tx.oncomplete = () => resolve(true)
    tx.onerror = () => reject(tx.error)
  })
}
