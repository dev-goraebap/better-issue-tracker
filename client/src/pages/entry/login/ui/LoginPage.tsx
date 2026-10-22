import { Text } from '@astryxdesign/core';
import { useNavigate } from '@tanstack/react-router';
import { SignInForm } from '@/features/sign-in';
import { AuthFrame } from '@/shared/ui';
export function LoginPage() {
  const navigate = useNavigate();
  return <AuthFrame title="로그인"><Text color="secondary">계정으로 로그인해 작업의 맥락을 이어가세요.</Text>
    <SignInForm onSignedIn={async () => { await navigate({ to: '/' }); }} />
    <Text type="supporting">새 계정은 워크스페이스 초대로 참여합니다. 계정 복구는 인스턴스 관리자에게 문의하세요.</Text>
  </AuthFrame>;
}
