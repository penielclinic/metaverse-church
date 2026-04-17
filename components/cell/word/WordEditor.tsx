'use client'

import { useState } from 'react'

interface Question {
  id: number
  text: string
}

interface WordBoardData {
  id: number
  cell_id: number
  bible_ref: string
  bible_text: string
  questions: Question[]
  updated_at: string
  profiles: { name: string } | null
}

interface WordEditorProps {
  cellId: number
  initial: WordBoardData | null
  onSaved: (data: WordBoardData) => void
  onCancel: () => void
}

export default function WordEditor({ cellId, initial, onSaved, onCancel }: WordEditorProps) {
  const [bibleRef, setBibleRef] = useState(initial?.bible_ref ?? '')
  const [bibleText, setBibleText] = useState(initial?.bible_text ?? '')
  const [questions, setQuestions] = useState<Question[]>(
    initial?.questions ?? []
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const addQuestion = () => {
    if (questions.length >= 5) return
    const nextId = questions.length > 0 ? Math.max(...questions.map((q) => q.id)) + 1 : 1
    setQuestions((prev) => [...prev, { id: nextId, text: '' }])
  }

  const updateQuestion = (id: number, text: string) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, text } : q)))
  }

  const removeQuestion = (id: number) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id))
  }

  const handleSave = async () => {
    setError('')
    if (!bibleRef.trim()) {
      setError('성경 본문을 입력해주세요. (예: 요한복음 3:16)')
      return
    }

    const validQuestions = questions.filter((q) => q.text.trim())

    setSaving(true)
    try {
      const res = await fetch('/api/cell/word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cellId,
          bibleRef: bibleRef.trim(),
          bibleText: bibleText.trim(),
          questions: validQuestions,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? '저장 실패')
        return
      }

      onSaved(json.data)
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full bg-amber-50 border border-amber-300 rounded-2xl shadow-sm overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-5 py-3 bg-amber-100 border-b border-amber-200">
        <span className="text-lg">✏️</span>
        <h2 className="text-sm font-bold text-amber-900">말씀 수정</h2>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* 성경 본문 참조 */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-amber-800">
            성경 본문 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={bibleRef}
            onChange={(e) => setBibleRef(e.target.value)}
            placeholder="예: 요한복음 3:16"
            maxLength={100}
            className="w-full px-3 py-2.5 text-sm border border-amber-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder-amber-300"
          />
        </div>

        {/* 말씀 내용 */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-amber-800">말씀 내용</label>
          <textarea
            value={bibleText}
            onChange={(e) => setBibleText(e.target.value)}
            placeholder="성경 본문 내용을 입력해주세요."
            rows={3}
            maxLength={1000}
            className="w-full px-3 py-2.5 text-sm border border-amber-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder-amber-300 resize-none"
          />
        </div>

        {/* 나눔 질문 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-amber-800">
              나눔 질문 ({questions.length}/5)
            </label>
            {questions.length < 5 && (
              <button
                onClick={addQuestion}
                className="text-xs text-amber-700 font-semibold hover:text-amber-900 flex items-center gap-1"
              >
                <span className="text-base leading-none">+</span> 질문 추가
              </button>
            )}
          </div>

          <div className="space-y-2">
            {questions.map((q, i) => (
              <div key={q.id} className="flex items-start gap-2">
                <span className="flex-shrink-0 mt-2.5 w-5 h-5 rounded-full bg-amber-200 text-amber-800 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <input
                  type="text"
                  value={q.text}
                  onChange={(e) => updateQuestion(q.id, e.target.value)}
                  placeholder={`나눔 질문 ${i + 1}`}
                  maxLength={200}
                  className="flex-1 px-3 py-2 text-sm border border-amber-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder-amber-300"
                />
                <button
                  onClick={() => removeQuestion(q.id)}
                  aria-label="질문 삭제"
                  className="mt-2 text-amber-400 hover:text-red-500 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 에러 */}
        {error && (
          <p className="text-xs text-red-500 font-medium" style={{ wordBreak: 'keep-all' }}>
            {error}
          </p>
        )}

        {/* 버튼 */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex-1 py-2.5 text-sm font-semibold text-amber-700 bg-amber-100 rounded-xl hover:bg-amber-200 transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-amber-600 rounded-xl hover:bg-amber-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-wait"
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
