import { useRouter } from 'expo-router';

import { useAuthSession } from '@/src/context/AuthSessionProvider';
import EditProfileModal from '@/src/components/EditProfileModal';

export default function EditProfileRoute() {
  const router = useRouter();
  const { session } = useAuthSession();
  const userId = session?.user?.id;

  if (!userId) {
    router.back();
    return null;
  }

  return (
    <EditProfileModal
      userId={userId}
      onClose={() => router.back()}
      onSaved={() => {}}
    />
  );
}
