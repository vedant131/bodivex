import { router } from 'expo-router';
import { Alert, toast } from '../ui/Feedback';
import { deleteMyAccount } from '../../services/auth';
import { useAuthStore } from '../../stores/authStore';

/** Confirm, then permanently delete the signed-in account (Profile → Delete account). */
export const askToDeleteAccount = () => {
  const uid = useAuthStore.getState().user?.id;
  if (!uid) return;
  Alert.alert(
    'Delete your account?',
    'This permanently deletes your profile, photos, videos, bookings, chats and reviews. It cannot be undone. Coaches you paid fees for keep the receipt, without your name.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete permanently',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMyAccount(uid);
            useAuthStore.getState().logout();
            router.replace('/welcome');
            toast('Account deleted', 'Your data has been removed from Bodivex.', 'success');
          } catch (e: any) {
            Alert.alert('Could not delete account', `${e.message}\nPlease try again or write to us.`);
          }
        },
      },
    ]
  );
};
