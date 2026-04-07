/**
 * 알림톡 발송 테스트 엔드포인트
 * ⚠️  개발/스테이징 환경에서만 사용. 프로덕션 배포 전 제거 또는 비활성화할 것.
 *
 * POST /api/notification/test
 * Body: { to, templateCode, variables }
 */

import { NextRequest, NextResponse } from 'next/server'
import { sendAlimtalk } from '@/lib/notification/alimtalk'
import { TEMPLATE_CODE } from '@/lib/notification/templates'

// 프로덕션 환경에서는 이 엔드포인트를 완전히 차단
function isDevOrStaging(): boolean {
  return process.env.NODE_ENV !== 'production'
}

export async function POST(req: NextRequest) {
  if (!isDevOrStaging()) {
    return NextResponse.json(
      { error: '이 엔드포인트는 개발/스테이징 환경에서만 사용 가능합니다.' },
      { status: 403 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '잘못된 JSON 형식입니다.' }, { status: 400 })
  }

  const { to, templateCode, variables } = body as {
    to?: string
    templateCode?: string
    variables?: Record<string, string>
  }

  if (!to || !templateCode) {
    return NextResponse.json(
      { error: 'to(전화번호)와 templateCode는 필수입니다.' },
      { status: 400 }
    )
  }

  // templateCode 유효성 검사
  const validCodes = Object.values(TEMPLATE_CODE) as string[]
  if (!validCodes.includes(templateCode)) {
    return NextResponse.json(
      {
        error: `유효하지 않은 templateCode입니다. 사용 가능: ${validCodes.join(', ')}`,
      },
      { status: 400 }
    )
  }

  try {
    const result = await sendAlimtalk({ to, templateCode, variables })
    return NextResponse.json({
      success: true,
      requestId: result.message?.requestId,
      sendResults: result.message?.sendResults,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * GET /api/notification/test
 * 사용 가능한 템플릿 코드 목록 조회
 */
export async function GET() {
  if (!isDevOrStaging()) {
    return NextResponse.json(
      { error: '이 엔드포인트는 개발/스테이징 환경에서만 사용 가능합니다.' },
      { status: 403 }
    )
  }

  return NextResponse.json({
    availableTemplates: Object.entries(TEMPLATE_CODE).map(([key, code]) => ({
      key,
      code,
    })),
    exampleRequest: {
      to: '01012345678',
      templateCode: TEMPLATE_CODE.CELL_INVITE,
      variables: {
        name: '홍길동',
        leaderName: '김순장',
        cellName: '믿음순',
        roomUrl: 'https://meta.haeundaifg.or.kr/world/cell/1',
      },
    },
  })
}
