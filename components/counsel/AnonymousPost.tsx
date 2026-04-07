'use client'

import { useState } from 'react'

const CATEGORIES = [
  { value: 'general', label: '일반' },
  { value: 'faith', label: '신앙' },
  { value: 'family', label: '가정' },
  { value: 'relationship', label: '관계' },
  { value: 'career', label: '직업/진로' },
  { value: 'health', label: '건강' },
] as const

type Category = (typeof CATEGORIES)[number]['value']

interface Props {
  onClose: () => void
  onSuccess: () => void
}

export default function AnonymousPost({ onClose, onSuccess }: Props) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<Category>('general')
  const [isAnonymous, setIsAnonymous] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      setError('제목과 내용을 모두 입력해주세요.')
      return
    }
    setError('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/counsel/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, category, is_anonymous: isAnonymous }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? '제출 중 오류가 발생했습니다.')
        return
      }

      onSuccess()
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-lg font-bold text-gray-800"
            style={{ wordBreak: 'keep-all' }}
          >
            고민 올리기
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="닫기"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 익명 토글 */}
        <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-xl">
          <div>
            <p className="text-sm font-medium text-gray-700">
              {isAnonymous ? '익명으로 올리기' : '실명으로 올리기'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5" style={{ wordBreak: 'keep-all' }}>
              {isAnonymous
                ? '교역자에게만 실명이 공개됩니다'
                : '내 이름이 목록에 표시됩니다'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAnonymous((v) => !v)}
            className={[
              'relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0',
              isAnonymous ? 'bg-indigo-500' : 'bg-gray-300',
            ].join(' ')}
            aria-pressed={isAnonymous}
          >
            <span
              className={[
                'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200',
                isAnonymous ? 'translate-x-6' : 'translate-x-0',
              ].join(' ')}
            />
          </button>
        </div>

        {/* 카테고리 */}
        <div className="mb-3">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
            분류
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={[
                  'px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap',
                  category === cat.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                ].join(' ')}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* 제목 */}
        <input
          type="text"
          placeholder="제목을 입력하세요 (최대 50자)"
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 50))}
          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />

        {/* 내용 */}
        <textarea
          placeholder="고민을 자유롭게 적어주세요. 교역자가 응답해 드립니다. (최대 500자)"
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, 500))}
          rows={5}
          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
          style={{ wordBreak: 'keep-all' }}
        />
        <div className="flex justify-between items-center mb-3">
          {error ? (
            <p className="text-xs text-red-500" style={{ wordBreak: 'keep-all' }}>{error}</p>
          ) : (
            <span />
          )}
          <span className="text-xs text-gray-400 ml-auto">{content.length}/500</span>
        </div>

        {/* 버튼 */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !title.trim() || !content.trim()}
            className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? '제출 중…' : '제출하기'}
          </button>
        </div>
      </div>
    </div>
  )
}
