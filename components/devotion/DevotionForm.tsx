'use client'

import { useState } from 'react'

interface DevotionFormProps {
  streak: number
  onSubmit: (bibleRef: string, content: string) => Promise<void>
  loading: boolean
}

export default function DevotionForm({ streak, onSubmit, loading }: DevotionFormProps) {
  const [bibleRef, setBibleRef] = useState('')
  const [content, setContent] = useState('')

  const isValid = bibleRef.trim().length > 0 && content.trim().length >= 20

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid || loading) return
    await onSubmit(bibleRef.trim(), content.trim())
    setBibleRef('')
    setContent('')
  }

  const nextMilestone = Math.ceil((streak + 1) / 7) * 7
  const daysToMilestone = nextMilestone - streak

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-indigo-100 rounded-2xl shadow-sm p-4 space-y-3"
    >
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-bold text-gray-800 text-base">📖 오늘의 큐티 인증</h3>
          <p className="text-xs text-gray-400 mt-0.5" style={{ wordBreak: 'keep-all' }}>
            말씀을 묵상하고 셀원들과 나눠요
          </p>
        </div>
        {streak > 0 && (
          <div className="flex-shrink-0 text-right">
            <p className="text-base font-black text-orange-500 leading-none">
              🔥 {streak}일
            </p>
            <p className="text-[10px] text-orange-300 whitespace-nowrap">
              {daysToMilestone}일 후 보너스 EXP
            </p>
          </div>
        )}
      </div>

      {/* 성경 본문 */}
      <div>
        <label className="text-xs font-semibold text-gray-500 block mb-1">
          성경 본문 <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={bibleRef}
          onChange={(e) => setBibleRef(e.target.value)}
          placeholder="예) 요한복음 3:16  /  시편 23편"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
          maxLength={50}
          required
        />
      </div>

      {/* 묵상 내용 */}
      <div>
        <label className="text-xs font-semibold text-gray-500 block mb-1">
          묵상 내용
          <span
            className={`ml-1.5 font-bold ${
              content.trim().length === 0
                ? 'text-gray-300'
                : content.trim().length < 20
                ? 'text-red-400'
                : 'text-green-500'
            }`}
          >
            {content.trim().length}/20자 이상
          </span>
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="오늘 말씀을 통해 받은 은혜, 깨달음, 결단이나 기도를 자유롭게 나눠주세요."
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition resize-none"
          rows={4}
          maxLength={1000}
          required
        />
        <p className="text-right text-[11px] text-gray-300 mt-0.5">
          {content.length} / 1000
        </p>
      </div>

      {/* 제출 버튼 */}
      <button
        type="submit"
        disabled={!isValid || loading}
        className={[
          'w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95',
          isValid && !loading
            ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed',
        ].join(' ')}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            저장 중...
          </span>
        ) : (
          '큐티 인증하기  +20 EXP'
        )}
      </button>
    </form>
  )
}
