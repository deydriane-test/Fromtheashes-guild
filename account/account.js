const c=window.GUILD_CONFIG||{};const sb=window.supabase?.createClient(c.supabase.url,c.supabase.publishableKey);const $=id=>document.getElementById(id);
const loginForm=$("loginForm"),resetForm=$("resetForm"),accountPanel=$("accountPanel");
function status(id,msg,type=""){const x=$(id);x.className="formStatus"+(type?" "+type:"");x.textContent=msg}
function showLogin(){loginForm.hidden=false;resetForm.hidden=true;$("authModeLabel").textContent="MEMBER SIGN IN";$("authPrompt").textContent="Don't have an account?"}
function showReset(){loginForm.hidden=true;resetForm.hidden=false;$("authModeLabel").textContent="RESET PASSWORD";$("authPrompt").textContent="Remember your password?"}
$("forgotPassword").onclick=showReset;$("backToLogin").onclick=showLogin;
loginForm.onsubmit=async e=>{e.preventDefault();status("loginStatus","SIGNING IN…");const {error}=await sb.auth.signInWithPassword({email:$("loginEmail").value.trim().toLowerCase(),password:$("loginPassword").value});if(error){status("loginStatus",error.message,"error");return}boot()};
resetForm.onsubmit=async e=>{e.preventDefault();status("resetStatus","SENDING RESET LINK…");const {error}=await sb.auth.resetPasswordForEmail($("resetEmail").value.trim().toLowerCase(),{redirectTo:window.location.origin+"/account/"});if(error){status("resetStatus",error.message,"error");return}status("resetStatus","CHECK YOUR EMAIL FOR THE PASSWORD RESET LINK.","success")};
async function boot(){const {data:{user}}=await sb.auth.getUser();if(!user){accountPanel.hidden=true;return}const {data:profile}=await sb.from("profiles").select("username,role").eq("id",user.id).maybeSingle();if(!profile)return;document.querySelector(".accountLanding").hidden=true;accountPanel.hidden=false;$("accountUsername").textContent=(profile.username||"MEMBER").toUpperCase()+".";$("accountRole").textContent="CURRENT ACCESS: "+profile.role.replace("_"," ").toUpperCase()+".";$("accountCharacter").textContent="Your character signup is private. Once approved, it is visible to Officers and above."}
$("accountLogout").onclick=async()=>{await sb.auth.signOut();document.querySelector(".accountLanding").hidden=false;accountPanel.hidden=true;showLogin()};
sb.auth.onAuthStateChange(()=>boot());boot();
if(location.hash==="#signin")showLogin();
