import { useEffect, useRef, useState } from 'react';
import { FileUploadButton } from '../ui/FileUploadButton';
import type { PendingFile } from '../api/engagement';

/** Pending uploads stay with the form; only references still present in its body are bound when saved. */
export function useBodyFiles(body: string) {
  const [files, setFiles] = useState<PendingFile[]>([]); const [isUploading, setUploading] = useState(false);
  const previews = useRef<string[]>([]);
  useEffect(() => () => { previews.current.forEach(url => URL.revokeObjectURL(url)); }, []);
  const uploadIds = files.filter(file => body.includes(`attachment:${file.id}`)).map(file => file.id);
  return { isUploading, uploadIds,
    reset: () => { setFiles([]); previews.current.forEach(url => URL.revokeObjectURL(url)); previews.current = []; },
    picker: (insert: (file: { id: string; filename: string; image: boolean; preview?: string }) => void) => <FileUploadButton isDisabled={uploadIds.length >= 20} onBusy={setUploading} onUploaded={file => {
      setFiles(previous => [...previous, file]); if (file.preview) previews.current.push(file.preview); insert(file);
    }} />,
  };
}
