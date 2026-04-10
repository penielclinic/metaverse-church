'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAvatarStore } from '@/store/avatarStore'
import AvatarPreview from '@/components/world/AvatarPreview'

type SkinTone = 'light' | 'medium' | 'tan' | 'dark'
type HairStyle = 'short' | 'long' | 'curly' | 'bald' | 'ponytail'
type Outfit = 'casual' | 'formal' | 'hanbok' | 'worship_team' | 'pastor'

const SKIN_OPTIONS: { value: SkinTone; label: string; color: string }[] = [
  { value: 'light',  label: '밝은',   color: '#FDDBB4' },
  { value: 'medium', label: '보통',   color: '#F0C27F' },
  { value: 'tan',    label: '구릿빛', color: '#D4915A' },
  { value: 'dark',   label: '어두운', color: '#8D5524' },
]

const HAIR_OPTIONS: { value: HairStyle; label: string; emoji: string }[] = [
  { value: 'short',    label: '단발',   emoji: '💇' },
  { value: 'long',     label: '장발',   emoji: '👩' },
  { value: 'curly',    label: '곱슬',   emoji: '🌀' },
  { value: 'bald',     label: '민머리', emoji: '🧑‍🦲' },
  { value: 'ponytail', label: '묶음',   emoji: '🎀' },
]

const OUTFIT_OPTIONS: { value: Outfit; label: string; emoji: string }[] = [
  { value: 'casual',       label: '캐주얼',   emoji: '👕' },
  { value: 'formal',       label: '정장',     emoji: '👔' },
  { value: 'hanbok',       label: '한복',     emoji: '🎎' },
  { value: 'worship_team', label: '찬양팀',   emoji: '🎵' },
  { value: 'pastor',       label: '목사',     emoji: '✝️' },
]

function AvatarPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isNew = searchParams.get('new') === 'true'

  const { setAvatar } = useAvatarStore()

  const [skinTone, setSkinTone] = useState<SkinTone>('medium')
  const [hairStyle, setHairStyle] = useState<HairStyle>('short')
  const [outfit, setOutfit] = useState<Outfit>('casual')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 기존 아바타 불러오기
  useEffect(() => {
    async function load() {
      const res = await fetch('/api/avatar')
      if (res.ok) {
        const { avatar } = await res.json()
        if (avatar) {
          setSkinTone(avatar.skin_tone)
          setHairStyle(avatar.hair_style)
          setOutfit(avatar.outfit)
        }
      }
    }
    if (!isNew) load()
  }, [isNew])

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skin_tone: skinTone, hair_style: hairStyle, outfit }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? '저장 실패')
        return
      }
      // zustand 업데이트
      setAvatar({ skinTone, hairStyle, outfit })
      router.push('/world')
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white px-4 py-8 flex flex-col items-center">
      <div className="w-full max-w-md">

        {/* 헤더 */}
        <div className="text-center mb-6">
          <h1
            className="text-2xl font-bold text-gray-800"
            style={{ wordBreak: 'keep-all' }}
          >
            {isNew ? '아바타를 만들어보세요 👋' : '아바타 꾸미기'}
          </h1>
          {isNew && (
            <p
              className="mt-1 text-sm text-gray-500"
              style={{ wordBreak: 'keep-all' }}
            >
              이음 메타버스에서 나를 대표할 아바타를 선택해주세요
            </p>
          )}
        </div>

        {/* 미리보기 */}
        <div className="flex justify-center mb-6">
          <div className="w-32 h-32 rounded-full bg-indigo-100 flex items-center justify-center shadow-inner">
            <AvatarPreview
              skinTone={skinTone}
              hairStyle={hairStyle}
              outfit={outfit}
              size={100}
            />
          </div>
        </div>

        {/* 옵션 카드 */}
        <div className="space-y-5">

          {/* 피부색 */}
          <section>
            <h2 className="text-sm font-semibold text-gray-600 mb-2">피부색</h2>
            <div className="flex gap-3">
              {SKIN_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSkinTone(opt.value)}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border-2 transition-all ${
                    skinTone === opt.value
                      ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                      : 'border-gray-200 bg-white'
                  }`}
                  style={{ minWidth: 60 }}
                >
                  <span
                    className="w-8 h-8 rounded-full border border-gray-300"
                    style={{ background: opt.color }}
                  />
                  <span className="text-xs text-gray-600 whitespace-nowrap">{opt.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* 헤어스타일 */}
          <section>
            <h2 className="text-sm font-semibold text-gray-600 mb-2">헤어스타일</h2>
            <div className="flex flex-wrap gap-2">
              {HAIR_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setHairStyle(opt.value)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 transition-all text-sm ${
                    hairStyle === opt.value
                      ? 'border-indigo-500 bg-indigo-50 font-semibold shadow-sm'
                      : 'border-gray-200 bg-white text-gray-600'
                  }`}
                >
                  <span>{opt.emoji}</span>
                  <span className="whitespace-nowrap">{opt.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* 옷차림 */}
          <section>
            <h2 className="text-sm font-semibold text-gray-600 mb-2">옷차림</h2>
            <div className="flex flex-wrap gap-2">
              {OUTFIT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setOutfit(opt.value)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 transition-all text-sm ${
                    outfit === opt.value
                      ? 'border-indigo-500 bg-indigo-50 font-semibold shadow-sm'
                      : 'border-gray-200 bg-white text-gray-600'
                  }`}
                >
                  <span>{opt.emoji}</span>
                  <span className="whitespace-nowrap">{opt.label}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* 에러 */}
        {error && (
          <p className="mt-4 text-sm text-red-500 text-center" style={{ wordBreak: 'keep-all' }}>
            {error}
          </p>
        )}

        {/* 저장 버튼 */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-8 w-full py-4 rounded-2xl bg-indigo-600 text-white text-base font-bold
                     active:scale-95 transition-all disabled:opacity-50 shadow-md"
        >
          {saving ? '저장 중...' : isNew ? '아바타 완성! 메타버스 입장 →' : '저장하기'}
        </button>

        {/* 신규 유저가 아닌 경우 취소 */}
        {!isNew && (
          <button
            onClick={() => router.back()}
            className="mt-3 w-full py-3 rounded-2xl border border-gray-300 text-gray-600 text-sm"
          >
            취소
          </button>
        )}
      </div>
    </div>
  )
}

export default function AvatarPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-50 to-white">
        <span className="text-gray-400 text-sm">불러오는 중...</span>
      </div>
    }>
      <AvatarPageContent />
    </Suspense>
  )
}
