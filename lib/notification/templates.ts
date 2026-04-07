/**
 * NHN Cloud 카카오 알림톡 템플릿 코드 상수
 *
 * 템플릿은 카카오 비즈니스 채널에서 사전 심사 승인 후 사용 가능합니다.
 * NHN Cloud 콘솔 > KakaoTalk Bizmessage > 알림톡 > 템플릿 관리에서 등록하세요.
 */

// ──────────────────────────────────────────────
// 템플릿 코드
// ──────────────────────────────────────────────

export const TEMPLATE_CODE = {
  /** 상담 요청 접수 확인 */
  COUNSEL_REQUEST: 'COUNSEL_REQ_01',

  /** 상담 배정 및 일정 확정 */
  COUNSEL_CONFIRM: 'COUNSEL_CNF_01',

  /** 순 모임방 초대 */
  CELL_INVITE: 'CELL_INV_01',

  /** 기도제목 아멘 알림 */
  PRAYER_AMEN: 'PRAYER_AMEN_01',

  /** 연속 기도 스트릭 종료 경고 */
  STREAK_LOST: 'STREAK_LOST_01',

  /** 예배 시작 30분 전 알림 */
  WORSHIP_REMINDER: 'WORSHIP_REM_01',

  /** 새벽기도 알람 */
  DAWN_PRAYER: 'DAWN_PRAY_01',
} as const

export type TemplateCode = (typeof TEMPLATE_CODE)[keyof typeof TEMPLATE_CODE]

// ──────────────────────────────────────────────
// 템플릿 변수 타입 정의
// ──────────────────────────────────────────────

export interface CounselRequestVars {
  /** 성도 이름 */
  name: string
  /** 접수 일시 (예: 2025-01-01 14:00) */
  requestedAt: string
  /** 상담 유형 (예: 신앙상담, 가정상담) */
  counselType: string
}

export interface CounselConfirmVars {
  /** 성도 이름 */
  name: string
  /** 담당 목사/부목사 이름 */
  counselorName: string
  /** 상담 일시 (예: 2025-01-05 오후 2시) */
  scheduledAt: string
  /** 상담 장소 또는 링크 */
  location: string
}

export interface CellInviteVars {
  /** 초대받는 성도 이름 */
  name: string
  /** 순장 이름 */
  leaderName: string
  /** 순 모임방 이름 */
  cellName: string
  /** 입장 링크 또는 방 번호 */
  roomUrl: string
}

export interface PrayerAmenVars {
  /** 기도제목 작성자 이름 */
  name: string
  /** 아멘한 성도 수 */
  amenCount: string
}

export interface StreakLostVars {
  /** 성도 이름 */
  name: string
  /** 마지막으로 기도한 날짜 */
  lastPrayedAt: string
}

export interface WorshipReminderVars {
  /** 예배 이름 (예: 주일 2부 예배) */
  worshipName: string
  /** 예배 시작 시각 (예: 오전 11시) */
  startTime: string
}

export interface DawnPrayerVars {
  /** 성도 이름 */
  name: string
}

// ──────────────────────────────────────────────
// 템플릿 코드 ↔ 변수 타입 매핑 (헬퍼)
// ──────────────────────────────────────────────

export type TemplateVarsMap = {
  [TEMPLATE_CODE.COUNSEL_REQUEST]: CounselRequestVars
  [TEMPLATE_CODE.COUNSEL_CONFIRM]: CounselConfirmVars
  [TEMPLATE_CODE.CELL_INVITE]: CellInviteVars
  [TEMPLATE_CODE.PRAYER_AMEN]: PrayerAmenVars
  [TEMPLATE_CODE.STREAK_LOST]: StreakLostVars
  [TEMPLATE_CODE.WORSHIP_REMINDER]: WorshipReminderVars
  [TEMPLATE_CODE.DAWN_PRAYER]: DawnPrayerVars
}
