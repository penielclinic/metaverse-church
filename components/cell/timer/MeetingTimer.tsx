'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import TimerDisplay from './TimerDisplay'

// ── 모임 순서 기본값 ─────────────────────────────────────────────
const DEFAULT_STEPS = [
  { name: '찬양',   emoji: '🎵', defaultMinutes: 5  },
  { name: '기도',   emoji: '🙏', defaultMinutes: 10 },
  { name: '말씀',   emoji: '📖', defaultMinutes: 20 },
  { name: '나눔',   emoji: '💬', defaultMinutes: 30 },
  { name: '마무리', emoji: '🤝', defaultMinutes: 5  },
]

// ── 실시간 브로드캐스트 페이로드 ────────────────────────────────
type TimerPayload = {
  stepIndex: number
  remaining: number
  running: boolean
  durations: number[] // seconds
  alert?: 'warning' | 'end'
}

interface MeetingTimerProps {
  cellId: string
  isLeader: boolean
}

export default function MeetingTimer({ cellId, isLeader }: MeetingTimerProps) {
  const [durations, setDurations] = useState<number[]>(
    DEFAULT_STEPS.map((s) => s.defaultMinutes * 60)
  )
  const [stepIndex, setStepIndex]     = useState(0)
  const [remaining, setRemaining]     = useState(DEFAULT_STEPS[0].defaultMinutes * 60)
  const [running, setRunning]         = useState(false)
  const [editingStep, setEditingStep] = useState<number | null>(null)
  const [editMinutes, setEditMinutes] = useState('')
  const [alertMsg, setAlertMsg]       = useState<string | null>(null)

  // ── Refs ──────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef    = useRef<any>(null)
  const runningRef    = useRef(running)
  const alertTimer    = useRef<ReturnType<typeof setTimeout> | null>(null)

  // stateRef: REQUEST_SYNC 핸들러에서 최신 상태를 읽기 위해 사용
  const stateRef = useRef({ stepIndex, remaining, running, durations })
  useEffect(() => {
    stateRef.current = { stepIndex, remaining, running, durations }
  })
  useEffect(() => { runningRef.current = running }, [running])

  // ── Alert helper ──────────────────────────────────────────────
  const showAlert = useCallback((msg: string) => {
    setAlertMsg(msg)
    if (alertTimer.current) clearTimeout(alertTimer.current)
    alertTimer.current = setTimeout(() => setAlertMsg(null), 5000)
  }, [])

  // ── Supabase Realtime 채널 ────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`cell-timer:${cellId}`, {
      config: { broadcast: { ack: false } },
    })
    channelRef.current = channel

    // 팔로워: 타이머 상태 수신
    channel.on('broadcast', { event: 'TIMER_STATE' }, ({ payload }: { payload: TimerPayload }) => {
      if (isLeader) return
      setStepIndex(payload.stepIndex)
      setRemaining(payload.remaining)
      setRunning(payload.running)
      setDurations(payload.durations)
      if (payload.alert === 'warning') showAlert('⏰ 30초 후 시간이 종료됩니다!')
      if (payload.alert === 'end')
        showAlert(`✅ ${DEFAULT_STEPS[payload.stepIndex]?.name ?? ''} 시간이 종료되었습니다!`)
    })

    // 순장: 새 참여자의 동기화 요청에 응답
    channel.on('broadcast', { event: 'REQUEST_SYNC' }, () => {
      if (!isLeader) return
      const s = stateRef.current
      channel.send({
        type: 'broadcast',
        event: 'TIMER_STATE',
        payload: {
          stepIndex: s.stepIndex,
          remaining: s.remaining,
          running: runningRef.current,
          durations: s.durations,
        } satisfies TimerPayload,
      })
    })

    if (!isLeader) {
      // 팔로워: 구독 완료 후 현재 상태 요청
      channel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          channel.send({ type: 'broadcast', event: 'REQUEST_SYNC', payload: {} })
        }
      })
    } else {
      channel.subscribe()
    }

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cellId, isLeader])

  // ── 타이머 틱 (순장 전용) ─────────────────────────────────────
  useEffect(() => {
    if (!isLeader || !running) return
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000)
    return () => clearInterval(id)
  }, [isLeader, running])

  // ── 타이머 이벤트 (경고·종료) — runningRef로 stale closure 방지 ─
  useEffect(() => {
    if (!isLeader) return

    if (remaining === 30 && runningRef.current) {
      showAlert('⏰ 30초 후 시간이 종료됩니다!')
      channelRef.current?.send({
        type: 'broadcast',
        event: 'TIMER_STATE',
        payload: { ...stateRef.current, remaining: 30, alert: 'warning' } satisfies TimerPayload,
      })
    }

    if (remaining === 0 && runningRef.current) {
      setRunning(false)
      const ended = stateRef.current.stepIndex
      showAlert(`✅ ${DEFAULT_STEPS[ended]?.name ?? ''} 시간이 종료되었습니다!`)
      channelRef.current?.send({
        type: 'broadcast',
        event: 'TIMER_STATE',
        payload: {
          ...stateRef.current,
          remaining: 0,
          running: false,
          alert: 'end',
        } satisfies TimerPayload,
      })
    }

    // 5초마다 주기적 동기화
    if (remaining > 0 && remaining % 5 === 0 && runningRef.current) {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'TIMER_STATE',
        payload: { ...stateRef.current, remaining } satisfies TimerPayload,
      })
    }
  // remaining이 바뀔 때만 — runningRef는 ref이므로 deps 생략 안전
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, isLeader])

  // ── 브로드캐스트 헬퍼 ────────────────────────────────────────
  const broadcast = useCallback(
    (overrides: Partial<TimerPayload> = {}) => {
      const s = stateRef.current
      channelRef.current?.send({
        type: 'broadcast',
        event: 'TIMER_STATE',
        payload: { ...s, ...overrides } satisfies TimerPayload,
      })
    },
    []
  )

  // ── 컨트롤 핸들러 (순장 전용) ────────────────────────────────
  const handleStart = () => {
    if (remaining === 0) return
    setRunning(true)
    broadcast({ running: true })
  }

  const handlePause = () => {
    setRunning(false)
    broadcast({ running: false })
  }

  const handleReset = () => {
    const dur = stateRef.current.durations[stateRef.current.stepIndex]
    setRunning(false)
    setRemaining(dur)
    broadcast({ running: false, remaining: dur })
  }

  const handleStepSelect = (idx: number) => {
    if (!isLeader) return
    setRunning(false)
    setStepIndex(idx)
    setRemaining(durations[idx])
    broadcast({ running: false, stepIndex: idx, remaining: durations[idx] })
  }

  const handleEditOpen = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingStep(idx)
    setEditMinutes(String(Math.floor(durations[idx] / 60)))
  }

  const handleEditSave = (idx: number) => {
    const mins = parseInt(editMinutes, 10)
    if (isNaN(mins) || mins < 1 || mins > 180) {
      setEditingStep(null)
      return
    }
    const secs = mins * 60
    const newDur = [...durations]
    newDur[idx] = secs
    setDurations(newDur)
    if (idx === stepIndex) {
      setRunning(false)
      setRemaining(secs)
    }
    setEditingStep(null)
    broadcast({
      durations: newDur,
      ...(idx === stepIndex ? { remaining: secs, running: false } : {}),
    })
  }

  const isWarning =
    remaining <= 30 && remaining > 0 && running
  const currentStep = DEFAULT_STEPS[stepIndex]

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-5">
      <h2 className="text-base font-bold text-gray-800">⏱ 모임 타이머</h2>

      {/* 알림 배너 */}
      {alertMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-2.5 text-center font-medium animate-pulse">
          {alertMsg}
        </div>
      )}

      {/* 원형 타이머 */}
      <TimerDisplay
        stepName={currentStep.name}
        stepEmoji={currentStep.emoji}
        remainingSeconds={remaining}
        totalSeconds={durations[stepIndex]}
        isWarning={isWarning}
        isRunning={running}
      />

      {/* 컨트롤 버튼 — 순장만 */}
      {isLeader && (
        <div className="flex justify-center gap-3">
          {running ? (
            <button
              onClick={handlePause}
              className="px-6 py-2.5 bg-amber-500 text-white text-sm font-semibold rounded-full hover:bg-amber-600 active:scale-95 transition-all"
            >
              ⏸ 일시정지
            </button>
          ) : (
            <button
              onClick={handleStart}
              disabled={remaining === 0}
              className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-full hover:bg-indigo-700 active:scale-95 disabled:opacity-40 transition-all"
            >
              ▶ 시작
            </button>
          )}
          <button
            onClick={handleReset}
            className="px-6 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-full hover:bg-gray-200 active:scale-95 transition-all"
          >
            ↺ 리셋
          </button>
        </div>
      )}

      {/* 순서 목록 */}
      <div className="space-y-1.5">
        {DEFAULT_STEPS.map((step, idx) => (
          <div
            key={idx}
            onClick={() => isLeader && handleStepSelect(idx)}
            className={`flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors ${
              isLeader ? 'cursor-pointer' : 'cursor-default'
            } ${
              idx === stepIndex
                ? 'bg-indigo-50 border border-indigo-200'
                : 'hover:bg-gray-50 border border-transparent'
            }`}
          >
            {/* 왼쪽: 이모지 + 이름 + 진행 중 뱃지 */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xl leading-none">{step.emoji}</span>
              <span
                className={`text-sm font-medium whitespace-nowrap ${
                  idx === stepIndex ? 'text-indigo-700' : 'text-gray-700'
                }`}
              >
                {step.name}
              </span>
              {idx === stepIndex && running && (
                <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full whitespace-nowrap">
                  진행 중
                </span>
              )}
            </div>

            {/* 오른쪽: 시간 + 수정 */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {editingStep === idx && isLeader ? (
                <div
                  className="flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="number"
                    value={editMinutes}
                    onChange={(e) => setEditMinutes(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleEditSave(idx)
                      if (e.key === 'Escape') setEditingStep(null)
                    }}
                    className="w-14 text-sm border border-indigo-300 rounded-lg px-1.5 py-0.5 text-center focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    min={1}
                    max={180}
                    autoFocus
                  />
                  <span className="text-xs text-gray-500">분</span>
                  <button
                    onClick={() => handleEditSave(idx)}
                    className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    저장
                  </button>
                  <button
                    onClick={() => setEditingStep(null)}
                    className="text-xs text-gray-400 hover:text-gray-600 px-1"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-xs text-gray-500 tabular-nums whitespace-nowrap">
                    {Math.floor(durations[idx] / 60)}분
                  </span>
                  {isLeader && (
                    <button
                      onClick={(e) => handleEditOpen(idx, e)}
                      className="text-xs text-gray-400 hover:text-indigo-600 transition-colors px-1 py-0.5 rounded"
                    >
                      수정
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {!isLeader && (
        <p className="text-center text-xs text-gray-400" style={{ wordBreak: 'keep-all' }}>
          순장이 타이머를 제어합니다
        </p>
      )}
    </div>
  )
}
