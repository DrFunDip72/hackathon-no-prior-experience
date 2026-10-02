import React, { useEffect, useRef, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { PlusIcon, XIcon } from 'lucide-react';
import { toast } from 'sonner';
import { AppHeader } from '../components/AppHeader';
import { Chip } from '../components/ui/Chip';
import { StudentResultCard } from '../components/employer/StudentResultCard';
import { NewRolePanel } from '../components/employer/NewRolePanel';
import { mockStudents } from '../data/mockStudents';
import { rankStudents } from '../utils/employerMatching';
import { employerStore, NEW_ROLE } from '../utils/employerStore';
import { AI_GOOD_MATCH } from '../utils/matching';
import type { EmployerQuery, EmployerRole } from '../types/employer';

const tabId = (id: string) => `role-tab-${id}`;
const roleLabel = (q: EmployerQuery) => [q.jobTitle || 'Your role', q.companyName].filter(Boolean).join(' at ');

/**
 * The recruiter's saved roles as tabs, each showing the students ranked for it, plus a "+ New role" tab
 * that reads a posting inline. The open tab lives in the URL (?role=<id>) so back and refresh work.
 */
export function EmployerMatches() {
  const [params, setParams] = useSearchParams();
  const [roles, setRoles] = useState<EmployerRole[]>(() => employerStore.roles());
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());
  const hasAccount = Boolean(employerStore.account());

  const requested = params.get('role');
  const fallback = roles.find((r) => r.id === employerStore.activeRole()?.id) ?? roles[roles.length - 1];
  const activeId =
  requested === NEW_ROLE || roles.length === 0 ? NEW_ROLE : roles.some((r) => r.id === requested) ? requested! : fallback.id;
  const active = roles.find((r) => r.id === activeId) ?? null;

  // Missing or stale ?role= (e.g. the "Matches" nav link, or a removed tab): settle on a real tab without adding history.
  useEffect(() => {
    if (requested !== activeId) setParams({ role: activeId }, { replace: true });
  }, [requested, activeId, setParams]);

  useEffect(() => {
    if (active) employerStore.setActive(active.id);
    tabRefs.current.get(activeId)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeId, active]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Never signed up and nothing saved: the full sign-up is where a first role is made.
  if (!hasAccount && roles.length === 0) return <Navigate to="/employer" replace />;

  const select = (id: string, opts?: {replace?: boolean;focus?: boolean;}) => {
    setParams({ role: id }, { replace: opts?.replace });
    if (opts?.focus) tabRefs.current.get(id)?.focus();
  };

  const tabOrder = [...roles.map((r) => r.id), NEW_ROLE];
  const onTabKey = (e: React.KeyboardEvent, id: string) => {
    const i = tabOrder.indexOf(id);
    const to =
    e.key === 'ArrowRight' ? tabOrder[(i + 1) % tabOrder.length] :
    e.key === 'ArrowLeft' ? tabOrder[(i - 1 + tabOrder.length) % tabOrder.length] :
    e.key === 'Home' ? tabOrder[0] :
    e.key === 'End' ? tabOrder[tabOrder.length - 1] :
    null;
    if (to) {
      e.preventDefault();
      select(to, { replace: true, focus: true });
    } else if (e.key === 'Delete' && id !== NEW_ROLE) {
      e.preventDefault();
      remove(roles.find((r) => r.id === id)!);
    }
  };

  const remove = (role: EmployerRole) => {
    const index = employerStore.removeRole(role.id);
    const next = employerStore.roles();
    setRoles(next);
    if (role.id === activeId) {
      const neighbor = next[Math.min(index, next.length - 1)]?.id ?? NEW_ROLE;
      select(neighbor, { replace: true, focus: true });
    }
    toast(`Removed ${roleLabel(role.query)}`, {
      action: {
        label: 'Undo',
        onClick: () => {
          employerStore.restoreRole(role, index);
          setRoles(employerStore.roles());
          select(role.id);
        }
      }
    });
  };

  const create = (query: EmployerQuery) => {
    const role = employerStore.addRole(query);
    setRoles(employerStore.roles());
    select(role.id);
    toast.success(`Ranked students for ${roleLabel(query)}`);
  };

  const tabClass = (selected: boolean) =>
  `relative flex min-h-[44px] shrink-0 items-center border-b-2 text-sm transition-colors duration-150 ${
  selected ? 'border-navy font-semibold text-ink' : 'border-transparent text-muted hover:text-ink'}`;

  return (
    <div className="min-h-screen w-full bg-canvas">
      <AppHeader audience="employer" />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div role="tablist" aria-label="Your roles" className="flex min-w-max gap-1 border-b border-line">
            {roles.map((role) => {
              const selected = role.id === activeId;
              const label = roleLabel(role.query);
              return (
                <div key={role.id} role="presentation" className={tabClass(selected)}>
                  <button
                    ref={(el) => el ? tabRefs.current.set(role.id, el) : tabRefs.current.delete(role.id)}
                    id={tabId(role.id)}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls="role-panel"
                    tabIndex={selected ? 0 : -1}
                    title={label}
                    onClick={() => select(role.id)}
                    onKeyDown={(e) => onTabKey(e, role.id)}
                    className="flex min-h-[44px] max-w-[14rem] items-center gap-1 rounded-t-md pl-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy/40 sm:max-w-[20rem]">

                    <span className="truncate">{role.query.jobTitle || 'Your role'}</span>
                    {role.query.companyName &&
                    <span className="hidden truncate font-normal text-muted sm:inline">· {role.query.companyName}</span>
                    }
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={`Remove ${label}`}
                    title="Remove"
                    onClick={() => remove(role)}
                    className="flex h-11 w-9 items-center justify-center rounded-md text-muted transition-colors duration-150 hover:text-ink">

                    <XIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>);

            })}
            <div role="presentation" className={tabClass(activeId === NEW_ROLE)}>
              <button
                ref={(el) => el ? tabRefs.current.set(NEW_ROLE, el) : tabRefs.current.delete(NEW_ROLE)}
                id={tabId(NEW_ROLE)}
                type="button"
                role="tab"
                aria-selected={activeId === NEW_ROLE}
                aria-controls="role-panel"
                tabIndex={activeId === NEW_ROLE ? 0 : -1}
                onClick={() => select(NEW_ROLE)}
                onKeyDown={(e) => onTabKey(e, NEW_ROLE)}
                className="flex min-h-[44px] items-center gap-1.5 rounded-t-md px-3 font-medium text-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy/40">

                <PlusIcon className="h-4 w-4" aria-hidden="true" />
                New role
              </button>
            </div>
          </div>
        </div>

        <div id="role-panel" role="tabpanel" aria-labelledby={tabId(activeId)} className="mt-6">
          {active ?
          <RoleMatches role={active} /> :

          <div className="max-w-2xl">
              <NewRolePanel onCreate={create} />
            </div>
          }
        </div>
      </main>
    </div>);

}

/** One role's ranked students, laid out like the student Events page. */
function RoleMatches({ role }: {role: EmployerRole;}) {
  const query = role.query;
  const results = rankStudents(mockStudents, query);
  const good = results.filter((r) => r.percent >= AI_GOOD_MATCH).length;
  const label = roleLabel(query);

  return (
    <>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Students for {label}</h1>
        <p className="mt-1 text-sm text-muted">
          {results.length} students who opted in, ranked by fit · {good} good {good === 1 ? 'fit' : 'fits'} or better
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-3">
          {results.map((item, i) => <StudentResultCard key={item.student.id} item={item} top={i === 0} roleId={role.id} />)}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <section aria-labelledby="role-heading" className="rounded-xl border border-line bg-white p-5">
            <h2 id="role-heading" className="text-sm font-semibold text-ink">
              The role
            </h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium text-muted">Role</dt>
                <dd className="mt-0.5 text-ink">{label}</dd>
              </div>
              {query.employmentType &&
              <div>
                  <dt className="text-xs font-medium text-muted">Type</dt>
                  <dd className="mt-0.5 text-ink">{query.employmentType === 'Either' ? 'Internship or full-time' : query.employmentType}</dd>
                </div>
              }
              {query.skills.length > 0 &&
              <div>
                  <dt className="text-xs font-medium text-muted">Skills</dt>
                  <dd className="mt-1 flex flex-wrap gap-1.5">
                    {query.skills.map((s) => <Chip key={s} tone="navy">{s}</Chip>)}
                  </dd>
                </div>
              }
              {query.lookingFor &&
              <div>
                  <dt className="text-xs font-medium text-muted">Ideal candidate</dt>
                  <dd className="mt-0.5 line-clamp-4 text-ink">{query.lookingFor}</dd>
                </div>
              }
            </dl>
            <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-muted">
              Fit weighs skills most, then the role each student wants, their major, interest in your company, experience, and timing.
              Only students who chose to be found are shown.
            </p>
          </section>
        </aside>
      </div>
    </>);

}
