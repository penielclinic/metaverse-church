'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AlbumPhoto {
  id: number
  cell_id: number
  user_id: string
  storage_path: string
  public_url: string
  file_name: string
  created_at: string
  authorName: string
}

interface GroupedPhotos {
  label: string
  photos: AlbumPhoto[]
}

interface CellAlbumProps {
  cellId: number
  myUserId: string
  isLeader: boolean
}

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function groupByDate(photos: AlbumPhoto[]): GroupedPhotos[] {
  const map = new Map<string, AlbumPhoto[]>()
  for (const photo of photos) {
    const d = new Date(photo.created_at)
    const label = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
    if (!map.has(label)) map.set(label, [])
    map.get(label)!.push(photo)
  }
  return Array.from(map.entries()).map(([label, photos]) => ({ label, photos }))
}

export default function CellAlbum({ cellId, myUserId, isLeader }: CellAlbumProps) {
  const [photos, setPhotos]               = useState<AlbumPhoto[]>([])
  const [loading, setLoading]             = useState(true)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [uploading, setUploading]         = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError]     = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchPhotos = useCallback(async () => {
    const res = await fetch(`/api/cell/album?cellId=${cellId}`)
    if (res.ok) {
      const json = await res.json()
      setPhotos(json.data ?? [])
    }
    setLoading(false)
  }, [cellId])

  useEffect(() => { fetchPhotos() }, [fetchPhotos])

  // Realtime 구독
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`cell_album:${cellId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cell_album', filter: `cell_id=eq.${cellId}` }, () => { fetchPhotos() })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'cell_album', filter: `cell_id=eq.${cellId}` }, (payload) => {
        const deleted = payload.old as { id: number }
        setPhotos(prev => prev.filter(p => p.id !== deleted.id))
        setLightboxIndex(null)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [cellId, fetchPhotos])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    setUploadError('')
    setUploading(true)
    setUploadProgress(0)

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setUploadError('JPG, PNG, WEBP 파일만 업로드할 수 있습니다.')
        setUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }
      if (file.size > MAX_FILE_SIZE) {
        setUploadError(`${file.name} 파일이 10MB를 초과합니다.`)
        setUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }
    }

    let completed = 0
    for (const file of files) {
      const formData = new FormData()
      formData.append('cellId', String(cellId))
      formData.append('file', file)

      const res = await fetch('/api/cell/album', { method: 'POST', body: formData })
      if (!res.ok) {
        const json = await res.json()
        setUploadError(json.error ?? '업로드 실패')
        setUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }
      completed++
      setUploadProgress(Math.round((completed / files.length) * 100))
    }

    setUploading(false)
    setUploadProgress(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
    fetchPhotos()
  }

  const handleDelete = async (id: number) => {
    if (deleteConfirmId !== id) { setDeleteConfirmId(id); return }
    const res = await fetch(`/api/cell/album?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setPhotos(prev => prev.filter(p => p.id !== id))
      setDeleteConfirmId(null)
      setLightboxIndex(null)
    }
  }

  const openLightbox = (index: number) => { setLightboxIndex(index); setDeleteConfirmId(null) }
  const closeLightbox = () => { setLightboxIndex(null); setDeleteConfirmId(null) }
  const goNext = () => { if (lightboxIndex === null) return; setLightboxIndex((lightboxIndex + 1) % photos.length); setDeleteConfirmId(null) }
  const goPrev = () => { if (lightboxIndex === null) return; setLightboxIndex((lightboxIndex - 1 + photos.length) % photos.length); setDeleteConfirmId(null) }

  const grouped = groupByDate(photos)
  const currentPhoto = lightboxIndex !== null ? photos[lightboxIndex] : null
  const canDeleteCurrent = currentPhoto && (currentPhoto.user_id === myUserId || isLeader)

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  }

  return (
    <div className="w-full space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📷</span>
          <h2 className="text-base font-bold text-amber-400">앨범</h2>
          {photos.length > 0 && (
            <span className="text-xs font-semibold text-slate-400 bg-slate-700 px-2 py-0.5 rounded-full">{photos.length}</span>
          )}
        </div>
        <button
          onClick={() => { setUploadError(''); fileInputRef.current?.click() }}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-bold text-slate-900 bg-amber-400 rounded-xl hover:bg-amber-300 active:scale-95 transition-all shadow-sm disabled:opacity-50"
        >
          📷 사진 추가
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
      </div>

      {/* 업로드 진행 */}
      {uploading && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span style={{ wordBreak: 'keep-all' }}>업로드 중...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-1.5">
            <div className="bg-amber-400 h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      {uploadError && (
        <p className="text-xs text-red-400 font-medium" style={{ wordBreak: 'keep-all' }}>{uploadError}</p>
      )}

      {/* 사진 목록 */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[1, 2, 3, 4].map(i => <div key={i} className="aspect-square bg-slate-700 rounded-xl animate-pulse" />)}
        </div>
      ) : photos.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-12" style={{ wordBreak: 'keep-all' }}>
          아직 사진이 없어요. 첫 번째 사진을 올려보세요! 📸
        </p>
      ) : (
        <div className="space-y-5">
          {grouped.map(({ label, photos: groupPhotos }) => (
            <div key={label}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-amber-400" style={{ wordBreak: 'keep-all' }}>{label}</span>
                <div className="flex-1 h-px bg-slate-700" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {groupPhotos.map(photo => {
                  const globalIdx = photos.indexOf(photo)
                  return (
                    <button
                      key={photo.id}
                      onClick={() => openLightbox(globalIdx)}
                      className="group relative aspect-square rounded-xl overflow-hidden bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.public_url} alt={photo.file_name} className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-end p-2">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-full">
                          <p className="text-white text-xs font-semibold truncate whitespace-nowrap">{photo.authorName}</p>
                          <p className="text-white/70 text-xs">{formatDate(photo.created_at)}</p>
                        </div>
                      </div>
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <span className="text-white text-sm drop-shadow">🔍</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 라이트박스 */}
      {lightboxIndex !== null && currentPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={e => { if (e.target === e.currentTarget) closeLightbox() }}
        >
          <button onClick={closeLightbox} className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl leading-none z-10" aria-label="닫기">✕</button>

          {photos.length > 1 && (
            <button onClick={goPrev} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center text-white/70 hover:text-white bg-black/30 hover:bg-black/60 rounded-full text-2xl" aria-label="이전">‹</button>
          )}

          <div className="flex flex-col items-center max-w-[90vw] max-h-[90vh] gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={currentPhoto.public_url} alt={currentPhoto.file_name} className="max-w-[85vw] max-h-[75vh] object-contain rounded-lg shadow-2xl" />

            <div className="flex items-center gap-3 w-full px-2">
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate whitespace-nowrap">{currentPhoto.authorName}</p>
                <p className="text-white/50 text-xs">{formatDate(currentPhoto.created_at)}</p>
              </div>
              <a href={currentPhoto.public_url} download={currentPhoto.file_name} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors">
                ⬇ 저장
              </a>
              {canDeleteCurrent && (
                deleteConfirmId === currentPhoto.id ? (
                  <div className="flex items-center gap-1">
                    <button onClick={() => setDeleteConfirmId(null)} className="px-2.5 py-1.5 text-xs font-semibold text-slate-300 bg-slate-700 rounded-lg">취소</button>
                    <button onClick={() => handleDelete(currentPhoto.id)} className="px-2.5 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-lg">삭제</button>
                  </div>
                ) : (
                  <button onClick={() => setDeleteConfirmId(currentPhoto.id)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-400 bg-red-950/60 rounded-lg">
                    🗑 삭제
                  </button>
                )
              )}
            </div>

            {photos.length > 1 && (
              <p className="text-white/40 text-xs">{lightboxIndex + 1} / {photos.length}</p>
            )}
          </div>

          {photos.length > 1 && (
            <button onClick={goNext} className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center text-white/70 hover:text-white bg-black/30 hover:bg-black/60 rounded-full text-2xl" aria-label="다음">›</button>
          )}
        </div>
      )}
    </div>
  )
}
