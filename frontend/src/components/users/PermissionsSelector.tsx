'use client';

import React from 'react';
import {
  PERMISSION_GROUPS,
  OPERATIONAL_CEILING_ROLES,
  PRIVILEGED_PERMISSION_KEYS,
} from '@/lib/rbac';
import { ShieldAlert, FlaskConical } from 'lucide-react';

interface PermissionsSelectorProps {
  role: string;
  selectedPermissions: string[];
  selectedLabs: string[];
  onChangePermissions: (perms: string[]) => void;
  onChangeLabs: (labs: string[]) => void;
}

const LAB_LIST = [
  { code: 'GENERAL', label: 'General Lab' },
  { code: 'PENICILLIN', label: 'Penicillin Lab' },
  { code: 'CEPHALOSPORIN', label: 'Cephalosporin Lab' },
];

export function PermissionsSelector({
  role,
  selectedPermissions,
  selectedLabs,
  onChangePermissions,
  onChangeLabs,
}: PermissionsSelectorProps) {
  const upperRole = (role || '').toUpperCase();
  const hasOperationalCeiling = OPERATIONAL_CEILING_ROLES.has(upperRole);
  const isSuperAdminRole = upperRole === 'SUPER_ADMIN';

  const togglePermission = (key: string) => {
    if (isSuperAdminRole) return;
    if (hasOperationalCeiling && PRIVILEGED_PERMISSION_KEYS.has(key)) return;
    if (key === 'documents.approve_deletion' && upperRole !== 'HOD') return;

    if (selectedPermissions.includes(key)) {
      onChangePermissions(selectedPermissions.filter((p) => p !== key));
    } else {
      onChangePermissions([...selectedPermissions, key]);
    }
  };

  const toggleLab = (code: string) => {
    if (selectedLabs.includes(code)) {
      onChangeLabs(selectedLabs.filter((l) => l !== code));
    } else {
      onChangeLabs([...selectedLabs, code]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Allowed Laboratories */}
      <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 mb-2">
          <FlaskConical className="h-3.5 w-3.5 text-blue-600" />
          <span>Allowed Laboratories</span>
          <span className="text-[10px] font-normal text-slate-500">
            (Leave all unchecked for facility-wide lab access)
          </span>
        </div>
        <div className="flex flex-wrap gap-3">
          {LAB_LIST.map((lab) => (
            <label
              key={lab.code}
              className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer bg-white px-2.5 py-1.5 rounded-lg border border-slate-200"
            >
              <input
                type="checkbox"
                checked={selectedLabs.includes(lab.code)}
                onChange={() => toggleLab(lab.code)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="font-medium">{lab.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Module & Action Permissions */}
      <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-slate-700">
            Module &amp; Action Permissions ({selectedPermissions.length} selected)
          </span>
          {hasOperationalCeiling && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              <ShieldAlert className="h-3 w-3" />
              HOD / Admin / Superadmin actions locked
            </span>
          )}
        </div>

        <div className="max-h-56 overflow-y-auto space-y-2.5 pr-1">
          {PERMISSION_GROUPS.map((group) => {
            const visiblePerms = group.permissions.filter((p) => {
              if (hasOperationalCeiling && p.isPrivileged) return false;
              if (p.key === 'documents.approve_deletion' && upperRole !== 'SUPER_ADMIN' && upperRole !== 'HOD') {
                return false;
              }
              return true;
            });
            if (visiblePerms.length === 0) return null;

            return (
              <div key={group.module} className="bg-white rounded-lg border border-slate-200 p-2.5">
                <div className="text-[11px] font-bold text-slate-800 mb-1.5">{group.label}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {visiblePerms.map((perm) => {
                    const checked = isSuperAdminRole || selectedPermissions.includes(perm.key);
                    return (
                      <label
                        key={perm.key}
                        className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer hover:text-slate-900"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={isSuperAdminRole}
                          onChange={() => togglePermission(perm.key)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>{perm.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

