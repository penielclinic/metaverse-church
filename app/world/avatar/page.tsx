'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAvatarStore } from '@/store/avatarStore'
import AvatarPreview, {
  MALE_HAIR_OPTIONS, FEMALE_HAIR_OPTIONS, HAIR_COLOR_OPTIONS,
  EYE_MAKEUP_OPTIONS, GLASSES_OPTIONS, EARRING_OPTIONS, NECKLACE_OPTIONS,
  type SkinTone, type Gender, type Outfit,
} from '@/components/world/AvatarPreview'

const SKIN_OPTIONS: { value: SkinTone; label: string; color: string }[] = [
  { value: 'light',  label: '밝은',   color: '#FDDBB4' },
  { value: 'medium', label: '보통',   color: '#F0C27F' },
  { value: 'tan',    label: '구릿빛', color: '#D4915A' },
  { value: 'dark',   label: '어두운', color: '#8D5524' },
]

const OUTFIT_OPTIONS: { value: Outfit; label: string; emoji: string }[] = [
  { value: 'casual',       label: '캐주얼',    emoji: '👕' },
  { value: 'hoodie',       label: '후드티',    emoji: '🧥' },
  { value: 'shirt',        label: '셔츠',      emoji: '🔵' },
  { value: 'blouse',       label: '블라우스',  emoji: '🌸' },
  { value: 'sweater',      label: '스웨터',    emoji: '🧶' },
  { value: 'vest',         label: '조끼',      emoji: '🦺' },
  { value: 'formal',       label: '정장',      emoji: '👔' },
  { value: 'hanbok',       label: '한복',      emoji: '🎎' },
  { value: 'worship_team', label: '찬양팀',    emoji: '🎵' },
  { value: 'pastor',       label: '목사 가운', emoji: '✝️' },
]

const TITLE_OPTIONS = [
  '담임목사', '부목사', '전도사', '학교선생', '장로', '권사',
  '안수집사', '집사', '성도', '선교회장', '순장', '목자', '구역장',
  '청년회장', '청년부회장', '청년부총무',
  '초등학생', '중학생', '고등학생', '대학생', '대학원생', '청년',
]

/** hairStyle 문자열 파싱: "bob+bangs+blonde" → { base, hasBangs, colorName } */
function parseHair(raw: string) {
  const parts = raw.split('+')
  const base  = parts[0] ?? 'short'
  const hasBangs  = parts.includes('bangs')
  const colorName = parts.find(p => HAIR_COLOR_OPTIONS.some(o => o.value === p)) ?? 'brown'
  return { base, hasBangs, colorName }
}

/** 조합 → hairStyle 문자열 */
function buildHair(base: string, hasBangs: boolean, colorName: string) {
  const mods = [hasBangs && 'bangs', colorName !== 'brown' && colorName].filter(Boolean)
  return [base, ...mods].join('+')
}

export default function AvatarPage() {
  const router = useRouter()
  const { setAvatar } = useAvatarStore()

  const [isNew,      setIsNew]      = useState(false)
  const [nameInput,  setNameInput]  = useState('')
  const [titles,     setTitles]     = useState<string[]>([])
  const [gender,     setGender]     = useState<Gender>('male')
  const [skinTone,   setSkinTone]   = useState<SkinTone>('medium')
  const [baseHair,   setBaseHair]   = useState('short')
  const [hasBangs,   setHasBangs]   = useState(false)
  const [hairColor,  setHairColor]  = useState('brown')
  const [outfit,     setOutfit]     = useState<Outfit>('casual')
  const [eyeMakeup,  setEyeMakeup]  = useState('none')
  const [glasses,    setGlasses]    = useState('none')
  const [earring,    setEarring]    = useState('none')
  const [necklace,   setNecklace]   = useState('none')
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  // 미리보기용 조합 hairStyle
  const previewHair = buildHair(baseHair, hasBangs, hairColor)

  useEffect(() => {
    setIsNew(new URLSearchParams(window.location.search).get('new') === 'true')
  }, [])

  useEffect(() => {
    if (isNew) return
    fetch('/api/avatar').then(r => r.ok ? r.json() : null).then(data => {
      if (!data) return
      if (data.name)              setNameInput(data.name)
      if (Array.isArray(data.titles)) setTitles(data.titles)
      const a = data.avatar
      if (!a) return
      if (a.skin_tone) setSkinTone(a.skin_tone)
      if (a.gender)    setGender(a.gender)
      if (a.hair_style) {
        const parsed = parseHair(a.hair_style)
        setBaseHair(parsed.base)
        setHasBangs(parsed.hasBangs)
        setHairColor(parsed.colorName)
      }
      if (a.outfit)      setOutfit(a.outfit)
      if (a.eye_makeup)  setEyeMakeup(a.eye_makeup)
      if (a.glasses)     setGlasses(a.glasses)
      if (a.earring)     setEarring(a.earring)
      if (a.necklace)    setNecklace(a.necklace)
    })
  }, [isNew])

  function handleGenderChange(g: Gender) {
    setGender(g)
    setBaseHair(g === 'male' ? MALE_HAIR_OPTIONS[0].value : FEMALE_HAIR_OPTIONS[0].value)
    setHasBangs(false)
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
          skin_tone: skinTone, gender,
          hair_style: previewHair,
          outfit,
          eye_makeup: eyeMakeup,
          glasses,
          earring,
          necklace,
          name: nameInput.trim(), titles,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? '저장 실패')
        return
      }
      setAvatar({ name: nameInput.trim(), titles, skinTone, gender, hairStyle: previewHair, outfit,
                  eyeMakeup, glasses, earring, necklace })
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
              hairStyle={previewHair} outfit={outfit}
              eyeMakeup={eyeMakeup} glasses={glasses}
              earring={earring} necklace={necklace}
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

          {/* ── 헤어스타일 ── */}
          <section>
            <h2 className="text-sm font-semibold text-gray-600 mb-2">헤어스타일</h2>

            {/* 베이스 스타일 */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {hairOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setBaseHair(opt.value)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border-2 transition-all text-sm ${
                    baseHair === opt.value
                      ? 'border-indigo-500 bg-indigo-50 font-semibold shadow-sm'
                      : 'border-gray-200 bg-white text-gray-600'
                  }`}
                >
                  <span>{opt.emoji}</span>
                  <span className="whitespace-nowrap">{opt.label}</span>
                </button>
              ))}
            </div>

            {/* 앞머리 토글 */}
            <button
              onClick={() => setHasBangs(p => !p)}
              className={[
                'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 transition-all text-sm font-medium',
                hasBangs
                  ? 'border-pink-400 bg-pink-50 text-pink-700 shadow-sm'
                  : 'border-gray-200 bg-white text-gray-500',
              ].join(' ')}
            >
              <span>✂️</span>
              <span>앞머리 추가</span>
              {hasBangs && <span className="text-xs px-2 py-0.5 rounded-full bg-pink-200 text-pink-700">ON</span>}
            </button>
          </section>

          {/* ── 머리 색깔 ── */}
          <section>
            <h2 className="text-sm font-semibold text-gray-600 mb-2">머리 색깔</h2>
            <div className="grid grid-cols-5 gap-2">
              {HAIR_COLOR_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setHairColor(opt.value)}
                  className={[
                    'flex flex-col items-center gap-1 py-2 rounded-xl border-2 transition-all',
                    hairColor === opt.value
                      ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                      : 'border-gray-200 bg-white',
                  ].join(' ')}
                >
                  <span
                    className="w-7 h-7 rounded-full border border-gray-300 block"
                    style={{ background: opt.hex }}
                  />
                  <span className="text-[10px] text-gray-600 whitespace-nowrap">{opt.label}</span>
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

          {/* 안경 */}
          <section>
            <h2 className="text-sm font-semibold text-gray-600 mb-2">안경 / 선글라스</h2>
            <div className="grid grid-cols-3 gap-2">
              {GLASSES_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setGlasses(opt.value)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border-2 transition-all text-sm ${
                    glasses === opt.value
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

          {/* 눈화장 (여성 전용) */}
          {gender === 'female' && (
            <section>
              <h2 className="text-sm font-semibold text-gray-600 mb-2">눈화장</h2>
              <div className="grid grid-cols-3 gap-2">
                {EYE_MAKEUP_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setEyeMakeup(opt.value)}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border-2 transition-all text-sm ${
                      eyeMakeup === opt.value
                        ? 'border-pink-400 bg-pink-50 font-semibold shadow-sm'
                        : 'border-gray-200 bg-white text-gray-600'
                    }`}
                  >
                    <span>{opt.emoji}</span>
                    <span className="whitespace-nowrap">{opt.label}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* 귀걸이 (여성 전용) */}
          {gender === 'female' && (
            <section>
              <h2 className="text-sm font-semibold text-gray-600 mb-2">귀걸이</h2>
              <div className="grid grid-cols-3 gap-2">
                {EARRING_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setEarring(opt.value)}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border-2 transition-all text-sm ${
                      earring === opt.value
                        ? 'border-pink-400 bg-pink-50 font-semibold shadow-sm'
                        : 'border-gray-200 bg-white text-gray-600'
                    }`}
                  >
                    <span>{opt.emoji}</span>
                    <span className="whitespace-nowrap">{opt.label}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* 목걸이 (여성 전용) */}
          {gender === 'female' && (
            <section>
              <h2 className="text-sm font-semibold text-gray-600 mb-2">목걸이</h2>
              <div className="grid grid-cols-3 gap-2">
                {NECKLACE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setNecklace(opt.value)}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border-2 transition-all text-sm ${
                      necklace === opt.value
                        ? 'border-pink-400 bg-pink-50 font-semibold shadow-sm'
                        : 'border-gray-200 bg-white text-gray-600'
                    }`}
                  >
                    <span>{opt.emoji}</span>
                    <span className="whitespace-nowrap">{opt.label}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
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
