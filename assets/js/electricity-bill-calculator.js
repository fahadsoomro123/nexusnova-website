(()=>{
  const NON_TOU_TARIFFS={
    lifeline:[
      {max:50,rate:3.95,fixedRate:0,label:'Up to 50 units — Lifeline'},
      {max:100,rate:7.74,fixedRate:0,label:'51–100 units — Lifeline'}
    ],
    protected:[
      {max:100,rate:10.54,fixedRate:200,label:'1–100 units — Protected'},
      {max:200,rate:13.01,fixedRate:300,label:'101–200 units — Protected'}
    ],
    unprotected:[
      {max:100,rate:22.44,fixedRate:275,label:'1–100 units — Unprotected'},
      {max:200,rate:28.91,fixedRate:300,label:'101–200 units — Unprotected'},
      {max:300,rate:33.10,fixedRate:350,label:'201–300 units — Unprotected'},
      {max:400,rate:36.46,fixedRate:400,label:'301–400 units — Unprotected'},
      {max:500,rate:38.95,fixedRate:500,label:'401–500 units — Unprotected'},
      {max:600,rate:40.22,fixedRate:675,label:'501–600 units — Unprotected'},
      {max:700,rate:41.85,fixedRate:675,label:'601–700 units — Unprotected'},
      {max:Infinity,rate:47.20,fixedRate:675,label:'Above 700 units — Unprotected'}
    ]
  };
  const TOU={peakRate:46.85,offPeakRate:34.53,fixedRate:675};

  const parseNonNegative=value=>{
    const text=String(value??'').replace(/,/g,'').trim();
    if(text==='') return 0;
    const number=Number(text);
    return Number.isFinite(number)&&number>=0?number:null;
  };
  const parseSigned=value=>{
    const text=String(value??'').replace(/,/g,'').trim();
    if(text==='') return 0;
    const number=Number(text);
    return Number.isFinite(number)?number:null;
  };
  const round2=value=>Math.round((value+Number.EPSILON)*100)/100;

  const calculateNonTou=({category,units,sanctionedLoadKw,fcaRate=0,qtaRate=0,otherCharges=0,arrearsOrCredits=0})=>{
    const cleanUnits=parseNonNegative(units);
    const load=parseNonNegative(sanctionedLoadKw);
    const fca=parseSigned(fcaRate);
    const qta=parseSigned(qtaRate);
    const other=parseSigned(otherCharges);
    const arrears=parseSigned(arrearsOrCredits);
    if(cleanUnits===null||load===null||fca===null||qta===null||other===null||arrears===null) throw new Error('Invalid numeric input');
    if(!NON_TOU_TARIFFS[category]) throw new Error('Unknown residential category');
    if(load>=5) throw new Error('Residential sanctioned load of 5 kW or above should use Time-of-Use mode');
    if(category==='lifeline'&&cleanUnits>100) throw new Error('Lifeline mode supports up to 100 units');
    if(category==='protected'&&cleanUnits>200) throw new Error('Protected mode supports up to 200 units');

    const slab=NON_TOU_TARIFFS[category].find(item=>cleanUnits<=item.max);
    let energyCharge=0;
    if(category==='protected'&&cleanUnits>100){
      energyCharge=(100*NON_TOU_TARIFFS.protected[0].rate)+((cleanUnits-100)*NON_TOU_TARIFFS.protected[1].rate);
    }else{
      energyCharge=cleanUnits*slab.rate;
    }
    const fixedCharge=slab.fixedRate*load;
    const fcaCharge=fca*cleanUnits;
    const qtaCharge=qta*cleanUnits;
    const total=energyCharge+fixedCharge+fcaCharge+qtaCharge+other+arrears;
    return {
      mode:'non-tou',category,units:cleanUnits,slabLabel:slab.label,energyRate:slab.rate,
      energyCharge:round2(energyCharge),fixedRate:slab.fixedRate,fixedCharge:round2(fixedCharge),
      fcaRate:fca,fcaCharge:round2(fcaCharge),qtaRate:qta,qtaCharge:round2(qtaCharge),
      otherCharges:other,arrearsOrCredits:arrears,total:round2(total)
    };
  };

  const calculateTou=({peakUnits,offPeakUnits,sanctionedLoadKw,mdiKw=0,fcaRate=0,qtaRate=0,otherCharges=0,arrearsOrCredits=0})=>{
    const peak=parseNonNegative(peakUnits);
    const offPeak=parseNonNegative(offPeakUnits);
    const load=parseNonNegative(sanctionedLoadKw);
    const mdi=parseNonNegative(mdiKw);
    const fca=parseSigned(fcaRate);
    const qta=parseSigned(qtaRate);
    const other=parseSigned(otherCharges);
    const arrears=parseSigned(arrearsOrCredits);
    if([peak,offPeak,load,mdi].some(value=>value===null)||[fca,qta,other,arrears].some(value=>value===null)) throw new Error('Invalid numeric input');
    if(load<5) throw new Error('Time-of-Use residential mode is for sanctioned load of 5 kW or above');
    const units=peak+offPeak;
    const applicableLoad=Math.max(load*0.5,mdi);
    const energyCharge=(peak*TOU.peakRate)+(offPeak*TOU.offPeakRate);
    const fixedCharge=applicableLoad*TOU.fixedRate;
    const fcaCharge=fca*units;
    const qtaCharge=qta*units;
    const total=energyCharge+fixedCharge+fcaCharge+qtaCharge+other+arrears;
    return {
      mode:'tou',units,peakUnits:peak,offPeakUnits:offPeak,peakRate:TOU.peakRate,offPeakRate:TOU.offPeakRate,
      energyCharge:round2(energyCharge),applicableLoadKw:round2(applicableLoad),fixedRate:TOU.fixedRate,fixedCharge:round2(fixedCharge),
      fcaRate:fca,fcaCharge:round2(fcaCharge),qtaRate:qta,qtaCharge:round2(qtaCharge),
      otherCharges:other,arrearsOrCredits:arrears,total:round2(total)
    };
  };

  if(typeof module!=='undefined'&&module.exports){module.exports={NON_TOU_TARIFFS,TOU,parseNonNegative,parseSigned,calculateNonTou,calculateTou};return;}

  const form=document.querySelector('[data-electricity-form]');
  if(!form)return;
  const mode=form.querySelector('[data-bill-mode]');
  const nonTou=form.querySelector('[data-non-tou-fields]');
  const tou=form.querySelector('[data-tou-fields]');
  const result=form.querySelector('[data-electricity-result]');
  const money=value=>new Intl.NumberFormat('en-PK',{style:'currency',currency:'PKR',maximumFractionDigits:2}).format(value);
  const number=value=>new Intl.NumberFormat('en-PK',{maximumFractionDigits:2}).format(value);
  const get=name=>form.elements[name]?.value??0;

  const syncMode=()=>{
    const isTou=mode.value==='tou';
    nonTou.hidden=isTou;
    tou.hidden=!isTou;
  };

  const line=(label,value)=>`<div><span>${label}</span><strong>${value}</strong></div>`;
  const render=()=>{
    try{
      const common={fcaRate:get('fcaRate'),qtaRate:get('qtaRate'),otherCharges:get('otherCharges'),arrearsOrCredits:get('arrearsOrCredits')};
      const out=mode.value==='tou'
        ?calculateTou({...common,peakUnits:get('peakUnits'),offPeakUnits:get('offPeakUnits'),sanctionedLoadKw:get('touLoad'),mdiKw:get('mdiKw')})
        :calculateNonTou({...common,category:get('category'),units:get('units'),sanctionedLoadKw:get('sanctionedLoadKw')});
      result.classList.remove('is-error');
      if(out.mode==='tou'){
        result.innerHTML=`${line('Peak energy',`${number(out.peakUnits)} × Rs ${out.peakRate.toFixed(2)}/kWh`)}${line('Off-peak energy',`${number(out.offPeakUnits)} × Rs ${out.offPeakRate.toFixed(2)}/kWh`)}${line('Energy charges',money(out.energyCharge))}${line(`Fixed charges (${number(out.applicableLoadKw)} kW × Rs ${out.fixedRate})`,money(out.fixedCharge))}${line('FCA adjustment',money(out.fcaCharge))}${line('QTA adjustment',money(out.qtaCharge))}${line('Other taxes / charges entered',money(out.otherCharges))}${line('Arrears / credits entered',money(out.arrearsOrCredits))}<div class="bill-total"><span>Estimated bill total</span><strong>${money(out.total)}</strong></div><p>Estimate only. Compare FCA, QTA, taxes, duty, PTV fee, arrears and credits with the actual bill issued by your utility.</p>`;
      }else{
        result.innerHTML=`${line('Selected billing band',out.slabLabel)}${line('Energy charges',money(out.energyCharge))}${line(`Fixed charges (Rs ${out.fixedRate}/kW × sanctioned load)`,money(out.fixedCharge))}${line('FCA adjustment',money(out.fcaCharge))}${line('QTA adjustment',money(out.qtaCharge))}${line('Other taxes / charges entered',money(out.otherCharges))}${line('Arrears / credits entered',money(out.arrearsOrCredits))}<div class="bill-total"><span>Estimated bill total</span><strong>${money(out.total)}</strong></div><p>${out.category==='protected'&&out.units>100?'Protected calculation applies the one-previous-slab benefit to the first 100 units. ':out.category==='unprotected'?'Unprotected calculation applies the landing slab rate to all units for the month. ':''}Estimate only; your printed utility bill remains the authoritative amount.</p>`;
      }
    }catch(error){
      result.classList.add('is-error');
      result.innerHTML=`<p>${error?.message||'Please enter valid values. No bill amount is guessed from invalid input.'}</p>`;
    }
  };

  mode.addEventListener('change',()=>{syncMode();render()});
  form.addEventListener('input',render);
  form.addEventListener('submit',event=>{event.preventDefault();render()});
  syncMode();
  render();
})();
