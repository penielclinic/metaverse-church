'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

type Tag = 'all' | 'worship' | 'event' | 'mission' | 'youth' | 'daily'

const TAG_LABEL: Record<Tag, string> = {
  all:     '전체',
  worship: '예배',
  event:   '행사',
  mission: '선교',
  youth:   '청년부',
  daily:   '일상',
}

const TAG_COLOR: Record<string, string> = {
  worship: 'bg-purple-100 text-purple-700',
  event:   'bg-blue-100   text-blue-700',
  mission: 'bg-green-100  text-green-700',
  youth:   'bg-orange-100 text-orange-700',
  daily:   'bg-gray-100   text-gray-600',
}

const TAGS: Tag[] = ['all', 'worship', 'event', 'mission', 'youth', 'daily']

interface GalleryPhoto {
  id:         number
  userId:     string
  title:      string
  tag:        string
  publicUrl:  string
  createdAt:  string
  authorName: string
}

export default function GalleryPage() {
  const supabase = createClient()
  const [photos, setPhotos]         = useState<GalleryPhoto[]>([])
  const [loading, setLoading]       = useState(true)
  const [myUserId, setMyUserId]     = useState<string | null>(null)
  const [myRole, setMyRole]         = useState<string>('')
  const [activeTag, setActiveTag]   = useState<Tag>('all')
  const [lightbox, setLightbox]     = useState<GalleryPhoto | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading]   = useState(false)
  const [deleting, setDeleting]     = useState<number | null>(null)
  const [form, setForm]             = useState({ title: '', tag: 'worship' as Exclude<Tag, 'all'> })
  const [preview, setPreview]       = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setMyUserId(user?.id ?? null)
      if (user) {
        supabase.from('profiles').select('role').eq('id', user.id).single()
          .then(({ data }) => setMyRole(data?.role ?? ''))
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const load = useCallback(async (tag: Tag = activeTag) => {
    setLoading(true)
    const res = await fetch(`/api/gallery?tag=${tag}`)
    const json = await res.json()
    setPhotos(json.data ?? [])
    setLoading(false)
  }, [activeTag])

  useEffect(() => { load() }, [load])

  const handleTagChange = (tag: Tag) => {
    setActiveTag(tag)
    load(tag)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreview(url)
  }

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) { alert('사진을 선택해주세요.'); return }
    if (!form.title.trim()) { alert('제목을 입력해주세요.'); return }

    setUploading(true)
    const fd = new FormData()
    fd.append('title', form.title.trim())
    fd.append('tag', form.tag)
    fd.append('file', file)

    const res = await fetch('/api/gallery', { method: 'POST', body: fd })
    const json = await res.json()
    setUploading(false)

    if (!res.ok) { alert(json.error ?? '업로드 실패'); return }

    setShowUpload(false)
    setForm({ title: '', tag: 'worship' })
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
    load(activeTag)
  }

  const handleDelete = async (photo: GalleryPhoto) => {
    if (!confirm(`"${photo.title}" 사진을 삭제할까요?`)) return
    setDeleting(photo.id)
    const res = await fetch(`/api/gallery?id=${photo.id}`, { method: 'DELETE' })
    const json = await res.json()
    setDeleting(null)
    if (!res.ok) { alert(json.error ?? '삭제 실패'); return }
    setPhotos(prev => prev.filter(p => p.id !== photo.id))
    if (lightbox?.id === photo.id) setLightbox(null)
  }

  const canDelete = (photo: GalleryPhoto) =>
    photo.userId === myUserId || myRole === 'pastor'

  const closeUpload = () => {
    setShowUpload(false)
    setForm({ title: '', tag: 'worship' })
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="pb-24 min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <h1 className="text-lg font-bold text-gray-800 mb-2">🖼️ 갤러리</h1>
        {/* 태그 필터 */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => handleTagChange(tag)}
              className={[
                'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap',
                activeTag === tag
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              ].join(' ')}
            >
              {TAG_LABEL[tag]}
            </button>
          ))}
        </div>
      </div>

      {/* 사진 그리드 */}
      <div className="px-3 pt-3">
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && photos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <span className="text-4xl mb-3">📷</span>
            <p className="text-sm" style={{ wordBreak: 'keep-all' }}>
              아직 사진이 없어요. 첫 번째 추억을 올려보세요!
            </p>
          </div>
        )}

        {!loading && photos.length > 0 && (
          <div className="columns-2 sm:columns-3 gap-2 space-y-2">
            {photos.map(photo => (
              <div
                key={photo.id}
                className="break-inside-avoid rounded-xl overflow-hidden bg-white shadow-sm cursor-pointer group relative"
                onClick={() => setLightbox(photo)}
              >
                <div className="relative w-full">
                  <Image
                    src={photo.publicUrl}
                    alt={photo.title}
                    width={400}
                    height={300}
                    className="w-full h-auto object-cover"
                    unoptimized
                  />
                </div>
                <div className="p-2">
                  <p className="text-xs font-semibold text-gray-800 leading-snug line-clamp-2" style={{ wordBreak: 'keep-all' }}>
                    {photo.title}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className={['text-[10px] font-semibold px-1.5 py-0.5 rounded-full', TAG_COLOR[photo.tag] ?? 'bg-gray-100 text-gray-500'].join(' ')}>
                      {TAG_LABEL[photo.tag as Tag] ?? photo.tag}
                    </span>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">{photo.authorName}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowUpload(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl z-20 active:scale-95 transition-transform"
        aria-label="사진 올리기"
      >
        📷
      </button>

      {/* ── 업로드 모달 ── */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4 sm:pb-0">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5">
            <h2 className="text-base font-bold text-gray-800 mb-4">사진 올리기</h2>

            {/* 이미지 선택 */}
            <div
              className="relative w-full h-40 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center mb-4 overflow-hidden cursor-pointer bg-gray-50"
              onClick={() => fileRef.current?.click()}
            >
              {preview ? (
                <Image src={preview} alt="미리보기" fill className="object-cover" unoptimized />
              ) : (
                <div className="text-center text-gray-400">
                  <div className="text-3xl mb-1">📷</div>
                  <p className="text-xs">탭하여 사진 선택</p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* 제목 */}
            <label className="block text-xs font-semibold text-gray-600 mb-1">제목 <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="사진 제목을 입력해주세요"
              maxLength={40}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />

            {/* 태그 */}
            <label className="block text-xs font-semibold text-gray-600 mb-2">태그 <span className="text-red-400">*</span></label>
            <div className="flex flex-wrap gap-2 mb-4">
              {(Object.keys(TAG_LABEL) as Tag[]).filter(t => t !== 'all').map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, tag: tag as Exclude<Tag, 'all'> }))}
                  className={[
                    'px-3 py-1.5 rounded-full text-xs font-semibold transition-colors',
                    form.tag === tag ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600',
                  ].join(' ')}
                >
                  {TAG_LABEL[tag]}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={closeUpload}
                className="flex-1 py-3 rounded-xl border border-gray-300 text-sm text-gray-600 min-h-[44px]"
              >
                취소
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50 min-h-[44px]"
              >
                {uploading ? '올리는 중...' : '올리기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 라이트박스 ── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/90"
          onClick={() => setLightbox(null)}
        >
          {/* 상단 정보 */}
          <div
            className="flex items-center justify-between px-4 py-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate" style={{ wordBreak: 'keep-all' }}>
                {lightbox.title}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={['text-[10px] font-semibold px-1.5 py-0.5 rounded-full', TAG_COLOR[lightbox.tag] ?? 'bg-gray-100 text-gray-500'].join(' ')}>
                  {TAG_LABEL[lightbox.tag as Tag] ?? lightbox.tag}
                </span>
                <span className="text-xs text-gray-400 whitespace-nowrap">{lightbox.authorName}</span>
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {new Date(lightbox.createdAt).toLocaleDateString('ko-KR')}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              {canDelete(lightbox) && (
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(lightbox) }}
                  disabled={deleting === lightbox.id}
                  className="text-xs px-3 py-1.5 rounded-full bg-red-500/80 text-white disabled:opacity-50"
                >
                  {deleting === lightbox.id ? '삭제 중' : '삭제'}
                </button>
              )}
              <button
                onClick={() => setLightbox(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white text-lg"
              >
                ×
              </button>
            </div>
          </div>

          {/* 이미지 */}
          <div className="flex-1 flex items-center justify-center px-4 pb-8">
            <div className="relative w-full max-w-lg max-h-[70vh]">
              <Image
                src={lightbox.publicUrl}
                alt={lightbox.title}
                width={800}
                height={600}
                className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
                unoptimized
                onClick={e => e.stopPropagation()}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
