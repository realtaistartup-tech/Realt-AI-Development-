import { readFileSync, writeFileSync } from "node:fs";

const add = {
  sv: {
    accountMenu: {
      menuLabel: "Kontomeny",
      signIn: "Logga in",
      signInTitle: "Logga in",
      signInDescription: "Logga in för att spara sökningar och fortsätta där du slutade.",
      profile: "Profil",
      settings: "Inställningar",
      mySearches: "Mina sökningar",
      signOut: "Logga ut",
    },
    settings: {
      metaTitle: "Inställningar",
      metaDescription: "Ändra utseende och språk för Realt AI.",
      title: "Inställningar",
      back: "Tillbaka till chatten",
      appearance: "Utseende",
      appearanceDescription: "Välj ljust, mörkt eller följ din enhet.",
      language: "Språk",
      languageDescription: "Välj vilket språk appen visas på.",
      moreSoon: "Fler inställningar kommer.",
    },
    profile: {
      metaTitle: "Profil",
      metaDescription: "Ditt konto på Realt AI.",
      title: "Profil",
      back: "Tillbaka till chatten",
      email: "E-post",
      nameSoon: "Namn och initialer visas här när du kan ange dem vid registrering.",
      signedOut: "Du är inte inloggad.",
      signOut: "Logga ut",
    },
  },
  en: {
    accountMenu: {
      menuLabel: "Account menu",
      signIn: "Sign in",
      signInTitle: "Sign in",
      signInDescription: "Sign in to save searches and pick up where you left off.",
      profile: "Profile",
      settings: "Settings",
      mySearches: "My searches",
      signOut: "Sign out",
    },
    settings: {
      metaTitle: "Settings",
      metaDescription: "Change appearance and language for Realt AI.",
      title: "Settings",
      back: "Back to the chat",
      appearance: "Appearance",
      appearanceDescription: "Choose light, dark or follow your device.",
      language: "Language",
      languageDescription: "Choose the language the app is shown in.",
      moreSoon: "More settings are coming.",
    },
    profile: {
      metaTitle: "Profile",
      metaDescription: "Your Realt AI account.",
      title: "Profile",
      back: "Back to the chat",
      email: "Email",
      nameSoon: "Your name and initials will show here once you can enter them at sign-up.",
      signedOut: "You are not signed in.",
      signOut: "Sign out",
    },
  },
};

for (const locale of ["sv", "en"]) {
  const path = `messages/${locale}.json`;
  const json = JSON.parse(readFileSync(path, "utf8"));
  Object.assign(json, add[locale]);
  writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
}
console.log("ok");
