const c=window.GUILD_CONFIG||{};const sb=window.supabase?.createClient(c.supabase.url,c.supabase.publishableKey);const $=id=>document.getElementById(id);
const passwordPattern=/^(?=.{10,72}$)(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).*$/;
function status(msg,type=""){const x=$("signupStatus");x.className="formStatus"+(type?" "+type:"");x.textContent=msg}
function checkMatch(){const a=$("password").value,b=$("passwordConfirm").value,x=$("passwordMatch");if(!b){x.textContent="";x.className="passwordMatch";return false}if(a===b){x.textContent="PASSWORDS MATCH";x.className="passwordMatch good";return true}x.textContent="PASSWORDS DO NOT MATCH";x.className="passwordMatch bad";return false}
$("password").addEventListener("input",checkMatch);$("passwordConfirm").addEventListener("input",checkMatch);
$("signupForm").onsubmit=async e=>{e.preventDefault();const username=$("username").value.trim(),email=$("email").value.trim().toLowerCase(),password=$("password").value,passwordConfirm=$("passwordConfirm").value,character=$("character").value.trim(),discord=$("discord").value.trim();
if(!passwordPattern.test(password)){status("PASSWORD MUST BE 10+ CHARACTERS AND INCLUDE 1 UPPERCASE, 1 LOWERCASE, 1 NUMBER, AND 1 SPECIAL CHARACTER.","error");return}
if(password!==passwordConfirm){checkMatch();status("PASSWORDS DO NOT MATCH.","error");return}
if(username.length<3){status("USERNAME MUST BE AT LEAST 3 CHARACTERS.","error");return}
status("CREATING YOUR ACCOUNT…");
const {error}=await sb.auth.signUp({email,password,options:{data:{username,character_name:character,discord_id:discord}}});
if(error){status(error.message,"error");return}
status("ACCOUNT CREATED. CHECK YOUR EMAIL TO CONFIRM IT. YOU START AS A RECRUIT AND YOUR CHARACTER IS PENDING APPROVAL.","success");$("signupForm").reset();$("passwordMatch").textContent="";$("passwordMatch").className="passwordMatch"};
