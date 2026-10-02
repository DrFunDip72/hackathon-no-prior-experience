import React from 'react';
import { AlertTriangleIcon, CheckCircle2Icon } from 'lucide-react';
import { Chip } from '../ui/Chip';

export function Availability({ conflict, googleConnected }: {conflict: string | null;googleConnected: boolean;}) {
  if (!googleConnected) return null;
  if (conflict) {
    return (
      <Chip tone="warning">
        <AlertTriangleIcon className="h-3 w-3" aria-hidden="true" />
        Conflicts with {conflict.split(' · ')[0]}
      </Chip>);

  }
  return (
    <Chip tone="success">
      <CheckCircle2Icon className="h-3 w-3" aria-hidden="true" />
      You’re free
    </Chip>);

}