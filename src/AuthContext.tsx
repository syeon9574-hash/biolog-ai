import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, User as FirebaseUser, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'student' | 'teacher';
  className?: string;
  studentNumber?: string;
  points: number;
  badges: string[];
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signInTeacher: () => Promise<void>;
  signInStudent: (className: string, number: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Listen to profile changes
        const profileRef = doc(db, 'users', user.uid);
        const unsubProfile = onSnapshot(profileRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            setProfile(null);
          }
          setLoading(false);
        });
        return () => unsubProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const signInTeacher = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    const profileRef = doc(db, 'users', user.uid);
    const snap = await getDoc(profileRef);
    
    if (!snap.exists()) {
      await setDoc(profileRef, {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        role: 'teacher',
        points: 0,
        badges: [],
      });
    }
  };

  const signInStudent = async (className: string, studentNumber: string, name: string) => {
    // For students, we use a deterministic UID based on their info for "simplified auth"
    const uid = `student_${className}_${studentNumber}_${name.replace(/\s/g, '')}`;
    const profileRef = doc(db, 'users', uid);
    const snap = await getDoc(profileRef);
    
    const profileData: UserProfile = {
      uid,
      email: `${uid}@biolog.ai`,
      displayName: name,
      role: 'student',
      className,
      studentNumber,
      points: snap.exists() ? snap.data().points : 0,
      badges: snap.exists() ? snap.data().badges : [],
    };

    await setDoc(profileRef, profileData);
    
    // We simulate a "logged in" state for students by setting the profile
    // In a real app, you'd use Firebase Custom Tokens, but for this simplified requirement:
    setProfile(profileData);
    setUser({ uid, email: profileData.email, displayName: name } as any);
  };

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInTeacher, signInStudent, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
