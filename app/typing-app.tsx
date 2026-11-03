"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { FeedbackForm } from "./feedback-form";
import { metrics } from "../shared/metrics";
import { rows, points, graphemes, visibleStartFor, physicalKey, compareTyping, type KeyDef, type Level } from "./typing-core";
import { limitInput, usesNativeTextInput } from "./unicode";
import { Download, RotateCcw, Shuffle, MessageSquare, ChartNoAxesColumn, Volume2, VolumeX } from "lucide-react";

import { useTypingProgress } from "./use-typing-progress";
import { usePwaInstall } from "./use-pwa-install";
import { useTextMode } from "./use-text-mode";
import { content, practice, selectPassage, type TextMode } from "./typing-content";
import { useTheme, type Theme } from "./use-theme";
import { useFont, type DzongkhaFont } from "./use-font";
import { TEST_DURATION_SECONDS } from "../shared/typing-config";
import { makeSession, newId } from "./progress-storage";
import { ProgressDashboard } from "./progress-dashboard";
import { fingers, fingerName, HOME_KEYS, type Finger, type PressResult } from "./finger-map";
import { useSound } from "./use-sound";
import { KeyboardHands } from "./keyboard-hands";

const HANDS_KEY="dzongkha_typing_hands";
function readHands(){try{return localStorage.getItem(HANDS_KEY)!=="off";}catch{return true;}}

// Green only confirms the right key; a wrong key is red, other keys stay neutral.
const pressStyle = (result: PressResult) => result === "correct"
  ? "border-[var(--pressed)] bg-[var(--pressed)] text-[var(--pressed-foreground)]"
  : result === "wrong"
    ? "border-[var(--destructive)] bg-[var(--destructive)] text-[var(--background)]"
    : "border-[var(--border)] bg-[var(--muted)] text-[var(--foreground)]";
export default function TypingApp(){
  const {progress,storageWarning,saveSession,saveLevel,resetProgress}=useTypingProgress();
  const {theme,setTheme,themeWarning}=useTheme();
  const {font,setFont,fontWarning}=useFont();
  const {soundOn,toggleSound,play,soundWarning}=useSound();
  const [handsOn,setHandsOn]=useState(readHands);
  function toggleHands(){const next=!handsOn;setHandsOn(next);try{localStorage.setItem(HANDS_KEY,next?"on":"off");}catch{/* preference only */}}
  const {mode,changeMode,modeWarning}=useTextMode();
  const pwa=usePwaInstall();
  const attempt=useRef(newId());
  const statsDialog=useRef<HTMLDialogElement>(null);
  const saved=useRef(false);
  const feedbackTimer=useRef<ReturnType<typeof setTimeout> | null>(null);
  const [level,setLevel]=useState<Level>(progress.currentLevel);
  const [passage,setPassage]=useState(()=>selectPassage(practice[progress.currentLevel].length,-1,mode));
  const tailPassage=useRef(passage);
  const nextTestPassage=useRef<number|null>(null);
  const [stream,setStream]=useState(()=>practice[progress.currentLevel][passage]);
  const [typed,setTyped]=useState("");
  const composing=useRef(false);
  const [compositionText,setCompositionText]=useState<string|null>(null);
  const [started,setStarted]=useState<number|null>(null);
  const [seconds,setSeconds]=useState(0);
  const [finished,setFinished]=useState(false);
  const personalBest=progress.bestWpm;
  const [panel,setPanel]=useState<"progress"|"feedback"|null>(null);
  const [keystrokes,setKeystrokes]=useState(0);
  const [activeKey,setActiveKey]=useState("");
  const [pressResult,setPressResult]=useState<PressResult>("neutral");
  const [shiftDown,setShiftDown]=useState(false);
  const [clickShift,setClickShift]=useState(false);
  const input=useRef<HTMLTextAreaElement>(null);
  const textViewport=useRef<HTMLDivElement>(null);
  const caret=useRef<HTMLSpanElement>(null);
  const lastScrolledLine=useRef(-1);
  const focusAfterReset=useRef(false);
  const targetText=stream;
  const passages=practice[level];
  const target=points(targetText);
  const comparison=useMemo(()=>compareTyping(targetText,typed),[targetText,typed]);
  const {expected,correct,incorrect}=comparison;
  const visibleStart=visibleStartFor(target,comparison.position);
  const visibleUnits=comparison.units.filter(unit=>unit.end>visibleStart);
  const expectedKey=useMemo(()=>rows.flat().find(key=>key.normal===expected||key.shift===expected),[expected]);
  const needsShift=expectedKey?.shift===expected;
  const expectsSpace=expected==="་"||expected===" ";
  const targetFinger:Finger|null=expectsSpace?"thumb":expectedKey?fingers[expectedKey.latin]:null;
  const pressedFinger:Finger|null=activeKey?fingers[activeKey]??null:null;
  // Every key the next finger is responsible for, in keyboard order.
  const fingerKeys=targetFinger&&targetFinger!=="thumb"?rows.flat().filter(key=>fingers[key.latin]===targetFinger).map(key=>key.latin):[];
  const shiftResult:PressResult=needsShift?"correct":"wrong";
  const typedG=graphemes(typed);
  const {accuracy,wpm}=metrics(correct,incorrect,seconds);
  const timeDisplay=Math.max(0,TEST_DURATION_SECONDS-seconds);

  useEffect(()=>{if(started===null||finished)return;const id=setInterval(()=>setSeconds(Math.min(TEST_DURATION_SECONDS,Math.floor((Date.now()-started)/1000))),250);return()=>clearInterval(id);},[started,finished]);
  function saveAttempt(){
    if(started===null||saved.current||correct+incorrect===0)return;
    const elapsed=Math.min(TEST_DURATION_SECONDS,Math.max(1,Math.floor((Date.now()-started)/1000)));
    saveSession(makeSession({id:attempt.current,date:new Date(started).toISOString(),level,
      correctCharacters:correct,incorrectCharacters:incorrect,durationSeconds:elapsed,
      completed:elapsed>=TEST_DURATION_SECONDS,wordsTyped:typed.split(/[\s\u0f0b-\u0f0e]+/u).filter(Boolean).length}));
  }
  const latestSave=useRef(saveAttempt);
  latestSave.current=saveAttempt;
  useEffect(()=>{
    const save=()=>latestSave.current();
    const hidden=()=>{if(document.visibilityState==="hidden")save();};
    window.addEventListener("pagehide",save);
    window.addEventListener("beforeunload",save);
    document.addEventListener("visibilitychange",hidden);
    return()=>{window.removeEventListener("pagehide",save);window.removeEventListener("beforeunload",save);document.removeEventListener("visibilitychange",hidden);};
  },[]);
  useEffect(()=>{
    if(seconds>=TEST_DURATION_SECONDS&&!finished){saveAttempt();saved.current=true;nextTestPassage.current=selectPassage(passages.length,passage,mode);setFinished(true);input.current?.blur();}
  },[seconds,finished]);
  useEffect(()=>{if(panel)statsDialog.current?.showModal();else statsDialog.current?.close();},[panel]);
  useEffect(()=>{
    if(target.length-comparison.position<45){
      const nextIndex=selectPassage(passages.length,tailPassage.current,mode);
      setStream(current=>current+passages[nextIndex]);
      tailPassage.current=nextIndex;
    }
  },[comparison.position,target.length,level,mode]);
  useLayoutEffect(()=>{
    lastScrolledLine.current=-1;
    textViewport.current?.scrollTo({top:0,behavior:"instant"});
  },[visibleStart,level,passage,started===null]);
  useLayoutEffect(()=>{
    if(focusAfterReset.current){focusAfterReset.current=false;input.current?.focus({preventScroll:true});}
  });
  useLayoutEffect(()=>{
    // A reset positions the new passage before paint. Never start a smooth
    // scroll against the replacement content until typing has resumed.
    if(started!==null&&textViewport.current&&caret.current){
      const viewport=textViewport.current;
      const active=caret.current;
      const frame=requestAnimationFrame(()=>{
        const activeTop=active.offsetTop;
        const activeBottom=activeTop+active.offsetHeight;
        const scrollBoundary=viewport.scrollTop+viewport.clientHeight*.72;

        if(activeBottom>scrollBoundary&&activeTop>lastScrolledLine.current+2){
          lastScrolledLine.current=activeTop;
          viewport.scrollTo({top:Math.max(0,activeTop-viewport.clientHeight*.4),behavior:"smooth"});
        }
      });
      return()=>cancelAnimationFrame(frame);
    }
  },[keystrokes,target.length,level,passage,font,visibleStart,started]);
  useEffect(()=>{const up=(e:KeyboardEvent)=>{setActiveKey("");setShiftDown(e.shiftKey);};const blur=()=>{setActiveKey("");setShiftDown(false);};window.addEventListener("keyup",up);window.addEventListener("blur",blur);return()=>{window.removeEventListener("keyup",up);window.removeEventListener("blur",blur);if(feedbackTimer.current)clearTimeout(feedbackTimer.current);};},[]);
  function judge(result:PressResult){setPressResult(result);if(result!=="neutral"&&!finished)play(result);}
  function feedback(key:string,result:PressResult){setActiveKey(key);judge(result);if(feedbackTimer.current)clearTimeout(feedbackTimer.current);feedbackTimer.current=setTimeout(()=>setActiveKey(""),160);}
  function handleKey(e:React.KeyboardEvent<HTMLTextAreaElement>){
    if(composing.current||e.nativeEvent.isComposing||e.nativeEvent.keyCode===229||e.ctrlKey||e.metaKey||e.altKey)return;
    const key=physicalKey(e.code);setActiveKey(key);setShiftDown(e.shiftKey);setPressResult("neutral");
    if(usesNativeTextInput(e.key)){if(points(e.key).length===1)judge(e.key.normalize("NFC")===expected?"correct":"wrong");return;}
    if(e.key==="Tab"){e.preventDefault();restart();return;}
    if(e.key==="Backspace"){e.preventDefault();update(points(typed).slice(0,-1).join(""));return;}
    if(e.code==="Space"){e.preventDefault();judge(expectsSpace?"correct":"wrong");update(typed+(expected===" "?" ":"་"));return;}
    const item=rows.flat().find(item=>item.latin===key);
    if(item){e.preventDefault();judge((e.shiftKey?item.shift:item.normal)===expected?"correct":"wrong");update(typed+(e.shiftKey?item.shift:item.normal));}
  }

  function update(value:string){if(finished||(started!==null&&Date.now()-started>=TEST_DURATION_SECONDS*1000))return;const next=limitInput(value,targetText);if(next===typed)return;if(started===null)setStarted(Date.now());setKeystrokes(count=>count+1);setTyped(next);}
  function resetViewport(){attempt.current=newId();saved.current=false;setActiveKey("");setPressResult("neutral");setShiftDown(false);setClickShift(false);setKeystrokes(0);lastScrolledLine.current=-1;textViewport.current?.scrollTo({top:0,behavior:"instant"});}
  function begin(nextLevel:Level,index:number){
    setLevel(nextLevel);setPassage(index);tailPassage.current=index;nextTestPassage.current=null;
    setStream(practice[nextLevel][index]);setTyped("");setStarted(null);setSeconds(0);setFinished(false);
    composing.current=false;setCompositionText(null);
    resetViewport();focusAfterReset.current=true;
  }
  function restart(){saveAttempt();begin(level,nextTestPassage.current??passage);}
  function next(){saveAttempt();begin(level,nextTestPassage.current??selectPassage(passages.length,passage,mode));}
  function chooseLevel(nextLevel:Level){if(nextLevel===level)return;saveAttempt();saveLevel(nextLevel);begin(nextLevel,selectPassage(practice[nextLevel].length,-1,mode));}
  function chooseMode(nextMode:TextMode){saveAttempt();changeMode(nextMode);begin(level,nextMode==="sequential"?0:selectPassage(passages.length,passage,nextMode));}
  function press(key:KeyDef){feedback(key.latin,(clickShift?key.shift:key.normal)===expected?"correct":"wrong");update(typed+(clickShift?key.shift:key.normal));setClickShift(false);input.current?.focus();}

  return <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] lg:h-screen lg:overflow-hidden" >
    <header className="mx-auto flex flex-wrap gap-2 max-w-6xl items-center justify-between px-5 py-4">
      <button onClick={e=>{e.stopPropagation();restart();}} className="flex items-center gap-3"><span className="font-dzongkha text-4xl font-black text-[var(--primary)]">ཀ</span><span className="text-left"><b className="block text-xl">dzongtype</b><small className="text-[var(--muted-foreground)]">Dzongkha typing practice</small></span></button>
      <div className="flex flex-wrap items-center gap-1" onClick={e=>e.stopPropagation()}>
        <button onClick={()=>setPanel("progress")} className="tool"><ChartNoAxesColumn/>Progress</button>
        <button onClick={()=>setPanel("feedback")} className="tool"><MessageSquare/>Feedback</button>
        <button onMouseDown={e=>e.preventDefault()} onClick={()=>{toggleSound();input.current?.focus({preventScroll:true});}} aria-pressed={soundOn} className="tool" title={soundOn?"Turn key sounds off":"Turn key sounds on"}>{soundOn?<Volume2/>:<VolumeX/>}Sound {soundOn?"on":"off"}</button>
        <label className="tool">Theme<select aria-label="Theme" value={theme} onChange={e=>setTheme(e.target.value as Theme)} className="rounded bg-[var(--secondary)] p-1 text-[var(--foreground)]"><option value="light">Light</option><option value="dark">Dark</option><option value="bhutan">Bhutan</option></select></label>
        {(pwa.canInstall||pwa.busy)&&<button onClick={pwa.install} disabled={pwa.busy} className="tool" title="Install Dzongkha Typing"><Download/>{pwa.busy?"Installing...":"Install"}</button>}
      </div>
    </header>

    <section className="mx-auto flex max-w-6xl flex-col px-5 pb-5 lg:h-[calc(100vh-78px)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex h-12 items-end gap-6"><Metric value={wpm} label="wpm"/><Metric value={accuracy} label="accuracy"/><Metric value={timeDisplay} label="left"/>{personalBest>0&&<Metric value={personalBest} label="best"/>}</div>
        <div className="flex flex-wrap items-center justify-center gap-2" onClick={e=>e.stopPropagation()}>
          <label className="tool">Text:<select aria-label="Text selection" value={mode} onChange={e=>chooseMode(e.target.value as TextMode)} className="rounded bg-[var(--secondary)] p-1 text-[var(--foreground)]"><option value="sequential">Sequential</option><option value="random">Random</option></select></label>
          <label className="tool">Font:<select aria-label="Font" value={font} onChange={e=>setFont(e.target.value as DzongkhaFont)} className="rounded bg-[var(--secondary)] p-1 text-[var(--foreground)]"><option value="joyig">Joyig</option><option value="tsuyig">Tsuyig</option></select></label>
          <div className="flex rounded-lg bg-[var(--secondary)] p-0.5">{(["beginner","intermediate","expert"] as Level[]).map(item=><button key={item} onClick={()=>chooseLevel(item)} className={`rounded-md px-2.5 py-1 text-xs font-bold capitalize transition ${level===item?"bg-[var(--primary)] text-[var(--primary-foreground)]":"text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}>{item}</button>)}</div>
        </div>
        <div className="flex gap-2"><button onClick={e=>{e.stopPropagation();restart();}} className="tool"><RotateCcw/>restart</button><button onClick={e=>{e.stopPropagation();next();}} className="tool"><Shuffle/>new text</button></div>
      </div>

      <div onClick={()=>input.current?.focus()} ref={textViewport} data-passage-id={content[level][passage].id} className="relative h-[clamp(8rem,22vh,11rem)] cursor-text overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-3 shadow-[0_14px_45px_rgba(0,0,0,.18)]">
        <textarea ref={input} value={compositionText??typed} onKeyDown={handleKey} onPaste={e=>e.preventDefault()} onDrop={e=>e.preventDefault()}
          onCompositionStart={e=>{composing.current=true;setCompositionText(e.currentTarget.value);}}
          onCompositionEnd={e=>{composing.current=false;setCompositionText(null);update(e.currentTarget.value);}}
          onChange={e=>{if(composing.current)setCompositionText(e.target.value);else update(e.target.value);}}
          disabled={finished} className="pointer-events-none absolute h-px w-px opacity-0" autoFocus spellCheck={false} lang="dz" aria-label="Dzongkha typing input"/>
        <p className={`text-xs text-[var(--muted-foreground)] ${started!==null?"invisible":""}`}>Click the text and type using the guided keyboard.</p>
        {finished?<div className="flex h-full flex-wrap items-center justify-center gap-4 text-center"><Result value={wpm} label="wpm"/><Result value={`${accuracy}%`} label="accuracy"/><Result value={typedG.length} label="characters"/><button onClick={e=>{e.stopPropagation();restart();}} className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-bold text-[var(--primary-foreground)]">restart</button></div>:<div className="select-none font-dzongkha text-[2rem] leading-[1.72] sm:text-[2.45rem]" lang="dz">
          {visibleUnits.map(unit=>{const color=unit.status==="correct"?"text-[var(--correct)]":unit.status==="partial"?"text-[var(--primary)]":unit.status==="incorrect"?"text-[var(--destructive)] underline decoration-2":"text-[var(--muted-foreground)]";return <span key={unit.start} ref={unit.cursor?caret:undefined} className={`relative ${color}`}>{unit.cursor&&<i className="absolute -left-[2px] top-[8%] h-[84%] w-[2px] animate-pulse bg-[var(--primary)]"/>}{unit.text}</span>;})}
        </div>}
      </div>
      <p className="mt-2 text-center text-xs text-[var(--muted-foreground)]">{TEST_DURATION_SECONDS}-second {level} test · Tab restarts · Progress saves on this device</p>

      <div onClick={e=>e.stopPropagation()} className="mx-auto mt-3 w-full max-w-5xl rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2.5 shadow-[0_14px_45px_rgba(0,0,0,.14)]">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-[var(--muted-foreground)]">Next: <span className="font-bold text-[var(--primary)]">{needsShift?"Shift + ":""}{expectedKey?.latin??(expectsSpace?"Space":"—")}</span>{targetFinger&&<span className="ml-2 text-xs">· <span aria-hidden className="mr-1 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{background:`var(--f-${targetFinger})`}}/>{fingerName(targetFinger)}{handsOn&&fingerKeys.length>0&&<span className="opacity-75"> · keys {fingerKeys.join(" ")}</span>}</span>}</p><div className="flex items-center gap-2"><p className="hidden text-xs text-[var(--muted-foreground)] sm:block">normal character · Shift character at top right</p><button onMouseDown={e=>e.preventDefault()} onClick={()=>{toggleHands();input.current?.focus({preventScroll:true});}} aria-pressed={handsOn} className="tool !py-1 text-xs">{handsOn?"Hide hands":"Show hands"}</button></div></div>
        <div className="relative space-y-1">
          {handsOn&&<KeyboardHands targetKey={expectsSpace?"Space":expectedKey?.latin??null} targetFinger={targetFinger} pressedFinger={pressedFinger} pressResult={pressResult}/>}
          {rows.map((row,rowIndex)=><div key={rowIndex} className="flex justify-center gap-1">{row.map(key=><Key key={key.latin} item={key} expected={expected} pressed={activeKey===key.latin?pressResult:undefined} zone={handsOn&&fingerKeys.includes(key.latin)} clickShift={clickShift} press={()=>press(key)}/>)}</div>)}
          <div className="flex justify-center gap-1">
            <button onClick={()=>setClickShift(x=>!x)} className={`h-9 w-24 relative rounded border-b-2 text-xs font-bold ${shiftDown?pressStyle(shiftResult):needsShift||clickShift?"border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]":"border-[var(--border)] bg-[var(--secondary)] text-[var(--muted-foreground)]"}`}>Shift</button>
            <button data-key="Space" onClick={()=>{feedback("Space",expectsSpace?"correct":"wrong");update(typed+(expected===" "?" ":"་"));input.current?.focus();}} style={activeKey!=="Space"&&!expectsSpace?{background:"color-mix(in srgb,var(--f-thumb) var(--finger-mix),var(--card))"}:undefined} className={`relative h-9 w-1/2 max-w-md rounded border-b-2 text-xs ${activeKey==="Space"?pressStyle(pressResult):expectsSpace?"border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]":"border-[var(--border)] bg-[var(--secondary)] text-[var(--muted-foreground)]"}`}>Space · ་</button>
            <button onClick={()=>setClickShift(x=>!x)} className={`h-9 w-24 relative rounded border-b-2 text-xs font-bold ${shiftDown?pressStyle(shiftResult):needsShift||clickShift?"border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]":"border-[var(--border)] bg-[var(--secondary)] text-[var(--muted-foreground)]"}`}>Shift</button>
          </div>
        </div>
      </div>
    </section>
    {(storageWarning||themeWarning||modeWarning||fontWarning||soundWarning)&&<p role="status" className="fixed bottom-2 left-2 z-[60] max-w-sm rounded bg-[var(--card)] p-3 text-sm">{storageWarning||themeWarning||modeWarning||fontWarning||soundWarning}</p>}
    {pwa.message&&<div role="status" className="fixed bottom-2 right-2 z-[60] max-w-sm rounded border border-[var(--border)] bg-[var(--card)] p-3 text-sm">{pwa.message}<button onClick={pwa.dismissMessage} className="tool">close</button></div>}
    <dialog ref={statsDialog} onCancel={()=>setPanel(null)} onClick={e=>{if(e.target===e.currentTarget)setPanel(null);}} className="stats-dialog" aria-labelledby="stats-title">
      <div className="mb-4 flex items-center justify-between"><h2 id="stats-title" className="text-xl font-bold">{panel==="progress"?"Progress":"Feedback"}</h2><button className="tool" onClick={()=>setPanel(null)}>close</button></div>
      {panel==="progress"?<ProgressDashboard progress={progress} reset={()=>{saved.current=true;restart();resetProgress();}}/> :panel==="feedback"?<FeedbackForm/>:null}
    </dialog>
  </main>;
}

function Key({item,expected,pressed,zone,clickShift,press}:{item:KeyDef;expected:string;pressed?:PressResult;zone:boolean;clickShift:boolean;press:()=>void}){
  const next=item.normal===expected||item.shift===expected;
  // Each key is tinted with the colour of the finger that types it; home keys strongest.
  const finger=fingers[item.latin];
  const tint=finger&&!pressed&&!next?{background:`color-mix(in srgb,var(--f-${finger}) var(${HOME_KEYS.has(item.latin)?"--finger-home-mix":"--finger-mix"}),var(--card))`}:undefined;
  return <button data-key={item.latin} data-finger={finger} style={tint} onClick={press} aria-label={`${item.latin}: ${item.normal}, Shift ${item.shift}`} className={`relative h-9 min-w-0 flex-1 max-w-16 rounded-md border-b-2 transition ${zone&&!next&&!pressed?"finger-zone ":""}${pressed?pressStyle(pressed):next?"border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[0_0_18px_color-mix(in_srgb,var(--primary)_18%,transparent)]":clickShift?"border-[var(--border)] bg-[var(--secondary)] text-[var(--foreground)]":"border-[var(--border)] bg-[var(--secondary)] text-[var(--foreground)] hover:bg-[var(--muted)]"}`}>
    <span className="absolute left-1 top-0.5 font-sans text-[8px] font-bold opacity-55">{item.latin}</span><span className="absolute right-1 top-0 font-dzongkha text-base opacity-65">{item.shift}</span><span className="font-dzongkha text-2xl">{item.normal}</span>
  </button>;
}
function Metric({value,label}:{value:number;label:string}){return <div><b className="text-3xl font-light text-[var(--primary)]">{value}</b><span className="ml-1 text-xs text-[var(--muted-foreground)]">{label}</span></div>;}
function Result({value,label}:{value:number|string;label:string}){return <div><b className="block text-4xl font-light text-[var(--primary)]">{value}</b><span className="text-xs text-[var(--muted-foreground)]">{label}</span></div>;}
