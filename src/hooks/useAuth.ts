import { useState, useEffect } from 'react';
import { signInAnonymously, onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../services/firebase';

interface AuthState {
  user: User | null;
  uid: string | null;
  loading: boolean;
  error: string | null;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    uid: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setState({ user, uid: user.uid, loading: false, error: null });
      } else {
        signInAnonymously(auth).catch((err: Error) => {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: err.message,
          }));
        });
      }
    });

    return unsubscribe;
  }, []);

  return state;
}
