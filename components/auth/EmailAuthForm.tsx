'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Mode = 'login' | 'signup'

interface Mission { id: number; name: string }
interface Cell    { id: number; name: string; mission_id: number }

const ROLE_OPTIONS = [
  { value: 'youth',          label: '청년' },
  { value: 'elder',          label: '장로' },
  { value: 'cell_leader',    label: '순장' },
  { value: 'mission_leader', label: '선교회장' },
  { value: 'youth_pastor',   label: '교역자' },
]

export default function EmailAuthForm() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')

  // 가입 필드
  const [name,       setName]       = useState('')
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [phone,      setPhone]      = useState('')
  const [role,       setRole]       = useState('youth')
  const [missionId,  setMissionId]  = useState<number | ''>('')
  const [cellId,     setCellId]     = useState<number | ''>('')

  // 선택지
  const [missions, setMissions] = useState<Mission[]>([])
  const [cells,    setCells]    = useState<Cell[]>([])
  const [filteredCells, setFilteredCells] = useState<Cell[]>([])

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [done,    setDone]    = useState(false)

  // 선교회·순 목록 로드
  useEffect(() => {
    if (mode !== 'signup') return
    const supabase = createClient()
    Promise.all([
      supabase.from('missions').select('id, name').order('name'),
      supabase.from('cells').select('id, name, mission_id').order('name'),
    ]).then(([{ data: m }, { data: c }]) => {
      setMissions((m ?? []) as Mission[])
      setCells((c ?? []) as Cell[])
    })
  }, [mode])

  // 선교회 변경 시 순 필터링
  useEffect(() => {
    if (missionId === '') {
      setFilteredCells(cells)
    } else {
      setFilteredCells(cells.filter((c) => c.mission_id === missionId))
    }
    setCellId('')
  }, [missionId, cells])

  async function handleLogin() {
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setError('이메일 또는 비밀번호가 올바르지 않습니다.'); return }
    router.push('/world')
    router.refresh()
  }

  async function handleSignup() {
    setError('')
    if (!name.trim())      { setError('이름을 입력해 주세요.');            return }
    if (!email.trim())     { setError('이메일을 입력해 주세요.');           return }
    if (password.length < 6) { setError('비밀번호는 6자리 이상이어야 합니다.'); return }

    setLoading(true)
    const res = await fetch('/api/auth/email-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:    name.trim(),
        email:   email.trim(),
        password,
        phone:   phone.trim() || null,
        role,
        cellId:  role === 'elder' ? null : (cellId || null),
      }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { setError(json.error ?? '가입에 실패했습니다.'); return }
    setDone(true)
  }

  // 가입 완료 안내
  if (done) {
    return (
      <div className="text-center py-4 space-y-3">
        <p className="text-3xl">✅</p>
        <p className="font-bold text-gray-800 text-base" style={{ wordBreak: 'keep-all' }}>
          가입 신청이 완료되었습니다
        </p>
        <p className="text-sm text-gray-500" style={{ wordBreak: 'keep-all' }}>
          관리자 승인 후 로그인하실 수 있습니다.<br />
          승인이 완료되면 다시 로그인해 주세요.
        </p>
        <button
          onClick={() => { setDone(false); setMode('login') }}
          className="mt-2 text-indigo-600 text-sm font-medium underline"
        >
          로그인 화면으로
        </button>
      </div>
    )
  }

  const selectCls = 'w-full border border-gray-300 rounded-xl px-4 py-3 text-base bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 min-h-[52px]'
  const inputCls  = 'w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400 min-h-[52px]'

  return (
    <div className="space-y-4">
      {/* 탭 */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200">
        {(['login', 'signup'] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setError('') }}
            className={[
              'flex-1 py-2.5 text-sm font-semibold transition-colors min-h-[44px]',
              mode === m ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50',
            ].join(' ')}
          >
            {m === 'login' ? '로그인' : '회원가입'}
          </button>
        ))}
      </div>

      {/* 가입 전용 필드 */}
      {mode === 'signup' && (
        <div className="space-y-3">
          <input
            type="text"
            placeholder="이름 (예: 홍길동)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
          />
          <input
            type="tel"
            placeholder="전화번호 (선택)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputCls}
          />

          {/* 역할 선택 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1 ml-1">나의 역할</label>
            <select
              value={role}
              onChange={(e) => { setRole(e.target.value); setMissionId(''); setCellId('') }}
              className={selectCls}
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* 장로: 자동 배정 안내 */}
          {role === 'elder' && (
            <p className="text-xs text-indigo-600 bg-indigo-50 rounded-xl px-3 py-2" style={{ wordBreak: 'keep-all' }}>
              ✅ 승인 후 장로 소그룹에 자동으로 배정됩니다
            </p>
          )}

          {/* 장로 외: 선교회 + 순 선택 */}
          {role !== 'elder' && (
            <>
              <div>
                <label className="block text-xs text-gray-500 mb-1 ml-1">소속 선교회 (선택)</label>
                <select
                  value={missionId}
                  onChange={(e) => setMissionId(e.target.value === '' ? '' : Number(e.target.value))}
                  className={selectCls}
                >
                  <option value="">선택 안 함</option>
                  {missions.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1 ml-1">소속 순/반 (선택)</label>
                <select
                  value={cellId}
                  onChange={(e) => setCellId(e.target.value === '' ? '' : Number(e.target.value))}
                  className={selectCls}
                  disabled={filteredCells.length === 0}
                >
                  <option value="">선택 안 함</option>
                  {filteredCells.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      )}

      {/* 공통 필드 */}
      <input
        type="email"
        placeholder="이메일"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={inputCls}
      />
      <input
        type="password"
        placeholder="비밀번호 (6자리 이상)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && (mode === 'login' ? handleLogin() : handleSignup())}
        className={inputCls}
      />

      {error && (
        <p className="text-sm text-red-500 text-center" style={{ wordBreak: 'keep-all' }}>{error}</p>
      )}

      <button
        onClick={mode === 'login' ? handleLogin : handleSignup}
        disabled={loading}
        className="w-full bg-indigo-600 text-white font-bold rounded-xl py-3 text-base hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition-all min-h-[52px]"
      >
        {loading ? '처리 중...' : mode === 'login' ? '로그인' : '가입 신청'}
      </button>
    </div>
  )
}
