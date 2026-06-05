import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — ShhChats" },
      { name: "description", content: "Sign up or sign in to ShhChats. Free, no email verification." },
    ],
  }),
  component: AuthPage,
});

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Argentina", "Australia", "Austria",
  "Bangladesh", "Belgium", "Brazil", "Canada", "Chile", "China", "Colombia",
  "Croatia", "Czech Republic", "Denmark", "Egypt", "Ethiopia", "Finland",
  "France", "Germany", "Ghana", "Greece", "Hungary", "India", "Indonesia",
  "Iran", "Iraq", "Ireland", "Israel", "Italy", "Japan", "Jordan", "Kenya",
  "Malaysia", "Mexico", "Morocco", "Nepal", "Netherlands", "New Zealand",
  "Nigeria", "Norway", "Pakistan", "Peru", "Philippines", "Poland", "Portugal",
  "Romania", "Russia", "Saudi Arabia", "South Africa", "South Korea", "Spain",
  "Sri Lanka", "Sweden", "Switzerland", "Thailand", "Turkey", "Ukraine",
  "United Arab Emirates", "United Kingdom", "United States", "Vietnam",
];

const STATES_BY_COUNTRY: Record<string, string[]> = {
  "India": [
    "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
    "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa",
    "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka",
    "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
    "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
  ],
  "United States": [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
    "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
    "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
    "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
    "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
    "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
    "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
    "Wisconsin", "Wyoming"
  ],
  "Australia": [
    "Australian Capital Territory", "New South Wales", "Northern Territory", "Queensland",
    "South Australia", "Tasmania", "Victoria", "Western Australia"
  ],
  "Canada": [
    "Alberta", "British Columbia", "Manitoba", "New Brunswick",
    "Newfoundland and Labrador", "Nova Scotia", "Ontario",
    "Prince Edward Island", "Quebec", "Saskatchewan"
  ],
  "United Kingdom": [
    "England", "Northern Ireland", "Scotland", "Wales"
  ],
  "Germany": [
    "Baden-Württemberg", "Bavaria", "Berlin", "Brandenburg", "Bremen", "Hamburg",
    "Hesse", "Lower Saxony", "Mecklenburg-Vorpommern", "North Rhine-Westphalia",
    "Rhineland-Palatinate", "Saarland", "Saxony", "Saxony-Anhalt",
    "Schleswig-Holstein", "Thuringia"
  ],
  "Pakistan": [
    "Azad Kashmir", "Balochistan", "Gilgit-Baltistan", "Khyber Pakhtunkhwa",
    "Punjab", "Sindh"
  ],
  "Brazil": [
    "Acre", "Alagoas", "Amapá", "Amazonas", "Bahia", "Ceará", "Espírito Santo",
    "Goiás", "Maranhão", "Mato Grosso", "Mato Grosso do Sul", "Minas Gerais",
    "Pará", "Paraíba", "Paraná", "Pernambuco", "Piauí", "Rio de Janeiro",
    "Rio Grande do Norte", "Rio Grande do Sul", "Rondônia", "Roraima",
    "Santa Catarina", "São Paulo", "Sergipe", "Tocantins"
  ],
};

function AuthPage() {
  const nav = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"choose" | "email" | "guest-form">("choose");
  const [tab, setTab] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("other");
  const [stateField, setStateField] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);

  // Country autocomplete
  const [countryInput, setCountryInput] = useState("");
  const [countrySelected, setCountrySelected] = useState("");
  const [showCountrySugg, setShowCountrySugg] = useState(false);

  // State autocomplete
  const [stateInput, setStateInput] = useState("");
  const [showStateSugg, setShowStateSugg] = useState(false);

  const filteredCountries = COUNTRIES.filter(c =>
    c.toLowerCase().includes(countryInput.toLowerCase()) && countryInput.length > 0
  ).slice(0, 6);

  const availableStates = STATES_BY_COUNTRY[countrySelected] || [];
  const filteredStates = availableStates.filter(s =>
    s.toLowerCase().includes(stateInput.toLowerCase()) && stateInput.length > 0
  ).slice(0, 6);

  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);

  useEffect(() => {
    if (!authLoading && user) nav({ to: "/discover" });
  }, [user, authLoading, nav]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("guest") === "true") {
        setMode("guest-form");
      }
    }
  }, []);

  useEffect(() => {
    const checkUsername = async () => {
      const u = username.trim().toLowerCase();
      if (u.length < 3) {
        setUsernameAvailable(null);
        return;
      }
      setUsernameChecking(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", u)
        .maybeSingle();
      if (!error) {
        setUsernameAvailable(!data);
      }
      setUsernameChecking(false);
    };

    const timer = setTimeout(checkUsername, 400);
    return () => clearTimeout(timer);
  }, [username]);

  function guest() {
    setMode("guest-form");
  }

  async function handleGuestSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (!username.trim() || username.length < 3) throw new Error("Username must be at least 3 characters");
      if (usernameAvailable === false) throw new Error("Username is already taken");
      const ageNum = age ? parseInt(age, 10) : null;
      if (ageNum !== null && (ageNum < 18 || ageNum > 100)) throw new Error("You must be at least 18 years old to use ShhChats");

      // Sign in anonymously (no data param - causes 422 error)
      const { data: anonData, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      const uid = anonData?.user?.id;
      if (!uid) throw new Error('Sign-in failed, please try again');
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: uid,
        username: username.trim().toLowerCase(),
        name: username.trim(),
        age: ageNum,
        gender,
        country: countrySelected || null,
        state: stateField.trim() || null,
        is_online: true,
        last_seen: new Date().toISOString(),
      });
      if (profileError) throw profileError;
      nav({ to: '/discover' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (tab === "signup") {
        if (!agree) throw new Error("Please accept the Terms and Privacy Policy");
        if (!username.trim() || username.length < 3) throw new Error("Username must be at least 3 characters");
        if (usernameAvailable === false) throw new Error("Username is already taken");
        if (password.length < 6) throw new Error("Password must be at least 6 characters");
        const ageNum = age ? parseInt(age, 10) : null;
        if (ageNum !== null && (ageNum < 18 || ageNum > 100)) throw new Error("You must be at least 18 years old to use ShhChats");

        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              username: username.trim().toLowerCase(),
              name: username.trim(),
              age: ageNum?.toString() ?? "",
              gender,
              country: countrySelected || null,
              state: stateField.trim() || null,
            },
          },
        });
        if (error) throw error;
        const { error: siErr } = await supabase.auth.signInWithPassword({ email, password });
        if (siErr) throw siErr;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  // Reusable country+state fields
  const locationFields = (
    <div className="grid grid-cols-2 gap-2">
      {/* Country autocomplete */}
      <div className="relative">
        <input
          value={countryInput}
          onChange={(e) => {
            setCountryInput(e.target.value);
            setCountrySelected("");
            setStateField("");
            setStateInput("");
            setShowCountrySugg(true);
          }}
          onFocus={() => setShowCountrySugg(true)}
          onBlur={() => setTimeout(() => setShowCountrySugg(false), 150)}
          placeholder="Country"
          required
          className="w-full h-12 px-4 rounded-full bg-[#1C1C1E] outline-none text-sm placeholder:text-[#666] text-white"
        />
        {showCountrySugg && filteredCountries.length > 0 && (
          <ul className="absolute z-50 top-13 left-0 right-0 bg-[#2a2a2e] rounded-2xl overflow-hidden shadow-lg mt-1">
            {filteredCountries.map((c) => (
              <li
                key={c}
                onMouseDown={() => {
                  setCountryInput(c);
                  setCountrySelected(c);
                  setShowCountrySugg(false);
                  setStateField("");
                  setStateInput("");
                }}
                className="px-4 py-2.5 text-sm text-white hover:bg-[#7C3AED] cursor-pointer"
              >
                {c}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* State autocomplete */}
      <div className="relative">
        <input
          value={stateInput}
          onChange={(e) => {
            setStateInput(e.target.value);
            setStateField(e.target.value);
            setShowStateSugg(true);
          }}
          onFocus={() => setShowStateSugg(true)}
          onBlur={() => setTimeout(() => setShowStateSugg(false), 150)}
          placeholder="State"
          className="w-full h-12 px-4 rounded-full bg-[#1C1C1E] outline-none text-sm placeholder:text-[#666] text-white"
        />
        {showStateSugg && filteredStates.length > 0 && (
          <ul className="absolute z-50 top-13 left-0 right-0 bg-[#2a2a2e] rounded-2xl overflow-hidden shadow-lg mt-1">
            {filteredStates.map((s) => (
              <li
                key={s}
                onMouseDown={() => {
                  setStateInput(s);
                  setStateField(s);
                  setShowStateSugg(false);
                }}
                className="px-4 py-2.5 text-sm text-white hover:bg-[#7C3AED] cursor-pointer"
              >
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-black text-white flex flex-col">
      <header className="h-14 px-5 flex items-center">
        <Link to="/" className="p-2 -ml-2 text-[#888]"><ArrowLeft className="h-5 w-5" strokeWidth={1.5} /></Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-6">
        <div className="w-full max-w-[380px]">
          <div className="flex flex-col items-center mb-6">
            <span className="h-14 w-14 rounded-xl bg-[#8AB4F8] text-[#0D0D0F] grid place-items-center text-3xl mb-3">🤫</span>
            <h1 className="text-[28px] text-center">Welcome to ShhChats</h1>
          </div>

          {/* 18+ Compliance Banner */}
          <div 
            className="mb-6 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-[12px] font-medium text-[#f28b82] text-center leading-normal"
            style={{ background: "rgba(242,139,130,0.06)", borderColor: "rgba(242,139,130,0.2)" }}
          >
            ⚠️ 18+ Notice: By continuing as a guest or logging in, you confirm you are at least 18 years old.
          </div>

          {mode === "choose" ? (
            <>
              <button onClick={guest} className="w-full h-14 rounded-full bg-[#7C3AED] text-white text-base flex items-center justify-center gap-2">
                Continue as guest
              </button>
              <p className="mt-2.5 text-[12px] text-[#888] text-center">No email needed</p>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-[#1C1C1E]" />
                <span className="text-[12px] text-[#888]">or</span>
                <div className="flex-1 h-px bg-[#1C1C1E]" />
              </div>

              <button onClick={() => setMode("email")} className="w-full h-14 rounded-full bg-transparent border border-white/30 text-white text-base">
                Sign up with email
              </button>
            </>
          ) : mode === "guest-form" ? (
            <>
              <form onSubmit={handleGuestSubmit} className="space-y-2.5">
                <div className="relative">
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    required
                    minLength={3}
                    maxLength={20}
                    className="w-full h-12 px-4 rounded-full bg-[#1C1C1E] outline-none text-sm placeholder:text-[#666]"
                  />
                  {usernameChecking && <span className="absolute right-4 top-3.5 text-xs text-[#888]">Checking...</span>}
                  {usernameAvailable === false && <p className="text-red-400 text-[11px] mt-1 ml-3">Username already taken</p>}
                  {usernameAvailable === true && <p className="text-green-400 text-[11px] mt-1 ml-3">Username is available</p>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min={18}
                    max={100}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="Age (Min 18)"
                    required
                    className="w-full h-12 px-4 rounded-full bg-[#1C1C1E] outline-none text-sm placeholder:text-[#666]"
                  />
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full h-12 px-4 rounded-full bg-[#1C1C1E] outline-none text-sm text-[#888]"
                  >
                    <option value="other">Gender: Other</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                {locationFields}
                <button
                  type="submit"
                  disabled={busy || usernameAvailable === false || usernameChecking}
                  className="w-full h-14 rounded-full bg-[#7C3AED] text-white text-base flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {busy && <Loader2 className="h-5 w-5 spin-slow" />} Let's chat
                </button>
              </form>
              <button onClick={() => setMode("choose")} className="mt-4 w-full text-[13px] text-[#888]">← Back to options</button>
            </>
          ) : (
            <>
              <div className="flex gap-1 mb-4 p-1 rounded-full bg-[#1C1C1E]">
                {(["signup", "signin"] as const).map((t) => (
                  <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2.5 rounded-full text-sm ${tab === t ? "bg-[#7C3AED] text-white" : "text-[#888]"}`}>
                    {t === "signup" ? "Sign up" : "Sign in"}
                  </button>
                ))}
              </div>

              <form onSubmit={handle} className="space-y-2.5">
                {tab === "signup" && (
                  <>
                    <div className="relative">
                      <input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Username"
                        required
                        minLength={3}
                        maxLength={20}
                        className="w-full h-12 px-4 rounded-full bg-[#1C1C1E] outline-none text-sm placeholder:text-[#666]"
                      />
                      {usernameChecking && <span className="absolute right-4 top-3.5 text-xs text-[#888]">Checking...</span>}
                      {usernameAvailable === false && <p className="text-red-400 text-[11px] mt-1 ml-3">Username already taken</p>}
                      {usernameAvailable === true && <p className="text-green-400 text-[11px] mt-1 ml-3">Username is available</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        min={18}
                        max={100}
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="Age (Min 18)"
                        required
                        className="w-full h-12 px-4 rounded-full bg-[#1C1C1E] outline-none text-sm placeholder:text-[#666]"
                      />
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value as any)}
                        className="w-full h-12 px-4 rounded-full bg-[#1C1C1E] outline-none text-sm text-[#888]"
                      >
                        <option value="other">Gender: Other</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                    {locationFields}
                  </>
                )}
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required className="w-full h-12 px-4 rounded-full bg-[#1C1C1E] outline-none text-sm placeholder:text-[#666]" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required minLength={6} className="w-full h-12 px-4 rounded-full bg-[#1C1C1E] outline-none text-sm placeholder:text-[#666]" />

                {tab === "signup" && (
                  <label className="flex items-start gap-2 px-1 py-2 text-[12px] text-[#888]">
                    <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 accent-[#7C3AED]" />
                    <span>
                      I agree to the{" "}
                      <a href="https://www.termsfeed.com/live/82620bf7-04c5-4f57-ac5f-7ef3f8e56a29" target="_blank" rel="noopener noreferrer" className="text-[#7C3AED]">Terms</a> and{" "}
                      <a href="https://www.termsfeed.com/live/1e0211fa-64de-478c-a7d9-bdd1e79c7d11" target="_blank" rel="noopener noreferrer" className="text-[#7C3AED]">Privacy Policy</a>.
                    </span>
                  </label>
                )}

                <button
                  type="submit"
                  disabled={busy || (tab === "signup" && (usernameAvailable === false || usernameChecking))}
                  className="w-full h-14 rounded-full bg-[#7C3AED] text-white text-base flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {busy && <Loader2 className="h-5 w-5 spin-slow" />}
                  {tab === "signup" ? "Create account" : "Sign in"}
                </button>
              </form>
              <button onClick={() => setMode("choose")} className="mt-4 w-full text-[13px] text-[#888]">← Back to options</button>
            </>
          )}

          <p className="mt-6 text-center text-[11px] text-[#555]">
            <a href="https://www.termsfeed.com/live/82620bf7-04c5-4f57-ac5f-7ef3f8e56a29" target="_blank" rel="noopener noreferrer">Terms</a> ·{" "}
            <a href="https://www.termsfeed.com/live/1e0211fa-64de-478c-a7d9-bdd1e79c7d11" target="_blank" rel="noopener noreferrer">Privacy</a> ·{" "}
            <Link to="/contact">Contact</Link>
          </p>
        </div>
      </div>
    </div>
  );
}