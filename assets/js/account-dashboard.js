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

function showDashboard(){loading.hidden=true;dashboard.hidden=false;}
function setVerified(verified){const pill=document.querySelector('[data-verified]');if(pill){pill.textContent=verified?'EMAIL VERIFIED':'EMAIL NOT VERIFIED';pill.classList.toggle('unverified',!verified);}setText('[data-email-state]',verified?'VERIFIED':'PENDING');}

function paintTelegram(user,{linked=false,copy=''}={}){
  const fullName=user?[user.firstName,user.lastName].filter(Boolean).join(' '):'No Telegram account linked';
  setText('[data-telegram-name]',fullName||'Telegram user');
  setText('[data-telegram-username]',user?(user.username?`@${user.username} • ID ${user.id}`:`Telegram ID ${user.id}`):'Open this page from @NexusNovaToolsBot to connect.');
  setText('[data-telegram-copy]',copy||(linked?'Telegram and NexusNova use the same secure identity.':'Telegram is not linked to this NexusNova account.'));
  setText('[data-telegram-state]',linked?'LINKED':(user?'READY TO LINK':'NOT CONNECTED'));
  if(telegramPhoto){
    telegramPhoto.hidden=!user?.photoUrl;
    if(user?.photoUrl){telegramPhoto.src=user.photoUrl;telegramPhoto.alt=`${fullName} Telegram profile`;}
    else telegramPhoto.removeAttribute('src');
  }
  if(telegramLinkButton)telegramLinkButton.hidden=linked||!user||!window.NexusNovaTelegram?.isAvailable;
}

async function getTelegramSession(){
  const bridge=window.NexusNovaTelegram;
  if(!bridge?.isAvailable)return null;
  if(!telegramSessionPromise){
    telegramSessionPromise=telegramSessionCall({initData:bridge.getInitData()})
      .then(response=>response?.data||null)
      .catch(error=>{console.warn('[NexusNova Telegram]',error?.code||'session-failed');return null;});
  }
  return telegramSessionPromise;
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
    let detectedTelegram=null;
    if(!linkedTelegram){
      const session=await getTelegramSession();
      detectedTelegram=session?.user||null;
    }
    paintTelegram(linkedTelegram||detectedTelegram,{
      linked:Boolean(linkedTelegram),
      copy:linkedTelegram
        ?'Server-verified Telegram identity is synced with this Firebase profile.'
        :(detectedTelegram?'Telegram identity verified. Tap Link Telegram to connect it to this account.':'Open this account from @NexusNovaToolsBot to link Telegram.')
    });

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
    if(status)status.textContent='Secure account state loaded from Firebase.';
    showDashboard();
    window.gtag?.('event','account_dashboard_view',{email_verified:active.emailVerified===true,telegram_linked:Boolean(linkedTelegram)});
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
    let skip=false;
    try{skip=sessionStorage.getItem(TELEGRAM_SKIP_KEY)==='1';}catch(_){}
    if(skip){location.replace('register.html');return;}
    const session=await getTelegramSession();
    if(session?.linked&&session.customToken){
      await signInWithCustomToken(auth,session.customToken);
      window.gtag?.('event','login',{method:'telegram_mini_app'});
      return;
    }
    location.replace(window.NexusNovaTelegram?.isAvailable?'register.html?telegram=1':'register.html');
  }catch(error){
    console.warn('[NexusNova Telegram]',error?.code||'sign-in-failed');
    location.replace('register.html');
  }finally{
    resolvingSignedOut=false;
  }
}

onAuthStateChanged(auth,user=>{
  if(!user){resolveSignedOutWithTelegram();return;}
  try{sessionStorage.removeItem(TELEGRAM_SKIP_KEY);}catch(_){}
  loadAccount(user);
});

telegramLinkButton?.addEventListener('click',async()=>{
  const user=auth.currentUser;
  const bridge=window.NexusNovaTelegram;
  if(!user||!bridge?.isAvailable)return;
  telegramLinkButton.disabled=true;
  setText('[data-telegram-state]','LINKING');
  setText('[data-telegram-copy]','Verifying the Telegram launch and linking this NexusNova account…');
  try{
    const idToken=await user.getIdToken(true);
    const response=await linkTelegramAccountCall({initData:bridge.getInitData(),idToken});
    paintTelegram(response?.data?.user||window.NexusNovaTelegram.getUser(),{linked:true,copy:'Telegram and NexusNova now use the same secure account.'});
    if(status)status.textContent='Telegram account linked securely.';
    window.gtag?.('event','telegram_account_linked',{source:'account_dashboard'});
  }catch(error){
    console.warn('[NexusNova Telegram]',error?.code||'link-failed');
    const conflict=String(error?.code||'').includes('already-exists');
    setText('[data-telegram-state]','LINK NOT COMPLETED');
    setText('[data-telegram-copy]',conflict?'This Telegram identity is already linked to another NexusNova account.':'Telegram linking failed. Sign in again and reopen the Mini App.');
  }finally{
    telegramLinkButton.disabled=false;
  }
});

document.querySelector('[data-signout]')?.addEventListener('click',async()=>{
  const button=document.querySelector('[data-signout]');button.disabled=true;
  try{
    try{sessionStorage.setItem(TELEGRAM_SKIP_KEY,'1');}catch(_){}
    await signOut(auth);
    location.replace('register.html');
  }catch(error){console.error('[NexusNova Dashboard]',error?.code||'signout-failed');button.disabled=false;}
});
