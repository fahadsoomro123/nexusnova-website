import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithCustomToken, signOut } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import { telegramSessionCall, linkTelegramAccountCall } from './telegram-account-api.js';

const firebaseConfig={apiKey:'AIzaSyBU75WYp5ioaMD1LrNcDyAvROFW2wrTil0',authDomain:'nexusnova-6ade2.firebaseapp.com',projectId:'nexusnova-6ade2',storageBucket:'nexusnova-6ade2.firebasestorage.app',messagingSenderId:'49791194817',appId:'1:49791194817:web:07f28326e0f15979536640',measurementId:'G-YLPFKWSS12'};
const app=getApps()[0]||initializeApp(firebaseConfig);
const auth=getAuth(app);
const db=getFirestore(app);
const TELEGRAM_SKIP_KEY='nexusnova_skip_telegram_autologin_v1';

const dashboard=document.querySelector('[data-dashboard]');
const loading=document.querySelector('[data-loading]');
const status=document.querySelector('[data-dashboard-status]');
const telegramLinkButton=document.querySelector('[data-telegram-link]');
const telegramPhoto=document.querySelector('[data-telegram-photo]');
const setText=(selector,value)=>{const el=document.querySelector(selector);if(el)el.textContent=String(value??'');};
let telegramSessionPromise=null;
let loadedUid='';
let resolvingSignedOut=false;
let linkingTelegram=false;

function showDashboard(){if(loading)loading.hidden=true;if(dashboard)dashboard.hidden=false;}
function setVerified(verified){const pill=document.querySelector('[data-verified]');if(pill){pill.textContent=verified?'EMAIL VERIFIED':'EMAIL NOT VERIFIED';pill.classList.toggle('unverified',!verified);}setText('[data-email-state]',verified?'VERIFIED':'PENDING');}
function setTelegramState(value){setText('[data-telegram-state]',value);}

function paintTelegram(user,{linked=false,copy='',state=''}={}){
  const fullName=user?[user.firstName,user.lastName].filter(Boolean).join(' '):'No Telegram account linked';
  setText('[data-telegram-name]',fullName||'Telegram user');
  setText('[data-telegram-username]',user?(user.username?`@${user.username} • ID ${user.id}`:`Telegram ID ${user.id}`):'Open this page from @NexusNovaToolsBot to connect.');
  setText('[data-telegram-copy]',copy||(linked?'Telegram and NexusNova use the same secure identity.':'Telegram is not linked to this NexusNova account.'));
  setTelegramState(state||(linked?'LINKED':(user?'READY TO LINK':'NOT CONNECTED')));
  if(telegramPhoto){telegramPhoto.hidden=!user?.photoUrl;if(user?.photoUrl){telegramPhoto.src=user.photoUrl;telegramPhoto.alt=`${fullName} Telegram profile`;}else telegramPhoto.removeAttribute('src');}
  if(telegramLinkButton)telegramLinkButton.hidden=linked||!user||!window.NexusNovaTelegram?.isAvailable;
}

function telegramErrorText(error){
  const code=String(error?.code||'unknown-error').replace(/^functions\//,'');
  if(code.includes('already-exists'))return {state:'ALREADY LINKED',copy:'This Telegram identity is linked to another NexusNova account.'};
  if(code.includes('telegram-session-expired'))return {state:'SESSION EXPIRED',copy:'Telegram session expired. Close the Mini App and open it again from the bot.'};
  if(code.includes('invalid-telegram-signature'))return {state:'VERIFY FAILED',copy:'Telegram verification failed on the backend.'};
  if(code.includes('firebase-config-missing'))return {state:'BACKEND CONFIG',copy:'Telegram backend is missing a Firebase Cloudflare variable.'};
  if(code.includes('google-auth-failed'))return {state:'BACKEND AUTH',copy:'Firebase service authentication failed in the Cloudflare Worker.'};
  if(code.includes('firebase-private-key'))return {state:'PRIVATE KEY ERROR',copy:'The Firebase private key in Cloudflare could not be loaded.'};
  if(code.includes('firestore'))return {state:'DATABASE ERROR',copy:'Telegram verification worked, but Firestore linking failed.'};
  if(code.includes('unavailable')||code.includes('network'))return {state:'BACKEND OFFLINE',copy:'The Telegram account service could not be reached.'};
  return {state:'LINK ERROR',copy:`Telegram linking failed (${code}).`};
}

async function getTelegramSession(){
  const bridge=window.NexusNovaTelegram;
  if(!bridge?.isAvailable)return {data:null,error:{code:'telegram-not-detected'}};
  if(!telegramSessionPromise){
    telegramSessionPromise=telegramSessionCall({initData:bridge.getInitData()})
      .then(response=>({data:response?.data||null,error:null}))
      .catch(error=>{console.warn('[NexusNova Telegram session]',error?.code||'session-failed');return {data:null,error};});
  }
  return telegramSessionPromise;
}

async function linkTelegramForSignedInUser(user,verifiedTelegram){
  const bridge=window.NexusNovaTelegram;
  if(linkingTelegram||!user||!bridge?.isAvailable||!verifiedTelegram?.id)return false;
  linkingTelegram=true;
  if(telegramLinkButton)telegramLinkButton.disabled=true;
  paintTelegram(verifiedTelegram,{state:'LINKING',copy:'Telegram verified. Connecting it to this NexusNova account automatically…'});
  try{
    const idToken=await user.getIdToken(true);
    const response=await linkTelegramAccountCall({initData:bridge.getInitData(),idToken});
    const linkedUser=response?.data?.user||verifiedTelegram;
    paintTelegram(linkedUser,{linked:true,copy:'Telegram and NexusNova now use the same secure account.'});
    if(status)status.textContent='Telegram account linked securely.';
    window.gtag?.('event','telegram_account_linked',{source:'account_dashboard_auto'});
    return true;
  }catch(error){
    console.warn('[NexusNova Telegram link]',error?.code||'link-failed');
    const info=telegramErrorText(error);
    paintTelegram(verifiedTelegram,{state:info.state,copy:info.copy});
    if(status)status.textContent=`Telegram link not completed: ${String(error?.code||'unknown-error')}`;
    return false;
  }finally{
    linkingTelegram=false;
    if(telegramLinkButton)telegramLinkButton.disabled=false;
  }
}

async function loadAccount(user){
  if(loadedUid===user.uid)return;
  loadedUid=user.uid;
  try{
    await user.reload();
    const active=auth.currentUser||user;
    const profileSnap=await getDoc(doc(db,'users',active.uid));
    const profile=profileSnap.exists()?profileSnap.data()||{}:{};
    setText('[data-name]',profile.name||active.displayName||active.email?.split('@')[0]||'NexusNova User');
    setText('[data-email]',active.email||profile.email||'');
    setText('[data-profile-state]',profileSnap.exists()?'CONNECTED':'MISSING');
    setVerified(active.emailVerified===true);

    const linkedTelegram=profile.telegram?.linked===true?profile.telegram:null;
    if(linkedTelegram){
      paintTelegram(linkedTelegram,{linked:true,copy:'Server-verified Telegram identity is synced with this Firebase profile.'});
    }else{
      const bridge=window.NexusNovaTelegram;
      const localTelegram=bridge?.getUser?.()||null;
      if(localTelegram)paintTelegram(localTelegram,{state:'VERIFYING',copy:'Telegram Mini App detected. Verifying this launch securely…'});
      const sessionResult=await getTelegramSession();
      const session=sessionResult.data;
      if(session?.user?.id){
        if(session.linked===true){
          paintTelegram(session.user,{linked:true,copy:'Telegram identity is already linked on the secure backend.'});
        }else{
          await linkTelegramForSignedInUser(active,session.user);
        }
      }else if(sessionResult.error){
        const info=telegramErrorText(sessionResult.error);
        paintTelegram(localTelegram,{state:info.state,copy:info.copy});
        if(status)status.textContent=`Telegram verification error: ${String(sessionResult.error?.code||'unknown-error')}`;
      }else{
        paintTelegram(localTelegram,{state:localTelegram?'NOT VERIFIED':'NOT CONNECTED',copy:localTelegram?'Telegram was detected but secure verification returned no user.':'Open this account from @NexusNovaToolsBot to connect Telegram.'});
      }
    }

    const referralSnap=await getDoc(doc(db,'referrals',active.uid));
    if(referralSnap.exists()){
      const referral=referralSnap.data()||{};
      setText('[data-referral-title]','Referral attached');
      setText('[data-referral-copy]',referral.status==='verified'?'Your referral has completed the app verification requirements.':'Referral is attached and waiting for the app verification requirements to complete.');
      setText('[data-referral-code]',referral.code||'');
      const code=document.querySelector('[data-referral-code]');if(code)code.hidden=!referral.code;
      setText('[data-referral-status]',String(referral.status||'pending').toUpperCase());
    }else{
      setText('[data-referral-title]','No referral attached');
      setText('[data-referral-copy]','This account was created or signed in without an active referral attribution.');
      setText('[data-referral-status]','DIRECT');
    }
    if(status&&!status.textContent.includes('Telegram'))status.textContent='Secure account state loaded from Firebase.';
    showDashboard();
    window.gtag?.('event','account_dashboard_view',{email_verified:active.emailVerified===true,telegram_linked:Boolean(profile.telegram?.linked)});
  }catch(error){
    console.error('[NexusNova Dashboard]',error?.code||'load-failed');
    if(status)status.textContent='Account is signed in, but some profile details could not be loaded.';
    showDashboard();
  }
}

async function resolveSignedOutWithTelegram(){
  if(resolvingSignedOut)return;
  resolvingSignedOut=true;
  try{
    let skip=false;try{skip=sessionStorage.getItem(TELEGRAM_SKIP_KEY)==='1';}catch(_){}
    if(skip){location.replace('register.html');return;}
    const result=await getTelegramSession();
    const session=result.data;
    if(session?.linked&&session.customToken){await signInWithCustomToken(auth,session.customToken);window.gtag?.('event','login',{method:'telegram_mini_app'});return;}
    location.replace(window.NexusNovaTelegram?.isAvailable?'register.html?telegram=1':'register.html');
  }catch(error){console.warn('[NexusNova Telegram]',error?.code||'sign-in-failed');location.replace('register.html');}
  finally{resolvingSignedOut=false;}
}

onAuthStateChanged(auth,user=>{if(!user){resolveSignedOutWithTelegram();return;}try{sessionStorage.removeItem(TELEGRAM_SKIP_KEY);}catch(_){}loadAccount(user);});

telegramLinkButton?.addEventListener('click',async()=>{
  const user=auth.currentUser;const bridge=window.NexusNovaTelegram;if(!user||!bridge?.isAvailable)return;
  const result=await getTelegramSession();
  if(result.data?.user?.id){await linkTelegramForSignedInUser(user,result.data.user);return;}
  const local=bridge.getUser?.()||null;const info=telegramErrorText(result.error||{code:'verification-failed'});paintTelegram(local,{state:info.state,copy:info.copy});
});

document.querySelector('[data-signout]')?.addEventListener('click',async()=>{const button=document.querySelector('[data-signout]');button.disabled=true;try{try{sessionStorage.setItem(TELEGRAM_SKIP_KEY,'1');}catch(_){}await signOut(auth);location.replace('register.html');}catch(error){console.error('[NexusNova Dashboard]',error?.code||'signout-failed');button.disabled=false;}});
