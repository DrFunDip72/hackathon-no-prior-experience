import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpIcon, PaperclipIcon } from 'lucide-react';
import { saveLandingPrompt } from '../../utils/landingPrompt';

const suggestions = [
'Product design internship at Adobe',
'Consulting recruiting this fall',
'Software roles in Lehi',
'Meet BYU alumni in data science'];


export function HeroPrompt({ destination }: {destination: string;}) {
  const [value, setValue] = useState('');
  const navigate = useNavigate();

  const submit = (text = value) => {
    saveLandingPrompt(text);
    navigate(destination);
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="rounded-2xl border border-line bg-white p-3 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] transition-colors duration-150 focus-within:border-navy-200">
        
        <label htmlFor="hero-prompt" className="sr-only">
          Tell us what you’re looking for
        </label>
        <textarea
          id="hero-prompt"
          rows={3}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Tell us what you’re looking for… e.g. a UX internship, and I’d love to meet people from Qualtrics"
          className="w-full resize-none bg-transparent px-2 py-1.5 text-base text-ink placeholder:text-muted/70 focus:outline-none" />
        
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => submit()}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted transition-colors duration-150 hover:bg-canvas hover:text-ink">
            
            <PaperclipIcon className="h-4 w-4" aria-hidden="true" />
            Attach resume
          </button>
          <button
            type="submit"
            aria-label="Get started"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-white transition-colors duration-150 hover:bg-navy">
            
            <ArrowUpIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </form>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {suggestions.map((s) =>
        <button
          key={s}
          type="button"
          onClick={() => submit(s)}
          className="whitespace-nowrap rounded-full border border-line bg-white px-3 py-1.5 text-sm text-muted transition-colors duration-150 hover:border-navy-200 hover:text-ink">
          
            {s}
          </button>
        )}
      </div>
    </div>);

}