export default function GuidePage() {
  const sections = [
    {
      emoji: '🔑',
      title: '로그인',
      steps: [
        '카카오 계정으로 간편 로그인합니다.',
        '처음 접속하면 아바타를 설정할 수 있어요.',
      ],
    },
    {
      emoji: '🧑‍🎨',
      title: '아바타 꾸미기',
      steps: [
        '상단 "아바타" 버튼을 눌러 편집 화면으로 이동합니다.',
        '피부색, 머리 스타일, 의상, 악세서리를 자유롭게 바꿔보세요.',
        '변경 후 "저장" 버튼을 눌러야 반영됩니다.',
      ],
    },
    {
      emoji: '⛪',
      title: '예배 참여',
      steps: [
        '왼쪽 메뉴에서 "예배"를 선택합니다.',
        '주일예배 라이브가 시작되면 영상이 자동 표시됩니다.',
        '아멘, 박수, 할렐루야 버튼으로 실시간 반응할 수 있어요.',
        '영상의 ⬇ 버튼을 누르면 작은 화면으로 최소화되며, 드래그하여 이동할 수 있습니다.',
      ],
    },
    {
      emoji: '📖',
      title: '큐티 인증 (말씀 묵상)',
      steps: [
        '예배 페이지 하단 또는 챌린지 페이지에서 큐티를 인증합니다.',
        '오늘 읽은 말씀 구절과 묵상 내용을 입력하세요.',
        '하루 1회 인증 가능하며, 연속 인증 시 보너스 경험치를 받습니다.',
      ],
    },
    {
      emoji: '🙏',
      title: '기도실',
      steps: [
        '"기도실" 메뉴에서 기도 포스트잇을 작성합니다.',
        '다른 성도의 기도제목에 "아멘"으로 응답할 수 있어요.',
        '익명 기도도 가능합니다.',
      ],
    },
    {
      emoji: '🏆',
      title: '챌린지',
      steps: [
        '"챌린지" 메뉴에서 주간 챌린지를 확인합니다.',
        '챌린지를 완료하면 경험치(EXP)와 뱃지를 획득합니다.',
        '출석 인증 버튼으로 매일 출석 체크를 해보세요.',
      ],
    },
    {
      emoji: '👥',
      title: '소그룹 (순 모임)',
      steps: [
        '"소그룹" 메뉴에서 내 순/반을 확인합니다.',
        '아직 순 배치가 안 되었다면 신청할 수 있습니다.',
        '순장이 승인하면 소그룹 활동에 참여할 수 있어요.',
      ],
    },
    {
      emoji: '🛍️',
      title: '나눔장터',
      steps: [
        '성도 간 물품이나 재능을 나눌 수 있는 공간입니다.',
        '나눔 글을 작성하고, 관심 있는 항목에 연락해보세요.',
      ],
    },
    {
      emoji: '🖼️',
      title: '갤러리',
      steps: [
        '교회 행사 사진과 추억을 함께 볼 수 있습니다.',
      ],
    },
    {
      emoji: '⭐',
      title: '경험치(EXP)와 레벨',
      steps: [
        '큐티 인증, 챌린지, 예배 참석 등 활동으로 EXP를 획득합니다.',
        'EXP가 쌓이면 레벨이 올라가요.',
        '상단 HUD에서 현재 레벨과 경험치를 확인할 수 있습니다.',
      ],
    },
  ]

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gradient-to-b from-blue-50 to-indigo-50 px-4 py-6">
      <div className="max-w-screen-md mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">📘 사용설명서</h1>
          <p className="mt-1 text-sm text-gray-500" style={{ wordBreak: 'keep-all' }}>
            이음 메타버스의 주요 기능과 사용법을 안내합니다
          </p>
        </div>

        <div className="space-y-4">
          {sections.map((section) => (
            <div
              key={section.title}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5"
            >
              <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span className="text-xl">{section.emoji}</span>
                <span className="whitespace-nowrap">{section.title}</span>
              </h2>
              <ol className="space-y-2">
                {section.steps.map((step, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-gray-700">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <span style={{ wordBreak: 'keep-all' }}>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>

        <div className="h-6" />
      </div>
    </div>
  )
}
