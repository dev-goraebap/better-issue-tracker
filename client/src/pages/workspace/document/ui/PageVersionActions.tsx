import { Button } from '@astryxdesign/core';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { afterOverlayClose } from '@/shared/lib/back-close';
import { NavIcon, PropertyPicker } from '@/shared/ui';
import type { DocumentDetail } from '@/entities/document';
import { pageVersionQuery } from '../api/page-version';

/**
 * A page's version and printing, at the top of its screen. The version chosen goes in the address (none for the
 * latest). BIT's helper prints inside the opaque frame, using the upload's print styles and the browser's PDF output.
 */
export function PageVersionActions({ workspaceId, documentId, documentRef, page, number, onPrint, isPrinting }: {
  workspaceId: string; documentId: string; documentRef: string; page: DocumentDetail['page']; number: number;
  onPrint: () => void;
  isPrinting: boolean;
}) {
  const navigate = useNavigate();
  const viewUrl = useQuery(pageVersionQuery(workspaceId, documentId, number)).data?.viewUrl;
  const options = page.versions.map(version => ({
    value: String(version.number),
    label: `v${version.number}${version.number === page.latest ? ' (최신)' : ''}`,
  }));
  const choose = (value: string | string[] | undefined) => {
    const chosen = Number(value);
    if (!chosen || chosen === number) return;
    // A phone picks in a bottom sheet, whose history step must be gone before the address changes.
    afterOverlayClose(() => void navigate({ to: '/workspaces/$workspaceId/documents/$documentRef', params: { workspaceId, documentRef },
      search: chosen === page.latest ? {} : { v: chosen } }));
  };
  return <>
    <PropertyPicker label="버전" icon="clock" options={options} value={String(number)} onChange={choose} />
    <Button label="PDF로 저장" tooltip="인쇄 창에서 PDF로 저장" variant="ghost" isIconOnly icon={<NavIcon name="print" />} isDisabled={!viewUrl || isPrinting} isLoading={isPrinting} onClick={onPrint} />
  </>;
}
