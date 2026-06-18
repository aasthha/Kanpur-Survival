"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Image from "next/image";
import {
  Jr,
  getKolkataToday,
  getJourneyStats,
  generateCalendarGrid,
  generateTimelineDays,
  formatDateFriendly,
  formatDateTimeFriendly,
  daysBetween,
  isAfterOrEqual,
  parseUTCDate,
  UserProfile,
} from "../utils/date";
import {
  $G,
  ND,
  mapUserProfile,
  upsertUserProfile,
  UserSessionProfile,
} from "../utils/supabase";
import {
  loadProjectState,
  getDailyMessageForDate,
  saveReflection,
  scheduleSurpriseMessage,
  saveCardPhoto,
  saveCardCustom,
  localSignOut,
  uploadToStorage,
  deleteCompletion,
  deleteSurpriseMessage,
} from "../utils/database";

// Weekly cards configuration
const WEEKLY_CARDS = [
  {
    weekNumber: 1,
    title: "The Explorer",
    emoji: "📍",
    caption: "One week down. New city, new company, new people. You walked into unfamiliar territory and made it look normal.",
    observation: "You adapt to new situations much faster than most people I know.",
  },
  {
    weekNumber: 2,
    title: "The Americano Enjoyer",
    emoji: "☕",
    caption: "Two weeks in, and somewhere along the way you became the kind of person who voluntarily orders an Americano.",
    observation: "I enjoy watching your weird little evolution into a corporate coffee person.",
  },
  {
    weekNumber: 3,
    title: "Master of Movement",
    emoji: "📦",
    caption: "Three weeks down. The MBA supply chain brain is fully operational.",
    observation: "I love how your brain naturally looks for systems and solutions when everyone else sees confusion.",
  },
  {
    weekNumber: 4,
    title: "Built Different",
    emoji: "🛠️",
    caption: "One month done. You somehow make adulthood look easier than it actually is.",
    observation: "I still find it funny that you're younger than me and somehow more self-sufficient than a lot of people around us.",
  },
  {
    weekNumber: 5,
    title: "The Geek",
    emoji: "🤖",
    caption: "Five weeks in. Still curious. Still probably trying to automate something.",
    observation: "I genuinely think you would automate brushing your teeth if someone gave you enough APIs.",
  },
  {
    weekNumber: 6,
    title: "Operations Boss",
    emoji: "📊",
    caption: "Six weeks completed. Problems enter. Solutions exit.",
    observation: "You have a very annoying habit of making difficult things look effortless.",
  },
  {
    weekNumber: 7,
    title: "Quiet Strength",
    emoji: "⚡",
    caption: "Seven weeks down. You never make a big deal out of what you're carrying, but you've handled a lot.",
    observation: "One of the things I admire most about you is how strong and independent you are without needing everyone to notice it.",
  },
  {
    weekNumber: 8,
    title: "Reliable As Ever",
    emoji: "⚓",
    caption: "Eight weeks completed. Through all the chaos, you've remained exactly who you are.",
    observation: "You're the kind of person people quietly depend on, whether you realize it or not.",
  },
  {
    weekNumber: 9,
    title: "Future Industry Leader",
    emoji: "🎓",
    caption: "Nine weeks down. The intern era is rapidly becoming a myth.",
    observation: "I can already picture you running things instead of learning how they work.",
  },
  {
    weekNumber: 10,
    title: "The Problem Absorber",
    emoji: "🔥",
    caption: "Ten weeks down. Problems continue arriving. Solutions continue leaving.",
    observation: "You have this strange ability to stay calm while everyone else is figuring out how to panic.",
  },
  {
    weekNumber: 11,
    title: "The Plot Armor Holder",
    emoji: "🎬",
    caption: "Eleven weeks done. At this point you're basically coasting toward the finale.",
    observation: "Somehow every story becomes a little more interesting when you're involved.",
  },
  {
    weekNumber: 12,
    title: "Dhiraj, According To Aastha",
    emoji: "✨",
    caption: "88 days. One internship. Hundreds of little moments collected.",
    observation: "I started this because I wanted to make the days feel a little more fun. Somewhere along the way, it became a collection of all the reasons I admire you.",
  },
];

const MASCOT_AVATARS = {
  aastha: "/aastha.png",
  dhiraj: "/dhiraj.png",
  aasthaWriting: "/aastha-writing.png",
  aasthaCelebrate: "/aastha-celebrate.png",
  dhirajCelebrate: "/dhiraj-celebrate.png",
  dhirajReading: "/dhiraj-reading.png",
};

const CARD_RARITIES: Record<number, { tier: string; color: string; bg: string; icon: string }> = {
  1: { tier: "Rookie", color: "#8B7355", bg: "linear-gradient(135deg, #D4C5A9, #8B7355)", icon: "🥉" },
  2: { tier: "Rookie", color: "#8B7355", bg: "linear-gradient(135deg, #D4C5A9, #8B7355)", icon: "🥉" },
  3: { tier: "Explorer", color: "#607D8B", bg: "linear-gradient(135deg, #B0BEC5, #546E7A)", icon: "🥈" },
  4: { tier: "Explorer", color: "#607D8B", bg: "linear-gradient(135deg, #B0BEC5, #546E7A)", icon: "🥈" },
  5: { tier: "Adventurer", color: "#F5A623", bg: "linear-gradient(135deg, #FFD54F, #F5A623)", icon: "🥇" },
  6: { tier: "Adventurer", color: "#F5A623", bg: "linear-gradient(135deg, #FFD54F, #F5A623)", icon: "🥇" },
  7: { tier: "Specialist", color: "#7C4DFF", bg: "linear-gradient(135deg, #B388FF, #7C4DFF)", icon: "💎" },
  8: { tier: "Specialist", color: "#7C4DFF", bg: "linear-gradient(135deg, #B388FF, #7C4DFF)", icon: "💎" },
  9: { tier: "Veteran", color: "#E040FB", bg: "linear-gradient(135deg, #EA80FC, #CE93D8)", icon: "🔮" },
  10: { tier: "Veteran", color: "#E040FB", bg: "linear-gradient(135deg, #EA80FC, #CE93D8)", icon: "🔮" },
  11: { tier: "Survivor", color: "#FF6D00", bg: "linear-gradient(135deg, #FFAB40, #FF6D00)", icon: "🔥" },
  12: { tier: "Legend", color: "#FFD700", bg: "linear-gradient(160deg, #FFD700, #FF6B35, #FF1744, #D500F9, #2979FF)", icon: "👑" },
};

// Sub-component typewriter effect
function TypewriterText({ text }: { text: string }) {
  return <span>{text}</span>;
}

export default function Home() {
  const [todayDate] = useState(() => getKolkataToday());
  const [currentUser, setCurrentUser] = useState<UserSessionProfile | null>(null);
  const [appLoading, setAppLoading] = useState(true);
  const [syncState, setSyncState] = useState<any>({
    completions: [],
    reflections: [],
    surpriseMessages: [],
    dailyMessageOverrides: [],
    settings: {},
  });
  const [cardPhotos, setCardPhotos] = useState<Record<number, string>>({});
  const [cardCustoms, setCardCustoms] = useState<Record<string, string>>({});
  const [dataRefreshing, setDataRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"timeline" | "letters" | "cards" | "settings">(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("kanpur-survival-tab");
      if (saved === "timeline" || saved === "letters" || saved === "cards" || saved === "settings") {
        return saved;
      }
    }
    return "timeline";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("kanpur-survival-tab", activeTab);
    }
  }, [activeTab]);

  const [testModeActive, setTestModeActive] = useState(false);
  const [newCardUnlockedNotifier, setNewCardUnlockedNotifier] = useState(false);
  const stats = useMemo(() => getJourneyStats(todayDate), [todayDate]);

  const journeyCards = useMemo(() => {
    const nowStr = new Date().toISOString();
    return WEEKLY_CARDS.map((card) => {
      const unlockKey = cardCustoms[`card_unlock_${card.weekNumber}`];
      const isUnlocked = !!unlockKey && new Date(unlockKey) <= new Date(nowStr);
      return {
        ...card,
        unlocked: isUnlocked,
        photoUrl: cardPhotos[card.weekNumber] || undefined,
      };
    });
  }, [cardCustoms, cardPhotos]);

  useEffect(() => {
    setNewCardUnlockedNotifier(
      Object.keys(cardCustoms).some((key) => {
        return key.startsWith("card_unlock_") && String(cardCustoms[key] || "").startsWith(todayDate);
      })
    );
  }, [cardCustoms, todayDate]);

  // Handle SW cleanups
  useEffect(() => {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (let r of registrations) r.unregister();
      });
    }
  }, []);

  // Fetch initial profile
  useEffect(() => {
    let active = true;
    (async () => {
      if (!$G || !ND) {
        const storedUser = window.localStorage.getItem("kanpur-survival-current-user");
        if (storedUser === "aastha") setCurrentUser(mapUserProfile(Jr.aastha));
        if (storedUser === "dhiraj") setCurrentUser(mapUserProfile(Jr.dhiraj));
        setAppLoading(false);
        return;
      }

      const { data: authData } = await ND.auth.getSession();
      if (authData?.session?.user && active) {
        setCurrentUser(await upsertUserProfile(authData.session.user));
      }

      const { data: authListener } = ND.auth.onAuthStateChange(async (event, session) => {
        if (active) {
          if (session?.user) {
            setCurrentUser(mapUserProfile(session.user));
          } else {
            setCurrentUser(null);
          }
        }
      });

      setAppLoading(false);
      return () => {
        authListener.subscription.unsubscribe();
      };
    })().catch(() => setAppLoading(false));

    return () => {
      active = false;
    };
  }, []);

  const refreshProjectData = useCallback(async () => {
    if (typeof window !== "undefined" && !window.localStorage.getItem("kanpur-chronicles-state-v2")) {
      setDataRefreshing(true);
    }
    const data = await loadProjectState(currentUser);
    setSyncState(data.state);
    setCardPhotos(data.cardPhotos);
    setCardCustoms(data.cardCustoms);
    setDataRefreshing(false);
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      refreshProjectData();
    }
  }, [currentUser, refreshProjectData]);

  async function handleSignOut() {
    if (ND) {
      await ND.auth.signOut();
    }
    await localSignOut();
    setCurrentUser(null);
    setActiveTab("timeline");
  }

  async function handleSaveReflection(text: string, dateOverride?: string) {
    if (!currentUser) return;
    const targetDate = dateOverride || todayDate;
    const dailyMessage = getDailyMessageForDate(targetDate, syncState.dailyMessageOverrides);
    await saveReflection({
      user: currentUser,
      date: targetDate,
      mood: "happy",
      reflection: text,
      dailyMessage,
    });
    await refreshProjectData();
  }

  async function handleDeleteLog(date: string, userId: string) {
    if (!confirm("Delete this log?")) return;
    setDataRefreshing(true);
    await deleteCompletion({ id: userId }, date);
    await refreshProjectData();
    setDataRefreshing(false);
  }

  async function handleDeleteLetter(id: string) {
    if (!confirm("Delete this letter?")) return;
    setDataRefreshing(true);
    await deleteSurpriseMessage(id);
    await refreshProjectData();
    setDataRefreshing(false);
  }

  if (appLoading) {
    return (
      <main className="auth-screen">
        <div className="auth-box">
          <div className="auth-mascots">
            <Image src={MASCOT_AVATARS.dhiraj} alt="Dhiraj" width={60} height={60} />
            <Image src={MASCOT_AVATARS.aastha} alt="Aastha" width={60} height={60} />
          </div>
          <h1 className="comic-title">Quest Log</h1>
          <p className="subtitle">Opening your quest log...</p>
        </div>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <AuthScreen
        onLocal={(usr) => {
          window.localStorage.setItem("kanpur-survival-current-user", usr.id);
          setCurrentUser(mapUserProfile(usr));
        }}
      />
    );
  }

  const isAdmin = currentUser.role === "admin";

  return (
    <main className="app-shell">
      {/* Timeline Tab */}
      <div className="screen" style={{ display: activeTab === "timeline" ? "flex" : "none" }}>
        <div className="timeline-bg-blobs" />
        <TimelineTab
          s={syncState}
          today={todayDate}
          stats={stats}
          user={currentUser}
          cards={journeyCards}
          cardCustoms={cardCustoms}
          loading={dataRefreshing}
          onSave={handleSaveReflection}
          onDeleteLog={isAdmin ? handleDeleteLog : undefined}
          test={testModeActive}
        />
      </div>

      {/* Letters Tab */}
      <div className="screen-scroll" style={{ display: activeTab === "letters" ? "block" : "none" }}>
        <div className="letters-particles" />
        <div className="tab-header">
          <span className="letter-icon-pulse">💌</span>
          <h2>Letters</h2>
          <p className="tab-sub">A pocket full of future smiles</p>
        </div>
        <LettersTab
          letters={syncState.surpriseMessages}
          today={todayDate}
          loading={dataRefreshing}
          isAdmin={isAdmin}
          onDeleteLetter={isAdmin ? handleDeleteLetter : undefined}
        />
      </div>

      {/* Cards Tab */}
      <div className="screen-scroll" style={{ display: activeTab === "cards" ? "block" : "none" }}>
        <div className="tab-header">
          <div className="tab-header-icon">🎴</div>
          <h2>Character Cards</h2>
          <p className="tab-sub">Turn surviving days into collectible character cards!</p>
        </div>
        <CardsTab
          cards={journeyCards}
          user={currentUser}
          customs={cardCustoms}
          today={todayDate}
          onPhoto={async (weekNum, file) => {
            const url = await uploadToStorage(file, "cards");
            if (url) {
              await saveCardPhoto(weekNum, url);
              await refreshProjectData();
            }
          }}
          onCustom={async (weekNum, field, val) => {
            await saveCardCustom(weekNum, field, val);
            await refreshProjectData();
          }}
        />
      </div>

      {/* Settings Tab */}
      <div className="screen-scroll" style={{ display: activeTab === "settings" ? "block" : "none" }}>
        <div className="tab-header">
          <div className="tab-header-icon">⚙️</div>
          <h2>Settings</h2>
        </div>
        <SettingsTab
          user={currentUser}
          s={syncState}
          onSignOut={handleSignOut}
          onRefresh={refreshProjectData}
          test={testModeActive}
          onTest={() => setTestModeActive(!testModeActive)}
        />
      </div>

      {/* Navigation Tab Bar */}
      <TabBar active={activeTab} onChange={(tab: any) => setActiveTab(tab)} newCard={newCardUnlockedNotifier} />
    </main>
  );
}

// Sub-component: Authentication / User bypass select
function AuthScreen({ onLocal }: { onLocal: (user: UserProfile) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!ND) return;
    setLoading(true);
    setErrorMsg("");
    const { error } = await ND.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) setErrorMsg(error.message);
  }

  return (
    <main className="auth-screen">
      <section className="auth-box">
        <div className="auth-mascots">
          <img src={MASCOT_AVATARS.dhiraj} alt="Dhiraj" width={60} height={60} />
          <span style={{ fontSize: 22 }}>🤝</span>
          <img src={MASCOT_AVATARS.aastha} alt="Aastha" width={60} height={60} />
        </div>
        <h1 className="comic-title">Quest Log</h1>
        <p className="subtitle">A journal for two. Documenting the in-between.</p>

        {$G ? (
          <div className="flow">
            <input
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              autoCapitalize="none"
              autoCorrect="off"
            />
            <input
              className="field"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
            />
            {errorMsg && (
              <p className="tab-sub" style={{ color: "var(--red)" }}>
                {errorMsg}
              </p>
            )}
            <button className="primary-btn" disabled={loading || !email || !password} onClick={handleLogin}>
              {loading ? "Opening..." : "Open Quest Log ⚡"}
            </button>
          </div>
        ) : (
          <div className="flow">
            <button className="primary-btn" onClick={() => onLocal(Jr.dhiraj)}>
              Continue as Dhiraj
            </button>
            <button className="ghost-btn" onClick={() => onLocal(Jr.aastha)}>
              Continue as Aastha
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

// Sub-component: Timeline tab
interface TimelineTabProps {
  s: any;
  today: string;
  stats: any;
  user: UserSessionProfile;
  loading: boolean;
  onSave: (text: string, dateOverride?: string) => Promise<void>;
  test: boolean;
  cards: any[];
  cardCustoms: any;
  onDeleteLog?: (date: string, userId: string) => Promise<void>;
}

function TimelineTab({
  s,
  today,
  stats,
  user,
  loading,
  onSave,
  test,
  cards,
  cardCustoms,
  onDeleteLog,
}: TimelineTabProps) {
  const [selectedDate, setSelectedDate] = useState(today);
  const [tempCompletions, setTempCompletions] = useState<any[]>([]);
  const [selectedCalDate, setSelectedCalDate] = useState<string | null>(null);
  const [animationPhase, setAnimationPhase] = useState<"idle" | "walk-in" | "write" | "strike" | "celebrate" | "walk-out">("idle");
  const [animatingDate, setAnimatingDate] = useState<string | null>(null);
  const [grandUnlockCard, setGrandUnlockCard] = useState<any | null>(null);

  const activeDate = test ? selectedDate : today;
  const currentCompletions = test ? [...s.completions, ...tempCompletions] : s.completions;

  const isDhirajLogged = currentCompletions.some((c: any) => c.date === activeDate && c.userName === "Dhiraj");
  const isAasthaLogged = currentCompletions.some((c: any) => c.date === activeDate && c.userName === "Aastha");
  const hasCurrentUserLogged = currentCompletions.some(
    (c: any) => c.date === activeDate && c.userId === user.id
  );

  const currentHour = new Date().getHours();
  let timeGreeting = "Good evening! 🌙";
  if (currentHour >= 0 && currentHour < 5) timeGreeting = "Hi night owl! 🦉";
  else if (currentHour < 12) timeGreeting = "Good morning! ☀️";
  else if (currentHour < 17) timeGreeting = "Good afternoon! ⛅";

  // Check for card unlocks
  useEffect(() => {
    if (window.localStorage.getItem("grandUnlockSeen_v2") !== "true") {
      const unlocked = cards.filter((c) => c.unlocked);
      if (unlocked.length > 0) {
        setGrandUnlockCard(unlocked[unlocked.length - 1]);
        window.localStorage.setItem("grandUnlockSeen_v2", "true");
      }
    }
  }, [today, cards]);

  async function handleLogSubmit(text: string) {
    if (test) {
      setTempCompletions((prev) => [
        ...prev,
        { date: selectedDate, userId: user.id, userName: user.displayName },
      ]);
    } else {
      await onSave(text);
    }

    setAnimatingDate(test ? selectedDate : today);
    setAnimationPhase("walk-in");
    setTimeout(() => setAnimationPhase("write"), 800);
    setTimeout(() => setAnimationPhase("strike"), 1800);
    setTimeout(() => setAnimationPhase("celebrate"), 2400);
    setTimeout(() => setAnimationPhase("walk-out"), 3600);
    setTimeout(() => {
      setAnimationPhase("idle");
      setAnimatingDate(null);
    }, 4400);
  }

  // Calendar rendering
  const dateObj = parseUTCDate(today);
  const calendarYear = dateObj.getUTCFullYear();
  const calendarMonth = dateObj.getUTCMonth();
  const calendarGrid = generateCalendarGrid(calendarYear, calendarMonth);
  const timelineSet = new Set(generateTimelineDays());

  return (
    <React.Fragment>
      {grandUnlockCard && (
        <div className="grand-unlock-overlay" onClick={() => setGrandUnlockCard(null)}>
          <div className="grand-unlock-content">
            <h2 className="grand-unlock-title">NEW CARD UNLOCKED!</h2>
            <div className="grand-unlock-card">
              <div className="game-card-art">
                <div className="game-card-emoji">{grandUnlockCard.emoji}</div>
                <div className="game-card-shimmer" />
              </div>
            </div>
            <p className="grand-unlock-name">{grandUnlockCard.title}</p>
            <p className="grand-unlock-tap">Tap to continue</p>
          </div>
          <div className="grand-unlock-rays" />
          <div className="grand-unlock-particles" />
        </div>
      )}

      {/* Stats Header */}
      <div className="hero-compact">
        <div className="stats-row">
          <div className="stat-pill">
            📍 <strong className="text-gradient-warm">Day {stats.elapsed}</strong>
          </div>
          <div className="stat-pill">
            ⏳ <strong className="text-gradient-cool">{stats.daysUntilHome} to go</strong>
          </div>
        </div>
      </div>

      {/* Progress Track */}
      <div className="journey-bar">
        <div className="jb-track">
          <div className="jb-fill" style={{ width: `${stats.percentComplete}%` }} />
          <div className="jb-marker" style={{ left: `${Math.max(5, Math.min(95, stats.percentComplete))}%` }}>
            <img src={MASCOT_AVATARS.dhiraj} alt="Dhiraj" className="jb-avatar" />
          </div>
        </div>
        <div className="jb-labels">
          <span className="jb-location">📍 Kanpur</span>
          <span className="jb-progress">{stats.percentComplete}%</span>
          <span className="jb-location">🏠 Nashik</span>
        </div>
      </div>

      {/* Mascot Bubble Scene */}
      <div className="scene-card">
        {isDhirajLogged && isAasthaLogged ? (
          <div className="scene-row">
            <img src="/both-highfive.png" alt="High five!" width={90} height={90} className="scene-img" />
            <div className="scene-right">
              <div className="scene-speech both">
                <div style={{ fontSize: 12, fontWeight: 800, color: "var(--blue)" }}>
                  Dhiraj:{" "}
                  <TypewriterText
                    text={s.reflections.find((r: any) => r.date === activeDate && r.userName === "Dhiraj")?.text || "Logged"}
                  />
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "var(--pink)", marginTop: 4 }}>
                  Aastha:{" "}
                  <TypewriterText
                    text={s.reflections.find((r: any) => r.date === activeDate && r.userName === "Aastha")?.text || "Logged"}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : isDhirajLogged && !isAasthaLogged ? (
          <div className="scene-row">
            <img src="/dhiraj-waiting.png" alt="Dhiraj waiting" width={90} height={90} className="scene-img" />
            <div className="scene-right">
              <div className="scene-speech dhiraj">
                <TypewriterText
                  text={s.reflections.find((r: any) => r.date === activeDate && r.userName === "Dhiraj")?.text || "Done for today. Waiting for Aastha... 👀"}
                />
              </div>
              <p className="scene-detail">Dhiraj is waiting for your log</p>
            </div>
          </div>
        ) : isAasthaLogged && !isDhirajLogged ? (
          <div className="scene-row">
            <img src="/aastha-waiting.png" alt="Aastha waiting" width={90} height={90} className="scene-img" />
            <div className="scene-right">
              <div className="scene-speech aastha">
                <TypewriterText
                  text={s.reflections.find((r: any) => r.date === activeDate && r.userName === "Aastha")?.text || "Your turn, Dhiraj 👀"}
                />
              </div>
              <p className="scene-detail">Aastha is waiting for your log</p>
            </div>
          </div>
        ) : (
          <div className="scene-row">
            <img src="/annoyed-couple.png" alt="Both annoyed" width={110} height={110} className="scene-img" />
            <div className="scene-right">
              <div className="scene-speech sleeping">
                <TypewriterText text={`${timeGreeting} Who logs first? 🤔`} />
              </div>
              <p className="scene-detail">No one showed up yet?</p>
            </div>
          </div>
        )}
      </div>

      {/* Admin Test Bar */}
      {test && (
        <div className="test-bar">
          <span className="test-badge">🧪 Test</span>
          <input
            className="field"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ minHeight: 40, padding: "6px 10px", flex: 1 }}
          />
        </div>
      )}

      {/* Input or logged indicator */}
      {hasCurrentUserLogged ? (
        <div className="strikeoff-done">
          <img
            src={user.displayName === "Dhiraj" ? MASCOT_AVATARS.dhirajCelebrate : MASCOT_AVATARS.aasthaCelebrate}
            alt=""
            width={44}
            height={44}
          />
          <div className="strikeoff-text">
            <strong>
              <span className="strike-line">Day {stats.elapsed}</span> — Over! ⚡
            </strong>
          </div>
        </div>
      ) : (
        <MemoryInput loading={loading} onSubmit={handleLogSubmit} />
      )}

      {/* Calendar Grid Card */}
      <div className="card cal-card" style={{ position: "relative" }}>
        <div className="cal-grid" style={{ position: "relative", zIndex: 1 }}>
          {["S", "M", "T", "W", "T", "F", "S"].map((w, idx) => (
            <div className="cal-weekday" key={`w-${idx}`}>
              {w}
            </div>
          ))}

          {calendarGrid.map((dayStr, idx) => {
            if (!dayStr) return <div key={`b-${idx}`} />;
            const isHistoricalDefault = dayStr >= "2026-06-01" && dayStr <= "2026-06-08";
            const completionsForDay = currentCompletions.filter((c: any) => c.date === dayStr);
            const compCount = isHistoricalDefault ? 2 : completionsForDay.length;
            const hasAasthaLogged = !isHistoricalDefault && compCount === 1 && currentCompletions.some((c: any) => c.date === dayStr && c.userName === "Aastha");
            const hasDhirajLogged = !isHistoricalDefault && compCount === 1 && currentCompletions.some((c: any) => c.date === dayStr && c.userName === "Dhiraj");
            const hasSurprise = s.surpriseMessages.some((m: any) => (m.unlockDate || "").startsWith(dayStr));
            const hasCardUnlock = Object.keys(cardCustoms).some(
              (key) => key.startsWith("card_unlock_") && String(cardCustoms[key] || "").startsWith(dayStr)
            );
            const isStriked = animatingDate === dayStr;

            return (
              <div
                className={[
                  "cal-day",
                  compCount > 0 ? "struck" : "",
                  dayStr === today ? "today" : "",
                  !timelineSet.has(dayStr) ? "outside" : "",
                  selectedCalDate === dayStr ? "selected" : "",
                  isStriked ? `strike-${animationPhase}` : "",
                  hasSurprise || hasCardUnlock ? "has-special" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={dayStr}
                onClick={() => {
                  if (test) setSelectedDate(dayStr);
                  if (compCount > 0 && !isHistoricalDefault) {
                    setSelectedCalDate(selectedCalDate === dayStr ? null : dayStr);
                  }
                }}
              >
                <span className="cal-date-num">{Number(dayStr.slice(8))}</span>

                {isStriked && animationPhase !== "idle" && (
                  <div className={`cell-char-anim phase-${animationPhase}`}>
                    <div className="char-sprite">
                      <img
                        src={
                          user.displayName === "Dhiraj"
                            ? animationPhase === "write" || animationPhase === "strike"
                              ? "/dhiraj-working.png"
                              : animationPhase === "celebrate"
                              ? MASCOT_AVATARS.dhirajCelebrate
                              : MASCOT_AVATARS.dhiraj
                            : animationPhase === "write" || animationPhase === "strike"
                            ? MASCOT_AVATARS.aasthaWriting
                            : animationPhase === "celebrate"
                            ? MASCOT_AVATARS.aasthaCelebrate
                            : MASCOT_AVATARS.aastha
                        }
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "contain" }}
                      />
                    </div>
                    {(animationPhase === "strike" || animationPhase === "celebrate" || animationPhase === "walk-out") && (
                      <div className="char-strike-line" />
                    )}
                    {animationPhase === "celebrate" && <div className="cell-pen-sparkles">✨</div>}
                  </div>
                )}

                {/* Day Completion Avatars */}
                {!isHistoricalDefault && compCount >= 2 && (
                  <div className="cal-avatars both-avatars">
                    <div className="avatar-wrapper">
                      <img src={MASCOT_AVATARS.dhiraj} alt="" width={16} height={16} />
                    </div>
                    <div className="avatar-wrapper">
                      <img src={MASCOT_AVATARS.aastha} alt="" width={16} height={16} className="aastha-avatar" />
                    </div>
                  </div>
                )}
                {hasDhirajLogged && (
                  <div className="cal-avatars">
                    <div className="avatar-wrapper">
                      <img src={MASCOT_AVATARS.dhiraj} alt="" width={16} height={16} />
                    </div>
                  </div>
                )}
                {hasAasthaLogged && (
                  <div className="cal-avatars">
                    <div className="avatar-wrapper">
                      <img src={MASCOT_AVATARS.aastha} alt="" width={16} height={16} className="aastha-avatar" />
                    </div>
                  </div>
                )}

                {hasSurprise && <span className="cal-letter-dot">💌</span>}
                {hasCardUnlock && (
                  <span className="cal-letter-dot card-dot" style={hasSurprise ? { right: 12 } : {}}>
                    🎴
                  </span>
                )}

                {/* Popover on click */}
                {selectedCalDate === dayStr && (
                  <div className="cal-popover" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="pop-close"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCalDate(null);
                      }}
                    >
                      ✕
                    </button>
                    <div className="pop-header">Day {Array.from(timelineSet).indexOf(dayStr) + 1}</div>
                    {completionsForDay.length > 0 ? (
                      completionsForDay.map((comp: any, idx: number) => {
                        const ref = s.reflections.find((r: any) => r.date === dayStr && r.userId === comp.userId);
                        return (
                          <div
                            key={idx}
                            className={`pop-log ${comp.userName === "Dhiraj" ? "dhiraj" : "aastha"}`}
                            style={{ position: "relative" }}
                          >
                            <strong>{comp.userName}:</strong> {ref ? ref.text : <i style={{opacity: 0.6}}>Logged without note.</i>}
                            {onDeleteLog && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteLog(dayStr, comp.userId);
                                  setTempCompletions((prev) => prev.filter((c) => c.date !== dayStr || c.userId !== comp.userId));
                                }}
                                style={{
                                  position: "absolute",
                                  right: 5,
                                  top: 5,
                                  background: "none",
                                  border: "none",
                                  fontSize: 12,
                                  cursor: "pointer",
                                }}
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="pop-log" style={{ background: "#f0f0f0", color: "#666", textAlign: "center" }}>
                        No logs yet.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </React.Fragment>
  );
}

// Sub-component: Memory input text area
function MemoryInput({ loading, onSubmit }: { loading: boolean; onSubmit: (text: string) => Promise<void> }) {
  const [val, setVal] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!val.trim()) return;
    setSaving(true);
    await onSubmit(val.trim());
    setVal("");
    setSaving(false);
  }

  return (
    <div className="memory-input-wrap">
      <textarea
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="What's up today?"
        rows={1}
      />
      <button className="save-pill" disabled={!val.trim() || saving || loading} onClick={handleSave}>
        {saving ? "..." : "Done ✅"}
      </button>
    </div>
  );
}

// Sub-component: Letters tab
function LettersTab({ letters, today, loading, isAdmin, onDeleteLetter }: { letters: any[]; today: string; loading: boolean; isAdmin?: boolean; onDeleteLetter?: (id: string) => Promise<void> }) {
  const [selectedLetter, setSelectedLetter] = useState<any | null>(null);
  const [reactionPhase, setReactionPhase] = useState<"idle" | "excited" | "lift" | "center" | "flap" | "slide" | "reveal" | "closing">("idle");
  const [savedLettersOpen, setSavedLettersOpen] = useState(false);
  const [stackOpening, setStackOpening] = useState(false);

  const sortedLetters = useMemo(() => {
    return [...letters].sort((a, b) => a.unlockDate.localeCompare(b.unlockDate));
  }, [letters]);

  function handleOpenLetter(letter: any) {
    if (isAfterOrEqual((letter.unlockDate || "").slice(0, 10), today)) {
      setSelectedLetter(letter);
      setReactionPhase("excited");
      setTimeout(() => setReactionPhase("lift"), 1500);
      setTimeout(() => setReactionPhase("center"), 1800);
      setTimeout(() => setReactionPhase("flap"), 2300);
      setTimeout(() => setReactionPhase("slide"), 2700);
      setTimeout(() => setReactionPhase("reveal"), 3300);
    }
  }

  function handleCloseLetter() {
    setReactionPhase("closing");
    setTimeout(() => {
      setReactionPhase("idle");
      setSelectedLetter(null);
    }, 600);
  }

  const unlockedLetters = sortedLetters.filter((m) => isAfterOrEqual((m.unlockDate || "").slice(0, 10), today));
  const lockedLetters = sortedLetters.filter((m) => !isAfterOrEqual((m.unlockDate || "").slice(0, 10), today));
  const newLettersToday = sortedLetters.filter((m) => (m.unlockDate || "").startsWith(today));

  return (
    <React.Fragment>
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <span className="letter-icon-pulse" style={{ fontSize: 40 }}>
            📬
          </span>
          <p className="tab-sub" style={{ marginTop: 12, fontWeight: 700 }}>
            Checking mailbox...
          </p>
        </div>
      ) : unlockedLetters.length === 0 && newLettersToday.length === 0 ? (
        <div className="card letter-mascot-scene">
          <div
            className="mascot-pair"
            style={{
              display: "flex",
              justifyContent: "center",
              position: "relative",
              marginBottom: "16px",
              marginTop: "20px",
            }}
          >
            <div className="floating-particles">
              <span className="p1">✨</span>
              <span className="p2">🦋</span>
              <span className="p3">✨</span>
            </div>
            <Image
              src={MASCOT_AVATARS.aasthaWriting}
              alt="Aastha"
              width={80}
              height={80}
              style={{ position: "relative", zIndex: 2, marginRight: "-10px" }}
            />
            <Image
              src={MASCOT_AVATARS.dhirajReading}
              alt="Dhiraj"
              width={80}
              height={80}
              style={{ position: "relative", zIndex: 1, marginLeft: "-10px" }}
            />
          </div>
          <p style={{ fontSize: 18, fontWeight: 900, color: "var(--ink)", textAlign: "center" }}>
            No new letters today
          </p>
          <p className="tab-sub" style={{ marginTop: 8, textAlign: "center", fontSize: 14 }}>
            Aastha may surprise you anytime!
          </p>
        </div>
      ) : (
        <div className="unlocked-letters-list">
          {newLettersToday.length > 0 && (
            <React.Fragment>
              <h4 className="locked-letters-header" style={{ color: "var(--purple)", marginBottom: 12 }}>
                New Today ✨
              </h4>
              {newLettersToday.map((letter) => (
                <div
                  className="envelope-card ready letter-anim"
                  onClick={() => handleOpenLetter(letter)}
                  key={letter.id}
                >
                  <div className="fairy-dust">
                    <span>✨</span>
                    <span>✨</span>
                    <span>✨</span>
                  </div>
                  <div className="env-stamp env-animated">💌</div>
                  <div className="env-info">
                    <p className="env-from">From Aastha</p>
                    <h3 className="env-title">{letter.title}</h3>
                    <p className="env-action">Tap to open 💜</p>
                  </div>
                </div>
              ))}
            </React.Fragment>
          )}
        </div>
      )}

      {/* Letter collection stack */}
      {unlockedLetters.length > 0 && (
        <div className={`letter-collection-wrap ${stackOpening ? "opening" : ""}`}>
          <div
            className="letter-collection-stack"
            onClick={() => {
              setStackOpening(true);
              setTimeout(() => {
                setSavedLettersOpen(true);
                setStackOpening(false);
              }, 600);
            }}
          >
            <div className="stack-env" />
            <div className="stack-env" />
            <div className="stack-env">
              <div className="stack-ribbon" />
            </div>
          </div>
          <p className="stack-label">Archives</p>
        </div>
      )}

      {/* Locked Future Letters list */}
      {lockedLetters.length > 0 && (
        <div className="locked-letters-section">
          <h4 className="locked-letters-header">Locked Future Letters</h4>
          <div className="locked-letters-list">
            {lockedLetters.map((letter, idx) => (
              <div
                className="locked-letter-row"
                onClick={(e) => {
                  const el = e.currentTarget;
                  el.classList.add("rattle-anim");
                  setTimeout(() => el.classList.remove("rattle-anim"), 400);
                }}
                key={letter.id}
              >
                <div className="locked-icon-wrapper">
                  <span className="locked-heart-peek">❤️</span>
                  <span className="locked-icon">🔒</span>
                </div>
                <div className="locked-info">
                  <span className="locked-title">Letter #{unlockedLetters.length + idx + 1}</span>
                  <span className="locked-date">Opens on {formatDateTimeFriendly(letter.unlockDate)}</span>
                </div>
                {isAdmin && onDeleteLetter && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteLetter(letter.id);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: 18,
                      cursor: "pointer",
                      marginLeft: "auto",
                      padding: 10,
                    }}
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fullscreen view of all saved unlocked letters */}
      {savedLettersOpen && !selectedLetter && (
        <div
          className="letter-fullscreen phase-reveal"
          style={{ display: "block", overflowY: "auto", padding: "60px 20px" }}
        >
          <div className="letter-backdrop" />
          <div style={{ position: "relative", zIndex: 100, width: "100%", maxWidth: "440px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "30px" }}>
              <span style={{ fontSize: 40 }}>🎀</span>
              <h2 style={{ color: "#fff", fontSize: 24, fontWeight: 900, marginTop: 10 }}>Saved Letters</h2>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 14 }}>Re-read your past surprises from Aastha.</p>
            </div>
            <div className="unlocked-letters-list" style={{ gap: 12 }}>
              {unlockedLetters.map((letter) => (
                <div
                  className="envelope-card ready letter-anim"
                  onClick={() => {
                    setSavedLettersOpen(false);
                    handleOpenLetter(letter);
                  }}
                  style={{ animation: "slideUp 400ms ease forwards" }}
                  key={letter.id}
                >
                  <div className="env-stamp">💌</div>
                  <div className="env-info">
                    <p className="env-from">From Aastha</p>
                    <h3 className="env-title">{letter.title}</h3>
                    <p className="env-action" style={{ color: "var(--ink-soft)" }}>
                      Opened {formatDateTimeFriendly(letter.unlockDate)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <button
              className="fs-close"
              onClick={() => setSavedLettersOpen(false)}
              style={{ position: "static", display: "block", margin: "40px auto 0 auto", width: "100%", maxWidth: "200px" }}
            >
              Back to timeline
            </button>
          </div>
        </div>
      )}

      {/* Letter details popover */}
      {selectedLetter && reactionPhase !== "idle" && (
        <div className={`letter-fullscreen phase-${reactionPhase}`} onClick={reactionPhase === "reveal" ? handleCloseLetter : undefined}>
          <div className="letter-backdrop" />
          <div className={`dhiraj-letter-reaction phase-${reactionPhase}`}>
            <Image
              src={reactionPhase === "reveal" ? MASCOT_AVATARS.dhirajReading : MASCOT_AVATARS.dhirajCelebrate}
              alt="Dhiraj"
              width={140}
              height={140}
            />
          </div>
          <div className="letter-stage">
            <div className="fs-envelope">
              <div className="fs-env-flap" />
              <div className="fs-env-body">
                <div className="fs-env-stamp">💌</div>
              </div>
            </div>
            <div className="fs-letter-card">
              <div className="fs-card-inner">
                <div className="fs-butterflies">
                  <span className="b1">🦋</span>
                  <span className="b2">✨</span>
                  <span className="b3">🦋</span>
                </div>
                <div className="fs-sparkles">✨💜✨</div>
                <div className="fs-card-header">
                  <Image
                    src={MASCOT_AVATARS.aasthaWriting}
                    alt=""
                    width={44}
                    height={44}
                    style={{ borderRadius: "50%", border: "3px solid #fff" }}
                  />
                  <div>
                    <p className="fs-from">💌 From Aastha</p>
                    <p className="fs-title">{selectedLetter.title}</p>
                  </div>
                </div>
                <div className="fs-card-body">
                  <p className="letter-msg fs-reveal-text">{selectedLetter.message}</p>
                </div>
                {selectedLetter.photoUrl && (
                  <img className="fs-card-photo" src={selectedLetter.photoUrl} alt="" />
                )}
              </div>
            </div>
          </div>
          {reactionPhase === "reveal" && (
            <div className="fs-close-wrap">
              <button className="fs-close" onClick={handleCloseLetter}>
                Close letter ✕
              </button>
            </div>
          )}
        </div>
      )}
    </React.Fragment>
  );
}

// Sub-component: Character cards tab
interface CardsTabProps {
  cards: any[];
  user: UserSessionProfile;
  customs: any;
  today: string;
  onPhoto: (weekNum: number, file: File) => Promise<void>;
  onCustom: (weekNum: number, field: string, value: string) => Promise<void>;
}

function CardsTab({ cards, user, customs, today, onPhoto, onCustom }: CardsTabProps) {
  const [selectedCard, setSelectedCard] = useState<any | null>(null);
  const [showUnlockAnim, setShowUnlockAnim] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [editTitle, setEditTitle] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const [editObservation, setEditObservation] = useState("");
  const [editUnlockDate, setEditUnlockDate] = useState("");
  const [savingCard, setSavingCard] = useState(false);

  const isAdmin = user.role === "admin";

  function checkCardUnlocked(card: any): boolean {
    return card.unlocked || false;
  }

  function handleCardClick(card: any) {
    const isUnlocked = checkCardUnlocked(card);
    if (!isAdmin && !isUnlocked) return;

    setSelectedCard(card);
    setEditTitle(customs[`card_title_${card.weekNumber}`] || card.title);
    setEditCaption(customs[`card_caption_${card.weekNumber}`] || card.caption);
    setEditObservation(customs[`card_observation_${card.weekNumber}`] || card.observation);
    setEditUnlockDate(customs[`card_unlock_${card.weekNumber}`] || "");

    const unlockKey = customs[`card_unlock_${card.weekNumber}`];
    if (unlockKey && unlockKey.startsWith(today) && !isAdmin) {
      setShowUnlockAnim(true);
    }
  }

  async function handleSaveCardCustoms() {
    if (!selectedCard) return;
    setSavingCard(true);
    await onCustom(selectedCard.weekNumber, "caption", editCaption);
    await onCustom(selectedCard.weekNumber, "observation", editObservation);

    if (editTitle) {
      await onCustom(selectedCard.weekNumber, "title", editTitle);
    }
    if (editUnlockDate) {
      await onCustom(selectedCard.weekNumber, "unlock", editUnlockDate);
    }

    setSavingCard(false);
    setSelectedCard(null);
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && selectedCard) {
      setUploadingPhoto(true);
      await onPhoto(selectedCard.weekNumber, file);
      setUploadingPhoto(false);
    }
  }

  return (
    <React.Fragment>
      {showUnlockAnim && selectedCard && (
        <div className="card-unlock-overlay" onClick={() => setShowUnlockAnim(false)}>
          <div className="gacha-container">
            <div className="gacha-burst"></div>
            <div className="gacha-card-wrapper">
              <div className="gacha-card">
                <img 
                  src={selectedCard.photoUrl || selectedCard.image} 
                  alt="Card Unlocked" 
                  className="gacha-card-img" 
                />
                <div className="gacha-glare"></div>
              </div>
            </div>
            <h2 className="gacha-title">New Card Unlocked!</h2>
            <p className="gacha-subtitle">{customs[`card_title_${selectedCard.weekNumber}`] || selectedCard.title}</p>
            <p className="gacha-tap">Tap anywhere to continue</p>
          </div>
        </div>
      )}

      {/* Cards Grid */}
      <div className="cards-grid">
        {cards.map((card) => {
          const rarity = CARD_RARITIES[card.weekNumber] || CARD_RARITIES[1];
          const isUnlocked = isAdmin || checkCardUnlocked(card);
          const unlockKey = customs[`card_unlock_${card.weekNumber}`];

          return (
            <div
              className={`game-card ${isUnlocked ? "" : "locked"}`}
              onClick={() => handleCardClick(card)}
              key={card.weekNumber}
            >
              <div className="game-card-art">
                {card.photoUrl && isUnlocked ? (
                  <img
                    src={card.photoUrl}
                    alt={card.title}
                    loading="lazy"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = "none";
                      const fallback = target.parentElement?.querySelector(".game-card-emoji") as HTMLElement;
                      if (fallback) fallback.style.display = "flex";
                    }}
                  />
                ) : null}
                <div className="game-card-emoji" style={{ display: card.photoUrl && isUnlocked ? "none" : "flex" }}>{isUnlocked ? card.emoji : "🔒"}</div>
                {isUnlocked && <div className="game-card-shimmer" />}
              </div>
              <div className="game-card-info">
                <div className="game-card-rarity" style={{ background: rarity.bg }}>
                  {rarity.icon} {rarity.tier}
                </div>
                <p className="game-card-issue">Card #{card.weekNumber}</p>
                <p className="game-card-title">
                  {isUnlocked
                    ? customs[`card_title_${card.weekNumber}`] || card.title
                    : unlockKey
                    ? `Opens ${formatDateTimeFriendly(unlockKey)}`
                    : "Locked 🔒"}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Card Detail Dialog */}
      {selectedCard && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setSelectedCard(null)}>
          <div
            className="card-detail card-detail-anim"
            style={{ borderColor: (CARD_RARITIES[selectedCard.weekNumber] || CARD_RARITIES[1]).color }}
          >
            <button className="close-btn" onClick={() => setSelectedCard(null)}>
              ✕
            </button>
            <div
              className="detail-rarity"
              style={{ background: (CARD_RARITIES[selectedCard.weekNumber] || CARD_RARITIES[1]).bg }}
            >
              {(CARD_RARITIES[selectedCard.weekNumber] || CARD_RARITIES[1]).icon}{" "}
              {(CARD_RARITIES[selectedCard.weekNumber] || CARD_RARITIES[1]).tier}
            </div>

            {selectedCard.photoUrl ? (
              <img
                className="detail-photo"
                src={selectedCard.photoUrl}
                alt={selectedCard.title}
                loading="lazy"
                onError={(e) => {
                  const target = e.currentTarget;
                  const placeholder = document.createElement("div");
                  placeholder.className = "detail-placeholder";
                  placeholder.textContent = selectedCard.emoji;
                  target.parentElement?.replaceChild(placeholder, target);
                }}
              />
            ) : (
              <div className="detail-placeholder">{selectedCard.emoji}</div>
            )}

            <div className="detail-body">
              <p className="issue">Card #{selectedCard.weekNumber}</p>
              {isAdmin ? (
                <React.Fragment>
                  <div style={{ marginTop: 8 }}>
                    <label className="edit-label">Card Title</label>
                    <input
                      className="field"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        borderColor: "rgba(255,255,255,0.1)",
                        color: "#fff",
                        fontSize: 14,
                        minHeight: 44,
                        marginTop: 4,
                      }}
                    />
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <label className="edit-label">Caption</label>
                    <textarea
                      className="textarea"
                      value={editCaption}
                      onChange={(e) => setEditCaption(e.target.value)}
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        borderColor: "rgba(255,255,255,0.1)",
                        color: "#fff",
                        fontSize: 13,
                        minHeight: 60,
                        marginTop: 4,
                      }}
                    />
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <label className="edit-label pink">Aastha's Observation</label>
                    <textarea
                      className="textarea"
                      value={editObservation}
                      onChange={(e) => setEditObservation(e.target.value)}
                      style={{
                        background: "rgba(232,120,154,0.06)",
                        borderColor: "rgba(232,120,154,0.1)",
                        color: "rgba(232,120,154,0.95)",
                        fontSize: 13,
                        minHeight: 60,
                        fontStyle: "italic",
                        marginTop: 4,
                      }}
                    />
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <label className="edit-label">Unlock Date & Time</label>
                    <input
                      className="field"
                      type="datetime-local"
                      value={editUnlockDate}
                      onChange={(e) => setEditUnlockDate(e.target.value)}
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        borderColor: "rgba(255,255,255,0.1)",
                        color: "#fff",
                        minHeight: 44,
                        marginTop: 4,
                      }}
                    />
                  </div>

                  <button
                    className="primary-btn"
                    disabled={savingCard}
                    style={{ marginTop: 12, fontSize: 14, minHeight: 48 }}
                    onClick={handleSaveCardCustoms}
                  >
                    {savingCard ? "Saving..." : "Save Card 💾"}
                  </button>

                  <div style={{ marginTop: 10 }}>
                    <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handlePhotoUpload} />
                    <button
                      className="ghost-btn"
                      style={{
                        fontSize: 14,
                        background: "rgba(255,255,255,0.08)",
                        borderColor: "rgba(255,255,255,0.12)",
                        color: "#fff",
                        minHeight: 48,
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                    >
                      {uploadingPhoto ? "Uploading..." : "📷 Upload Card Photo"}
                    </button>
                  </div>
                </React.Fragment>
              ) : (
                <React.Fragment>
                  <h2>{customs[`card_title_${selectedCard.weekNumber}`] || selectedCard.title}</h2>
                  <p className="caption">{customs[`card_caption_${selectedCard.weekNumber}`] || selectedCard.caption}</p>
                  <div className="observation">
                    <strong>Aastha's Observation</strong>
                    {customs[`card_observation_${selectedCard.weekNumber}`] || selectedCard.observation}
                  </div>
                </React.Fragment>
              )}
            </div>
          </div>
        </div>
      )}
    </React.Fragment>
  );
}

// Sub-component: Settings tab
interface SettingsTabProps {
  user: UserSessionProfile;
  s: any;
  onSignOut: () => void;
  onRefresh: () => void;
  test: boolean;
  onTest: () => void;
}

function SettingsTab({ user, s, onSignOut, onRefresh, test, onTest }: SettingsTabProps) {
  const isAdmin = user.role === "admin";

  return (
    <React.Fragment>
      <div className="settings-card">
        <h3>👤 Account</h3>
        <div className="settings-row">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="avatar-wrapper" style={{ width: 38, height: 38 }}>
              <img
                className={user.displayName === "Aastha" ? "aastha-avatar" : ""}
                src={user.displayName === "Dhiraj" ? MASCOT_AVATARS.dhiraj : MASCOT_AVATARS.aastha}
                alt={user.displayName || "User"}
                style={{ width: "100%", height: "100%" }}
              />
            </div>
            <div>
              <span style={{ fontWeight: 900, fontSize: 16, display: "block" }}>{user.displayName}</span>
              <span className="tiny">{user.email}</span>
            </div>
          </div>
          <span className={`login-indicator ${user.displayName === "Aastha" ? "aastha" : "dhiraj"}`} style={{ margin: 0 }}>
            {isAdmin ? "👑 Admin" : "👤 Member"}
          </span>
        </div>
        <div style={{ marginTop: 10 }}>
          <button className="ghost-btn" onClick={onSignOut}>
            Sign Out
          </button>
        </div>
      </div>

      <div className="settings-card">
        <h3>🧪 Testing Mode</h3>
        <div className="settings-row">
          <span style={{ fontWeight: 700, fontSize: 15 }}>Enable Testing Mode</span>
          <button
            onClick={onTest}
            style={{
              padding: "8px 20px",
              borderRadius: 22,
              border: 0,
              background: test ? "var(--pink)" : "rgba(0,0,0,0.06)",
              color: test ? "#fff" : "var(--ink-soft)",
              fontWeight: 800,
              fontSize: 13,
              minHeight: 40,
            }}
          >
            {test ? "ON" : "OFF"}
          </button>
        </div>
      </div>
      {isAdmin && <AdminForm s={s} onRefresh={onRefresh} />}
    </React.Fragment>
  );
}

// Sub-component: Write a Letter / Admin panel inside settings
function AdminForm({ s, onRefresh }: { s: any; onRefresh: () => void }) {
  const today = getKolkataToday();
  const [letterTitle, setLetterTitle] = useState("");
  const [letterMessage, setLetterMessage] = useState("");
  const [unlockDateTime, setUnlockDateTime] = useState(`${today}T09:00`);
  const [savingLetter, setSavingLetter] = useState(false);

  async function handleScheduleLetter() {
    if (!letterTitle.trim() || !letterMessage.trim()) return;
    setSavingLetter(true);
    await scheduleSurpriseMessage({
      title: letterTitle.trim(),
      message: letterMessage.trim(),
      unlockDate: unlockDateTime,
      type: "surprise",
    });
    setLetterTitle("");
    setLetterMessage("");
    await onRefresh();
    setSavingLetter(false);
  }

  return (
    <React.Fragment>
      <div className="settings-card">
        <h3>💌 Write a Letter</h3>
        <form
          className="admin-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleScheduleLetter();
          }}
        >
          <input
            className="field"
            value={letterTitle}
            onChange={(e) => setLetterTitle(e.target.value)}
            placeholder="Letter title"
          />
          <textarea
            className="textarea"
            value={letterMessage}
            onChange={(e) => setLetterMessage(e.target.value)}
            placeholder="Write your letter..."
          />
          <label className="edit-label" style={{ color: "var(--ink-muted)" }}>
            Unlock Date & Time
          </label>
          <input
            className="field"
            type="datetime-local"
            value={unlockDateTime}
            onChange={(e) => setUnlockDateTime(e.target.value)}
          />
          <button className="primary-btn" disabled={savingLetter || !letterTitle.trim() || !letterMessage.trim()}>
            {savingLetter ? "Saving..." : "Schedule Letter 💌"}
          </button>
        </form>
      </div>

      <div className="settings-card">
        <h3>📖 Recent Memories</h3>
        {s.reflections.length === 0 && <p className="tab-sub">No memories yet.</p>}
        {s.reflections
          .slice(-8)
          .reverse()
          .map((ref: any) => (
            <div
              style={{
                padding: "8px 0",
                borderBottom: "1px solid #F0EDF8",
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
              }}
              key={ref.id || ref.date}
            >
              <img
                src={ref.userName === "Dhiraj" ? MASCOT_AVATARS.dhiraj : MASCOT_AVATARS.aastha}
                alt=""
                width={28}
                height={28}
                style={{ borderRadius: "50%", marginTop: 2 }}
              />
              <div>
                <p className="tiny">{formatDateFriendly(ref.date)}</p>
                <p style={{ fontSize: 14, fontWeight: 800 }}>{ref.userName}</p>
                <p className="tab-sub">{ref.text}</p>
              </div>
            </div>
          ))}
      </div>
    </React.Fragment>
  );
}

// Sub-component: Bottom Tab bar
interface TabBarProps {
  active: "timeline" | "letters" | "cards" | "settings";
  onChange: (tab: "timeline" | "letters" | "cards" | "settings") => void;
  newCard: boolean;
}

function TabBar({ active, onChange, newCard }: TabBarProps) {
  const tabs = [
    { id: "timeline", icon: "🏠", label: "Timeline" },
    { id: "letters", icon: "💌", label: "Letters" },
    { id: "cards", icon: "🎴", label: "Cards", flash: newCard },
    { id: "settings", icon: "⚙️", label: "Settings" },
  ] as const;

  return (
    <nav className="tabbar" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
      {tabs.map((tab) => (
        <button
          className={`tab-btn ${active === tab.id ? "active" : ""} ${tab.flash ? "tab-flash" : ""}`}
          onClick={() => onChange(tab.id)}
          key={tab.id}
        >
          <span>{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
