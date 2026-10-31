import { useEffect, useRef, useState, type RefObject } from 'react';
import { useToast } from '@astryxdesign/core';

/** Only the current opaque frame may acknowledge a print request. No document or account data is sent. */
export function usePagePrint(frame: RefObject<HTMLIFrameElement | null>) {
  const toast = useToast();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [isPrinting, setPrinting] = useState(false);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (!timer.current || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type !== 'bit:print-ready' && event.data?.type !== 'bit:print-failed') return;
      clearTimeout(timer.current); timer.current = undefined; setPrinting(false);
      toast({ body: event.data.type === 'bit:print-ready' ? '인쇄 창의 대상을 PDF로 저장으로 선택하세요.' : '인쇄 창을 열지 못했습니다. 페이지를 다시 열어 주세요.' });
    };
    window.addEventListener('message', receive);
    return () => { window.removeEventListener('message', receive); clearTimeout(timer.current); };
  }, [frame, toast]);
  const print = () => {
    const target = frame.current?.contentWindow;
    if (!target || timer.current) return;
    setPrinting(true);
    timer.current = setTimeout(() => { timer.current = undefined; setPrinting(false);
      toast({ body: '페이지에서 응답하지 않습니다. Chrome에서 페이지를 열고 다시 시도해 주세요.' }); }, 8000);
    target.postMessage({ type: 'bit:print' }, '*');
  };
  return { print, isPrinting };
}
