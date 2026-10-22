import { useState } from 'react';
import { Button, Text } from '@astryxdesign/core';
import { Link } from '@tanstack/react-router';
import { CompactDialog } from '@/shared/ui';
import styles from './app-shell.module.css';
export function AgentBar() {
  const [open, setOpen] = useState(false);
  return <footer className={styles.agentBar} aria-label="에이전트 연결"><i className={styles.barcode} aria-hidden="true" /><button type="button" className={styles.agentButton} onClick={() => setOpen(true)}>✧ Agent</button>
    <CompactDialog isOpen={open} onClose={() => setOpen(false)} title="에이전트 연결" footer={<Button label="닫기" onClick={() => setOpen(false)} />}>
      <Text>API 키로 에이전트에 내 업무 권한을 부여할 수 있습니다. MCP 연결 안내는 후속 작업에서 제공됩니다.</Text><Link to="/settings/api-keys" onClick={() => setOpen(false)}>API 키 관리</Link>
    </CompactDialog>
  </footer>;
}
