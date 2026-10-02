const c=window.GUILD_CONFIG||{};const sb=window.supabase?.createClient(c.supabase.url,c.supabase.publishableKey);const $=id=>document.getElementById(id);
const loginForm=$("loginForm"),recoveryModal=$("recoveryModal");
function status(id,msg,type=""){const x=$(id);x.className="formStatus"+(type?" "+type:"");x.textContent=msg}
function openRecovery(){recoveryModal.hidden=false;$("recoveryEmail").focus();status("recoveryStatus","")}
function closeRecovery(){recoveryModal.hidden=true}
$("forgotAccount").onclick=openRecovery;$("closeRecovery").onclick=closeRecovery;$("recoveryBackdrop").onclick=closeRecovery;

$("sendPasswordReset").onclick=async()=>{const email=$("recoveryEmail").value.trim().toLowerCase();if(!email){status("recoveryStatus","ENTER YOUR EMAIL ADDRESS.","error");return}status("recoveryStatus","SENDING PASSWORD RESET EMAIL…");const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+"/account/"});if(error){status("recoveryStatus",error.message,"error");return}status("recoveryStatus","IF THAT EMAIL HAS AN ACCOUNT, A PASSWORD RESET EMAIL HAS BEEN SENT.","success")};
$("sendUsername").onclick=async()=>{const email=$("recoveryEmail").value.trim().toLowerCase();if(!email){status("recoveryStatus","ENTER YOUR EMAIL ADDRESS.","error");return}status("recoveryStatus","SENDING USERNAME EMAIL…");try{const res=await fetch(c.supabase.url+"/functions/v1/send-username-reminder",{method:"POST",headers:{"Content-Type":"application/json",apikey:c.supabase.publishableKey},body:JSON.stringify({email})});const data=await res.json();if(!res.ok)throw new Error(data?.error||"Username email is not available yet.");status("recoveryStatus","IF THAT EMAIL HAS AN ACCOUNT, YOUR USERNAME HAS BEEN EMAILED.","success")}catch(err){status("recoveryStatus",err.message,"error")}};
loginForm.onsubmit=async e=>{e.preventDefault();status("loginStatus","SIGNING IN…");const {error}=await sb.auth.signInWithPassword({email:$("loginEmail").value.trim().toLowerCase(),password:$("loginPassword").value});if(error){status("loginStatus",error.message,"error");return}window.location.href="../";};


const discordLogin=$("discordLogin");
discordLogin?.addEventListener("click",async()=>{const r=await sb.auth.signInWithOAuth({provider:"discord",options:{redirectTo:window.location.origin+"/account/discord-complete.html"}});if(r.error)status("loginStatus",r.error.message,"error");});
