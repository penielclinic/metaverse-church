'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AnonymousPost from '@/components/counsel/AnonymousPost'
import CounselCalendar from '@/components/counsel/CounselCalendar'
import PrivateChat from '@/components/counsel/PrivateChat'

interface Post {
  id: number
  title: string
  content: string
  category: string
  is_anonymous: boolean
  status: 'open' | 'in_progress' | 'closed'
  created_at: string
}

interface Booking {
  id: number
  counselor_id: string
  scheduled_at: string
  duration_min: number
  method: 'metaverse' | 'phone' | 'in_person'
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  counselor_name?: string
}

const STATUS_LABEL: Record<Post['status'], { label: string; color: string }> = {
  open: { label: '접수됨', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: '상담 중', color: 'bg-amber-100 text-amber-700' },
  closed: { label: '완료', color: 'bg-gray-100 text-gray-500' },
}

const BOOKING_STATUS_LABEL: Record<Booking['status'], { label: string; color: string }> = {
  pending: { label: '검토 중', color: 'bg-amber-100 text-amber-700' },
  confirmed: { label: '확정', color: 'bg-green-100 text-green-700' },
  cancelled: { label: '취소됨', color: 'bg-red-100 text-red-600' },
  completed: { label: '완료', color: 'bg-gray-100 text-gray-500' },
}

const METHOD_LABEL: Record<Booking['method'], string> = {
  metaverse: '메타버스 채팅',
  phone: '전화 상담',
  in_person: '대면 상담',
}

const CATEGORY_LABEL: Record<string, string> = {
  general: '일반',
  faith: '신앙',
  family: '가정',
  relationship: '관계',
  career: '직업/진로',
  health: '건강',
}

export default function CounselPage() {
  const supabase = createClient()

  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  const [showPostModal, setShowPostModal] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [chatBooking, setChatBooking] = useState<Booking | null>(null)

  const [activeTab, setActiveTab] = useState<'posts' | 'bookings'>('posts')

  const loadData = async (uid: string) => {
    const [postsRes, bookingsRes] = await Promise.all([
      supabase
        .from('counsel_posts')
        .select('id, title, content, category, is_anonymous, status, created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false }),
      supabase
        .from('counsel_bookings')
        .select('id, counselor_id, scheduled_at, duration_min, method, status')
        .eq('user_id', uid)
        .order('scheduled_at', { ascending: false }),
    ])

    if (postsRes.data) setPosts(postsRes.data as Post[])

    if (bookingsRes.data) {
      // 교역자 이름 추가 로드
      const counselorIds = Array.from(new Set(bookingsRes.data.map((b) => b.counselor_id)))
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', counselorIds)

      const nameMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.name]))
      setBookings(
        bookingsRes.data.map((b) => ({
          ...(b as Booking),
          counselor_name: nameMap[b.counselor_id] ?? '교역자',
        }))
      )
    }
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setMyUserId(user.id)
        loadData(user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })
  }, [])

  const handlePostSuccess = () => {
    setShowPostModal(false)
    if (myUserId) loadData(myUserId)
  }

  const handleBookSuccess = () => {
    setShowCalendar(false)
    if (myUserId) loadData(myUserId)
  }

  return (
    <div className="relative min-h-[calc(100vh-56px)] bg-gradient-to-b from-teal-50 to-indigo-50 px-4 py-6">
      {/* 헤더 */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-800">💬 상담실</h1>
        <p className="mt-1 text-sm text-gray-500" style={{ wordBreak: 'keep-all' }}>
          고민을 나누고, 교역자와 1:1 상담을 예약하세요
        </p>
      </div>

      {/* 주요 액션 버튼 */}
      <div className="flex gap-3 max-w-sm mx-auto mb-6">
        <button
          onClick={() => setShowPostModal(true)}
          className="flex-1 flex flex-col items-center gap-2 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md active:scale-95 transition-all"
        >
          <span className="text-3xl leading-none">📝</span>
          <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">익명 고민 올리기</span>
          <span className="text-xs text-gray-400 text-center" style={{ wordBreak: 'keep-all' }}>
            교역자에게 비공개로 전달돼요
          </span>
        </button>

        <button
          onClick={() => setShowCalendar(true)}
          className="flex-1 flex flex-col items-center gap-2 bg-indigo-600 rounded-2xl p-4 shadow-sm hover:bg-indigo-700 active:scale-95 transition-all"
        >
          <span className="text-3xl leading-none">📅</span>
          <span className="text-sm font-semibold text-white whitespace-nowrap">상담 예약하기</span>
          <span className="text-xs text-indigo-200 text-center" style={{ wordBreak: 'keep-all' }}>
            가능한 시간대를 선택하세요
          </span>
        </button>
      </div>

      {/* 탭 */}
      <div className="max-w-screen-md mx-auto">
        <div className="flex border-b border-gray-200 mb-4">
          {(['posts', 'bookings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={[
                'flex-1 py-2.5 text-sm font-semibold transition-colors',
                activeTab === tab
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-400 hover:text-gray-600',
              ].join(' ')}
            >
              {tab === 'posts' ? `고민 목록 (${posts.length})` : `예약 내역 (${bookings.length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">불러오는 중…</div>
        ) : !myUserId ? (
          <div className="text-center py-12 text-gray-500 text-sm" style={{ wordBreak: 'keep-all' }}>
            로그인 후 이용할 수 있습니다.
          </div>
        ) : (
          <>
            {/* 고민 목록 탭 */}
            {activeTab === 'posts' && (
              <div className="space-y-3">
                {posts.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-sm" style={{ wordBreak: 'keep-all' }}>
                    아직 올린 고민이 없어요.
                    <br />
                    고민을 올리면 교역자가 응답해 드립니다.
                  </div>
                ) : (
                  posts.map((post) => {
                    const st = STATUS_LABEL[post.status]
                    return (
                      <div
                        key={post.id}
                        className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3
                            className="text-sm font-semibold text-gray-800 flex-1"
                            style={{ wordBreak: 'keep-all' }}
                          >
                            {post.title}
                          </h3>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 whitespace-nowrap">
                              {CATEGORY_LABEL[post.category] ?? post.category}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${st.color}`}>
                              {st.label}
                            </span>
                          </div>
                        </div>
                        <p
                          className="text-sm text-gray-600 line-clamp-2"
                          style={{ wordBreak: 'keep-all' }}
                        >
                          {post.content}
                        </p>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                          <span className="text-xs text-gray-400">
                            {post.is_anonymous ? '익명' : '실명'}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(post.created_at).toLocaleDateString('ko-KR', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {/* 예약 내역 탭 */}
            {activeTab === 'bookings' && (
              <div className="space-y-3">
                {bookings.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-sm" style={{ wordBreak: 'keep-all' }}>
                    예약 내역이 없어요.
                    <br />
                    상담을 예약해 보세요.
                  </div>
                ) : (
                  bookings.map((booking) => {
                    const bst = BOOKING_STATUS_LABEL[booking.status]
                    const canChat = booking.status === 'confirmed' && booking.method === 'metaverse'
                    return (
                      <div
                        key={booking.id}
                        className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <p className="text-sm font-semibold text-gray-800 whitespace-nowrap">
                              {booking.counselor_name} 교역자
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {new Date(booking.scheduled_at).toLocaleString('ko-KR', {
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                timeZone: 'Asia/Seoul',
                              })}
                              {' · '}
                              {booking.duration_min}분
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 whitespace-nowrap">
                              {METHOD_LABEL[booking.method]}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${bst.color}`}>
                              {bst.label}
                            </span>
                          </div>
                        </div>

                        {canChat && (
                          <button
                            onClick={() => setChatBooking(booking)}
                            className="w-full mt-2 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-semibold hover:bg-indigo-100 transition-colors"
                          >
                            채팅 열기
                          </button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* 모달들 */}
      {showPostModal && (
        <AnonymousPost
          onClose={() => setShowPostModal(false)}
          onSuccess={handlePostSuccess}
        />
      )}

      {showCalendar && (
        <CounselCalendar
          onClose={() => setShowCalendar(false)}
          onSuccess={handleBookSuccess}
        />
      )}

      {chatBooking && myUserId && (
        <PrivateChat
          bookingId={chatBooking.id}
          myUserId={myUserId}
          counselorName={chatBooking.counselor_name ?? '교역자'}
          onClose={() => setChatBooking(null)}
        />
      )}
    </div>
  )
}
