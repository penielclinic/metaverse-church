'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type Category = 'all' | 'clothes' | 'books' | 'food' | 'talent' | 'etc'
type ItemType = 'all' | 'free' | 'barter' | 'sale'
type ItemStatus = 'active' | 'reserved' | 'done'

interface SharingItem {
  id: number
  userId: string
  authorName: string
  title: string
  description: string | null
  category: string
  type: string
  price: number | null
  contact: string | null
  status: ItemStatus
  createdAt: string
}

const CATEGORY_LABEL: Record<string, string> = {
  clothes: '의류·잡화',
  books: '도서·문구',
  food: '식품·생활',
  talent: '재능나눔',
  etc: '기타',
}
const CATEGORY_EMOJI: Record<string, string> = {
  clothes: '👗',
  books: '📚',
  food: '🍱',
  talent: '✨',
  etc: '📦',
}
const TYPE_LABEL: Record<string, string> = {
  free: '무료나눔',
  barter: '물물교환',
  sale: '저가판매',
}
const TYPE_COLOR: Record<string, string> = {
  free: 'bg-green-100 text-green-700',
  barter: 'bg-blue-100 text-blue-700',
  sale: 'bg-amber-100 text-amber-700',
}
const STATUS_LABEL: Record<ItemStatus, string> = {
  active: '나눔 중',
  reserved: '예약됨',
  done: '완료',
}

const CATEGORIES: { value: Category; label: string; emoji: string }[] = [
  { value: 'all', label: '전체', emoji: '🛍️' },
  { value: 'clothes', label: '의류·잡화', emoji: '👗' },
  { value: 'books', label: '도서·문구', emoji: '📚' },
  { value: 'food', label: '식품·생활', emoji: '🍱' },
  { value: 'talent', label: '재능나눔', emoji: '✨' },
  { value: 'etc', label: '기타', emoji: '📦' },
]

const ITEM_TYPES: { value: ItemType; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'free', label: '무료나눔' },
  { value: 'barter', label: '물물교환' },
  { value: 'sale', label: '저가판매' },
]

type DbItem = {
  id: number
  user_id: string
  title: string
  description: string | null
  category: string
  type: string
  price: number | null
  contact: string | null
  status: ItemStatus
  created_at: string
  profiles: { name: string } | null
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '방금 전'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}일 전`
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

export default function MarketPage() {
  const supabase = createClient()
  const [items, setItems] = useState<SharingItem[]>([])
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<Category>('all')
  const [itemType, setItemType] = useState<ItemType>('all')
  const [showDone, setShowDone] = useState(false)

  // 작성 모달
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'etc' as Exclude<Category, 'all'>,
    type: 'free' as Exclude<ItemType, 'all'>,
    price: '',
    contact: '',
  })
  const [submitting, setSubmitting] = useState(false)

  // 상세 보기
  const [detail, setDetail] = useState<SharingItem | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = supabase
      .from('sharing_items')
      .select('id, user_id, title, description, category, type, price, contact, status, created_at, profiles(name)')
      .order('created_at', { ascending: false })
      .limit(60)

    if (!showDone) q = q.neq('status', 'done')
    if (category !== 'all') q = q.eq('category', category)
    if (itemType !== 'all') q = q.eq('type', itemType)

    const { data } = await q
    setItems(
      (data ?? []).map((d: DbItem) => ({
        id: d.id,
        userId: d.user_id,
        authorName: d.profiles?.name ?? '성도',
        title: d.title,
        description: d.description,
        category: d.category,
        type: d.type,
        price: d.price,
        contact: d.contact,
        status: d.status,
        createdAt: d.created_at,
      }))
    )
    setLoading(false)
  }, [supabase, category, itemType, showDone])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setMyUserId(user?.id ?? null))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { load() }, [load])

  const handleSubmit = async () => {
    if (!form.title.trim() || !myUserId) return
    setSubmitting(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('sharing_items') as any).insert({
      user_id: myUserId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category,
      type: form.type,
      price: form.type === 'sale' && form.price ? Number(form.price) : null,
      contact: form.contact.trim() || null,
    })
    setSubmitting(false)
    setShowModal(false)
    setForm({ title: '', description: '', category: 'etc', type: 'free', price: '', contact: '' })
    load()
  }

  const updateStatus = async (id: number, status: ItemStatus) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('sharing_items') as any).update({ status }).eq('id', id)
    setDetail(null)
    load()
  }

  const deleteItem = async (id: number) => {
    if (!confirm('삭제할까요?')) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('sharing_items') as any).delete().eq('id', id)
    setDetail(null)
    load()
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gray-50 pb-24">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-100 px-4 pt-6 pb-4">
        <h1 className="text-xl font-bold text-gray-800">🛍️ 나눔장터</h1>
        <p className="text-sm text-gray-500 mt-0.5" style={{ wordBreak: 'keep-all' }}>
          성도들이 나누는 물품·재능 나눔 장터예요
        </p>

        {/* 타입 필터 탭 */}
        <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide pb-0.5">
          {ITEM_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setItemType(t.value)}
              className={[
                'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap',
                itemType === t.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 카테고리 필터 */}
        <div className="flex gap-2 mt-2 overflow-x-auto scrollbar-hide pb-0.5">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={[
                'flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap',
                category === c.value
                  ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300',
              ].join(' ')}
            >
              <span>{c.emoji}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>

        {/* 완료 포함 토글 */}
        <label className="flex items-center gap-1.5 mt-2 cursor-pointer select-none w-fit">
          <input
            type="checkbox"
            className="w-4 h-4 accent-indigo-600"
            checked={showDone}
            onChange={(e) => setShowDone(e.target.checked)}
          />
          <span className="text-xs text-gray-500">완료된 나눔도 보기</span>
        </label>
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* 목록 */}
      {!loading && (
        <div className="px-4 pt-4">
          {items.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <div className="text-4xl mb-3">🛍️</div>
              <p className="text-sm" style={{ wordBreak: 'keep-all' }}>
                아직 등록된 나눔이 없어요.<br />첫 번째로 나눔을 등록해보세요!
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => setDetail(item)}
                className={[
                  'text-left bg-white rounded-2xl border border-gray-200 shadow-sm p-3.5 transition-all hover:shadow-md active:scale-[0.98]',
                  item.status !== 'active' ? 'opacity-60' : '',
                ].join(' ')}
              >
                {/* 카테고리 이모지 + 상태 */}
                <div className="flex items-start justify-between gap-1 mb-2">
                  <span className="text-2xl leading-none">
                    {CATEGORY_EMOJI[item.category] ?? '📦'}
                  </span>
                  {item.status !== 'active' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-500 whitespace-nowrap">
                      {STATUS_LABEL[item.status]}
                    </span>
                  )}
                </div>

                {/* 제목 */}
                <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2 mb-2" style={{ wordBreak: 'keep-all' }}>
                  {item.title}
                </p>

                {/* 타입 + 가격 */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={['text-[10px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap', TYPE_COLOR[item.type] ?? 'bg-gray-100 text-gray-600'].join(' ')}>
                    {TYPE_LABEL[item.type] ?? item.type}
                  </span>
                  {item.type === 'sale' && item.price != null && (
                    <span className="text-xs font-bold text-amber-600 whitespace-nowrap">
                      {item.price.toLocaleString()}원
                    </span>
                  )}
                </div>

                {/* 작성자 + 시간 */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                  <span className="text-[10px] text-gray-400 whitespace-nowrap truncate">{item.authorName}</span>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap ml-1">{timeAgo(item.createdAt)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 플로팅 작성 버튼 */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-20 right-5 md:bottom-6 z-40 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold px-5 py-3 rounded-full shadow-lg transition-all min-h-[48px]"
      >
        <span className="text-lg leading-none">+</span>
        <span className="whitespace-nowrap">나눔 등록</span>
      </button>

      {/* 상세 보기 모달 */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5">
            {/* 카테고리 + 타입 */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-3xl">{CATEGORY_EMOJI[detail.category] ?? '📦'}</span>
              <div>
                <span className={['text-xs px-2 py-0.5 rounded-full font-semibold', TYPE_COLOR[detail.type] ?? 'bg-gray-100 text-gray-600'].join(' ')}>
                  {TYPE_LABEL[detail.type] ?? detail.type}
                </span>
                <span className="ml-1.5 text-xs text-gray-400">{CATEGORY_LABEL[detail.category] ?? detail.category}</span>
              </div>
              {detail.status !== 'active' && (
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-500">
                  {STATUS_LABEL[detail.status]}
                </span>
              )}
            </div>

            {/* 제목 */}
            <h2 className="text-base font-bold text-gray-800 mb-2" style={{ wordBreak: 'keep-all' }}>
              {detail.title}
            </h2>

            {/* 설명 */}
            {detail.description && (
              <p className="text-sm text-gray-600 mb-3 leading-relaxed" style={{ wordBreak: 'keep-all' }}>
                {detail.description}
              </p>
            )}

            {/* 가격 */}
            {detail.type === 'sale' && detail.price != null && (
              <p className="text-base font-bold text-amber-600 mb-3">
                {detail.price.toLocaleString()}원
              </p>
            )}

            {/* 연락처 */}
            {detail.contact && (
              <div className="bg-indigo-50 rounded-xl px-3 py-2 mb-3">
                <p className="text-xs text-indigo-500 font-semibold mb-0.5">연락처</p>
                <p className="text-sm text-indigo-800 font-medium">{detail.contact}</p>
              </div>
            )}

            {/* 작성자 + 날짜 */}
            <p className="text-xs text-gray-400 mb-4">
              {detail.authorName} · {timeAgo(detail.createdAt)}
            </p>

            {/* 내 글이면 상태 변경 / 삭제 */}
            {detail.userId === myUserId && (
              <div className="flex gap-2 mb-3">
                {detail.status === 'active' && (
                  <button
                    onClick={() => updateStatus(detail.id, 'reserved')}
                    className="flex-1 py-2 rounded-xl border border-blue-300 text-blue-600 text-sm font-semibold min-h-[44px]"
                  >
                    예약됨으로
                  </button>
                )}
                {(detail.status === 'active' || detail.status === 'reserved') && (
                  <button
                    onClick={() => updateStatus(detail.id, 'done')}
                    className="flex-1 py-2 rounded-xl border border-green-300 text-green-600 text-sm font-semibold min-h-[44px]"
                  >
                    나눔 완료
                  </button>
                )}
                <button
                  onClick={() => deleteItem(detail.id)}
                  className="px-4 py-2 rounded-xl border border-red-200 text-red-500 text-sm min-h-[44px]"
                >
                  삭제
                </button>
              </div>
            )}

            <button
              onClick={() => setDetail(null)}
              className="w-full py-3 rounded-xl border border-gray-300 text-sm text-gray-600 min-h-[44px]"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 등록 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-bold text-gray-800 mb-4">나눔 등록</h2>

            {/* 나눔 타입 */}
            <label className="block text-xs font-semibold text-gray-600 mb-1">나눔 종류</label>
            <div className="flex gap-2 mb-3">
              {(['free', 'barter', 'sale'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setForm({ ...form, type: t })}
                  className={[
                    'flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors min-h-[44px]',
                    form.type === t
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-gray-200 text-gray-600',
                  ].join(' ')}
                >
                  {TYPE_LABEL[t]}
                </button>
              ))}
            </div>

            {/* 카테고리 */}
            <label className="block text-xs font-semibold text-gray-600 mb-1">카테고리</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as Exclude<Category, 'all'> })}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              {CATEGORIES.filter((c) => c.value !== 'all').map((c) => (
                <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
              ))}
            </select>

            {/* 제목 */}
            <label className="block text-xs font-semibold text-gray-600 mb-1">제목 *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="예: 아기 옷 0-6개월 나눔합니다"
              maxLength={50}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />

            {/* 설명 */}
            <label className="block text-xs font-semibold text-gray-600 mb-1">상세 설명</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="물품 상태, 수량, 전달 방법 등을 적어주세요"
              rows={3}
              maxLength={300}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm mb-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />

            {/* 가격 (sale만) */}
            {form.type === 'sale' && (
              <>
                <label className="block text-xs font-semibold text-gray-600 mb-1">가격 (원)</label>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="0"
                  min={0}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </>
            )}

            {/* 연락처 */}
            <label className="block text-xs font-semibold text-gray-600 mb-1">연락처 (선택)</label>
            <input
              type="text"
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
              placeholder="카카오 ID 또는 전화번호"
              maxLength={50}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl border border-gray-300 text-sm text-gray-600 min-h-[44px]"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.title.trim() || !myUserId || submitting}
                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-40 min-h-[44px]"
              >
                {submitting ? '등록 중...' : '등록하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
