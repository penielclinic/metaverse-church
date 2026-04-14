'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAvatarStore } from '@/store/avatarStore'
import AvatarPreview, {
  MALE_HAIR_OPTIONS, FEMALE_HAIR_OPTIONS,
  type SkinTone, type Gender, type Outfit,
} from '@/components/world/AvatarPreview'

const SKIN_OPTIONS: { value: SkinTone; label: string; color: string }[] = [
  { value: 'light',  label: '밝은',   color: '#FDDBB4' },
  { value: 'medium', label: '보통',   color: '#F0C27F' },
  { value: 'tan',    label: '구릿빛', color: '#D4915A' },
  { value: 'dark',   label: '어두운', color: '#8D5524' },
]

const OUTFIT_OPTIONS: { value: Outfit; label: string; emoji: string }[] = [
  { value: 'casual',       label: '캐주얼', emoji: '👕' },
  { value: 'formal',       label: '정장',   emoji: '👔' },
  { value: 'hanbok',       label: '한복',   emoji: '🎎' },
  { value: 'worship_team', label: '찬양팀', emoji: '🎵' },
  { value: 'pastor',       label: '목사 가운', emoji: '✝️' },
]

const TITLE_OPTIONS = [
  '담임목사', '부목사', '전도사', '학교선생', '장로', '권사',
  '안수집사', '집사', '성도', '선교회장', '순장', '목자', '구역장',
  '초등학생', '중학생', '고등학생', '대학생', '대학원생', '청년',
]

export default function AvatarPage() {
  const router = useRouter()
  const { setAvatar } = useAvatarStore()

  const [isNew,      setIsNew]      = useState(false)
  const [nameInput,  setNameInput]  = useState('')
  const [titles,     setTitles]     = useState<string[]>([])
  const [gender,     setGender]     = useState<Gender>('male')
  const [skinTone,   setSkinTone]   = useState<SkinTone>('medium')
  const [hairStyle,  setHairStyle]  = useState('short')
  const [outfit,     setOutfit]     = useState<Outfit>('casual')
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  useEffect(() => {
    setIsNew(new URLSearchParams(window.location.search).get('new') === 'true')
  }, [])

  useEffect(() => {
    if (isNew) return
    fetch('/api/avatar').then(r => r.ok ? r.json() : null).then(data => {
      if (!data) return
      if (data.name)   setNameInput(data.name)
      if (Array.isArray(data.titles)) setTitles(data.titles)
      const a = data.avatar
      if (!a) return
      if (a.skin_tone)  setSkinTone(a.skin_tone)
      if (a.gender)     setGender(a.gender)
      if (a.hair_style) setHairStyle(a.hair_style)
      if (a.outfit)     setOutfit(a.outfit)
    })
  }, [isNew])

  function handleGenderChange(g: Gender) {
    setGender(g)
    setHairStyle(g === 'male' ? MALE_HAIR_OPTIONS[0].value : FEMALE_HAIR_OPTIONS[0].value)
  }

  function toggleTitle(t: string) {
    setTitles(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  const hairOptions = gender === 'male' ? MALE_HAIR_OPTIONS : FEMALE_HAIR_OPTIONS

  async function handleSave() {
    if (!nameInput.trim()) { setError('이름을 입력해주세요.'); return }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skin_tone: skinTone, gender, hair_style: hairStyle, outfit,
          name: nameInput.trim(), titles,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? '저장 실패')
        return
      }
      setAvatar({ name: nameInput.trim(), titles, skinTone, gender, hairStyle, outfit })
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
          <h1 className="text-2xl font-bold text-gray-800" style={{ wordBreak: 'keep-all' }}>
            {isNew ? '아바타를 만들어보세요 👋' : '아바타 꾸미기'}
          </h1>
        </div>

        {/* 미리보기 */}
        <div className="flex justify-center mb-6">
          <div className="w-36 h-36 rounded-full bg-indigo-100 flex items-center justify-center shadow-inner">
            <AvatarPreview
              skinTone={skinTone} gender={gender}
              hairStyle={hairStyle} outfit={outfit}
              size={110}
            />
          </div>
        </div>

        <div className="space-y-6">

          {/* 이름 */}
          <section>
            <h2 className="text-sm font-semibold text-gray-600 mb-2">이름</h2>
            <input
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              placeholder="이름을 입력하세요"
              maxLength={20}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 bg-white"
            />
          </section>

          {/* 직분 */}
          <section>
            <h2 className="text-sm font-semibold text-gray-600 mb-1">직분</h2>
            <p className="text-xs text-gray-400 mb-2">여러 개 선택 가능합니다</p>
            <div className="flex flex-wrap gap-2">
              {TITLE_OPTIONS.map(t => (
                <button
                  key={t}
                  onClick={() => toggleTitle(t)}
                  className={[
                    'px-3 py-1.5 rounded-full border-2 text-xs font-medium transition-all',
                    titles.includes(t)
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-600',
                  ].join(' ')}
                >
                  {t}
                </button>
              ))}
            </div>
            {titles.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {titles.map(t => (
                  <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* 성별 */}
          <section>
            <h2 className="text-sm font-semibold text-gray-600 mb-2">성별</h2>
            <div className="flex gap-3">
              {([
                { value: 'male',   label: '남성', emoji: '👨' },
                { value: 'female', label: '여성', emoji: '👩' },
              ] as { value: Gender; label: string; emoji: string }[]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleGenderChange(opt.value)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all text-sm font-medium ${
                    gender === opt.value
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-600'
                  }`}
                >
                  <span className="text-xl">{opt.emoji}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* 피부색 */}
          <section>
            <h2 className="text-sm font-semibold text-gray-600 mb-2">피부색</h2>
            <div className="flex gap-3">
              {SKIN_OPTIONS.map(opt => (
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
                  <span className="w-8 h-8 rounded-full border border-gray-300 block"
                        style={{ background: opt.color }} />
                  <span className="text-xs text-gray-600 whitespace-nowrap">{opt.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* 헤어스타일 */}
          <section>
            <h2 className="text-sm font-semibold text-gray-600 mb-2">헤어스타일</h2>
            <div className="grid grid-cols-3 gap-2">
              {hairOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setHairStyle(opt.value)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border-2 transition-all text-sm ${
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
            <div className="grid grid-cols-3 gap-2">
              {OUTFIT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setOutfit(opt.value)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border-2 transition-all text-sm ${
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

        {error && (
          <p className="mt-4 text-sm text-red-500 text-center" style={{ wordBreak: 'keep-all' }}>
            {error}
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-8 w-full py-4 rounded-2xl bg-indigo-600 text-white text-base font-bold
                     active:scale-95 transition-all disabled:opacity-50 shadow-md"
        >
          {saving ? '저장 중...' : isNew ? '아바타 완성! 메타버스 입장 →' : '저장하기'}
        </button>

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
