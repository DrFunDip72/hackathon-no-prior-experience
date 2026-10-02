import { useState } from 'react';
import { toast } from 'sonner';

export function useSectionEditor<F>(toForm: () => F, onSave: (form: F) => Promise<void>) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<F>(toForm);

  const start = () => {
    setForm(toForm());
    setEditing(true);
  };

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