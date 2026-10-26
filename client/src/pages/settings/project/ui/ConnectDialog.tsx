import { useState } from 'react';
import { Button, TextInput } from '@astryxdesign/core';
import { useQueryClient } from '@tanstack/react-query';
import { authError } from '@/shared/api';
import { CompactDialog, FormMessage } from '@/shared/ui';
import type { Project } from '@/entities/project';
import { connectRepository, PROVIDERS, ProviderMark, refreshIntegrations, reviseIntegration, type Integration, type Provider } from '@/entities/repository';
import styles from './project-settings.module.css';

/**
 * Connecting a repository (짧은 창, D-087), or giving a connected one a new token: the host's address (GitLab and Gitea
 * may be self-hosted; GitHub and GitLab start at their public sites), the repository as owner/name (a pasted address is
 * read too) and a token, with what the token must be allowed and where to make one. The server asks the host before it
 * keeps anything, so a wrong token or name comes back as the host's reason.
 */
export function ConnectDialog({ project, provider, integration, onClose }: {
  project: Project; provider: Provider; integration?: Integration; onClose: (connected?: Integration) => void;
}) {
  const client = useQueryClient();
  const host = PROVIDERS.find(each => each.value === provider)!;
  const [baseUrl, setBaseUrl] = useState(integration?.baseUrl ?? host.defaultUrl);
  const [repository, setRepository] = useState(integration?.repository ?? '');
  const [token, setToken] = useState('');
  const [isChecked, setChecked] = useState(false);
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isTokenOnly = !!integration;
  const urlError = isChecked && host.needsUrl && !/^https?:\/\/\S+/.test(baseUrl.trim()) ? '주소를 http(s)://부터 입력해 주세요.' : undefined;
  const repositoryError = isChecked && !isTokenOnly && !repository.trim() ? '저장소를 입력해 주세요.' : undefined;
  const tokenError = isChecked && !token.trim() ? '토큰을 입력해 주세요.' : undefined;
  const save = async () => {
    setChecked(true);
    if (isBusy || urlError || (host.needsUrl && !baseUrl.trim()) || (!isTokenOnly && !repository.trim()) || !token.trim()) return;
    setBusy(true); setError('');
    try {
      const saved = integration
        ? await reviseIntegration(project.workspaceId, project.id, integration.id, { expectedVersion: integration.version, token: token.trim() })
        : await connectRepository(project.workspaceId, project.id, { provider, baseUrl: baseUrl.trim() || null, repository: repository.trim(), token: token.trim() });
      await refreshIntegrations(client, project.workspaceId, project.id);
      onClose(saved);
    } catch (failure) { setError(authError(failure)); }
    finally { setBusy(false); }
  };
  const tokenPage = host.tokenUrl((baseUrl.trim() || host.defaultUrl).replace(/\/+$/, ''));
  return <CompactDialog isOpen title={isTokenOnly ? `${host.name} 토큰 바꾸기` : `${host.name} 저장소 연결`} width={560} isBusy={isBusy}
    onClose={() => { if (!isBusy) onClose(); }} onSubmit={() => { void save(); }}
    footer={<><Button label="취소" variant="ghost" onClick={() => onClose()} isDisabled={isBusy} />
      <Button type="submit" label={isTokenOnly ? '토큰 바꾸기' : '연결하기'} variant="primary" isLoading={isBusy} /></>}>
    <p className={styles.connectLead}><span className={styles.connectMark}><ProviderMark provider={provider} size="1.25rem" /></span>{host.hint}</p>
    {!isTokenOnly && <>
      <TextInput label="주소" value={baseUrl} onChange={setBaseUrl} isRequired={host.needsUrl} isDisabled={isBusy} placeholder={host.needsUrl ? 'https://git.example.com' : host.defaultUrl}
        description={host.needsUrl ? 'Gitea가 열리는 주소입니다.' : `${host.defaultUrl}이 아니면 직접 운영하는 주소를 넣어 주세요.`}
        status={urlError ? { type: 'error', message: urlError } : undefined} />
      <TextInput label="저장소" value={repository} onChange={setRepository} isRequired hasAutoFocus isDisabled={isBusy}
        placeholder={provider === 'gitlab' ? 'group/project' : 'owner/repository'} description="주소를 그대로 붙여 넣어도 됩니다."
        status={repositoryError ? { type: 'error', message: repositoryError } : undefined} />
    </>}
    <TextInput label="토큰" type="password" value={token} onChange={setToken} isRequired hasAutoFocus={isTokenOnly} isDisabled={isBusy}
      description={`${host.scopes}.`} status={tokenError ? { type: 'error', message: tokenError } : undefined} />
    <p className={styles.connectNote}>
      <a href={tokenPage} target="_blank" rel="noreferrer noopener">{host.name}에서 토큰 만들기</a> · 토큰은 암호화해 보관하고, 저장소에 쓰는 업무와 댓글은 이 토큰의 계정으로 남습니다.
    </p>
    <FormMessage message={error} />
  </CompactDialog>;
}
