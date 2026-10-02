import React, { useRef, useState } from 'react';
import { CameraIcon, DownloadIcon, ExternalLinkIcon, Loader2Icon, PencilIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar } from '../ui/Avatar';
import { TextField } from '../ui/TextField';
import { useSectionEditor } from '../../hooks/useSectionEditor';
import { resizeImage } from '../../utils/files';
import type { SectionProps } from './SectionCard';

export function ProfileHeader({ profile, editable, onSave }: SectionProps) {
  const photoRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const ed = useSectionEditor(
    () => ({
      name: profile.name,
      headline: profile.headline,
      year: profile.year,
      handshakeUrl: profile.handshakeUrl,
      linkedinUrl: profile.linkedinUrl
    }),
    (form) => onSave(form)
  );

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Choose a JPG or PNG image.');
      return;
    }
    setUploading(true);
    try {
      await onSave({ photoUrl: await resizeImage(file) });
      toast.success('Photo updated');
    } catch {
      toast.error('That photo couldn’t be used.');
    } finally {
      setUploading(false);
    }
  };

  const meta = [profile.education.major, profile.year, profile.education.gradYear && `Class of ${profile.education.gradYear}`].
  filter(Boolean).
  join(' · ');

  const links = [
  { label: 'Handshake', href: profile.handshakeUrl },
  { label: 'LinkedIn', href: profile.linkedinUrl }].
  filter((l) => l.href);

  return (
    <section aria-label="Profile summary" className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="h-24 bg-navy sm:h-28" />
      <div className="px-6 pb-6">
        <div className="flex items-end justify-between gap-4">
          <div className="relative -mt-14">
            <Avatar name={profile.name} src={profile.photoUrl} size="xl" className="ring-4 ring-white" />
            {editable &&
            <>
                <input
                ref={photoRef}
                type="file"
                accept="image/*"
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(e) => {
                  void onPhoto(e.target.files?.[0]);
                  e.target.value = '';
                }} />
              
                <button
                type="button"
                onClick={() => photoRef.current?.click()}
                aria-label={profile.photoUrl ? 'Change profile photo' : 'Add profile photo'}
                className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-ink shadow-sm transition-colors duration-150 hover:bg-canvas">
                
                  {uploading ? <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CameraIcon className="h-4 w-4" aria-hidden="true" />}
                </button>
              </>
            }
          </div>
          {editable && !ed.editing &&
          <button
            type="button"
            onClick={ed.start}
            className="mt-3 flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink transition-colors duration-150 hover:bg-canvas">
            
              <PencilIcon className="h-3.5 w-3.5" aria-hidden="true" />
              Edit intro
            </button>
          }
        </div>

        {ed.editing ?
        <div className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Full name" value={ed.form.name} onChange={(v) => ed.setForm({ ...ed.form, name: v })} />
              <TextField label="Year" value={ed.form.year} onChange={(v) => ed.setForm({ ...ed.form, year: v })} placeholder="Junior" />
            </div>
            <TextField label="Headline" value={ed.form.headline} onChange={(v) => ed.setForm({ ...ed.form, headline: v })} hint="One line recruiters see first." />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Handshake URL" value={ed.form.handshakeUrl} onChange={(v) => ed.setForm({ ...ed.form, handshakeUrl: v })} />
              <TextField label="LinkedIn URL" value={ed.form.linkedinUrl} onChange={(v) => ed.setForm({ ...ed.form, linkedinUrl: v })} />
            </div>
            <div className="flex justify-end gap-2 border-t border-line pt-4">
              <button type="button" onClick={ed.cancel} className="rounded-lg px-4 py-2 text-sm font-medium text-ink transition-colors duration-150 hover:bg-canvas">
                Cancel
              </button>
              <button
              type="button"
              onClick={ed.save}
              disabled={ed.saving}
              className="flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-navy disabled:opacity-60">
              
                {ed.saving && <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden="true" />}
                Save
              </button>
            </div>
          </div> :

        <div className="mt-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-ink">{profile.name}</h1>
              {profile.visibleToEmployers &&
            <span className="rounded-full bg-success-50 px-2.5 py-0.5 text-xs font-medium text-success-700">
                  Open to {profile.lookingFor.employmentType === 'Either' ? 'internships & full-time' : profile.lookingFor.employmentType.toLowerCase()}
                </span>
            }
            </div>
            <p className="mt-1 text-base text-ink">{profile.headline || (editable ? 'Add a headline' : '')}</p>
            <p className="mt-1 text-sm text-muted">
              {meta ? `${meta} · ` : ''}
              {profile.education.school}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {links.map((l) =>
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink transition-colors duration-150 hover:bg-canvas">
              
                  {l.label}
                  <ExternalLinkIcon className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                </a>
            )}
              {profile.resumeFileName && (
            profile.resumeDataUrl ?
            <a
              href={profile.resumeDataUrl}
              download={profile.resumeFileName}
              className="flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-navy">
              
                    <DownloadIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    Resume
                  </a> :

            <span className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-muted" title="File too large to store in this browser">
                    {profile.resumeFileName}
                  </span>)
            }
              {editable && links.length < 2 &&
            <button type="button" onClick={ed.start} className="px-1 text-sm font-medium text-navy hover:underline">
                  Add {profile.handshakeUrl ? 'LinkedIn' : profile.linkedinUrl ? 'Handshake' : 'Handshake & LinkedIn'}
                </button>
            }
            </div>
          </div>
        }
      </div>
    </section>);

}