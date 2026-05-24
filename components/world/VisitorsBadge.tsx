'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AvatarPreview, { type SkinTone, type Gender, type Outfit } from './AvatarPreview'

interface Visitor {
  id: string
  name: string
  skinTone: SkinTone
  gender: Gender
  hairStyle: string
  outfit: Outfit
  eyeMakeup: string
  glasses: string
  earring: string
  necklace: string
  hat: string
}

export default function VisitorsBadge() {
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [total, setTotal] = useState(0)

  useEffect(() => {
    async function load() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any

      const [{ count }, { data }] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase
          .from('profiles')
          .select('id, name, avatars(skin_tone, gender, hair_style, outfit, eye_makeup, glasses, earring, necklace, hat)')
          .order('created_at', { ascending: false })
          .limit(6),
      ])

      setTotal(count ?? 0)
      setVisitors(
        (data ?? []).map((p: any) => ({
          id: p.id,
          name: p.name,
          skinTone:  p.avatars?.skin_tone  ?? 'medium',
          gender:    p.avatars?.gender     ?? 'male',
          hairStyle: p.avatars?.hair_style ?? 'short',
          outfit:    p.avatars?.outfit     ?? 'casual',
          eyeMakeup: p.avatars?.eye_makeup ?? 'none',
          glasses:   p.avatars?.glasses    ?? 'none',
          earring:   p.avatars?.earring    ?? 'none',
          necklace:  p.avatars?.necklace   ?? 'none',
          hat:       p.avatars?.hat        ?? 'none',
        }))
      )
    }
    load()
  }, [])

  if (total === 0) return null

  const shown = visitors.slice(0, 5)
  const extra = total - shown.length

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm mb-6">
      {/* 스택 아바타 */}
      <div className="flex -space-x-2.5">
        {shown.map((v) => (
          <div
            key={v.id}
            title={v.name}
            className="w-10 h-10 rounded-full border-2 border-white bg-indigo-50 overflow-hidden flex-shrink-0 shadow-sm"
          >
            <AvatarPreview
              skinTone={v.skinTone}
              gender={v.gender}
              hairStyle={v.hairStyle}
              outfit={v.outfit}
              eyeMakeup={v.eyeMakeup}
              glasses={v.glasses}
              earring={v.earring}
              necklace={v.necklace}
              hat={v.hat}
              size={40}
              faceOnly
            />
          </div>
        ))}
        {extra > 0 && (
          <div className="w-10 h-10 rounded-full border-2 border-white bg-indigo-100 flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-[10px] font-bold text-indigo-600 leading-none">+{extra}</span>
          </div>
        )}
      </div>

      {/* 텍스트 */}
      <div className="min-w-0">
        <p className="text-sm font-bold text-gray-800 whitespace-nowrap">
          {total.toLocaleString()}명
        </p>
        <p className="text-xs text-gray-400" style={{ wordBreak: 'keep-all' }}>
          지금까지 접속한 성도들
        </p>
      </div>
    </div>
  )
}
