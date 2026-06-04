'use client'

/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Post { id: number; content: string; pinned: boolean; created_at: string; elder_name: string; elder_id: string; amen_count: number; my_reacted: boolean }

export default function GratitudeWall({ myUserId }: { myUserId: string }) {
  const supabase = createClient()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const s = supabase as any
    const { data } = await s.from('elder_gratitude_posts').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(30)
    if (data) {
      const uids = Array.from(new Set<string>((data as any[]).map(x => x.elder_id)))
      const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', uids.length ? uids : ['__'])
      const nameMap: Record<string, string> = {}
      profiles?.forEach((p: any) => { nameMap[p.id] = p.name })

      const mapped: Post[] = []
      for (const p of data as any[]) {
        const { count } = await s.from('elder_gratitude_reactions').select('id', { count: 'exact', head: true }).eq('post_id', p.id)
        const { data: my } = await s.from('elder_gratitude_reactions').select('id').eq('post_id', p.id).eq('elder_id', myUserId).limit(1)
        mapped.push({ id: p.id, content: p.content, pinned: p.pinned, created_at: p.created_at, elder_id: p.elder_id, elder_name: nameMap[p.elder_id] ?? '장로', amen_count: count ?? 0, my_reacted: (my?.length ?? 0) > 0 })
      }
      setPosts(mapped)
    }
    setLoading(false)
  }

  async function submit() {
    if (!content.trim() || posting) return
    setPosting(true)
    await (supabase as any).from('elder_gratitude_posts').insert({ elder_id: myUserId, content: content.trim() })
    setContent(''); setPosting(false); load()
  }

  async function react(postId: number) {
    await (supabase as any).from('elder_gratitude_reactions').upsert({ post_id: postId, elder_id: myUserId, reaction: 'amen' }, { onConflict: 'post_id,elder_id' })
    load()
  }

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-xl space-y-2" style={{ background: 'rgba(30,27,75,0.8)', border: '1px solid rgba(251,191,36,0.2)' }}>
        <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="감사한 일을 나눠보세요 ✨" rows={2} maxLength={200}
          className="w-full px-3 py-2 rounded-lg bg-slate-800 text-sm text-slate-100 border border-slate-700 resize-none focus:outline-none" />
        <button onClick={submit} disabled={!content.trim() || posting} className="w-full py-2 rounded-lg bg-amber-600 text-white text-xs font-bold disabled:opacity-50">
          {posting ? '등록 중...' : '🙌 감사 나누기'}
        </button>
      </div>

      {posts.length === 0 ? (
        <p className="text-center text-sm text-slate-500 py-8" style={{ wordBreak: 'keep-all' }}>아직 감사 나눔이 없습니다.</p>
      ) : posts.map(p => (
        <div key={p.id} className="p-3 rounded-xl" style={{ background: p.pinned ? 'rgba(251,191,36,0.1)' : 'rgba(30,27,75,0.5)', border: `1px solid ${p.pinned ? 'rgba(251,191,36,0.3)' : 'rgba(251,191,36,0.1)'}` }}>
          {p.pinned && <p className="text-[10px] text-amber-400 font-bold mb-1">📌 고정</p>}
          <p className="text-sm text-slate-100 leading-relaxed" style={{ wordBreak: 'keep-all' }}>{p.content}</p>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-300 font-semibold whitespace-nowrap">{p.elder_name}</span>
              <span className="text-[10px] text-slate-500">{new Date(p.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', timeZone: 'Asia/Seoul' })}</span>
            </div>
            <button onClick={() => react(p.id)} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${p.my_reacted ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-300'}`}>
              🙏 {p.amen_count > 0 ? p.amen_count : '아멘'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
