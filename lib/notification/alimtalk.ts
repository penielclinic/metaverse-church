/**
 * NHN Cloud 카카오 알림톡 REST API 연동
 * https://docs.nhncloud.com/ko/Notification/KakaoTalk-Bizmessage/ko/alimtalk-api-guide/
 */

const NHN_BASE_URL = 'https://api-alimtalk.cloud.toast.com'
const API_VERSION = 'v2.2'

interface AlimtalkVariable {
  [key: string]: string
}

interface SendAlimtalkParams {
  to: string                    // 수신자 전화번호 (01012345678)
  templateCode: string          // 템플릿 코드
  variables?: AlimtalkVariable  // 템플릿 변수
}

interface NhnRecipient {
  recipientNo: string
  templateParameter?: AlimtalkVariable
}

interface NhnAlimtalkRequest {
  plusFriendId: string
  templateCode: string
  recipientList: NhnRecipient[]
}

interface NhnAlimtalkResponse {
  header: {
    resultCode: number
    resultMessage: string
    isSuccessful: boolean
  }
  message?: {
    requestId: string
    senderGroupingKey?: string
    sendResults: Array<{
      recipientSeq: number
      recipientNo: string
      resultCode: number
      resultMessage: string
      recipientGroupingKey?: string
    }>
  }
}

function getAuthHeader(): string {
  const appKey = process.env.NHN_APP_KEY
  const secretKey = process.env.NHN_SECRET_KEY

  if (!appKey || !secretKey) {
    throw new Error('NHN_APP_KEY 또는 NHN_SECRET_KEY 환경변수가 설정되지 않았습니다.')
  }

  // NHN Cloud SecretKey 인증 방식
  return secretKey
}

/**
 * 알림톡 단건 발송
 */
export async function sendAlimtalk({
  to,
  templateCode,
  variables = {},
}: SendAlimtalkParams): Promise<NhnAlimtalkResponse> {
  const appKey = process.env.NHN_APP_KEY
  const senderKey = process.env.NHN_SENDER_KEY

  if (!appKey || !senderKey) {
    throw new Error('NHN Cloud 환경변수가 설정되지 않았습니다.')
  }

  // 전화번호 정규화 (010-1234-5678 → 01012345678)
  const normalizedPhone = to.replace(/[^0-9]/g, '')

  const body: NhnAlimtalkRequest = {
    plusFriendId: senderKey,
    templateCode,
    recipientList: [
      {
        recipientNo: normalizedPhone,
        templateParameter: variables,
      },
    ],
  }

  const url = `${NHN_BASE_URL}/${API_VERSION}/appkeys/${appKey}/messages`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'X-Secret-Key': getAuthHeader(),
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`NHN Cloud API 오류 (${res.status}): ${errorText}`)
  }

  const result: NhnAlimtalkResponse = await res.json()

  if (!result.header.isSuccessful) {
    throw new Error(
      `알림톡 발송 실패: [${result.header.resultCode}] ${result.header.resultMessage}`
    )
  }

  return result
}

/**
 * 알림톡 다건 발송 (최대 1000명)
 */
export async function sendAlimtalkBulk(
  recipients: SendAlimtalkParams[]
): Promise<NhnAlimtalkResponse> {
  if (recipients.length === 0) return Promise.reject(new Error('수신자가 없습니다.'))
  if (recipients.length > 1000) throw new Error('한 번에 최대 1000명까지 발송 가능합니다.')

  const appKey = process.env.NHN_APP_KEY
  const senderKey = process.env.NHN_SENDER_KEY

  if (!appKey || !senderKey) {
    throw new Error('NHN Cloud 환경변수가 설정되지 않았습니다.')
  }

  // 같은 templateCode만 일괄 발송 가능
  const templateCode = recipients[0].templateCode
  const allSameTemplate = recipients.every((r) => r.templateCode === templateCode)
  if (!allSameTemplate) {
    throw new Error('일괄 발송 시 모든 수신자의 templateCode가 동일해야 합니다.')
  }

  const body: NhnAlimtalkRequest = {
    plusFriendId: senderKey,
    templateCode,
    recipientList: recipients.map((r) => ({
      recipientNo: r.to.replace(/[^0-9]/g, ''),
      templateParameter: r.variables ?? {},
    })),
  }

  const url = `${NHN_BASE_URL}/${API_VERSION}/appkeys/${appKey}/messages`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'X-Secret-Key': getAuthHeader(),
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`NHN Cloud API 오류 (${res.status}): ${errorText}`)
  }

  const result: NhnAlimtalkResponse = await res.json()

  if (!result.header.isSuccessful) {
    throw new Error(
      `알림톡 발송 실패: [${result.header.resultCode}] ${result.header.resultMessage}`
    )
  }

  return result
}
