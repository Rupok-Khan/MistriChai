import React, { useEffect, useMemo, useState } from "react";
import { SiteContentService } from "../services/siteContent.service";
import { PreferencesContext } from "./preferencesContext";
import { translateUiTree } from "../utils/banglaUi";

export function PreferencesProvider({ children }) {
  const [language, setLanguage] = useState("ENGLISH");
  const [theme, setTheme] = useState(() => localStorage.getItem("ondemand-theme") || "light");
  useEffect(() => { SiteContentService.getPublic().then((res) => setLanguage(res?.data?.preferences?.language || "ENGLISH")).catch(() => {}); }, []);
  useEffect(() => { document.documentElement.dataset.theme=theme; localStorage.setItem("ondemand-theme",theme); }, [theme]);
  useEffect(() => { document.documentElement.lang=language === "BANGLA" ? "bn" : "en"; }, [language]);
  useEffect(() => {
    if (language !== "BANGLA") return undefined;
    const apply=()=>translateUiTree(document.body);
    apply();
    const observer=new MutationObserver((mutations)=>mutations.forEach((mutation)=>mutation.addedNodes.forEach((node)=>{ if(node.nodeType===Node.ELEMENT_NODE) translateUiTree(node); else if(node.nodeType===Node.TEXT_NODE && node.parentElement) translateUiTree(node.parentElement); })));
    observer.observe(document.body,{childList:true,subtree:true});
    return ()=>observer.disconnect();
  },[language]);
  const value=useMemo(() => ({language,theme,isBangla:language === "BANGLA",toggleTheme:()=>setTheme((x)=>x === "dark" ? "light" : "dark")}),[language,theme]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}
