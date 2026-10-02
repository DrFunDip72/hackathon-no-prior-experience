import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

/** Profile editors that can be opened from outside their section (the finish-your-profile card). */
export type ProfileEditTarget = 'photo' | 'intro' | 'glance' | 'about' | 'experience' | 'skills';

export interface EditRequest {
  target: ProfileEditTarget;
  /** Bumped on every request, so asking for the same editor twice still opens it. */
  seq: number;
}

/** The latest "open this editor" request on the Profile page; null everywhere else. */
export const EditRequestContext = createContext<EditRequest | null>(null);

/**
 * Calls `onRequest` when the Profile page asks to open `target`. Only requests made after mount count,
 * so a section remounting (e.g. leaving the employer preview) doesn't reopen an old request.
 */
export function useEditRequest(target: ProfileEditTarget | undefined, onRequest: () => void) {
  const request = useContext(EditRequestContext);
  const handled = useRef(request?.seq);
  const latest = useRef(onRequest);
  latest.current = onRequest;

  useEffect(() => {
    if (!request || request.seq === handled.current) return;
    handled.current = request.seq;
    if (request.target === target) latest.current();
  }, [request, target]);
}

export function useSectionEditor<F>(toForm: () => F, onSave: (form: F) => Promise<void>, target?: ProfileEditTarget) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<F>(toForm);

  const start = () => {
    setForm(toForm());
    setEditing(true);
  };

  useEditRequest(target, start);

  const cancel = () => setEditing(false);

  const save = async () => {
    setSaving(true);
    try {
      await onSave(form);
      setEditing(false);
      toast.success('Profile saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Couldn’t save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return { editing, saving, form, setForm, start, cancel, save };
}
