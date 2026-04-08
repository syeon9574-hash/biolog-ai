import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Camera, 
  MessageCircle, 
  LayoutDashboard, 
  LogOut, 
  Plus, 
  Award, 
  Search, 
  ChevronRight,
  User as UserIcon,
  Leaf,
  Send,
  Image as ImageIcon,
  Mic,
  Loader2,
  CheckCircle2,
  Trophy,
  Filter,
  Settings,
  X
} from 'lucide-react';
import { db } from './firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, increment, getDocs } from 'firebase/firestore';
import { analyzeJournal, identifyBiology, biologyChat, optimizeImage } from './services/geminiService';
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';
import { Toaster, toast } from 'sonner';

// --- Components ---

const Navbar = () => {
  const { profile, logout } = useAuth();
  return (
    <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-gray-100 z-50 px-4 py-3">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-green-500 p-2 rounded-xl">
            <Leaf className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-gray-900">BioLog AI</span>
        </div>
        <div className="flex items-center gap-4">
          {profile && (
            <div className="hidden md:flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <UserIcon className="w-3.5 h-3.5 text-green-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">
                {profile.displayName} ({profile.role === 'teacher' ? '선생님' : `${profile.className} ${profile.studentNumber}번`})
              </span>
              {profile.role === 'student' && (
                <div className="flex items-center gap-1 ml-2 border-l pl-2 border-gray-200">
                  <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                  <span className="text-sm font-bold text-gray-900">{profile.points}</span>
                </div>
              )}
            </div>
          )}
          <button 
            onClick={() => {
              logout();
              toast.info('로그아웃되었습니다.');
            }}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
            title="로그아웃"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </nav>
  );
};

const Login = () => {
  const { signInTeacher, signInStudent } = useAuth();
  const [mode, setMode] = useState<'student' | 'teacher'>('student');
  const [studentInfo, setStudentInfo] = useState({ className: '', number: '', name: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentInfo.className || !studentInfo.number || !studentInfo.name) {
      toast.error('모든 정보를 입력해주세요.');
      return;
    }
    setIsSubmitting(true);
    try {
      await signInStudent(studentInfo.className, studentInfo.number, studentInfo.name);
      toast.success('학생으로 로그인되었습니다.');
    } catch (error) {
      toast.error('로그인에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTeacherLogin = async () => {
    setIsSubmitting(true);
    try {
      await signInTeacher();
      toast.success('선생님으로 로그인되었습니다.');
    } catch (error) {
      toast.error('로그인에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-green-50 p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-8 md:p-10 rounded-[40px] shadow-2xl shadow-green-200/50 max-w-md w-full"
      >
        <div className="bg-green-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
          <Leaf className="text-white w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">BioLog AI</h1>
        <p className="text-gray-500 mb-8 text-center leading-relaxed">
          초등학생을 위한 AI 기반<br />생물 관찰일지 플랫폼
        </p>

        <div className="flex bg-gray-100 p-1 rounded-2xl mb-8">
          <button 
            onClick={() => setMode('student')}
            className={cn("flex-1 py-2.5 rounded-xl font-bold transition-all", mode === 'student' ? "bg-white text-green-600 shadow-sm" : "text-gray-500")}
          >
            학생
          </button>
          <button 
            onClick={() => setMode('teacher')}
            className={cn("flex-1 py-2.5 rounded-xl font-bold transition-all", mode === 'teacher' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500")}
          >
            선생님
          </button>
        </div>

        {mode === 'student' ? (
          <form onSubmit={handleStudentLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 ml-1 uppercase">학급명</label>
              <input 
                type="text" 
                placeholder="예: 3학년 1반"
                value={studentInfo.className}
                onChange={(e) => setStudentInfo({ ...studentInfo, className: e.target.value })}
                className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-green-500 focus:bg-white transition-all outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 ml-1 uppercase">번호</label>
              <input 
                type="text" 
                placeholder="예: 15"
                value={studentInfo.number}
                onChange={(e) => setStudentInfo({ ...studentInfo, number: e.target.value })}
                className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-green-500 focus:bg-white transition-all outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 ml-1 uppercase">이름</label>
              <input 
                type="text" 
                placeholder="예: 홍길동"
                value={studentInfo.name}
                onChange={(e) => setStudentInfo({ ...studentInfo, name: e.target.value })}
                className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-green-500 focus:bg-white transition-all outline-none"
              />
            </div>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-green-500 text-white py-4 rounded-2xl font-bold hover:bg-green-600 transition-all active:scale-95 disabled:opacity-50 mt-4"
            >
              {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : "로그인하기"}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-gray-500 text-center">선생님은 Google 계정으로 로그인해주세요.</p>
            <button 
              onClick={handleTeacherLogin}
              disabled={isSubmitting}
              className="w-full bg-white border-2 border-gray-100 text-gray-700 py-4 rounded-2xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
              Google 계정으로 로그인
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

// --- Student View Components ---

const StudentDashboard = () => {
  const { profile } = useAuth();
  const [journals, setJournals] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'journals' | 'encyclopedia' | 'badges'>('journals');
  const [isWriting, setIsWriting] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const q = query(
      collection(db, 'journals'),
      where('studentId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setJournals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [profile]);

  return (
    <div className="pt-24 pb-32 px-4 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar / Tabs */}
        <div className="w-full md:w-64 space-y-2">
          <button 
            onClick={() => setActiveTab('journals')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-all",
              activeTab === 'journals' ? "bg-green-500 text-white shadow-lg shadow-green-500/20" : "text-gray-600 hover:bg-gray-100"
            )}
          >
            <BookOpen className="w-5 h-5" />
            관찰 일지
          </button>
          <button 
            onClick={() => setActiveTab('encyclopedia')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-all",
              activeTab === 'encyclopedia' ? "bg-green-500 text-white shadow-lg shadow-green-500/20" : "text-gray-600 hover:bg-gray-100"
            )}
          >
            <Search className="w-5 h-5" />
            AI 생물도감
          </button>
          <button 
            onClick={() => setActiveTab('badges')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-all",
              activeTab === 'badges' ? "bg-green-500 text-white shadow-lg shadow-green-500/20" : "text-gray-600 hover:bg-gray-100"
            )}
          >
            <Award className="w-5 h-5" />
            나의 배지
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            {activeTab === 'journals' && (
              <motion.div 
                key="journals"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">나의 관찰 일지</h2>
                  <button 
                    onClick={() => setIsWriting(true)}
                    className="bg-green-500 text-white px-6 py-2.5 rounded-2xl font-bold flex items-center gap-2 hover:bg-green-600 transition-all shadow-lg shadow-green-500/20"
                  >
                    <Plus className="w-5 h-5" />
                    일지 쓰기
                  </button>
                </div>

                {journals.length === 0 ? (
                  <div className="bg-white rounded-[32px] p-12 text-center border-2 border-dashed border-gray-100">
                    <div className="bg-gray-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-gray-500">아직 작성한 일지가 없어요.<br />첫 번째 관찰을 시작해보세요!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {journals.map((journal) => (
                      <JournalCard key={journal.id} journal={journal} />
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'encyclopedia' && <EncyclopediaView key="encyclopedia" />}
            {activeTab === 'badges' && (
              <motion.div 
                key="badges"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-8">획득한 배지</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                  {profile?.badges.map((badge, i) => (
                    <div key={i} className="flex flex-col items-center gap-3 p-6 bg-yellow-50 rounded-3xl border-2 border-yellow-100">
                      <div className="bg-yellow-400 p-4 rounded-2xl shadow-lg shadow-yellow-400/20">
                        <Award className="w-8 h-8 text-white" />
                      </div>
                      <span className="font-bold text-yellow-900 text-sm">{badge}</span>
                    </div>
                  ))}
                  {(!profile?.badges || profile.badges.length === 0) && (
                    <div className="col-span-full py-12 text-center text-gray-400">
                      아직 획득한 배지가 없어요. 열심히 활동해서 배지를 모아보세요!
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Writing Modal */}
      <AnimatePresence>
        {isWriting && (
          <JournalWriter onClose={() => setIsWriting(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

const JournalCard = ({ journal }: { journal: any }) => {
  const [showFeedback, setShowFeedback] = useState(false);
  const feedback = journal.aiFeedback ? JSON.parse(journal.aiFeedback) : null;

  return (
    <motion.div 
      layout
      className="bg-white rounded-[32px] overflow-hidden shadow-sm hover:shadow-xl transition-all border border-gray-100"
    >
      {journal.imageUrl && (
        <img 
          src={journal.imageUrl} 
          alt={journal.title} 
          className="w-full h-48 object-cover"
          referrerPolicy="no-referrer"
        />
      )}
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">{journal.title}</h3>
            <p className="text-xs text-gray-400">{new Date(journal.createdAt?.toDate()).toLocaleDateString()}</p>
          </div>
          {feedback && (
            <button 
              onClick={() => setShowFeedback(!showFeedback)}
              className="bg-green-50 text-green-600 p-2 rounded-xl hover:bg-green-100 transition-colors"
            >
              <Award className="w-5 h-5" />
            </button>
          )}
        </div>
        <p className="text-gray-600 line-clamp-3 mb-4 leading-relaxed">{journal.content}</p>
        
        <AnimatePresence>
          {showFeedback && feedback && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 pt-4 border-t border-gray-50 space-y-3"
            >
              <div className="bg-green-50 p-4 rounded-2xl">
                <p className="text-xs font-bold text-green-700 mb-1 uppercase tracking-wider">AI 선생님의 칭찬</p>
                <p className="text-sm text-green-800">{feedback.praise}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-2xl">
                <p className="text-xs font-bold text-blue-700 mb-1 uppercase tracking-wider">더 관찰해볼까요?</p>
                <p className="text-sm text-blue-800">{feedback.advice}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const JournalWriter = ({ onClose }: { onClose: () => void }) => {
  const { profile } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'ko-KR';

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            setContent(prev => prev + event.results[i][0].transcript + ' ');
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
        toast.error('음성 인식 중 오류가 발생했습니다.');
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast.error('이 브라우저에서는 음성 인식을 지원하지 않습니다.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
      toast.info('음성 인식을 시작합니다. 말씀해주세요.');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result as string;
          // Optimize image before preview/upload
          const optimized = await optimizeImage(base64);
          setImage(optimized);
          toast.success('사진이 최적화되었습니다.');
        };
        reader.readAsDataURL(file);
      } catch (error) {
        toast.error('이미지 처리 중 오류가 발생했습니다.');
      }
    }
  };

  const handleSubmit = async () => {
    if (!profile || !title || !content) return;
    setIsSubmitting(true);
    try {
      // 1. Get AI Feedback (Gemini will also do OCR if image is provided)
      const feedback = await analyzeJournal(content, image || undefined);
      
      // 2. Save to Firestore
      await addDoc(collection(db, 'journals'), {
        studentId: profile.uid,
        studentName: profile.displayName,
        classId: profile.className || 'default',
        title,
        content,
        imageUrl: image,
        aiFeedback: JSON.stringify(feedback),
        createdAt: serverTimestamp()
      });

      // 3. Update points
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        points: increment(10)
      });

      toast.success('관찰 일지가 등록되었습니다! 10포인트를 획득했어요.');
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('일지 등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white w-full max-w-2xl rounded-[40px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-2xl font-bold text-gray-900">관찰 일지 쓰기</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">관찰 제목</label>
            <input 
              type="text" 
              placeholder="무엇을 관찰했나요? (예: 우리 집 강아지 초코)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-green-500 focus:bg-white transition-all outline-none text-lg"
            />
          </div>

          <div className="space-y-2 relative">
            <div className="flex justify-between items-center ml-1">
              <label className="text-sm font-bold text-gray-700">관찰 내용</label>
              <button 
                onClick={toggleRecording}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all",
                  isRecording ? "bg-red-100 text-red-600 animate-pulse" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                )}
              >
                <Mic className="w-3.5 h-3.5" />
                {isRecording ? "녹음 중..." : "음성 입력"}
              </button>
            </div>
            <textarea 
              placeholder="자세하게 적어보세요! 사진 속 손글씨도 AI가 읽을 수 있어요."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-green-500 focus:bg-white transition-all outline-none resize-none text-lg"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">사진 첨부 (손글씨 인식 가능)</label>
            <div className="flex gap-4 items-center">
              <label className="cursor-pointer bg-white border-2 border-dashed border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all w-32 h-32 rounded-3xl flex flex-col items-center justify-center gap-2 group">
                <Camera className="w-8 h-8 text-gray-400 group-hover:text-green-500" />
                <span className="text-xs font-bold text-gray-400 group-hover:text-green-500">사진 선택</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
              {image && (
                <div className="relative w-32 h-32 rounded-3xl overflow-hidden shadow-md">
                  <img src={image} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => setImage(null)}
                    className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full hover:bg-black/70"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-8 bg-gray-50/50 border-t border-gray-100">
          <button 
            disabled={isSubmitting || !title || !content}
            onClick={handleSubmit}
            className="w-full bg-green-500 text-white py-4 rounded-2xl font-bold text-xl hover:bg-green-600 transition-all shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                AI 선생님이 분석 중...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-6 h-6" />
                일지 등록하기
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const ChatbotView = ({ className }: { className?: string }) => {
  const [messages, setMessages] = useState<{ role: string, parts: { text: string }[] }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input;
    setInput('');
    const newHistory = [...messages, { role: 'user', parts: [{ text: userMessage }] }];
    setMessages(newHistory);
    setIsLoading(true);

    try {
      const response = await biologyChat(userMessage, messages);
      setMessages([...newHistory, { role: 'model', parts: [{ text: response }] }]);
    } catch (error) {
      console.error(error);
      toast.error('AI와 대화 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn("bg-white rounded-[40px] shadow-sm border border-gray-100 flex flex-col h-[600px] max-h-[80vh]", className)}
    >
      <div className="p-6 border-b border-gray-100 flex items-center gap-3">
        <div className="bg-blue-500 p-2.5 rounded-2xl">
          <MessageCircle className="text-white w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">AI 생물박사</h2>
          <p className="text-xs text-gray-400">생물에 대해 무엇이든 물어보세요!</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400">"사자는 왜 갈기가 있나요?"<br />"식물은 어떻게 숨을 쉬나요?"</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[80%] p-4 rounded-3xl",
              msg.role === 'user' ? "bg-green-500 text-white rounded-tr-none" : "bg-gray-100 text-gray-800 rounded-tl-none"
            )}>
              <div className="prose prose-sm max-w-none prose-p:leading-relaxed">
                <ReactMarkdown>
                  {msg.parts[0].text}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 p-4 rounded-3xl rounded-tl-none flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              <span className="text-sm text-gray-400">생각 중...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-gray-100 bg-gray-50/50">
        <div className="flex gap-3">
          <input 
            type="text" 
            placeholder="질문을 입력하세요..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 px-5 py-3.5 rounded-2xl bg-white border-2 border-transparent focus:border-blue-500 outline-none shadow-sm"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-blue-500 text-white p-3.5 rounded-2xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
          >
            <Send className="w-6 h-6" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const EncyclopediaView = () => {
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleIdentify = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsLoading(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        setImage(reader.result as string);
        try {
          const data = await identifyBiology(base64);
          setResult(data);
        } catch (error) {
          console.error(error);
        } finally {
          setIsLoading(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white rounded-[40px] shadow-sm border border-gray-100 p-8"
    >
      <div className="text-center mb-10">
        <div className="bg-purple-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/20">
          <Search className="text-white w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">AI 생물도감</h2>
        <p className="text-gray-500">사진을 올리면 어떤 생물인지 알려드려요!</p>
      </div>

      <div className="max-w-md mx-auto space-y-8">
        {!image ? (
          <label className="cursor-pointer border-4 border-dashed border-gray-100 rounded-[40px] p-12 flex flex-col items-center justify-center gap-4 hover:border-purple-500 hover:bg-purple-50 transition-all group">
            <Camera className="w-12 h-12 text-gray-300 group-hover:text-purple-500" />
            <span className="font-bold text-gray-400 group-hover:text-purple-500 text-lg">사진 찍기 또는 업로드</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleIdentify} />
          </label>
        ) : (
          <div className="space-y-6">
            <div className="relative rounded-[40px] overflow-hidden shadow-2xl">
              <img src={image} alt="Target" className="w-full aspect-square object-cover" />
              {isLoading && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-4">
                  <Loader2 className="w-10 h-10 animate-spin" />
                  <p className="font-bold text-lg">분석 중...</p>
                </div>
              )}
            </div>
            
            {result && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="bg-purple-50 p-6 rounded-[32px]">
                  <h3 className="text-2xl font-bold text-purple-900 mb-2">{result.name}</h3>
                  <p className="text-purple-800 leading-relaxed">{result.description}</p>
                </div>
                <div className="bg-amber-50 p-6 rounded-[32px] flex gap-4">
                  <div className="bg-amber-100 p-3 rounded-2xl h-fit">
                    <Award className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-bold text-amber-900 mb-1">재미있는 사실!</p>
                    <p className="text-amber-800 text-sm leading-relaxed">{result.funFact}</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setImage(null); setResult(null); }}
                  className="w-full py-4 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-all"
                >
                  다시 찾기
                </button>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// --- Teacher View Components ---

const TeacherDashboard = () => {
  const { profile } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [allJournals, setAllJournals] = useState<any[]>([]);
  const [filter, setFilter] = useState({ className: '', studentName: '' });
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const qStudents = query(collection(db, 'users'), where('role', '==', 'student'));
    const unsubStudents = onSnapshot(qStudents, (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qJournals = query(collection(db, 'journals'), orderBy('createdAt', 'desc'));
    const unsubJournals = onSnapshot(qJournals, (snapshot) => {
      setAllJournals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubStudents(); unsubJournals(); };
  }, [profile]);

  const filteredJournals = allJournals.filter(j => {
    const matchClass = !filter.className || j.classId?.includes(filter.className);
    const matchName = !filter.studentName || j.studentName?.includes(filter.studentName);
    return matchClass && matchName;
  });

  return (
    <div className="pt-24 pb-32 px-4 max-w-7xl mx-auto space-y-10">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">교사 대시보드</h1>
        <button 
          onClick={() => setIsBadgeModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
        >
          <Settings className="w-5 h-5" />
          배지 관리
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
          <p className="text-sm font-bold text-gray-400 mb-1 uppercase tracking-wider">전체 학생</p>
          <p className="text-4xl font-bold text-gray-900">{students.length}명</p>
        </div>
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
          <p className="text-sm font-bold text-gray-400 mb-1 uppercase tracking-wider">작성된 일지</p>
          <p className="text-4xl font-bold text-gray-900">{allJournals.length}개</p>
        </div>
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
          <p className="text-sm font-bold text-gray-400 mb-1 uppercase tracking-wider">오늘의 활동</p>
          <p className="text-4xl font-bold text-gray-900">
            {allJournals.filter(j => {
              const today = new Date();
              const journalDate = j.createdAt?.toDate();
              return journalDate && journalDate.toDateString() === today.toDateString();
            }).length}건
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1 space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">학생 현황</h2>
          <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
            <div className="max-h-[600px] overflow-y-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                  <tr>
                    <th className="px-6 py-4 text-sm font-bold text-gray-500">이름</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-500">포인트</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {students.map(student => (
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{student.displayName}</p>
                        <p className="text-xs text-gray-400">{student.className} {student.studentNumber}번</p>
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-bold">{student.points || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">관찰 활동 목록</h2>
            <div className="flex gap-2">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="학급 필터"
                  value={filter.className}
                  onChange={(e) => setFilter({ ...filter, className: e.target.value })}
                  className="pl-9 pr-4 py-2 rounded-xl bg-white border border-gray-200 text-sm focus:border-blue-500 outline-none"
                />
              </div>
              <input 
                type="text" 
                placeholder="학생 이름"
                value={filter.studentName}
                onChange={(e) => setFilter({ ...filter, studentName: e.target.value })}
                className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm focus:border-blue-500 outline-none"
              />
            </div>
          </div>
          <div className="space-y-4">
            {filteredJournals.map(journal => (
              <div key={journal.id} className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 flex gap-6">
                {journal.imageUrl && (
                  <img src={journal.imageUrl} className="w-24 h-24 rounded-2xl object-cover" alt="" referrerPolicy="no-referrer" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-lg font-bold text-gray-900 truncate">{journal.title}</p>
                      <p className="text-sm text-gray-500">{journal.studentName} 학생 ({journal.classId})</p>
                    </div>
                    <p className="text-xs text-gray-400">{new Date(journal.createdAt?.toDate()).toLocaleString()}</p>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{journal.content}</p>
                </div>
              </div>
            ))}
            {filteredJournals.length === 0 && (
              <div className="py-20 text-center text-gray-400">
                조건에 맞는 일지가 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isBadgeModalOpen && (
          <BadgeManagementModal onClose={() => setIsBadgeModalOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

const BadgeManagementModal = ({ onClose }: { onClose: () => void }) => {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">배지 시스템 설정</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
            <div>
              <p className="font-bold text-gray-900">자동 배지 지급</p>
              <p className="text-xs text-gray-500">활동 점수에 따라 배지를 자동 지급합니다.</p>
            </div>
            <div className="w-12 h-6 bg-green-500 rounded-full relative cursor-pointer">
              <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
            </div>
          </div>
          <div className="space-y-4">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">배지 목록</p>
            {['성실한 관찰자', 'AI 박사', '생물 수호자', '기록의 달인'].map((badge, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border border-gray-100 rounded-2xl">
                <div className="bg-yellow-100 p-2 rounded-xl">
                  <Award className="w-5 h-5 text-yellow-600" />
                </div>
                <span className="font-medium text-gray-700">{badge}</span>
                <div className="ml-auto text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">활성화</div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// --- Main App Logic ---

const ChatPopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="fixed bottom-6 right-6 z-[200]">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="mb-4 w-[350px] md:w-[400px] shadow-2xl"
          >
            <ChatbotView className="h-[500px] shadow-2xl border-2 border-blue-100" />
          </motion.div>
        )}
      </AnimatePresence>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90",
          isOpen ? "bg-gray-900 text-white rotate-90" : "bg-blue-500 text-white hover:bg-blue-600"
        )}
      >
        {isOpen ? <Plus className="w-8 h-8 rotate-45" /> : <MessageCircle className="w-8 h-8" />}
      </button>
    </div>
  );
};

const AppContent = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-green-50">
        <Loader2 className="w-10 h-10 animate-spin text-green-500" />
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      {profile?.role === 'student' ? <StudentDashboard /> : <TeacherDashboard />}
      <ChatPopup />
      <Toaster position="top-center" richColors />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
