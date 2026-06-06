[1mdiff --git a/src/routes/auth.tsx b/src/routes/auth.tsx[m
[1mindex 32bbe91..169b5ba 100644[m
[1m--- a/src/routes/auth.tsx[m
[1m+++ b/src/routes/auth.tsx[m
[36m@@ -160,7 +160,7 @@[m [mfunction AuthPage() {[m
       if (!username.trim() || username.length < 3) throw new Error("Username must be at least 3 characters");[m
       if (usernameAvailable === false) throw new Error("Username is already taken");[m
       const ageNum = age ? parseInt(age, 10) : null;[m
[31m-      if (ageNum !== null && (ageNum < 13 || ageNum > 100)) throw new Error("Age must be between 13 and 100");[m
[32m+[m[32m      if (ageNum !== null && (ageNum < 18 || ageNum > 100)) throw new Error("You must be at least 18 years old to use ShhChats");[m
 [m
       // Sign in anonymously (no data param - causes 422 error)[m
       const { data: anonData, error } = await supabase.auth.signInAnonymously();[m
[36m@@ -197,7 +197,7 @@[m [mfunction AuthPage() {[m
         if (usernameAvailable === false) throw new Error("Username is already taken");[m
         if (password.length < 6) throw new Error("Password must be at least 6 characters");[m
         const ageNum = age ? parseInt(age, 10) : null;[m
[31m-        if (ageNum !== null && (ageNum < 13 || ageNum > 100)) throw new Error("Age must be between 13 and 100");[m
[32m+[m[32m        if (ageNum !== null && (ageNum < 18 || ageNum > 100)) throw new Error("You must be at least 18 years old to use ShhChats");[m
 [m
         const { error } = await supabase.auth.signUp({[m
           email, password,[m
[36m@@ -316,6 +316,14 @@[m [mfunction AuthPage() {[m
             <h1 className="text-[28px] text-center">Welcome to ShhChats</h1>[m
           </div>[m
 [m
[32m+[m[32m          {/* 18+ Compliance Banner */}[m
[32m+[m[32m          <div[m[41m [m
[32m+[m[32m            className="mb-6 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-[12px] font-medium text-[#f28b82] text-center leading-normal"[m
[32m+[m[32m            style={{ background: "rgba(242,139,130,0.06)", borderColor: "rgba(242,139,130,0.2)" }}[m
[32m+[m[32m          >[m
[32m+[m[32m            ⚠️ 18+ Notice: By continuing as a guest or logging in, you confirm you are at least 18 years old.[m
[32m+[m[32m          </div>[m
[32m+[m
           {mode === "choose" ? ([m
             <>[m
               <button onClick={guest} className="w-full h-14 rounded-full bg-[#7C3AED] text-white text-base flex items-center justify-center gap-2">[m
[36m@@ -353,11 +361,11 @@[m [mfunction AuthPage() {[m
                 <div className="grid grid-cols-2 gap-2">[m
                   <input[m
                     type="number"[m
[31m-                    min={13}[m
[32m+[m[32m                    min={18}[m
                     max={100}[m
                     value={age}[m
                     onChange={(e) => setAge(e.target.value)}[m
[31m-                    placeholder="Age"[m
[32m+[m[32m                    placeholder="Age (Min 18)"[m
                     required[m
                     className="w-full h-12 px-4 rounded-full bg-[#1C1C1E] outline-none text-sm placeholder:text-[#666]"[m
                   />[m
[36m@@ -412,11 +420,11 @@[m [mfunction AuthPage() {[m
                     <div className="grid grid-cols-2 gap-2">[m
                       <input[m
                         type="number"[m
[31m-                        min={13}[m
[32m+[m[32m                        min={18}[m
                         max={100}[m
                         value={age}[m
                         onChange={(e) => setAge(e.target.value)}[m
[31m-                        placeholder="Age"[m
[32m+[m[32m                        placeholder="Age (Min 18)"[m
                         required[m
                         className="w-full h-12 px-4 rounded-full bg-[#1C1C1E] outline-none text-sm placeholder:text-[#666]"[m
                       />[m
