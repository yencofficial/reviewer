import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  Award, 
  Flame, 
  Clock, 
  Settings, 
  Layers, 
  HelpCircle, 
  Sparkles, 
  CheckCircle, 
  Moon, 
  Sun, 
  Bookmark, 
  Search, 
  ArrowLeft, 
  ArrowRight, 
  Shuffle, 
  Volume2, 
  VolumeX, 
  Trash2, 
  Plus, 
  Upload, 
  FileText, 
  Image as ImageIcon,
  Play, 
  Pause, 
  RotateCcw,
  Zap, 
  BookMarked,
  Info,
  Calendar,
  ChevronRight,
  TrendingUp,
  X,
  Maximize2,
  Minimize2,
  MessageSquare,
  Sparkle,
  Mic,
  Loader2,
  Compass,
  AlertTriangle,
  Github,
  Key,
  RefreshCw,
  Sliders,
  Check,
  ChevronDown
} from 'lucide-react';

function base64ToArrayBuffer(base64) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function pcmToWav(pcm16Array, sampleRate) {
  const buffer = new ArrayBuffer(44 + pcm16Array.length * 2);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcm16Array.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, pcm16Array.length * 2, true);

  let offset = 44;
  for (let i = 0; i < pcm16Array.length; i++, offset += 2) {
    view.setInt16(offset, pcm16Array[i], true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

// This function parses pasted text/notes and builds a full interactive Study Package entirely client-side.
// This allows the website to be fully hosted on GitHub Pages and run offline without requiring any API keys.
function generateLocalStudyPackage(rawText, titleName = "My Uploaded Reviewer") {
  const cleanText = rawText.trim();
  const paragraphs = cleanText.split(/\n\s*\n/).filter(p => p.trim().length > 10);
  
  // Dynamic Title Determination
  let determinedTitle = titleName;
  if (paragraphs.length > 0 && paragraphs[0].length < 100) {
    determinedTitle = paragraphs[0].replace(/[#*_\-]/g, '').trim();
  }

  // Segmenting topics from paragraphs
  const topics = [];
  const terms = [];
  const flashcards = [];
  const quiz = [];
  const practice = [];
  
  const totalParagraphs = paragraphs.length;
  const defaultSummary = paragraphs.slice(0, Math.min(2, totalParagraphs)).join(' ');

  // Loop paragraphs to extract structural elements
  paragraphs.forEach((para, index) => {
    const lines = para.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const sectionTitle = lines[0].replace(/[#*_\-]/g, '').substring(0, 50) || `Section ${index + 1}`;
    const sectionContent = para;

    // Build unique topic chunks
    topics.push({
      title: sectionTitle,
      content: sectionContent,
      keyConcepts: lines.slice(1, 4).map(l => l.substring(0, 80)) || ["Core Theme", "Analytical Outline"],
      facts: lines.slice(2, 5).map(l => l.substring(0, 120)) || ["Factual study segment derived directly from text."]
    });

    // Simple Key Term parser matching words followed by colon or dash
    const termMatches = para.match(/([A-Z][a-zA-Z\s\-]{3,25})\s*(:|—|-)\s*([^.\n]+)/g);
    if (termMatches) {
      termMatches.forEach(match => {
        const parts = match.split(/:|—|-/);
        if (parts.length >= 2) {
          const t = parts[0].trim();
          const d = parts.slice(1).join(':').trim();
          if (t.length > 2 && d.length > 5) {
            terms.push({ term: t, definition: d });
            flashcards.push({
              front: `Define the term: "${t}"`,
              back: d,
              topic: sectionTitle
            });
          }
        }
      });
    }
  });

  // If no term matches were found, synthesize terms from major noun phrases
  if (terms.length === 0) {
    const backupTerms = ["Key Objective", "Primary Concept", "Theoretical Framework", "Subject Methodology"];
    backupTerms.forEach((bt, idx) => {
      const sentence = paragraphs[idx % paragraphs.length]?.split('.')[0] || "Essential topic focus area.";
      terms.push({ term: bt, definition: sentence });
      flashcards.push({
        front: `What is the significance of: "${bt}"?`,
        back: sentence,
        topic: "General Overview"
      });
    });
  }

  // Ensure there are at least 5 flashcards
  while (flashcards.length < 5) {
    const randomPara = paragraphs[flashcards.length % paragraphs.length] || "Key study point.";
    flashcards.push({
      front: `Review the following concept context: "${randomPara.substring(0, 50)}..."`,
      back: randomPara,
      topic: "Reading Mastery"
    });
  }

  // Create randomized quizzes dynamically
  terms.slice(0, 5).forEach((item, idx) => {
    // Multiple Choice
    const distractors = terms
      .filter(t => t.term !== item.term)
      .map(t => t.term)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    const options = [item.term, ...distractors].sort(() => 0.5 - Math.random());

    quiz.push({
      id: `local-q-mc-${idx}`,
      type: "multiple-choice",
      question: `Which of the following terms describes: "${item.definition}"?`,
      options: options.length >= 2 ? options : [item.term, "Alternative Concept", "External Hypothesis", "General Term"],
      correctAnswer: item.term,
      explanation: `As detailed in your materials, ${item.term} represents: ${item.definition}`
    });

    // True/False
    const isTrue = Math.random() > 0.5;
    const tfQuestion = isTrue 
      ? `True or False: "${item.term}" is defined as: ${item.definition}`
      : `True or False: "${item.term}" is defined as: ${terms[(idx + 1) % terms.length].definition}`;
    
    quiz.push({
      id: `local-q-tf-${idx}`,
      type: "true-false",
      question: tfQuestion,
      options: ["True", "False"],
      correctAnswer: isTrue ? "True" : "False",
      explanation: `${item.term} is correctly defined as: ${item.definition}`
    });

    // Identification
    quiz.push({
      id: `local-q-id-${idx}`,
      type: "identification",
      question: `Identify the term defined as: "${item.definition.substring(0, 120)}..."`,
      correctAnswer: item.term,
      explanation: `The concept matching this summary is ${item.term}.`
    });

    // Fill in the blank
    const sentence = item.definition;
    const words = sentence.split(' ');
    let blankWord = words[Math.floor(words.length / 2)] || "concept";
    blankWord = blankWord.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
    const blankSentence = sentence.replace(new RegExp(`\\b${blankWord}\\b`, 'i'), "[blank]");

    quiz.push({
      id: `local-q-fib-${idx}`,
      type: "fill-in-the-blank",
      question: `Fill in the missing keyword: "${blankSentence}"`,
      correctAnswer: blankWord,
      explanation: `The complete quote is: "${sentence}"`
    });
  });

  // Practice deck generators
  const levels = ["easy", "medium", "hard"];
  topics.forEach((topic, idx) => {
    practice.push({
      id: `local-p-${idx}`,
      difficulty: levels[idx % 3],
      question: `In reference to "${topic.title}", explain the core takeaways or context of: "${topic.content.substring(0, 100)}..."`,
      correctAnswer: topic.title,
      explanation: `Your document details this section as: ${topic.content}`
    });
  });

  return {
    metadata: {
      title: determinedTitle,
      estimatedReadingTime: `${Math.max(1, Math.round(cleanText.split(' ').length / 200))} mins`,
      estimatedStudyTime: `${Math.max(5, Math.round(cleanText.split(' ').length / 50))} mins`
    },
    reviewer: {
      summary: defaultSummary,
      topics: topics,
      terms: terms.slice(0, 10),
      confusedConcepts: [
        {
          conceptA: terms[0]?.term || "Concept Alpha",
          conceptB: terms[1]?.term || "Concept Beta",
          difference: `Your study materials indicate "${terms[0]?.term || 'Alpha'}" focused on definitions, whereas "${terms[1]?.term || 'Beta'}" centers on applications.`
        }
      ],
      formulas: []
    },
    flashcards: flashcards,
    quiz: quiz.sort(() => 0.5 - Math.random()).slice(0, 8), // Start with a clean random slice
    practice: practice
  };
}

export default function App() {
  // Navigation & Layout State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState('light');
  const [focusMode, setFocusMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Content state - Start EMPTY/Null to force onboarding
  const [studyPackage, setStudyPackage] = useState(() => {
    const saved = localStorage.getItem('eduforge_study_package_v2');
    return saved ? JSON.parse(saved) : null;
  });
  const [rawText, setRawText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  
  // Custom API Key (for static hosting like GitHub Pages)
  const [customApiKey, setCustomApiKey] = useState(() => {
    return localStorage.getItem('eduforge_custom_api_key') || '';
  });

  // UI Processing states
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [reviewerSearch, setReviewerSearch] = useState('');
  const [highlightKeyword, setHighlightKeyword] = useState('');
  
  // Interactive bookmarks & progress
  const [bookmarkedTopics, setBookmarkedTopics] = useState(() => {
    const saved = localStorage.getItem('eduforge_bookmarks_v2');
    return saved ? JSON.parse(saved) : [];
  });
  const [completedTopics, setCompletedTopics] = useState(() => {
    const saved = localStorage.getItem('eduforge_completed_topics_v2');
    return saved ? JSON.parse(saved) : [];
  });
  const [masteredFlashcards, setMasteredFlashcards] = useState(() => {
    const saved = localStorage.getItem('eduforge_mastered_cards_v2');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Stats
  const [streak, setStreak] = useState(() => {
    return Number(localStorage.getItem('eduforge_streak_v2')) || 1;
  });
  const [totalSecondsStudied, setTotalSecondsStudied] = useState(() => {
    return Number(localStorage.getItem('eduforge_seconds_studied_v2')) || 0;
  });
  const [quizAttempts, setQuizAttempts] = useState(() => {
    const saved = localStorage.getItem('eduforge_quiz_attempts_v2');
    return saved ? JSON.parse(saved) : [];
  });

  // Pomodoro States
  const [pomoTimeLeft, setPomoTimeLeft] = useState(1500); 
  const [pomoIsRunning, setPomoIsRunning] = useState(false);
  const [pomoMode, setPomoMode] = useState('work'); 

  // AI features states
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: "Hello! I am your AI Study Buddy. Upload a study document first, then ask me to explain topics, create mnemonics, or test you!" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatSending, setIsChatSending] = useState(false);
  const [isTTSActive, setIsTTSActive] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioPlayer, setAudioPlayer] = useState(null);
  const [simplifiedConcept, setSimplifiedConcept] = useState(null);
  const [isSimplifying, setIsSimplifying] = useState(false);
  const [visualizedImages, setVisualizedImages] = useState({}); 
  const [generatingImageIndex, setGeneratingImageIndex] = useState(null);
  const [isAddingQuizQuestions, setIsAddingQuizQuestions] = useState(false);
  
  const mainContentRef = useRef(null);

  // Apply theme class
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Keep tracking time studied
  useEffect(() => {
    const interval = setInterval(() => {
      setTotalSecondsStudied(prev => {
        const next = prev + 1;
        if (next % 10 === 0) {
          localStorage.setItem('eduforge_seconds_studied_v2', next.toString());
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem('eduforge_bookmarks_v2', JSON.stringify(bookmarkedTopics));
  }, [bookmarkedTopics]);

  useEffect(() => {
    localStorage.setItem('eduforge_completed_topics_v2', JSON.stringify(completedTopics));
  }, [completedTopics]);

  useEffect(() => {
    localStorage.setItem('eduforge_mastered_cards_v2', JSON.stringify(masteredFlashcards));
  }, [masteredFlashcards]);

  useEffect(() => {
    if (studyPackage) {
      localStorage.setItem('eduforge_study_package_v2', JSON.stringify(studyPackage));
    } else {
      localStorage.removeItem('eduforge_study_package_v2');
    }
  }, [studyPackage]);

  useEffect(() => {
    localStorage.setItem('eduforge_custom_api_key', customApiKey);
  }, [customApiKey]);

  // Pomodoro Interval Timer trigger
  useEffect(() => {
    let timer = null;
    if (pomoIsRunning) {
      timer = setInterval(() => {
        setPomoTimeLeft(prev => {
          if (prev <= 1) {
            try {
              const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
              const osc = audioCtx.createOscillator();
              const gainNode = audioCtx.createGain();
              osc.connect(gainNode);
              gainNode.connect(audioCtx.destination);
              osc.frequency.setValueAtTime(880, audioCtx.currentTime); 
              gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
              osc.start();
              osc.stop(audioCtx.currentTime + 0.5);
            } catch (e) {
              console.log('Audio contextual beep failed', e);
            }

            if (pomoMode === 'work') {
              setPomoMode('break');
              return 300; 
            } else {
              setPomoMode('work');
              return 1500; 
            }
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timer);
    }
    return () => clearInterval(timer);
  }, [pomoIsRunning, pomoMode]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadedFileName(file.name);
    
    // Check if txt
    if (file.type === "text/plain" || file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setRawText(event.target.result);
      };
      reader.readAsText(file);
    } else {
      // Prompt user that raw text extracts are needed for docs or offer image conversion
      alert(`Detected file: ${file.name}. To run purely client-side or offline, plain text (.txt) file uploads are recommended. For PDF, DOCX, or images, you can open them and copy-paste the text content directly into the text box below.`);
    }
  };

  // Dispatches to Gemini API if customApiKey exists, or falls back to our robust Local Parser
  const handleGenerateStudyMaterials = async () => {
    if (!rawText.trim()) {
      alert("Please paste text or load a text file first!");
      return;
    }

    setIsLoading(true);
    setLoadingStep("Reading and parsing your review document...");

    // Check if Custom API Key is provided
    const activeKey = customApiKey.trim();
    if (!activeKey) {
      // FALLBACK TO PREMIUM LOCAL COMPILER
      setTimeout(() => {
        try {
          const localPackage = generateLocalStudyPackage(rawText, uploadedFileName || "Custom Syllabus");
          setStudyPackage(localPackage);
          
          // Reset progress
          setBookmarkedTopics([]);
          setCompletedTopics([]);
          setMasteredFlashcards([]);
          setStreak(prev => prev + 1);

          setChatMessages([
            { role: 'assistant', text: `Study materials parsed locally for "${localPackage.metadata.title}"! (To unlock true Gemini-powered features like visual sketches or voice audio, paste your Gemini API Key in the "Document Setup" or top-right settings bar).` }
          ]);
          setActiveTab('dashboard');
        } catch (err) {
          console.error("Local parsing failed: ", err);
          alert("Could not compile. Please try with simpler or larger text documents.");
        } finally {
          setIsLoading(false);
          setLoadingStep("");
        }
      }, 1200);
      return;
    }

    // RUN REAL GEMINI GENERATIVE COMPILATION
    try {
      setLoadingStep("Formulating syllabus schema through Gemini AI...");
      const jsonSchema = {
        type: "OBJECT",
        properties: {
          metadata: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING" },
              estimatedReadingTime: { type: "STRING" },
              estimatedStudyTime: { type: "STRING" }
            },
            required: ["title", "estimatedReadingTime", "estimatedStudyTime"]
          },
          reviewer: {
            type: "OBJECT",
            properties: {
              summary: { type: "STRING" },
              topics: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    title: { type: "STRING" },
                    content: { type: "STRING" },
                    keyConcepts: { type: "ARRAY", items: { type: "STRING" } },
                    facts: { type: "ARRAY", items: { type: "STRING" } }
                  },
                  required: ["title", "content", "keyConcepts", "facts"]
                }
              },
              terms: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    term: { type: "STRING" },
                    definition: { type: "STRING" }
                  },
                  required: ["term", "definition"]
                }
              },
              confusedConcepts: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    conceptA: { type: "STRING" },
                    conceptB: { type: "STRING" },
                    difference: { type: "STRING" }
                  },
                  required: ["conceptA", "conceptB", "difference"]
                }
              },
              formulas: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    name: { type: "STRING" },
                    equation: { type: "STRING" },
                    useCase: { type: "STRING" }
                  },
                  required: ["name", "equation", "useCase"]
                }
              }
            },
            required: ["summary", "topics", "terms", "confusedConcepts"]
          },
          flashcards: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                front: { type: "STRING" },
                back: { type: "STRING" },
                topic: { type: "STRING" }
              },
              required: ["front", "back", "topic"]
            }
          },
          quiz: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                id: { type: "STRING" },
                type: { type: "STRING" }, 
                question: { type: "STRING" },
                options: { type: "ARRAY", items: { type: "STRING" } }, 
                correctAnswer: { type: "STRING" },
                explanation: { type: "STRING" }
              },
              required: ["id", "type", "question", "correctAnswer", "explanation"]
            }
          },
          practice: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                id: { type: "STRING" },
                difficulty: { type: "STRING" }, 
                question: { type: "STRING" },
                correctAnswer: { type: "STRING" },
                explanation: { type: "STRING" }
              },
              required: ["id", "difficulty", "question", "correctAnswer", "explanation"]
            }
          }
        },
        required: ["metadata", "reviewer", "flashcards", "quiz", "practice"]
      };

      const systemPrompt = `You are a world-class academic tutor. Extract, digest, and generate premium study materials based strictly on the provided lesson text. 
      Do NOT inject external facts, invent statistics, or extrapolate beyond the explicit material provided. If details (like equations/formulas) are not relevant or missing in the source text, provide empty arrays.
      Create:
      1. A master overview summary and logical topics/subtopics.
      2. Key term definitions.
      3. Commonly confused concepts comparisons.
      4. Interactive flashcards.
      5. A multi-format quiz including multiple-choice, true-false, identification, and fill-in-the-blank.
      6. Dynamic practice questions grouped into easy, medium, and hard difficulties.`;

      const payload = {
        contents: [{ parts: [{ text: `Analyze the following user syllabus context and transform it into a complete structured study package:\n\n${rawText}` }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: jsonSchema
        },
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        }
      };

      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${activeKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Gemini API returned code ${response.status}`);
      }

      const data = await response.json();
      const rawResponseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (rawResponseText) {
        const parsedPackage = JSON.parse(rawResponseText);
        setStudyPackage(parsedPackage);
        setBookmarkedTopics([]);
        setCompletedTopics([]);
        setMasteredFlashcards([]);
        setStreak(prev => prev + 1);

        setChatMessages([
          { role: 'assistant', text: `Study deck loaded successfully! I've ingested "${parsedPackage.metadata.title}". What would you like to clarify or study today?` }
        ]);

        setActiveTab('dashboard');
      } else {
        throw new Error("No response generated by Gemini.");
      }

    } catch (error) {
      console.error("Gemini failed, trying local fallback parser: ", error);
      alert("Gemini call failed (verify API Key). Falling back to EduForge client-side local parser...");
      
      // Automatic fallback
      const localPackage = generateLocalStudyPackage(rawText, uploadedFileName || "Fallback Syllabus");
      setStudyPackage(localPackage);
      setBookmarkedTopics([]);
      setCompletedTopics([]);
      setMasteredFlashcards([]);
      setActiveTab('dashboard');
    } finally {
      setIsLoading(false);
      setLoadingStep("");
    }
  };

  const playAudioSummary = async (textToSpeak) => {
    if (!customApiKey) {
      alert("Please configure your Gemini API Key in 'Document Setup' to use Speech synthesis features.");
      return;
    }

    if (isTTSActive) {
      if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
      }
      setIsTTSActive(false);
      return;
    }

    setIsTTSActive(true);

    try {
      const payload = {
        contents: [{
          parts: [{ text: `Say encouragingly and clearly: Let's review the main point. ${textToSpeak}` }]
        }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Zephyr" }
            }
          }
        },
        model: "gemini-2.5-flash-preview-tts"
      };

      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${customApiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      const part = result?.candidates?.[0]?.content?.parts?.[0];
      const audioData = part?.inlineData?.data;
      const mimeType = part?.inlineData?.mimeType;

      if (audioData && mimeType && mimeType.startsWith("audio/")) {
        const rateMatch = mimeType.match(/rate=(\d+)/);
        const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
        
        const pcmData = base64ToArrayBuffer(audioData);
        const pcm16 = new Int16Array(pcmData);
        const wavBlob = pcmToWav(pcm16, sampleRate);
        const url = URL.createObjectURL(wavBlob);
        
        if (audioPlayer) {
          audioPlayer.pause();
        }

        const newPlayer = new Audio(url);
        setAudioUrl(url);
        setAudioPlayer(newPlayer);
        
        newPlayer.play();
        newPlayer.onended = () => {
          setIsTTSActive(false);
        };
      } else {
        throw new Error("Invalid speech package payload.");
      }
    } catch (err) {
      console.error("TTS generation failed: ", err);
      setIsTTSActive(false);
      alert("Speech synthesis service is currently busy. Try again.");
    }
  };

  const handleGenerateConceptIllustration = async (topicTitle, idx) => {
    if (!customApiKey) {
      alert("Please paste your Gemini API Key in the 'Document Setup' tab to generate customized illustrations with Imagen.");
      return;
    }

    if (generatingImageIndex !== null) return;
    setGeneratingImageIndex(idx);

    try {
      const promptText = `A minimalist, clean, 2D vector educational line illustration with balanced contrast depicting: ${topicTitle}, professional diagram layout.`;
      const payload = { 
        instances: [{ prompt: promptText }], 
        parameters: { sampleCount: 1 } 
      };

      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${customApiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      const base64Data = result.predictions?.[0]?.bytesBase64Encoded;

      if (base64Data) {
        const imageUrl = `data:image/png;base64,${base64Data}`;
        setVisualizedImages(prev => ({
          ...prev,
          [idx]: imageUrl
        }));
      } else {
        throw new Error("Empty image payload from generator.");
      }
    } catch (err) {
      console.error("Diagram illustration generation failed: ", err);
      alert("Could not load drawing. Ensure your API key is correct.");
    } finally {
      setGeneratingImageIndex(null);
    }
  };

  const handleSimplifyConcept = async (conceptTitle, contentBody) => {
    if (!customApiKey) {
      alert("Please add your Gemini API Key in the 'Document Setup' tab to simplify terms using Gemini.");
      return;
    }

    setIsSimplifying(true);
    setSimplifiedConcept({ title: conceptTitle, text: "" });

    try {
      const userPrompt = `Concept to simplify: "${conceptTitle}"\nContext text:\n${contentBody}`;
      const systemInstruction = "Explain this complex topic in extremely simple terms with a creative analogy as if explaining to a 10-year-old. Limit explanation to two engaging paragraphs.";

      const payload = {
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        }
      };

      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${customApiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      const responseText = result?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (responseText) {
        setSimplifiedConcept({
          title: conceptTitle,
          text: responseText
        });
      }
    } catch (err) {
      console.error("Simplifying failed: ", err);
      setSimplifiedConcept(null);
    } finally {
      setIsSimplifying(false);
    }
  };

  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatSending) return;

    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setIsChatSending(true);

    try {
      const packageGrounding = JSON.stringify({
        title: studyPackage?.metadata?.title || "My Reviewer",
        summary: studyPackage?.reviewer?.summary || "",
        topics: studyPackage?.reviewer?.topics?.map(t => ({ title: t.title, content: t.content })) || [],
        terms: studyPackage?.reviewer?.terms || []
      });

      const systemInstruction = `You are a helpful AI Study Buddy in the EduForge platform.
      You are strictly grounded in the currently loaded study package detailed here: ${packageGrounding}.
      Do NOT invent details or extrapolate. If asked for mnemonics or simplified concepts, draft them strictly using these facts. Keep answers succinct, using bold and bullet points.`;

      const payload = {
        contents: [{ parts: [{ text: userMsg }] }],
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        }
      };

      const activeKey = customApiKey.trim();
      const apiUrl = activeKey 
        ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${activeKey}`
        : ""; // If no key, we show a helpful local message

      if (!apiUrl) {
        setTimeout(() => {
          setChatMessages(prev => [...prev, { 
            role: 'assistant', 
            text: `[Grounded Offline Assistant]: I received your message: "${userMsg}". Since no Gemini API Key is loaded in 'Document Setup', I'm running offline! Please paste your text, review cards, or load an API Key to start real-time interactive AI dialogues!` 
          }]);
          setIsChatSending(false);
        }, 1000);
        return;
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      const responseText = result?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (responseText) {
        setChatMessages(prev => [...prev, { role: 'assistant', text: responseText }]);
      }
    } catch (err) {
      console.error("Chat service error: ", err);
      setChatMessages(prev => [...prev, { role: 'assistant', text: "I faced an error connecting to my server context. Please make sure your Gemini API Key is correct." }]);
    } finally {
      setIsChatSending(false);
    }
  };

  const handleExtendQuizQuestions = async () => {
    if (!customApiKey) {
      alert("Please enter a Gemini API Key in the 'Document Setup' tab to dynamically generate additional AI questions.");
      return;
    }
    setIsAddingQuizQuestions(true);

    try {
      const studySummary = JSON.stringify(studyPackage?.reviewer?.summary);
      const studyTopics = JSON.stringify(studyPackage?.reviewer?.topics);

      const jsonSchema = {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            id: { type: "STRING" },
            type: { type: "STRING" },
            question: { type: "STRING" },
            options: { type: "ARRAY", items: { type: "STRING" } },
            correctAnswer: { type: "STRING" },
            explanation: { type: "STRING" }
          },
          required: ["id", "type", "question", "correctAnswer", "explanation"]
        }
      };

      const systemPrompt = `Create exactly 5 more diverse questions (multiple-choice, true-false, identification, or fill-in-the-blank) based strictly on these topics: ${studyTopics}. Summary context: ${studySummary}. Do NOT create duplicates. Return valid JSON adhering to the target array schema.`;

      const payload = {
        contents: [{ parts: [{ text: "Create 5 extra customized practice quiz questions." }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: jsonSchema
        },
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        }
      };

      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${customApiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      const rawResponseText = result?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (rawResponseText) {
        const extraQuestions = JSON.parse(rawResponseText);
        const formatted = extraQuestions.map((q, idx) => ({
          ...q,
          id: `ai-ext-${Date.now()}-${idx}`
        }));

        setStudyPackage(prev => ({
          ...prev,
          quiz: [...prev.quiz, ...formatted]
        }));

        alert("Successfully added 5 new custom AI-generated quiz questions to your test bank!");
      }
    } catch (err) {
      console.error("Quiz Extension Failed: ", err);
      alert("Failed to extend practice quiz questions. Try again later.");
    } finally {
      setIsAddingQuizQuestions(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      mainContentRef.current?.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(err => console.log(err));
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Shown when there is no active study package
  if (!studyPackage) {
    return (
      <div className={`min-h-screen font-sans transition-all duration-300 flex flex-col justify-between ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
        
        {/* Onboarding Header */}
        <header className={`sticky top-0 z-40 backdrop-blur-md border-b flex items-center justify-between px-6 py-4 ${theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-tr from-indigo-500 to-blue-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20 text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-indigo-500 via-blue-600 to-cyan-500 bg-clip-text text-transparent">EduForge Studio</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Grounded Cognitive Student Hub</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} 
              className="p-2.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === 'light' ? <Moon className="w-5 h-5 text-indigo-600" /> : <Sun className="w-5 h-5 text-amber-400" />}
            </button>
          </div>
        </header>

        {/* Onboarding Main Content */}
        <main className="max-w-4xl mx-auto px-4 py-12 flex-1 flex flex-col justify-center w-full">
          <div className="text-center space-y-4 mb-8">
            <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs px-3 py-1.5 rounded-full font-bold uppercase tracking-wider">
              Ready to Study Smarter?
            </span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">
              Create Your Interactive Reviewer
            </h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-sm md:text-base">
              Paste your raw lesson syllabus, lecture notes, or upload a plain text file. EduForge automatically compiles a Quizlet-grade interactive workspace strictly using your uploaded data.
            </p>
          </div>

          {/* Key Input Banner for GitHub Pages Static Deployment */}
          <div className="mb-6 p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-2xl mx-auto w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start space-x-3">
                <Key className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs">Optional: Paste Your Gemini API Key</h4>
                  <p className="text-[10px] text-slate-400">Unlock dynamic diagram illustration (Imagen) & real AI concept-explaining features!</p>
                </div>
              </div>
              <input 
                type="password" 
                placeholder="AI Studio API Key (AI_KEY)..."
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
                className="p-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[180px]"
              />
            </div>
          </div>

          {/* Document Compilation Box */}
          <div className={`p-6 md:p-8 rounded-3xl border transition-all ${theme === 'dark' ? 'bg-slate-900 border-slate-800 shadow-2xl shadow-indigo-950/20' : 'bg-white border-slate-200 shadow-xl'}`}>
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Paste Your Lesson Content</label>
                <textarea 
                  placeholder="Paste textbook chapters, study sheets, raw science notes, history facts, definitions, or bullet points here..."
                  value={rawText}
                  onChange={(e) => {
                    setRawText(e.target.value);
                    setUploadedFileName('');
                  }}
                  className="w-full h-48 p-4 text-xs rounded-2xl border border-slate-200 dark:border-slate-800 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed font-sans"
                />
              </div>

              {/* Drag and Drop */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Attach Document File (.txt)</label>
                  <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500/50 rounded-2xl p-5 text-center cursor-pointer relative group transition">
                    <input 
                      type="file" 
                      accept=".txt"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className="w-8 h-8 mx-auto mb-2 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                    <span className="block text-xs text-slate-400 font-semibold">Browse plain text file</span>
                    {uploadedFileName && (
                      <span className="block text-xs text-indigo-500 mt-2 font-bold flex items-center justify-center">
                        <FileText className="w-4 h-4 mr-1 shrink-0" /> {uploadedFileName}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col justify-center p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-xs text-slate-500 leading-relaxed">
                  <div className="flex items-center space-x-2 text-indigo-500 font-bold mb-2">
                    <Info className="w-4 h-4" />
                    <span>How it works:</span>
                  </div>
                  <p className="mb-2">Your document is analyzed to draft an isolated syllabus environment. No external biases are introduced.</p>
                  <p className="font-semibold text-slate-400">If no Gemini API Key is added, a fast, highly capable client-side heuristic engine will parse the material locally!</p>
                </div>
              </div>

              <div className="pt-2">
                <button 
                  onClick={handleGenerateStudyMaterials}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-3.5 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-indigo-500/20 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Generate My Interactive Study Workspace</span>
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center text-white">
            <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Analyzing Study Content</h2>
            <p className="text-sm text-indigo-300 max-w-sm">{loadingStep}</p>
          </div>
        )}

        <footer className="py-8 text-center text-xs text-slate-400 border-t border-slate-100 dark:border-slate-900">
          <p>© 2026 EduForge Studio. Designed for offline resilience & GitHub static hosting compatibility.</p>
        </footer>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans transition-all duration-300 ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* Premium Header Bar */}
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b flex items-center justify-between px-6 py-4 transition-all ${theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-tr from-indigo-500 to-blue-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20 text-white">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-indigo-500 via-blue-600 to-cyan-500 bg-clip-text text-transparent">EduForge Studio</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Active Study Deck: {studyPackage?.metadata?.title}</p>
          </div>
        </div>

        {/* Control Center */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-4 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-xs font-semibold">
            <span className="flex items-center"><Flame className="w-4 h-4 text-orange-500 mr-1 fill-orange-500" /> {streak} Day Streak</span>
            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
            <span className="flex items-center"><Clock className="w-4 h-4 text-blue-500 mr-1" /> {Math.floor(totalSecondsStudied / 60)}m Studied</span>
          </div>

          {/* Local API Key Display Badge */}
          <div className="hidden md:flex items-center space-x-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px]">
            <Key className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">{customApiKey ? "API Key Connected" : "Local Engine Mode"}</span>
          </div>

          <button 
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} 
            className="p-2.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            title="Toggle Theme"
          >
            {theme === 'light' ? <Moon className="w-5 h-5 text-indigo-600" /> : <Sun className="w-5 h-5 text-amber-400" />}
          </button>

          <button 
            onClick={() => setFocusMode(!focusMode)} 
            className={`p-2.5 rounded-xl transition-all ${focusMode ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-200 dark:hover:bg-slate-800'}`}
            title="Toggle Focus Mode"
          >
            <Zap className="w-5 h-5" />
          </button>

          <button 
            onClick={toggleFullscreen} 
            className="p-2.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Primary Work Area Grid */}
      <div className="max-w-[1500px] mx-auto px-4 md:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Navigation Sidebar */}
        {!focusMode && (
          <aside className="lg:col-span-3 space-y-4">
            <div className={`p-5 rounded-2xl border transition-all ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="mb-4">
                <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Workspace Deck</span>
                <h3 className="font-bold text-slate-700 dark:text-slate-200 truncate mt-1">{studyPackage?.metadata?.title}</h3>
              </div>

              <nav className="space-y-1.5">
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: Award },
                  { id: 'reviewer', label: 'Smart Reviewer', icon: BookOpen },
                  { id: 'flashcards', label: 'Flashcards', icon: Layers },
                  { id: 'quiz', label: 'Interactive Quiz', icon: HelpCircle },
                  { id: 'practice', label: 'Practice Mode', icon: CheckCircle },
                  { id: 'chat', label: 'AI Study Buddy', icon: MessageSquare },
                  { id: 'settings', label: 'Document Setup', icon: Settings },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                        isActive 
                        ? 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-500/25' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                    >
                      <Icon className="w-4.5 h-4.5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* POMODORO FOCUS WIDGET */}
            <div className={`p-5 rounded-2xl border text-center transition-all ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Pomodoro Interval</h4>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${pomoMode === 'work' ? 'bg-orange-500/15 text-orange-500' : 'bg-green-500/15 text-green-500'}`}>
                  {pomoMode === 'work' ? 'FOCUS' : 'REST'}
                </span>
              </div>
              
              <div className="my-4">
                <div className="text-3xl font-extrabold tracking-widest text-slate-800 dark:text-white">
                  {Math.floor(pomoTimeLeft / 60).toString().padStart(2, '0')}:{(pomoTimeLeft % 60).toString().padStart(2, '0')}
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${pomoMode === 'work' ? 'bg-orange-500' : 'bg-green-500'}`} 
                    style={{ width: `${(pomoTimeLeft / (pomoMode === 'work' ? 1500 : 300)) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex justify-center space-x-2">
                <button 
                  onClick={() => setPomoIsRunning(!pomoIsRunning)}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold text-white flex items-center justify-center space-x-1.5 transition-all ${
                    pomoIsRunning ? 'bg-slate-500 hover:bg-slate-600' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {pomoIsRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{pomoIsRunning ? 'Pause' : 'Start'}</span>
                </button>
                <button 
                  onClick={() => { setPomoIsRunning(false); setPomoTimeLeft(pomoMode === 'work' ? 1500 : 300); }}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* Immersive Main Display Area */}
        <main className={`${focusMode ? 'lg:col-span-12' : 'lg:col-span-9'} space-y-6`}>
          
          {focusMode && (
            <div className="bg-indigo-600 text-white rounded-2xl p-4 flex items-center justify-between shadow-xl">
              <div className="flex items-center space-x-3">
                <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
                <div>
                  <h4 className="font-semibold text-sm">Focus Mode is Activated</h4>
                  <p className="text-xs text-indigo-200">Distractions are hidden. Use tab bar above to exit.</p>
                </div>
              </div>
              <button onClick={() => setFocusMode(false)} className="px-3 py-1 rounded bg-white/20 hover:bg-white/30 text-xs font-bold">
                Exit Focus
              </button>
            </div>
          )}

          {/* DASHBOARD TAB VIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Premium Progress Metric Hero Banner */}
              <div className="p-6 md:p-8 rounded-3xl relative overflow-hidden bg-gradient-to-tr from-indigo-900 via-indigo-950 to-blue-900 text-white border border-indigo-500/20 shadow-2xl">
                <div className="absolute top-0 right-0 transform translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  <div className="md:col-span-8 space-y-3">
                    <span className="bg-indigo-500/25 border border-indigo-400/25 px-3 py-1 rounded-full text-xs font-semibold text-indigo-300 flex items-center w-fit">
                      <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-300 fill-amber-300" /> Intelligent Core Study Deck
                    </span>
                    <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">{studyPackage?.metadata?.title}</h2>
                    <p className="text-sm text-indigo-200/90 max-w-xl">
                      Compiled successfully. Interactive quizzes, structured vocabulary, and flashcard sets are isolated specifically to your raw content uploads.
                    </p>

                    <div className="flex items-center space-x-3 pt-2">
                      <button 
                        onClick={() => setActiveTab('reviewer')}
                        className="bg-white text-indigo-950 font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-slate-100 transition shadow-lg shadow-white/10"
                      >
                        Start Reviewing
                      </button>
                      <button 
                        onClick={() => setActiveTab('chat')}
                        className="bg-indigo-600 text-white border border-indigo-500/40 font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition flex items-center space-x-2"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Ask AI Study Buddy</span>
                      </button>
                    </div>
                  </div>

                  {/* Circle Stats Display */}
                  <div className="md:col-span-4 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0">
                    <div className="relative w-28 h-28 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="56" cy="56" r="48" stroke="rgba(255,255,255,0.08)" strokeWidth="8" fill="transparent" />
                        <circle cx="56" cy="56" r="48" stroke="#4f46e5" strokeWidth="8" fill="transparent" 
                          strokeDasharray={2 * Math.PI * 48}
                          strokeDashoffset={2 * Math.PI * 48 * (1 - (completedTopics.length / (studyPackage?.reviewer?.topics?.length || 1)))} 
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      <div className="absolute text-center">
                        <span className="text-2xl font-black">{Math.round((completedTopics.length / (studyPackage?.reviewer?.topics?.length || 1)) * 100)}%</span>
                        <p className="text-[9px] uppercase tracking-wider text-indigo-300 font-bold">Progress</p>
                      </div>
                    </div>
                    <span className="text-xs text-indigo-200 mt-2 font-medium">
                      {completedTopics.length} of {studyPackage?.reviewer?.topics?.length || 0} topics mastered
                    </span>
                  </div>
                </div>
              </div>

              {/* STATS COUNT GRID */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Bookmarked Topics", val: bookmarkedTopics.length, icon: Bookmark, color: "text-amber-500 bg-amber-500/10" },
                  { label: "Flashcards Mastered", val: `${masteredFlashcards.length}/${studyPackage?.flashcards?.length || 0}`, icon: Layers, color: "text-blue-500 bg-blue-500/10" },
                  { label: "Quiz Success Rate", val: quizAttempts.length > 0 ? `${Math.round(quizAttempts.reduce((acc, q) => acc + q.score, 0) / quizAttempts.length)}%` : 'No data', icon: Award, color: "text-emerald-500 bg-emerald-500/10" },
                  { label: "Est. Total Reading Time", val: studyPackage?.metadata?.estimatedReadingTime || 'N/A', icon: Clock, color: "text-purple-500 bg-purple-500/10" },
                ].map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <div key={i} className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-400 font-semibold">{stat.label}</span>
                        <div className={`p-1.5 rounded-lg ${stat.color}`}><Icon className="w-4 h-4" /></div>
                      </div>
                      <div className="text-xl font-bold">{stat.val}</div>
                    </div>
                  );
                })}
              </div>

              {/* Two Column Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Syllabus Topics */}
                <div className={`md:col-span-7 p-6 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-base flex items-center"><BookMarked className="w-5 h-5 mr-2 text-indigo-500" /> Study Core Sections</h3>
                    <button onClick={() => setActiveTab('reviewer')} className="text-xs font-semibold text-indigo-500 hover:underline">View Reviewer</button>
                  </div>

                  <div className="space-y-3">
                    {studyPackage?.reviewer?.topics?.map((topic, index) => {
                      const isCompleted = completedTopics.includes(index);
                      const isBookmarked = bookmarkedTopics.includes(index);
                      return (
                        <div key={index} className={`p-4 rounded-xl border flex items-center justify-between ${
                          theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'
                        }`}>
                          <div className="space-y-1 flex-1 pr-4">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-semibold text-sm truncate max-w-[200px]">{topic.title}</h4>
                              {isBookmarked && <span className="bg-amber-100 dark:bg-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded text-[9px] font-bold">Starred</span>}
                            </div>
                            <p className="text-xs text-slate-400 truncate max-w-sm">{topic.content}</p>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                if (isCompleted) {
                                  setCompletedTopics(completedTopics.filter(t => t !== index));
                                } else {
                                  setCompletedTopics([...completedTopics, index]);
                                }
                              }}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isCompleted ? 'bg-emerald-500/10 text-emerald-500' : 'text-slate-300 dark:text-slate-700 hover:text-slate-400'
                              }`}
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Performance Analytics Widget */}
                <div className={`md:col-span-5 p-6 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                  <h3 className="font-bold text-base flex items-center mb-4"><TrendingUp className="w-5 h-5 mr-2 text-indigo-500" /> Test Performance</h3>
                  
                  {quizAttempts.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">
                      <HelpCircle className="w-12 h-12 mx-auto mb-2 text-slate-300 dark:text-slate-800" />
                      No test history recorded. Try generating a quiz!
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {quizAttempts.map((attempt, index) => (
                        <div key={index} className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 last:border-0 last:pb-0">
                          <div>
                            <p className="text-xs text-slate-400 flex items-center"><Calendar className="w-3 h-3 mr-1" /> {attempt.date}</p>
                            <h4 className="font-semibold text-sm truncate max-w-[150px]">{attempt.title}</h4>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div className="bg-indigo-500 h-full" style={{ width: `${attempt.score}%` }}></div>
                            </div>
                            <span className="font-bold text-sm">{attempt.score}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SMART REVIEWER TAB VIEW */}
          {activeTab === 'reviewer' && (
            <div className="space-y-6">
              
              {/* Header Bar Controls */}
              <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search inside reviewer content..." 
                    value={reviewerSearch}
                    onChange={(e) => setReviewerSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Highlighter widget */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">Highlight:</span>
                  <input 
                    type="text" 
                    placeholder="Enter keyword..." 
                    value={highlightKeyword}
                    onChange={(e) => setHighlightKeyword(e.target.value)}
                    className="border border-slate-200 dark:border-slate-800 bg-transparent rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  {highlightKeyword && (
                    <button onClick={() => setHighlightKeyword('')} className="p-1 hover:bg-slate-100 rounded text-slate-400">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Master Summary Card */}
              <div className={`p-6 rounded-2xl border relative overflow-hidden ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold flex items-center text-indigo-500">
                    <Info className="w-5 h-5 mr-2" /> Summary Overview
                  </h3>
                  
                  <button 
                    onClick={() => playAudioSummary(studyPackage?.reviewer?.summary)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isTTSActive 
                      ? 'bg-rose-500 text-white animate-pulse' 
                      : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200'
                    }`}
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>{isTTSActive ? 'Stop Voiceover' : 'Play AI Voiceover'}</span>
                  </button>
                </div>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {studyPackage?.reviewer?.summary}
                </p>
              </div>

              {/* Kid-friendly AI Simplification Box */}
              {simplifiedConcept && (
                <div className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 relative animate-fadeIn">
                  <button 
                    onClick={() => setSimplifiedConcept(null)}
                    className="absolute top-4 right-4 p-1 rounded-full hover:bg-amber-500/10 text-amber-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <span className="text-[10px] uppercase font-black text-amber-500 tracking-wider">Simple AI Analogy Mode</span>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-amber-300 mt-1 mb-2">Simply Put: {simplifiedConcept.title}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">{simplifiedConcept.text}</p>
                </div>
              )}

              {/* Topics Iterative Maps */}
              <div className="space-y-4">
                {studyPackage?.reviewer?.topics
                  ?.filter(topic => {
                    if (!reviewerSearch) return true;
                    return topic.title.toLowerCase().includes(reviewerSearch.toLowerCase()) || 
                           topic.content.toLowerCase().includes(reviewerSearch.toLowerCase());
                  })
                  .map((topic, index) => {
                    const isBookmarked = bookmarkedTopics.includes(index);
                    const isCompleted = completedTopics.includes(index);

                    const highlightText = (text) => {
                      if (!highlightKeyword) return text;
                      const parts = text.split(new RegExp(`(${highlightKeyword})`, 'gi'));
                      return parts.map((part, i) => 
                        part.toLowerCase() === highlightKeyword.toLowerCase() 
                          ? <mark key={i} className="bg-amber-300 text-slate-950 dark:bg-amber-400 rounded px-0.5">{part}</mark> 
                          : part
                      );
                    };

                    return (
                      <div key={index} className={`p-6 rounded-2xl border transition-all ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                      }`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-extrabold">Section {index + 1}</span>
                            <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">{highlightText(topic.title)}</h4>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleSimplifyConcept(topic.title, topic.content)}
                              disabled={isSimplifying}
                              className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 hover:text-indigo-600 font-semibold text-xs flex items-center space-x-1"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span className="hidden md:inline">Simplify with AI</span>
                            </button>

                            <button
                              onClick={() => handleGenerateConceptIllustration(topic.title, index)}
                              disabled={generatingImageIndex !== null}
                              className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-500 hover:text-blue-600 font-semibold text-xs flex items-center space-x-1"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                              <span className="hidden md:inline">Sketch Diagram</span>
                            </button>

                            <button 
                              onClick={() => {
                                if (isBookmarked) {
                                  setBookmarkedTopics(bookmarkedTopics.filter(t => t !== index));
                                } else {
                                  setBookmarkedTopics([...bookmarkedTopics, index]);
                                }
                              }}
                              className={`p-2 rounded-lg transition-colors ${
                                isBookmarked ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-500' : 'text-slate-300 dark:text-slate-600'
                              }`}
                            >
                              <Bookmark className="w-4 h-4 fill-current" />
                            </button>

                            <button 
                              onClick={() => {
                                if (isCompleted) {
                                  setCompletedTopics(completedTopics.filter(t => t !== index));
                                } else {
                                  setCompletedTopics([...completedTopics, index]);
                                }
                              }}
                              className={`p-2 rounded-lg transition-colors ${
                                isCompleted ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500' : 'text-slate-300 dark:text-slate-600'
                              }`}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {visualizedImages[index] && (
                          <div className="mb-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 flex flex-col items-center p-3">
                            <span className="text-[9px] uppercase font-black text-blue-500 mb-1">Imagen Schematic Diagram Outline</span>
                            <img 
                              src={visualizedImages[index]} 
                              alt={`AI Diagram of ${topic.title}`} 
                              className="max-h-64 object-contain rounded-lg"
                            />
                          </div>
                        )}

                        {generatingImageIndex === index && (
                          <div className="mb-4 p-4 rounded-xl border border-blue-500/10 bg-blue-500/5 text-center text-xs flex flex-col items-center justify-center space-y-2">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                            <span>Sketching diagram outline for "{topic.title}" with Imagen...</span>
                          </div>
                        )}

                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                          {highlightText(topic.content)}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900">
                            <span className="text-[11px] uppercase tracking-wider text-indigo-500 font-extrabold block mb-2 font-mono">Core Highlights</span>
                            <ul className="space-y-1.5">
                              {topic.keyConcepts?.map((concept, i) => (
                                <li key={i} className="text-xs text-slate-500 dark:text-slate-400 flex items-center">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-2"></span>
                                  {highlightText(concept)}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900">
                            <span className="text-[11px] uppercase tracking-wider text-emerald-500 font-extrabold block mb-2 font-mono">Facts Extracted</span>
                            <ul className="space-y-1.5">
                              {topic.facts?.map((fact, i) => (
                                <li key={i} className="text-xs text-slate-500 dark:text-slate-400 flex items-start">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 mt-1.5 shrink-0"></span>
                                  <span>{highlightText(fact)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Vocab Vocabulary section */}
              {studyPackage?.reviewer?.terms && studyPackage.reviewer.terms.length > 0 && (
                <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                  <h3 className="text-lg font-bold mb-4 text-indigo-500 flex items-center">
                    <Layers className="w-5 h-5 mr-2" /> Vocab Glossary Card list
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {studyPackage.reviewer.terms.map((term, i) => (
                      <div key={i} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
                        <strong className="text-sm font-bold block text-slate-800 dark:text-slate-200 mb-1">{term.term}</strong>
                        <p className="text-xs text-slate-400 leading-relaxed">{term.definition}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* FLASHCARDS TAB VIEW */}
          {activeTab === 'flashcards' && (
            <FlashcardsModule 
              cards={studyPackage?.flashcards || []} 
              masteredCards={masteredFlashcards}
              toggleMastered={(idx) => {
                if (masteredFlashcards.includes(idx)) {
                  setMasteredFlashcards(masteredFlashcards.filter(c => c !== idx));
                } else {
                  setMasteredFlashcards([...masteredFlashcards, idx]);
                }
              }}
              theme={theme}
            />
          )}

          {/* QUIZ TAB VIEW */}
          {activeTab === 'quiz' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold">Interactive Deck Quiz</h3>
                  <p className="text-xs text-slate-400">Questions derived directly from your reviewer.</p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleExtendQuizQuestions}
                    disabled={isAddingQuizQuestions}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition"
                  >
                    {isAddingQuizQuestions ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Adding with Gemini...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>AI Extend (+5)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <QuizModule 
                quizQuestions={studyPackage?.quiz || []} 
                reviewerTitle={studyPackage?.metadata?.title}
                addQuizAttempt={(score) => {
                  const nextAttempt = {
                    date: new Date().toISOString().split('T')[0],
                    score,
                    title: studyPackage?.metadata?.title || 'Review Quiz'
                  };
                  const updated = [nextAttempt, ...quizAttempts].slice(0, 10);
                  setQuizAttempts(updated);
                  localStorage.setItem('eduforge_quiz_attempts_v2', JSON.stringify(updated));
                }}
                theme={theme}
              />
            </div>
          )}

          {/* PRACTICE TAB VIEW */}
          {activeTab === 'practice' && (
            <PracticeModule 
              practiceQuestions={studyPackage?.practice || []} 
              theme={theme}
            />
          )}

          {/* CHAT TAB VIEW */}
          {activeTab === 'chat' && (
            <div className={`p-6 rounded-3xl border flex flex-col h-[600px] ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4 shrink-0">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">EduForge AI Study Buddy</h3>
                  <p className="text-xs text-slate-400">Ground queries specifically inside: {studyPackage?.metadata?.title}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-indigo-600 text-white font-medium shadow-md' 
                        : 'bg-slate-100 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/50 text-slate-800 dark:text-slate-200'
                    }`}>
                      <span className="block font-black uppercase text-[9px] text-slate-400 mb-1">
                        {msg.role === 'user' ? 'You' : 'Study Buddy'}
                      </span>
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                ))}

                {isChatSending && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/50 rounded-2xl p-4 text-xs text-slate-400 flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                      <span>Formulating grounded answer...</span>
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleSendChatMessage} className="flex space-x-2 shrink-0">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask for summaries, memory aids, or question mockups..."
                  className="flex-1 p-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button 
                  type="submit" 
                  disabled={isChatSending || !chatInput.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs px-5 py-3 rounded-xl transition-all"
                >
                  Ask AI
                </button>
              </form>
            </div>
          )}

          {/* SETTINGS / SETUP TAB VIEW */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className={`p-6 rounded-3xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-center space-x-3 mb-6">
                  <div className="bg-rose-500/10 text-rose-500 p-2.5 rounded-xl">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg">Clear Workspace / Upload New Lesson</h3>
                    <p className="text-xs text-slate-400">Clear the active study package to upload a different syllabus file or enter custom text.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-xs leading-relaxed mb-4">
                    <p className="font-bold text-amber-500 flex items-center mb-1">
                      <AlertTriangle className="w-4 h-4 mr-1.5" /> Cautionary Action
                    </p>
                    <span>Clearing your workspace deletes current cards, topics, and local summaries. All bookmarks and progress ratios for this session will be cleared.</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mb-6">
                    <label className="block text-xs uppercase font-extrabold text-slate-400 mb-2">Edit Gemini API Key</label>
                    <input 
                      type="password" 
                      placeholder="AI Studio API Key (AI_KEY)..."
                      value={customApiKey}
                      onChange={(e) => setCustomApiKey(e.target.value)}
                      className="w-full max-w-md p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={() => {
                        if (confirm("Are you sure you want to unload this study package? You will need to upload or paste content to study again.")) {
                          setStudyPackage(null);
                        }
                      }}
                      className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all"
                    >
                      Reset Workspace
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      <footer className="py-8 text-center text-xs text-slate-400 border-t border-slate-100 dark:border-slate-900 mt-12">
        <p>© 2026 EduForge Studio. Designed for offline resilience & GitHub static hosting compatibility.</p>
      </footer>
    </div>
  );
}

function FlashcardsModule({ cards, masteredCards, toggleMastered, theme }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [deck, setDeck] = useState(cards);

  useEffect(() => {
    setDeck(cards);
    setCurrentIdx(0);
    setIsFlipped(false);
  }, [cards]);

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIdx(prev => (prev + 1) % deck.length);
    }, 150);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIdx(prev => (prev === 0 ? deck.length - 1 : prev - 1));
    }, 150);
  };

  const shuffleDeck = () => {
    setIsFlipped(false);
    setTimeout(() => {
      const shuffled = [...deck].sort(() => Math.random() - 0.5);
      setDeck(shuffled);
      setCurrentIdx(0);
    }, 150);
  };

  if (!deck || deck.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <Layers className="w-16 h-16 mx-auto mb-3" />
        <p>No cards available. Paste or load a lesson in Settings first!</p>
      </div>
    );
  }

  const currentCard = deck[currentIdx];
  const isCurrentMastered = masteredCards.includes(currentIdx);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold">Interactive Deck</h3>
          <p className="text-xs text-slate-400">Flip cards to reveal terms. Flag memorized cards as Mastered.</p>
        </div>

        <div className="flex items-center space-x-3">
          <button 
            onClick={shuffleDeck} 
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-1.5"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Shuffle Cards</span>
          </button>
          
          <span className="text-xs font-bold text-slate-400">
            Card {currentIdx + 1} of {deck.length}
          </span>
        </div>
      </div>

      {/* Slide Container */}
      <div className="flex justify-center">
        <div 
          onClick={() => setIsFlipped(!isFlipped)}
          className={`w-full max-w-lg aspect-[5/3] cursor-pointer relative transition-all duration-500 preserve-3d ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* Front */}
          <div className={`absolute inset-0 rounded-3xl p-6 flex flex-col justify-between border backface-hidden transition-all duration-300 shadow-lg ${
            theme === 'dark' 
              ? 'bg-slate-900 border-slate-800 text-slate-100' 
              : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <span className="text-[10px] uppercase font-black tracking-widest text-indigo-500 bg-indigo-500/10 px-2.5 py-1 rounded-full w-fit">
              {currentCard?.topic || "Topic Overview"}
            </span>
            <div className="text-center py-6">
              <p className="text-lg font-bold leading-relaxed">{currentCard?.front}</p>
            </div>
            <p className="text-[11px] text-center text-slate-400 font-semibold animate-pulse">Click anywhere to flip</p>
          </div>

          {/* Back */}
          <div className={`absolute inset-0 rounded-3xl p-6 flex flex-col justify-between border backface-hidden rotate-y-180 transition-all duration-300 shadow-lg ${
            theme === 'dark' 
              ? 'bg-indigo-950 border-indigo-900 text-indigo-100' 
              : 'bg-indigo-50 border-indigo-100 text-indigo-950'
          }`}>
            <span className="text-[10px] uppercase font-black tracking-widest text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full w-fit">
              Answer Key
            </span>
            <div className="text-center py-6">
              <p className="text-lg font-medium leading-relaxed">{currentCard?.back}</p>
            </div>
            <p className="text-[11px] text-center text-slate-400 font-semibold">Click to return to front</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center space-x-3">
        <button onClick={handlePrev} className="p-3 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition text-slate-500">
          <ArrowLeft className="w-5 h-5" />
        </button>

        <button 
          onClick={() => toggleMastered(currentIdx)}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
            isCurrentMastered 
              ? 'bg-emerald-500 text-white' 
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          <span>{isCurrentMastered ? 'Mastered!' : 'Mark as Mastered'}</span>
        </button>

        <button onClick={handleNext} className="p-3 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition text-slate-500">
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      <div className="max-w-xs mx-auto">
        <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div className="bg-indigo-600 h-full transition-all" style={{ width: `${((currentIdx + 1) / deck.length) * 100}%` }}></div>
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-semibold">
          <span>Completion Progress</span>
          <span>{Math.round(((currentIdx + 1) / deck.length) * 100)}%</span>
        </div>
      </div>
    </div>
  );
}

function QuizModule({ quizQuestions, reviewerTitle, addQuizAttempt, theme }) {
  const [activeQuestions, setActiveQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  // Hook to handle initial questions or reshuffling when desired
  useEffect(() => {
    setActiveQuestions([...quizQuestions].sort(() => 0.5 - Math.random()));
  }, [quizQuestions]);

  const handleShuffleAndRebuild = () => {
    // Shuffles both the active list of questions, and option choices inside MC options
    const shuffledPool = quizQuestions.map(q => {
      if (q.options && q.type === "multiple-choice") {
        return {
          ...q,
          options: [...q.options].sort(() => 0.5 - Math.random())
        };
      }
      return q;
    }).sort(() => 0.5 - Math.random());
    
    setActiveQuestions(shuffledPool);
    setUserAnswers({});
    setShowResults(false);
    setScore(0);
  };

  const resetQuiz = () => {
    setUserAnswers({});
    setShowResults(false);
    setScore(0);
  };

  const handleSelectOption = (qId, option) => {
    if (showResults) return;
    setUserAnswers(prev => ({ ...prev, [qId]: option }));
  };

  const handleTextInput = (qId, val) => {
    if (showResults) return;
    setUserAnswers(prev => ({ ...prev, [qId]: val }));
  };

  const calculateScore = () => {
    let correct = 0;
    activeQuestions.forEach(q => {
      const answer = userAnswers[q.id]?.trim()?.toLowerCase() || '';
      const actual = q.correctAnswer?.trim()?.toLowerCase();
      if (answer === actual) {
        correct++;
      }
    });

    const finalScorePercent = Math.round((correct / activeQuestions.length) * 100);
    setScore(finalScorePercent);
    setShowResults(true);
    addQuizAttempt(finalScorePercent);
  };

  if (!activeQuestions || activeQuestions.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <HelpCircle className="w-16 h-16 mx-auto mb-3" />
        <p>No questions generated. Paste or load notes in settings first!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Quiz Utility Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <span className="text-xs text-slate-400 font-bold">{activeQuestions.length} Questions Compiled</span>
        <button 
          onClick={handleShuffleAndRebuild}
          className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Regenerate & Shuffle Quiz</span>
        </button>
      </div>

      {showResults && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 text-center space-y-2">
          <span className="text-[10px] uppercase font-extrabold text-emerald-500 tracking-widest bg-emerald-500/15 px-3 py-1 rounded-full">Test Concluded</span>
          <h4 className="text-2xl font-extrabold text-slate-800 dark:text-white">Your Score: {score}%</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {score >= 80 ? "Superb job! You have fully mastered these aspects of your reviewer." : "Review your source notes below and give it another try!"}
          </p>
          <div className="pt-2 flex justify-center space-x-2">
            <button onClick={resetQuiz} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs">
              Clear & Retry Same Order
            </button>
            <button onClick={handleShuffleAndRebuild} className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs">
              Generate New Shuffle
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {activeQuestions.map((q, idx) => {
          const isCorrect = (userAnswers[q.id]?.trim()?.toLowerCase() || '') === (q.correctAnswer?.trim()?.toLowerCase() || '');
          return (
            <div key={q.id} className={`p-5 rounded-2xl border transition-all ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase font-black tracking-wider text-indigo-500">
                  Question {idx + 1} • {q.type}
                </span>
                {showResults && (
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isCorrect ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'}`}>
                    {isCorrect ? 'Correct' : 'Incorrect'}
                  </span>
                )}
              </div>

              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4">{q.question}</p>

              {q.type === 'multiple-choice' || q.type === 'true-false' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {q.options?.map((option, oIdx) => {
                    const isSelected = userAnswers[q.id] === option;
                    return (
                      <button
                        key={oIdx}
                        disabled={showResults}
                        onClick={() => handleSelectOption(q.id, option)}
                        className={`p-3 text-left text-xs font-semibold rounded-xl border transition-all ${
                          isSelected 
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                            : 'hover:bg-slate-50 dark:hover:bg-slate-950 border-slate-100 dark:border-slate-800'
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div>
                  <input 
                    type="text" 
                    placeholder="Type your answer here..."
                    disabled={showResults}
                    value={userAnswers[q.id] || ''}
                    onChange={(e) => handleTextInput(q.id, e.target.value)}
                    className="w-full p-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              {showResults && (
                <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/50 text-xs">
                  <p className="font-semibold text-indigo-500 mb-1">Correct Answer: {q.correctAnswer}</p>
                  <p className="text-slate-400">{q.explanation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!showResults && (
        <button 
          onClick={calculateScore}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-3 rounded-xl transition-all shadow-lg"
        >
          Submit Answers
        </button>
      )}
    </div>
  );
}

function PracticeModule({ practiceQuestions, theme }) {
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [revealAnswerId, setRevealAnswerId] = useState(null);

  if (!practiceQuestions || practiceQuestions.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <CheckCircle className="w-16 h-16 mx-auto mb-3" />
        <p>No practice questions generated. Paste or load notes in settings first!</p>
      </div>
    );
  }

  const filteredQuestions = practiceQuestions.filter(q => {
    if (selectedDifficulty === 'all') return true;
    return q.difficulty.toLowerCase() === selectedDifficulty;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold">Concept Practice Mode</h3>
          <p className="text-xs text-slate-400">Filter practice points dynamically by estimated structural difficulty.</p>
        </div>

        <div className="flex items-center space-x-2 border border-slate-200 dark:border-slate-800 rounded-xl p-1 bg-transparent">
          {['all', 'easy', 'medium', 'hard'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => { setSelectedDifficulty(lvl); setRevealAnswerId(null); }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition ${
                selectedDifficulty === lvl 
                  ? 'bg-indigo-500 text-white shadow' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredQuestions.map((q, idx) => {
          const isRevealed = revealAnswerId === q.id;
          const diffColors = {
            easy: "bg-green-500/10 text-green-500 border-green-500/20",
            medium: "bg-amber-500/10 text-amber-500 border-amber-500/20",
            hard: "bg-rose-500/10 text-rose-500 border-rose-500/20"
          };

          return (
            <div key={q.id} className={`p-5 rounded-2xl border transition-all ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase font-black tracking-wider text-indigo-500">Practice Item {idx + 1}</span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${diffColors[q.difficulty.toLowerCase()] || "bg-slate-100 text-slate-500"}`}>
                  {q.difficulty}
                </span>
              </div>

              <p className="text-sm font-bold mb-4 leading-relaxed text-slate-800 dark:text-slate-100">{q.question}</p>

              {isRevealed ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800/50 space-y-1.5 transition">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-500 block">Correct Answer:</span>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{q.correctAnswer}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{q.explanation}</p>
                </div>
              ) : (
                <button 
                  onClick={() => setRevealAnswerId(q.id)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition"
                >
                  Reveal Explanation
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}