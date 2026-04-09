import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { useAuthSession } from '@/src/context/AuthSessionProvider';
import EditProfileModal from '@/src/components/EditProfileModal';

export default function EditProfileRoute() {
  const router = useRouter();
  const { session, initializing } = useAuthSession();
  const userId = session?.user?.id;

  useEffect(() => {
    if (initializing || userId) return;

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, [initializing, userId, router]);

  if (!userId) {
    return null;
  }

  return (
    <EditProfileModal
      userId={userId}
      onClose={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/');
        }
      }}
      onSaved={() => {}}
    />
  );
}
