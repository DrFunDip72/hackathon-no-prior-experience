import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { setPendingResume } from '../../utils/pendingResume';

/**
 * Landing-page resume upload: `open()` clicks a real file input inside the same user gesture, so the
 * OS picker appears on the first click. The picked file is handed to onboarding, which reads it straight away
 * (and does the PDF / 5 MB checks). Render `input` once next to the buttons that call `open`.
 */
export function useResumeUpload(onBeforeStart?: () => void) {
  const navigate = useNavigate();
  const ref = useRef<HTMLInputElement>(null);

  const input =
  <input
    ref={ref}
    type="file"
    accept=".pdf,application/pdf"
    className="sr-only"
    tabIndex={-1}
    aria-hidden="true"
    onChange={(e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      onBeforeStart?.();
      setPendingResume(file);
      navigate('/onboarding');
    }} />;


  return { input, open: () => ref.current?.click() };
}
