# 이음 메타버스 (Eum Metaverse) — CLAUDE.md

> 해운대순복음교회 통합 메타버스 플랫폼
> 담임목사: 유진성 | 성도 798명 | 셀 44개 | 선교회 12개

---

## 🎯 프로젝트 개요

**이음 메타버스**는 해운대순복음교회 성도들이 시공간을 초월해 예배·교제·사역을 함께 경험하는
웹 기반 3D 가상 교회 플랫폼이다. 기존 이음(Eum) 통합 플랫폼(주보·장학·순보고·대심방)과
완전히 연동되며, 브라우저에서 즉시 접속 가능한 것을 최우선으로 한다.

---

## 🛠️ 기술 스택

### 프론트엔드
```
Next.js 14 (App Router)
React Three Fiber + Three.js     ← 3D 렌더링 엔진
@react-three/drei                ← Three.js 헬퍼 컴포넌트
Zustand                          ← 클라이언트 전역 상태 (아바타, 위치)
TailwindCSS                      ← UI 스타일링
shadcn/ui                        ← 공통 UI 컴포넌트
```

### 백엔드 / 인프라
```
Supabase
  ├── PostgreSQL     ← 아바타, 사용자, 공간, 기도제목 데이터
  ├── Realtime       ← 아바타 실시간 위치 동기화 (Presence)
  ├── Auth           ← 카카오 소셜 로그인 (기존 이음 Auth 재사용)
  └── Storage        ← 아바타 이미지, 공간 에셋

Socket.io (Vercel Edge / Supabase Realtime 대체 가능)
  └── 실시간 멀티플레이어 위치·채팅·반응

Vercel                            ← 배포 (Edge Functions 활용)
```

### 외부 연동
```
카카오 소셜 로그인    ← 기존 이음 Auth 그대로 재사용
카카오 알림톡 (NHN Cloud)  ← 예배·셀모임 입장 알림
토스 페이먼츠 v2      ← 메타버스 내 헌금 기능
Anthropic Claude API  ← 설교 요약, 기도문 생성, AI 목양
순보고 API            ← 셀모임방 출석 자동 연동
```

---

## 🗂️ 디렉터리 구조

```
eum-metaverse/
├── app/
│   ├── (auth)/
│   │   └── login/              ← 카카오 로그인
│   ├── world/
│   │   ├── page.tsx            ← 메인 월드 맵 (2.5D 탑뷰 → 3D)
│   │   ├── sanctuary/          ← 본당 (예배 공간)
│   │   ├── plaza/              ← 교제 광장
│   │   ├── cell/[id]/          ← 셀/순 모임방 (44개)
│   │   ├── prayer/             ← 기도실
│   │   ├── library/            ← 설교 아카이브
│   │   └── scholarship/        ← 장학관
│   └── api/
│       ├── avatar/             ← 아바타 CRUD
│       ├── presence/           ← 실시간 위치 동기화
│       ├── prayer/             ← 기도제목 API
│       └── offering/           ← 헌금 처리 (토스 연동)
│
├── components/
│   ├── world/
│   │   ├── WorldCanvas.tsx     ← R3F 메인 캔버스
│   │   ├── Avatar.tsx          ← 아바타 3D 컴포넌트
│   │   ├── OtherAvatars.tsx    ← 타 성도 아바타
│   │   ├── ProximityChat.tsx   ← 근접 음성 채팅
│   │   └── SpaceName.tsx       ← 공간 이름 표시
│   ├── spaces/
│   │   ├── Sanctuary.tsx       ← 본당 공간
│   │   ├── Plaza.tsx           ← 교제광장
│   │   ├── CellRoom.tsx        ← 순 모임방
│   │   └── PrayerRoom.tsx      ← 기도실
│   └── ui/
│       ├── HUD.tsx             ← 화면 상단 상태바
│       ├── ChatBubble.tsx      ← 말풍선
│       ├── MiniMap.tsx         ← 미니맵
│       └── EmojiReaction.tsx   ← 반응 버튼 (아멘·박수·기도)
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── presence.ts         ← Realtime Presence 훅
│   ├── socket/
│   │   └── client.ts           ← Socket.io 클라이언트
│   ├── three/
│   │   ├── avatarMaker.ts      ← 아바타 생성 유틸
│   │   └── collision.ts        ← 충돌 감지
│   └── ai/
│       └── claude.ts           ← Anthropic API 호출
│
├── store/
│   ├── avatarStore.ts          ← 내 아바타 상태
│   ├── worldStore.ts           ← 현재 공간·위치
│   └── chatStore.ts            ← 채팅 메시지
│
└── supabase/
    └── migrations/
        ├── 001_avatars.sql
        ├── 002_spaces.sql
        ├── 003_prayer_notes.sql
        ├── 004_chat_messages.sql
        └── 005_offerings.sql
```

---

## 🗃️ 데이터베이스 스키마

```sql
-- 사용자 프로필 (이음 플랫폼 공통)
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users,
  name        TEXT NOT NULL,
  phone       TEXT,
  role        TEXT CHECK (role IN ('member', 'cell_leader', 'mission_leader', 'pastor')),
  cell_id     INTEGER REFERENCES cells(id),
  mission_id  INTEGER REFERENCES missions(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 아바타
CREATE TABLE avatars (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID UNIQUE REFERENCES profiles(id),
  skin_tone   TEXT DEFAULT 'medium',
  hair_style  TEXT DEFAULT 'short',
  outfit      TEXT DEFAULT 'casual',
  badge       TEXT,                -- 순장·선교회장·목사 뱃지
  level       INTEGER DEFAULT 1,  -- 신앙 성장 레벨
  glow        BOOLEAN DEFAULT FALSE, -- 예배 참석 시 발광
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 가상 공간
CREATE TABLE spaces (
  id          SERIAL PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,  -- 'sanctuary', 'plaza', 'cell-1' ...
  name        TEXT NOT NULL,
  type        TEXT CHECK (type IN ('sanctuary','plaza','cell','prayer','library','scholarship')),
  capacity    INTEGER DEFAULT 50,
  cell_id     INTEGER REFERENCES cells(id),  -- 셀 모임방인 경우
  is_active   BOOLEAN DEFAULT TRUE
);

-- 실시간 접속자 위치 (Supabase Presence 보조)
CREATE TABLE presence_log (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES profiles(id),
  space_id    INTEGER REFERENCES spaces(id),
  pos_x       FLOAT DEFAULT 0,
  pos_z       FLOAT DEFAULT 0,
  entered_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 기도 제목 포스트잇
CREATE TABLE prayer_notes (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES profiles(id),
  content     TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT FALSE,
  amen_count  INTEGER DEFAULT 0,
  pos_x       FLOAT,  -- 기도실 벽 위치
  pos_y       FLOAT,
  color       TEXT DEFAULT 'yellow',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 채팅 메시지
CREATE TABLE chat_messages (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES profiles(id),
  space_id    INTEGER REFERENCES spaces(id),
  content     TEXT NOT NULL,
  type        TEXT CHECK (type IN ('text','emoji','system')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 헌금 (메타버스 내)
CREATE TABLE offerings (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES profiles(id),
  amount      INTEGER NOT NULL,
  type        TEXT CHECK (type IN ('주일헌금','감사헌금','선교헌금')),
  toss_order_id TEXT UNIQUE,
  status      TEXT DEFAULT 'pending',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 셀 (순) — 기존 순보고 스키마 재사용
CREATE TABLE cells (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  leader_id   UUID REFERENCES profiles(id),
  mission_id  INTEGER REFERENCES missions(id)
);

-- 선교회
CREATE TABLE missions (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  leader_id   UUID REFERENCES profiles(id)
);
```

---

## 🔐 RBAC 권한 체계

| 역할 | slug | 권한 |
|------|------|------|
| 담임목사 | `pastor` | 모든 공간 관리, 전체 성도 조회, 방송 제어 |
| 선교회장 | `mission_leader` | 소속 선교회 공간 관리, 선교회원 조회 |
| 순장 | `cell_leader` | 소속 순 모임방 개설·관리, 순원 출석 체크 |
| 성도 | `member` | 공개 공간 입장, 기도 포스트잇, 채팅 |

```sql
-- RLS 예시: 셀 모임방은 해당 셀 멤버만 입장
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cell_chat_policy" ON chat_messages
  FOR ALL USING (
    space_id IN (
      SELECT s.id FROM spaces s
      JOIN cells c ON s.cell_id = c.id
      JOIN profiles p ON p.cell_id = c.id
      WHERE p.id = auth.uid()
    )
    OR
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('pastor', 'mission_leader')
  );
```

---

## 🎮 아바타 이동 방식

### Phase 1 — 클릭 이동 (MVP)
```
- 바닥 클릭 → 해당 위치로 아바타 이동
- 장년층 접근성 최우선
- Three.js Raycaster로 클릭 좌표 계산
- Supabase Realtime Presence로 위치 브로드캐스트
```

### Phase 2 — 키보드/터치 이동
```
- WASD / 화살표 키 이동
- 모바일 조이스틱 (nipplejs)
- 카메라: OrbitControls → 3인칭 추적 카메라
```

### 실시간 위치 동기화
```typescript
// Supabase Presence 활용
const channel = supabase.channel(`space:${spaceId}`)

channel.on('presence', { event: 'sync' }, () => {
  const state = channel.presenceState()
  // 모든 접속자 위치 업데이트
  updateOtherAvatars(state)
})

await channel.track({
  user_id: profile.id,
  name: profile.name,
  avatar: avatar,
  pos_x: position.x,
  pos_z: position.z,
})
```

---

## 🤖 AI 기능 (Anthropic Claude API)

| 기능 | 설명 | 트리거 |
|------|------|--------|
| **설교 요약** | 주보 설교문 → 3줄 요약 | 도서관 입장 시 |
| **기도문 생성** | 기도 제목 입력 → 완성된 기도문 | 기도실 내 버튼 |
| **AI 목양 상담** | 성도 고민 → 말씀 기반 위로 | 상담실 챗봇 |
| **셀 리포트 요약** | 순보고 데이터 → 주간 요약 | 순장 대시보드 |

```typescript
// lib/ai/claude.ts
export async function generatePrayer(prayerRequest: string) {
  const response = await fetch('/api/ai/prayer', {
    method: 'POST',
    body: JSON.stringify({ request: prayerRequest })
  })
  return response.json()
}

// app/api/ai/prayer/route.ts
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: Request) {
  const { request } = await req.json()
  const client = new Anthropic()

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `다음 기도제목으로 진심 어린 기도문을 작성해줘 (해운대순복음교회 성도를 위한): ${request}`
    }]
  })

  return Response.json({ prayer: message.content[0].text })
}
```

---

## 🔔 알림 시스템 (NHN Cloud 카카오 알림톡)

```
예배 시작 30분 전   → "오늘 주일예배가 30분 후 시작됩니다. 이음 메타버스에서 함께해요 🙏"
셀 모임 초대        → "[순장 {name}]님이 순 모임방에 초대했습니다"
기도 아멘 알림      → "내 기도제목에 {n}명이 아멘으로 응답했습니다"
새벽기도 알람       → "새벽 5시 기도실이 열렸습니다"
```

---

## 📦 MVP 범위 (Phase 1)

**목표: 8주 내 배포 가능한 최소 기능**

- [x] 카카오 로그인 + 프로필 설정
- [x] 아바타 기본 커스터마이징 (피부·머리·옷)
- [x] 교제광장 — 클릭 이동 + 실시간 타 성도 아바타 표시
- [x] 근접 텍스트 채팅 (가까이 가면 대화 가능)
- [x] 기도실 — 기도 포스트잇 작성·아멘 반응
- [x] 본당 — 유튜브 라이브 스트리밍 임베드 + 아바타 반응 (아멘·박수)
- [x] 순 모임방 — 순장만 개설, 순원 초대, 순보고 출석 연동

**Phase 1 제외 (이후 추가)**
- 음성 채팅 (WebRTC)
- 헌금 기능 (토스 페이먼츠)
- AI 목양 상담
- VR/AR 지원

---

## ⚙️ 환경 변수

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# 카카오
KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=

# 토스 페이먼츠
TOSS_CLIENT_KEY=
TOSS_SECRET_KEY=

# NHN Cloud (알림톡)
NHN_APP_KEY=
NHN_SECRET_KEY=
NHN_SENDER_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# 순보고 API 연동
SUNBOGO_API_URL=
SUNBOGO_API_SECRET=
```

---

## 🚀 배포 전략

```
개발   → localhost:3000
스테이징 → eum-meta-staging.vercel.app
프로덕션 → meta.haeundaifg.or.kr  (or eum.church)

GitHub main 브랜치 push → Vercel 자동 배포
Supabase migrations → supabase db push
```

---

## 📋 개발 원칙

1. **장년층 UX 최우선** — 버튼 최소 48px, 텍스트 최소 16px, 단순한 클릭 조작
2. **점진적 3D** — Phase 1은 2.5D 탑뷰, 안정화 후 3D 전환
3. **이음 플랫폼 통합** — 별도 Auth·DB 만들지 말고 기존 이음 스키마 확장
4. **오프라인 대비** — 연결 끊겨도 기도 포스트잇·채팅 로컬 임시 저장
5. **모바일 퍼스트** — 교인 대부분 스마트폰 접속, Three.js 성능 최적화 필수
6. **Supabase Realtime 우선** — Socket.io는 Realtime으로 불가할 때만 도입
7. **GSD 방식 개발** — 기능 단위 spec 작성 후 Claude Code로 구현
8. **모든 사용자는 성도** — 메타버스에 접속한 모든 사람(목사·전도사·장로·집사 포함)은 성도(member)로 통칭한다. 카카오 로그인 시 role은 'member'로 자동 생성되며, 특수 역할(pastor 등)은 관리자 페이지에서 수동 부여한다.
