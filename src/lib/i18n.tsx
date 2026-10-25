import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "bn" | "hi";
export const languages: { code: Lang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "bn", label: "বাংলা" },
  { code: "hi", label: "हिंदी" },
];

const dict = {
  en: { home: "Home", nearby: "Nearby", communities: "Communities", messages: "Messages", profile: "Profile", notifications: "Notifications", createPost: "Create post", signIn: "Sign in", seeMore: "See more", seeLess: "See less", share: "Share", language: "Language", editProfile: "Edit Profile", markAllRead: "Mark all read", linkCopied: "Link copied", message: "Message", canHelp: "I Can Help" },
  bn: { home: "হোম", nearby: "কাছাকাছি", communities: "কমিউনিটি", messages: "মেসেজ", profile: "প্রোফাইল", notifications: "নোটিফিকেশন", createPost: "পোস্ট করুন", signIn: "সাইন ইন", seeMore: "আরও দেখুন", seeLess: "কম দেখুন", share: "শেয়ার", language: "ভাষা", editProfile: "প্রোফাইল এডিট", markAllRead: "সব পড়া হয়েছে", linkCopied: "লিংক কপি হয়েছে", message: "মেসেজ", canHelp: "আমি সাহায্য করবো" },
  hi: { home: "होम", nearby: "आस-पास", communities: "समुदाय", messages: "संदेश", profile: "प्रोफ़ाइल", notifications: "सूचनाएँ", createPost: "पोस्ट करें", signIn: "साइन इन", seeMore: "और देखें", seeLess: "कम देखें", share: "शेयर", language: "भाषा", editProfile: "प्रोफ़ाइल संपादित करें", markAllRead: "सभी पढ़े गए", linkCopied: "लिंक कॉपी हुआ", message: "संदेश", canHelp: "मैं मदद करूँगा" },
} as const;

export type TKey = keyof typeof dict.en;
const KEY = "needup-lang";
const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: TKey) => string }>({ lang: "en", setLang: () => {}, t: (k) => dict.en[k] });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (saved === "bn" || saved === "hi" || saved === "en") setLangState(saved);
  }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const setLang = (l: Lang) => { setLangState(l); localStorage.setItem(KEY, l); };
  return <Ctx.Provider value={{ lang, setLang, t: (k) => dict[lang][k] }}>{children}</Ctx.Provider>;
}

export const useT = () => useContext(Ctx);
