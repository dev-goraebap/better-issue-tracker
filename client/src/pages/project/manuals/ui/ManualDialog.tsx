import { useState } from 'react';
import { Button, TextInput } from '@astryxdesign/core';
import { CompactDialog } from '@/shared/ui';
import { newId, type Cover, type Manual } from '../model/manual';
import { ManualCover } from './ManualCover';
import styles from './manuals.module.css';

export function ManualDialog({ manual, onSave, onClose }: { manual?: Manual; onSave: (manual: Manual) => boolean; onClose: () => void }) {
  const [title, setTitle] = useState(manual?.title ?? '');
  const [description, setDescription] = useState(manual?.description ?? '');
  const [cover, setCover] = useState<Cover>(manual?.cover ?? 'book');
  const [image, setImage] = useState(manual?.image);
  const [error, setError] = useState('');
  const save = () => {
    if (!title.trim()) return;
    if (onSave({ ...(manual ?? { id: newId(), sections: [], pages: [], comments: [], assets: {} }), title: title.trim(), description: description.trim(), cover, image })) onClose();
    else setError('저장하지 못했습니다. 입력을 유지했습니다.');
  };
  return <CompactDialog title={manual ? '매뉴얼 설정' : '매뉴얼 만들기'} onClose={onClose} onSubmit={save}
    footer={<><Button label="취소" variant="ghost" onClick={onClose} /><Button type="submit" label={manual ? '저장' : '매뉴얼 만들기'} isDisabled={!title.trim()} /></>}>
    <TextInput label="매뉴얼 이름" value={title} onChange={value => setTitle(value.slice(0, 120))} hasAutoFocus placeholder="예: 프로젝트 개발 매뉴얼" />
    <TextInput label="설명" value={description} onChange={value => setDescription(value.slice(0, 400))} placeholder="누구를 위한 어떤 안내인지 적어 주세요" />
    <fieldset className={styles.coverPicker}><legend>표지</legend><div>{(['book', 'structure', 'path'] as Cover[]).map((choice, index) =>
      <label key={choice}><input type="radio" name="cover" checked={cover === choice && !image} onChange={() => { setCover(choice); setImage(undefined); }} />
        <ManualCover cover={choice} /><span>{['안내', '구조', '절차'][index]}</span></label>)}</div></fieldset>
    <label className={styles.upload}>표지 이미지 선택 <input type="file" accept="image/png,image/jpeg,image/webp" onChange={async event => {
      const file = event.target.files?.[0]; if (!file) return;
      if (file.size > 2 * 1024 * 1024) { setError('설계 미리보기의 이미지는 2MB까지 저장할 수 있습니다.'); return; }
      const reader = new FileReader(); reader.onload = () => { setImage(String(reader.result)); setError(''); }; reader.readAsDataURL(file);
    }} /></label>
    {image && <><ManualCover cover={cover} image={image} /><Button variant="ghost" label="기본 표지 사용" onClick={() => setImage(undefined)} /></>}
    {error && <p role="alert">{error}</p>}
  </CompactDialog>;
}
