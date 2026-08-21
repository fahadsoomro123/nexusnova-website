import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const firebaseConfig={apiKey:'AIzaSyBU75WYp5ioaMD1LrNcDyAvROFW2wrTil0',authDomain:'nexusnova-6ade2.firebaseapp.com',projectId:'nexusnova-6ade2',storageBucket:'nexusnova-6ade2.firebasestorage.app',messagingSenderId:'49791194817',appId:'1:49791194817:web:07f28326e0f15979536640',measurementId:'G-YLPFKWSS12'};
const app=getApps()[0]||initializeApp(firebaseConfig);
const auth=getAuth(app);
const db=getFirestore(app);

const dashboard=document.querySelector('[data-dashboard]');
const loading=document.querySelector('[data-loading]');
const status=document.querySelector('[data-dashboard-status]');
const setText=(selector,value)=>{const el=document.querySelector(selector);if(el)el.textContent=String(value??'');};

function showDashboard(){loading.hidden=true;dashboard.hidden=false;}
function setVerified(verified){const pill=document.querySelector('[data-verified]');if(pill){pill.textContent=verified?'EMAIL VERIFIED':'EMAIL NOT VERIFIED';pill.classList.toggle('unverified',!verified);}setText('[data-email-state]',verified?'VERIFIED':'PENDING');}

async function loadAccount(user){
  try{
    await user.reload();
    const active=auth.currentUser||user;
    const profileSnap=await getDoc(doc(db,'users',active.uid));
    const profile=profileSnap.exists()?profileSnap.data()||{}:{};
    setText('[data-name]',profile.name||active.displayName||active.email?.split('@')[0]||'NexusNova User');
    setText('[data-email]',active.email||profile.email||'');
    setText('[data-profile-state]',profileSnap.exists()?'CONNECTED':'MISSING');
    setVerified(active.emailVerified===true);

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
    window.gtag?.('event','account_dashboard_view',{email_verified:active.emailVerified===true});
  }catch(error){
    console.error('[NexusNova Dashboard]',error?.code||'load-failed');
    if(status)status.textContent='Account is signed in, but some profile details could not be loaded.';
    showDashboard();
  }
}

onAuthStateChanged(auth,user=>{
  if(!user){location.replace('register.html');return;}
  loadAccount(user);
});

document.querySelector('[data-signout]')?.addEventListener('click',async()=>{
  const button=document.querySelector('[data-signout]');button.disabled=true;
  try{await signOut(auth);location.replace('register.html');}
  catch(error){console.error('[NexusNova Dashboard]',error?.code||'signout-failed');button.disabled=false;}
});
