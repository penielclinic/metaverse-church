# 이음 메타버스 (Eum Metaverse)

해운대순복음교회 성도들이 시공간을 초월해 예배·교제·사역을 함께 경험하는 웹 기반 가상 교회 플랫폼.

---

## 로컬 실행 방법

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 아래 값을 입력합니다.

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# 카카오 소셜 로그인
KAKAO_CLIENT_ID=<REST API 키>
KAKAO_CLIENT_SECRET=<카카오 클라이언트 시크릿>

# NHN Cloud 카카오 알림톡
NHN_APP_KEY=<NHN Cloud 앱키>
NHN_SECRET_KEY=<NHN Cloud 시크릿키>
NHN_SENDER_KEY=<카카오 채널 발신 프로필 키>

# Anthropic (AI 기도문·설교 요약)
ANTHROPIC_API_KEY=<sk-ant-...>

# YouTube (본당 라이브 스트림)
YOUTUBE_API_KEY=<YouTube Data API v3 키>
```

### 3. Supabase 마이그레이션 적용

```bash
npx supabase db push
```

> Supabase CLI가 없으면: `npm install -g supabase`

### 4. 개발 서버 시작

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속.

---

## 환경변수 상세 설명

| 변수명 | 필수 | 설명 | 발급 위치 |
|--------|------|------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase 프로젝트 URL | Supabase 대시보드 → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase 공개 anon 키 | Supabase 대시보드 → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase 서버 전용 키 | Supabase 대시보드 → Settings → API |
| `KAKAO_CLIENT_ID` | ✅ | 카카오 REST API 키 | [카카오 개발자 콘솔](https://developers.kakao.com) → 내 앱 → 앱 키 |
| `KAKAO_CLIENT_SECRET` | ✅ | 카카오 클라이언트 시크릿 | 카카오 개발자 콘솔 → 보안 |
| `NHN_APP_KEY` | ⬜ | NHN Cloud 알림톡 앱키 | [NHN Cloud 콘솔](https://console.nhncloud.com) → KakaoTalk Bizmessage |
| `NHN_SECRET_KEY` | ⬜ | NHN Cloud 시크릿키 | NHN Cloud 콘솔 → KakaoTalk Bizmessage |
| `NHN_SENDER_KEY` | ⬜ | 카카오 비즈니스 채널 발신 프로필 키 | NHN Cloud 콘솔 → 발신 프로필 관리 |
| `ANTHROPIC_API_KEY` | ⬜ | Claude API 키 | [Anthropic Console](https://console.anthropic.com) |
| `YOUTUBE_API_KEY` | ⬜ | YouTube Data API v3 키 | [Google Cloud Console](https://console.cloud.google.com) |

> ✅ 필수 · ⬜ 선택 (해당 기능 비활성화 시 불필요)

---

## 배포 방법

### Vercel 자동 배포 (권장)

```bash
# 최초 1회 — Vercel CLI 설치 및 배포
npm install -g vercel
vercel --prod
```

이후 `main` 브랜치에 push하면 Vercel이 자동 배포합니다.

```bash
git add .
git commit -m "feat: ..."
git push origin main
```

**Vercel 환경변수 설정:**
Vercel 대시보드 → 프로젝트 → Settings → Environment Variables에서
`.env.local`의 모든 변수를 `Production` + `Preview` 환경에 등록합니다.

### Supabase 마이그레이션 (프로덕션)

```bash
npx supabase db push --db-url postgresql://postgres:<password>@<host>:5432/postgres
```

---

## 주요 기능

| 기능 | 경로 | 설명 |
|------|------|------|
| 메인 로비 | `/world` | 공간 선택 허브 |
| 본당 | `/world/sanctuary` | 유튜브 라이브 + 큐티 피드 |
| 기도실 | `/world/prayer` | 기도 포스트잇 + Realtime 아멘 |
| 상담실 | `/world/counsel` | 익명 고민 게시판 + 1:1 예약 상담 |
| 챌린지 | `/world/challenge` | 신앙 성장 챌린지 + 뱃지 |
| 순 모임방 | `/world/cell/[id]` | 셀별 모임 공간 (셀원 전용) |

---

## 기술 스택

- **프레임워크**: Next.js 14 (App Router)
- **데이터베이스**: Supabase (PostgreSQL + Realtime + Auth)
- **스타일**: TailwindCSS + shadcn/ui
- **상태 관리**: Zustand
- **알림**: NHN Cloud 카카오 알림톡
- **AI**: Anthropic Claude API
- **배포**: Vercel
