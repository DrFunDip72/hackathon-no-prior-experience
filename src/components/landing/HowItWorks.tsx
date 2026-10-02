import React from 'react';

const steps = [
{
  title: 'Tell us about you',
  body: 'Drop in your resume, Handshake, and LinkedIn, then answer a few questions. We build a profile recruiters can scan in seconds.'
},
{
  title: 'Connect your calendars',
  body: 'Link Google Calendar and BYU’s career, club, department, and alumni calendars so nothing slips through.'
},
{
  title: 'Show up to the right rooms',
  body: 'See the events and people that fit you best, without conflicts, and add them to your calendar in one tap.'
}];


export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-heading" className="mx-auto max-w-6xl px-6 py-24">
      <h2 id="how-heading" className="text-3xl font-semibold tracking-tight text-ink">
        How it works
      </h2>
      <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
        {steps.map((step, i) =>
        <li key={step.title} className="border-t border-ink pt-5">
            <span className="text-sm font-medium tabular-nums text-muted">{i + 1}</span>
            <h3 className="mt-2 text-lg font-semibold text-ink">{step.title}</h3>
            <p className="mt-2 leading-relaxed text-muted">{step.body}</p>
          </li>
        )}
      </ol>
    </section>);

}