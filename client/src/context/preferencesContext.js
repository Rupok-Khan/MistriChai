import { createContext } from "react";

export const PreferencesContext = createContext({ language:"ENGLISH", theme:"light", toggleTheme:()=>{}, isBangla:false });
