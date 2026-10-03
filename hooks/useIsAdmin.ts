import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { isAdmin } from '../services/admin';

/** Whether the signed-in account is a Bodivex admin (checked on the server). */
export function useIsAdmin() {
  const uid = useAuthStore((s) => s.user?.id);
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    if (!uid) return setAdmin(false);
    isAdmin().then(setAdmin).catch(() => setAdmin(false));
  }, [uid]);
  return admin;
}
