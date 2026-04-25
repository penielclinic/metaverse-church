'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── 타입 ──────────────────────────────────────────────────────
interface Mission {
  id: number
  name: string
  description: string | null
  leaderName: string | null
  memberCount: number
}

interface MissionPost {
  id: number
  missionId: number
  userId: string
  title: string
  content: string
  imageUrl: string | null
  activityDateFrom: string | null
  activityDateTo: string | null
  location: string | null
  participantCount: number | null
  memberNames: string[]
  activityType: string | null
  participationCount: number
  myParticipation: boolean
  createdAt: string
  authorName: string
}

interface MissionPrayer {
  id: number
  missionId: number
  userId: string
  content: string
  isAnonymous: boolean
  amenCount: number
  myAmen: boolean
  createdAt: string
  authorName: string
}

type Tab = 'activity' | 'prayer'

// ── 컴포넌트 ─────────────────────────────────────────────────
export default function MissionPage() {
  const supabase = createClient()

  const [missions, setMissions]           = useState<Mission[]>([])
  const [selectedId, setSelectedId]       = useState<number | null>(null)
  const [tab, setTab]                     = useState<Tab>('activity')
  const [posts, setPosts]                 = useState<MissionPost[]>([])
  const [prayers, setPrayers]             = useState<MissionPrayer[]>([])
  const [loading, setLoading]             = useState(true)
  const [myUserId, setMyUserId]           = useState<string | null>(null)
  const [myRole, setMyRole]               = useState('')
  const [myMissionId, setMyMissionId]     = useState<number | null>(null)

  // 배지 알림 상태
  const [badgeToast, setBadgeToast] = useState<{ name: string } | null>(null)

  // 모달 상태
  const [showPostModal, setShowPostModal]     = useState(false)
  const [showPrayerModal, setShowPrayerModal] = useState(false)
  const [postForm, setPostForm]               = useState({ title: '', content: '', activityDateFrom: '', activityDateTo: '', location: '', participantCount: '', activityType: '' })
  const [memberInput, setMemberInput]         = useState('')
  const [memberList, setMemberList]           = useState<string[]>([])
  const [prayerForm, setPrayerForm]           = useState({ content: '', isAnonymous: false })
  const [saving, setSaving]                   = useState(false)
  const [expandedPost, setExpandedPost]       = useState<number | null>(null)

  // ── 초기화 ───────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setMyUserId(user.id)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (supabase as any)
        .from('profiles').select('role, mission_id').eq('id', user.id).single()
      setMyRole(profile?.role ?? '')
      setMyMissionId(profile?.mission_id ?? null)

      // 선교회 목록 (리더 이름 + 멤버 수)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: missionData } = await (supabase as any)
        .from('missions')
        .select('id, name, description, profiles:leader_id ( name )')
        .order('id')

      if (!missionData) return

      // 멤버 수 카운트
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: countData } = await (supabase as any)
        .from('profiles')
        .select('mission_id')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const countMap: Record<number, number> = {}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(countData ?? []).forEach((r: any) => {
        if (r.mission_id) countMap[r.mission_id] = (countMap[r.mission_id] ?? 0) + 1
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const list: Mission[] = missionData.map((m: any) => ({
        id:          m.id,
        name:        m.name,
        description: m.description,
        leaderName:  (m.profiles as { name: string } | null)?.name ?? null,
        memberCount: countMap[m.id] ?? 0,
      }))

      setMissions(list)
      if (list.length > 0) setSelectedId(list[0].id)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 데이터 로드 ───────────────────────────────────────────────
  const loadPosts = useCallback(async (missionId: number) => {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('mission_posts')
      .select('id, mission_id, user_id, title, content, image_url, activity_date_from, activity_date_to, location, participant_count, activity_type, participation_count, created_at, profiles:user_id ( name ), mission_participations ( user_id ), mission_post_members ( name )')
      .eq('mission_id', missionId)
      .order('created_at', { ascending: false })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setPosts((data ?? []).map((r: any) => ({
      id:                 r.id,
      missionId:          r.mission_id,
      userId:             r.user_id,
      title:              r.title,
      content:            r.content,
      imageUrl:           r.image_url,
      activityDateFrom:   r.activity_date_from ?? null,
      activityDateTo:     r.activity_date_to ?? null,
      location:           r.location ?? null,
      participantCount:   r.participant_count ?? null,
      memberNames:        (r.mission_post_members ?? []).map((m: { name: string }) => m.name),
      activityType:       r.activity_type ?? null,
      participationCount: r.participation_count ?? 0,
      myParticipation:    (r.mission_participations ?? []).some((p: { user_id: string }) => p.user_id === myUserId),
      createdAt:          r.created_at,
      authorName:         (r.profiles as { name: string } | null)?.name ?? '선교회',
    })))
    setLoading(false)
  }, [supabase])

  const loadPrayers = useCallback(async (missionId: number) => {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('mission_prayers')
      .select('id, mission_id, user_id, content, is_anonymous, amen_count, created_at, profiles:user_id ( name ), mission_prayer_amens ( user_id )')
      .eq('mission_id', missionId)
      .order('created_at', { ascending: false })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setPrayers((data ?? []).map((r: any) => ({
      id:          r.id,
      missionId:   r.mission_id,
      userId:      r.user_id,
      content:     r.content,
      isAnonymous: r.is_anonymous,
      amenCount:   r.amen_count,
      myAmen:      (r.mission_prayer_amens ?? []).some((a: { user_id: string }) => a.user_id === myUserId),
      createdAt:   r.created_at,
      authorName:  r.is_anonymous ? '익명' : ((r.profiles as { name: string } | null)?.name ?? '성도'),
    })))
    setLoading(false)
  }, [supabase, myUserId])

  useEffect(() => {
    if (!selectedId) return
    if (tab === 'activity') loadPosts(selectedId)
    else loadPrayers(selectedId)
  }, [selectedId, tab, loadPosts, loadPrayers])

  // ── 활동 글 작성 ─────────────────────────────────────────────
  const submitPost = async () => {
    if (!postForm.title.trim() || !postForm.content.trim() || !selectedId) return
    setSaving(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('mission_posts')
      .insert({
        mission_id:        selectedId,
        user_id:           myUserId,
        title:             postForm.title.trim(),
        content:           postForm.content.trim(),
        activity_date_from: postForm.activityDateFrom || null,
        activity_date_to:   postForm.activityDateTo || null,
        location:          postForm.location.trim() || null,
        participant_count: memberList.length > 0 ? memberList.length : (postForm.participantCount ? Number(postForm.participantCount) : null),
        activity_type:     postForm.activityType || null,
      })
    setSaving(false)
    if (error) { alert(error.message); return }

    // 명단 저장
    if (memberList.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newPost } = await (supabase as any)
        .from('mission_posts')
        .select('id')
        .eq('mission_id', selectedId)
        .eq('user_id', myUserId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (newPost) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('mission_post_members')
          .insert(memberList.map(name => ({ post_id: newPost.id, name })))
      }
    }

    setShowPostModal(false)
    setPostForm({ title: '', content: '', activityDateFrom: '', activityDateTo: '', location: '', participantCount: '', activityType: '' })
    setMemberList([])
    setMemberInput('')
    loadPosts(selectedId)
  }

  // ── 기도 요청 작성 ────────────────────────────────────────────
  const submitPrayer = async () => {
    if (!prayerForm.content.trim() || !selectedId) return
    setSaving(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('mission_prayers')
      .insert({ mission_id: selectedId, user_id: myUserId, content: prayerForm.content.trim(), is_anonymous: prayerForm.isAnonymous })
    setSaving(false)
    if (error) { alert(error.message); return }
    setShowPrayerModal(false)
    setPrayerForm({ content: '', isAnonymous: false })
    loadPrayers(selectedId)
  }

  // ── 선교 활동 참여 토글 ──────────────────────────────────────
  const toggleParticipation = async (post: MissionPost) => {
    if (!myUserId) return
    if (post.myParticipation) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('mission_participations')
        .delete().eq('post_id', post.id).eq('user_id', myUserId)
    } else {
      // 참여 전 배지 수 스냅샷
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count: beforeCount } = await (supabase as any)
        .from('user_badges').select('id', { count: 'exact', head: true }).eq('user_id', myUserId)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('mission_participations')
        .insert({ post_id: post.id, user_id: myUserId })

      // 새 배지 확인
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newBadges } = await (supabase as any)
        .from('user_badges')
        .select('badge_definitions ( name )')
        .eq('user_id', myUserId)
        .order('earned_at', { ascending: false })
        .limit(1)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count: afterCount } = await (supabase as any)
        .from('user_badges').select('id', { count: 'exact', head: true }).eq('user_id', myUserId)

      if (afterCount > (beforeCount ?? 0) && newBadges?.[0]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const badgeName = (newBadges[0].badge_definitions as any)?.name
        if (badgeName) {
          setBadgeToast({ name: badgeName })
          setTimeout(() => setBadgeToast(null), 4000)
        }
      }
    }
    if (selectedId) loadPosts(selectedId)
  }

  // ── 아멘 토글 ────────────────────────────────────────────────
  const toggleAmen = async (prayer: MissionPrayer) => {
    if (!myUserId) return
    if (prayer.myAmen) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('mission_prayer_amens')
        .delete().eq('prayer_id', prayer.id).eq('user_id', myUserId)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('mission_prayer_amens')
        .insert({ prayer_id: prayer.id, user_id: myUserId })
    }
    if (selectedId) loadPrayers(selectedId)
  }

  // ── 삭제 ─────────────────────────────────────────────────────
  const deletePost = async (post: MissionPost) => {
    if (!confirm(`"${post.title}" 글을 삭제할까요?`)) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('mission_posts').delete().eq('id', post.id)
    if (selectedId) loadPosts(selectedId)
  }

  const deletePrayer = async (prayer: MissionPrayer) => {
    if (!confirm('이 기도 요청을 삭제할까요?')) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('mission_prayers').delete().eq('id', prayer.id)
    if (selectedId) loadPrayers(selectedId)
  }

  // ── 권한 ─────────────────────────────────────────────────────
  const canPostActivity = selectedId !== null && (
    ['pastor', 'youth_pastor'].includes(myRole) ||
    (myRole === 'mission_leader' && myMissionId === selectedId)
  )
  const canDeletePost   = (post: MissionPost)     => post.userId === myUserId || ['pastor', 'youth_pastor'].includes(myRole)
  const canDeletePrayer = (prayer: MissionPrayer) => prayer.userId === myUserId || ['pastor', 'youth_pastor'].includes(myRole)

  const selectedMission = missions.find(m => m.id === selectedId)

  // ── 렌더 ─────────────────────────────────────────────────────
  return (
    <div className="pb-24 min-h-screen bg-gray-50">
      {/* 배지 획득 토스트 */}
      {badgeToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-white border border-yellow-300 shadow-xl rounded-2xl px-5 py-3 flex items-center gap-3 animate-bounce">
          <span className="text-2xl">🎖️</span>
          <div>
            <p className="text-xs text-yellow-600 font-semibold">새 배지 획득!</p>
            <p className="text-sm font-bold text-gray-800 whitespace-nowrap">{badgeToast.name}</p>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 pt-3 pb-0">
        <h1 className="text-lg font-bold text-gray-800 mb-2">✈️ 선교</h1>

        {/* 선교회 탭 */}
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
          {missions.map(m => (
            <button
              key={m.id}
              onClick={() => setSelectedId(m.id)}
              className={[
                'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap',
                selectedId === m.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              ].join(' ')}
            >
              {m.name}
            </button>
          ))}
        </div>
      </div>

      {/* 선택된 선교회 정보 */}
      {selectedMission && (
        <div className="mx-4 mt-3 bg-indigo-50 rounded-2xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-indigo-800 text-sm">{selectedMission.name}</p>
              {selectedMission.description && (
                <p className="text-xs text-indigo-600 mt-0.5" style={{ wordBreak: 'keep-all' }}>
                  {selectedMission.description}
                </p>
              )}
            </div>
            <div className="text-right text-xs text-indigo-500 flex-shrink-0 ml-3">
              {selectedMission.leaderName && (
                <p className="whitespace-nowrap">회장 {selectedMission.leaderName}</p>
              )}
              <p className="whitespace-nowrap">{selectedMission.memberCount}명</p>
            </div>
          </div>
        </div>
      )}

      {/* 활동/기도 탭 */}
      <div className="flex mx-4 mt-3 bg-gray-100 rounded-xl p-1 gap-1">
        {(['activity', 'prayer'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'flex-1 py-2 rounded-lg text-sm font-semibold transition-colors',
              tab === t ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500',
            ].join(' ')}
          >
            {t === 'activity' ? '📋 활동 현황' : '🙏 기도 요청'}
          </button>
        ))}
      </div>

      {/* 콘텐츠 */}
      <div className="px-4 mt-3 space-y-3">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* ── 활동 현황 ── */}
        {!loading && tab === 'activity' && (
          <>
            {posts.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p className="text-3xl mb-2">📋</p>
                <p className="text-sm" style={{ wordBreak: 'keep-all' }}>아직 활동 소식이 없어요.</p>
                {canPostActivity && (
                  <p className="text-xs mt-1 text-indigo-400">아래 버튼으로 첫 소식을 올려보세요!</p>
                )}
              </div>
            )}
            {posts.map(post => (
              <div key={post.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {/* 활동 메타 뱃지 */}
                    {(post.activityType || post.activityDateFrom || post.location || post.participantCount) && (
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {post.activityType && (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-semibold whitespace-nowrap">
                            {post.activityType}
                          </span>
                        )}
                        {post.activityDateFrom && (() => {
                          const fmt = (d: string) => new Date(d).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
                          if (post.activityDateTo && post.activityDateTo !== post.activityDateFrom) {
                            const days = Math.round((new Date(post.activityDateTo).getTime() - new Date(post.activityDateFrom).getTime()) / 86400000) + 1
                            return (
                              <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[11px] whitespace-nowrap">
                                📅 {fmt(post.activityDateFrom)} ~ {fmt(post.activityDateTo)} ({days}일간)
                              </span>
                            )
                          }
                          return (
                            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[11px] whitespace-nowrap">
                              📅 {fmt(post.activityDateFrom)}
                            </span>
                          )
                        })()}
                        {post.location && (
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[11px] whitespace-nowrap">
                            📍 {post.location}
                          </span>
                        )}
                        {(post.memberNames.length > 0 || post.participantCount) && (
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[11px] whitespace-nowrap">
                            👥 {post.memberNames.length > 0 ? post.memberNames.length : post.participantCount}명
                          </span>
                        )}
                      </div>
                    )}
                    <p className="font-bold text-gray-800 text-sm" style={{ wordBreak: 'keep-all' }}>{post.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400 whitespace-nowrap">{post.authorName}</span>
                      <span className="text-xs text-gray-300 whitespace-nowrap">
                        {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  </div>
                  {canDeletePost(post) && (
                    <button
                      onClick={() => deletePost(post)}
                      className="flex-shrink-0 text-[10px] px-2 py-1 rounded-full border border-red-200 text-red-400 hover:bg-red-50"
                    >
                      삭제
                    </button>
                  )}
                </div>
                <div className={['mt-2 text-sm text-gray-700 leading-relaxed', expandedPost === post.id ? '' : 'line-clamp-3'].join(' ')}
                  style={{ wordBreak: 'keep-all' }}>
                  {post.content}
                </div>
                {post.content.length > 100 && (
                  <button
                    onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                    className="mt-1 text-xs text-indigo-500"
                  >
                    {expandedPost === post.id ? '접기' : '더보기'}
                  </button>
                )}
                {post.memberNames.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <p className="text-[11px] text-gray-400 mb-1">참가자 명단</p>
                    <div className="flex flex-wrap gap-1">
                      {post.memberNames.map((name, i) => (
                        <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-[11px] whitespace-nowrap">{name}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => toggleParticipation(post)}
                    className={[
                      'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors',
                      post.myParticipation
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-indigo-50',
                    ].join(' ')}
                  >
                    ✋ 참여했어요
                    {!post.myParticipation && <span className="text-indigo-400 font-bold">+30 XP</span>}
                    {post.participationCount > 0 && <span>{post.participationCount}</span>}
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── 기도 요청 ── */}
        {!loading && tab === 'prayer' && (
          <>
            {prayers.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p className="text-3xl mb-2">🙏</p>
                <p className="text-sm" style={{ wordBreak: 'keep-all' }}>아직 기도 요청이 없어요.</p>
              </div>
            )}
            {prayers.map(prayer => (
              <div key={prayer.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="flex-1 text-sm text-gray-700 leading-relaxed" style={{ wordBreak: 'keep-all' }}>
                    {prayer.content}
                  </p>
                  {canDeletePrayer(prayer) && (
                    <button
                      onClick={() => deletePrayer(prayer)}
                      className="flex-shrink-0 text-[10px] px-2 py-1 rounded-full border border-red-200 text-red-400 hover:bg-red-50"
                    >
                      삭제
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 whitespace-nowrap">{prayer.authorName}</span>
                    <span className="text-xs text-gray-300 whitespace-nowrap">
                      {new Date(prayer.createdAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  <button
                    onClick={() => toggleAmen(prayer)}
                    className={[
                      'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors',
                      prayer.myAmen
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-indigo-50',
                    ].join(' ')}
                  >
                    🙏 아멘 {prayer.amenCount > 0 && <span>{prayer.amenCount}</span>}
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* FAB */}
      {tab === 'activity' && canPostActivity && (
        <button
          onClick={() => setShowPostModal(true)}
          className="fixed bottom-20 right-4 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl z-20 active:scale-95 transition-transform"
          aria-label="활동 소식 쓰기"
        >
          ✏️
        </button>
      )}
      {tab === 'prayer' && (
        <button
          onClick={() => setShowPrayerModal(true)}
          className="fixed bottom-20 right-4 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl z-20 active:scale-95 transition-transform"
          aria-label="기도 요청 올리기"
        >
          🙏
        </button>
      )}

      {/* ── 활동 글 모달 ── */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4 sm:pb-0">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-bold text-gray-800 mb-4">활동 소식 작성</h2>

            {/* 활동 유형 */}
            <label className="block text-xs font-semibold text-gray-600 mb-1">활동 유형</label>
            <select
              value={postForm.activityType}
              onChange={e => setPostForm(f => ({ ...f, activityType: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
            >
              <option value="">선택 안함</option>
              <option value="전도">전도</option>
              <option value="봉사">봉사</option>
              <option value="예배">예배</option>
              <option value="친교">친교</option>
              <option value="기타">기타</option>
            </select>

            {/* 활동 날짜 */}
            <label className="block text-xs font-semibold text-gray-600 mb-1">활동 날짜</label>
            <div className="flex items-center gap-2 mb-1">
              <input
                type="date"
                value={postForm.activityDateFrom}
                onChange={e => setPostForm(f => ({ ...f, activityDateFrom: e.target.value }))}
                className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <span className="text-gray-400 text-sm flex-shrink-0">~</span>
              <input
                type="date"
                value={postForm.activityDateTo}
                min={postForm.activityDateFrom || undefined}
                onChange={e => setPostForm(f => ({ ...f, activityDateTo: e.target.value }))}
                className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            {postForm.activityDateFrom && postForm.activityDateTo && postForm.activityDateTo >= postForm.activityDateFrom && (
              <p className="text-xs text-indigo-500 mb-3">
                {Math.round((new Date(postForm.activityDateTo).getTime() - new Date(postForm.activityDateFrom).getTime()) / 86400000) + 1}일간
              </p>
            )}
            {!(postForm.activityDateFrom && postForm.activityDateTo) && <div className="mb-3" />}

            {/* 활동 장소 */}
            <label className="block text-xs font-semibold text-gray-600 mb-1">활동 장소</label>
            <input
              type="text"
              value={postForm.location}
              onChange={e => setPostForm(f => ({ ...f, location: e.target.value }))}
              placeholder="예: 해운대구 경로당"
              maxLength={50}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />

            {/* 참가자 명단 */}
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              참가자 명단
              {memberList.length > 0 && <span className="ml-1 text-indigo-500">{memberList.length}명</span>}
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={memberInput}
                onChange={e => setMemberInput(e.target.value)}
                onKeyDown={e => {
                  if ((e.key === 'Enter' || e.key === ',') && memberInput.trim()) {
                    e.preventDefault()
                    const name = memberInput.trim()
                    if (!memberList.includes(name)) setMemberList(l => [...l, name])
                    setMemberInput('')
                  }
                }}
                placeholder="이름 입력 후 Enter"
                className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <button
                type="button"
                onClick={() => {
                  const name = memberInput.trim()
                  if (name && !memberList.includes(name)) setMemberList(l => [...l, name])
                  setMemberInput('')
                }}
                className="px-3 py-2 bg-indigo-100 text-indigo-700 rounded-xl text-sm font-semibold"
              >
                추가
              </button>
            </div>
            {memberList.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {memberList.map((name, i) => (
                  <span key={i} className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs">
                    {name}
                    <button onClick={() => setMemberList(l => l.filter((_, j) => j !== i))} className="text-indigo-400 hover:text-red-400">×</button>
                  </span>
                ))}
              </div>
            )}
            {memberList.length === 0 && (
              <input
                type="number"
                value={postForm.participantCount}
                onChange={e => setPostForm(f => ({ ...f, participantCount: e.target.value }))}
                placeholder="명단 없이 인원 수만 입력"
                min={1}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            )}
            {memberList.length > 0 && <div className="mb-1" />}

            {/* 제목 */}
            <label className="block text-xs font-semibold text-gray-600 mb-1">제목 <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={postForm.title}
              onChange={e => setPostForm(f => ({ ...f, title: e.target.value }))}
              placeholder="활동 제목"
              maxLength={60}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />

            {/* 내용 */}
            <label className="block text-xs font-semibold text-gray-600 mb-1">내용 <span className="text-red-400">*</span></label>
            <textarea
              value={postForm.content}
              onChange={e => setPostForm(f => ({ ...f, content: e.target.value }))}
              placeholder="활동 내용을 입력해주세요"
              rows={4}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />

            <div className="flex gap-2">
              <button
                onClick={() => { setShowPostModal(false); setPostForm({ title: '', content: '', activityDateFrom: '', activityDateTo: '', location: '', participantCount: '', activityType: '' }); setMemberList([]); setMemberInput('') }}
                className="flex-1 py-3 rounded-xl border border-gray-300 text-sm text-gray-600 min-h-[44px]"
              >
                취소
              </button>
              <button
                onClick={submitPost}
                disabled={saving}
                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50 min-h-[44px]"
              >
                {saving ? '저장 중...' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 기도 요청 모달 ── */}
      {showPrayerModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4 sm:pb-0">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5">
            <h2 className="text-base font-bold text-gray-800 mb-4">기도 요청 올리기</h2>

            <label className="block text-xs font-semibold text-gray-600 mb-1">기도 제목 <span className="text-red-400">*</span></label>
            <textarea
              value={prayerForm.content}
              onChange={e => setPrayerForm(f => ({ ...f, content: e.target.value }))}
              placeholder="기도 요청 내용을 입력해주세요"
              rows={4}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm mb-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />

            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={prayerForm.isAnonymous}
                onChange={e => setPrayerForm(f => ({ ...f, isAnonymous: e.target.checked }))}
                className="w-4 h-4 rounded accent-indigo-600"
              />
              <span className="text-sm text-gray-600">익명으로 올리기</span>
            </label>

            <div className="flex gap-2">
              <button
                onClick={() => { setShowPrayerModal(false); setPrayerForm({ content: '', isAnonymous: false }) }}
                className="flex-1 py-3 rounded-xl border border-gray-300 text-sm text-gray-600 min-h-[44px]"
              >
                취소
              </button>
              <button
                onClick={submitPrayer}
                disabled={saving}
                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50 min-h-[44px]"
              >
                {saving ? '저장 중...' : '올리기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
