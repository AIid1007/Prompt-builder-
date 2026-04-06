import { useState, useRef, useEffect } from "react";

const QUESTIONS = [
  "What are you trying to accomplish? (your core goal)",
  "What's your relevant background or context for this?",
  "What have you already tried, or what constraints do you have?",
  "What does your ideal output look like — format, tone, length?"
];

const callClaude = async (systemPrompt, userContent) => {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }]
    })
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.content[0].text.trim();
};

const TypingDots = () => (
  <div style={{ display: "flex", gap: 5, padding: "10px 0 4px" }}>
    {[0,1,2].map(i => (
      <div key={i} style={{
        width: 7, height: 7, borderRadius: "50%", background: "#c8a96e",
        animation: "bounce 1.2s infinite", animationDelay: `${i*0.2}s`
      }}/>
    ))}
  </div>
);

export default function PromptBuilder() {
  const [phase, setPhase] = useState("intro"); // intro | chat | generating | done
  const [chatMessages, setChatMessages] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, loading]);

  const pushMsg = (role, content) =>
    setChatMessages(prev => [...prev, { role, content }]);

  // ── Start: show Q1 ──
  const startInterview = () => {
    setPhase("chat");
    setChatMessages([{ role: "assistant", content: QUESTIONS[0] }]);
    setAnswers([]);
    setErrMsg("");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // ── User submits an answer ──
  const submitAnswer = async () => {
    if (!input.trim() || loading) return;
    const answer = input.trim();
    setInput("");
    setErrMsg("");

    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);
    setChatMessages(prev => [...prev, { role: "user", content: answer }]);

    const qIndex = newAnswers.length; // index of NEXT question (0-based)

    if (qIndex < 4) {
      // Show next question
      setChatMessages(prev => [...prev, { role: "assistant", content: QUESTIONS[qIndex] }]);
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      // All 4 answers collected → generate prompt
      setPhase("generating");
      setLoading(true);
      try {
        const system = `You are an elite prompt engineer. Craft a single ready-to-use Claude prompt based on these 4 answers. 

Rules:
- Include the user's context and goal upfront
- Specify an explicit output format (table, bullets, steps, word count, etc.)
- Assign Claude a role or expert lens to reason from
- Mention what has already been tried or constraints
- End with a request to critique or stress-test, not just create

Return ONLY the prompt text itself. No intro, no labels, no markdown wrapper. Just the prompt.`;

        const userContent = `Goal: ${newAnswers[0]}
Background: ${newAnswers[1]}
Constraints/Already tried: ${newAnswers[2]}
Ideal output: ${newAnswers[3]}`;

        const prompt = await callClaude(system, userContent);
        setGeneratedPrompt(prompt);
        setPhase("done");
      } catch (e) {
        setErrMsg(`API error: ${e.message}`);
        setPhase("chat");
      }
      setLoading(false);
    }
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const restart = () => {
    setPhase("intro");
    setChatMessages([]);
    setAnswers([]);
    setInput("");
    setGeneratedPrompt("");
    setErrMsg("");
  };

  const qDone = answers.length;

  return (
    <div style={{
      minHeight: "100vh", background: "#0f0e0c",
      display: "flex", flexDirection: "column", alignItems: "center",
      fontFamily: "Georgia, serif", padding: "0 16px 48px"
    }}>
      <style>{`
        @keyframes bounce {
          0%,80%,100%{transform:translateY(0);opacity:.4}
          40%{transform:translateY(-7px);opacity:1}
        }
        @keyframes fadeUp {
          from{opacity:0;transform:translateY(10px)}
          to{opacity:1;transform:translateY(0)}
        }
        .msg{animation:fadeUp .3s ease forwards}
        textarea{resize:none}
        textarea:focus{outline:none}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:#2a2820;border-radius:4px}
      `}</style>

      {/* Header */}
      <div style={{ width:"100%", maxWidth:660, padding:"36px 0 22px", borderBottom:"1px solid #1e1c18", marginBottom:28 }}>
        <div style={{ fontSize:10, letterSpacing:"0.22em", color:"#c8a96e", fontFamily:"monospace", marginBottom:8 }}>
          PROMPT ENGINEERING STUDIO
        </div>
        <h1 style={{ fontSize:"clamp(20px,4vw,30px)", color:"#f0ead6", margin:0, fontWeight:400, letterSpacing:"-0.02em" }}>
          Top 1% Prompt Builder
        </h1>
        <p style={{ color:"#555", fontSize:13, margin:"6px 0 0", lineHeight:1.6 }}>
          Answer 4 questions. Get a prompt that gets exceptional results.
        </p>
      </div>

      <div style={{ width:"100%", maxWidth:660 }}>

        {/* ── INTRO ── */}
        {phase === "intro" && (
          <div style={{ animation:"fadeUp .4s ease" }}>
            <div style={{ background:"#161512", border:"1px solid #222", borderRadius:14, padding:"26px 24px", marginBottom:20 }}>
              {[
                ["◎","4 targeted questions","No fluff — only what matters to craft your prompt"],
                ["◈","Auto-crafted output","Built on all 5 top 1% principles"],
                ["◉","Copy & paste ready","Use it immediately in any Claude conversation"],
              ].map(([icon,label,desc]) => (
                <div key={label} style={{ display:"flex", gap:14, marginBottom:16, alignItems:"flex-start" }}>
                  <div style={{ color:"#c8a96e", fontSize:17, minWidth:22 }}>{icon}</div>
                  <div>
                    <div style={{ color:"#e0d5bc", fontSize:13.5, fontWeight:600, marginBottom:2 }}>{label}</div>
                    <div style={{ color:"#4a4540", fontSize:12.5 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={startInterview} style={{
              width:"100%", padding:15,
              background:"linear-gradient(135deg,#c8a96e,#a8854e)",
              border:"none", borderRadius:11,
              color:"#0f0e0c", fontSize:14, fontFamily:"Georgia,serif",
              fontWeight:700, letterSpacing:".04em", cursor:"pointer"
            }}>
              Begin the Interview →
            </button>
          </div>
        )}

        {/* ── CHAT / GENERATING / DONE ── */}
        {(phase === "chat" || phase === "generating" || phase === "done") && (
          <div>

            {/* Progress bar */}
            {(phase === "chat" || phase === "generating") && (
              <div style={{ display:"flex", gap:5, marginBottom:22 }}>
                {[1,2,3,4].map(n => (
                  <div key={n} style={{
                    flex:1, height:3, borderRadius:4,
                    background: n <= qDone ? "#c8a96e" : "#1e1c18",
                    transition:"background .4s"
                  }}/>
                ))}
              </div>
            )}

            {/* Message thread */}
            <div style={{ display:"flex", flexDirection:"column", gap:14, marginBottom:18 }}>
              {chatMessages.map((m, i) => (
                <div key={i} className="msg" style={{ display:"flex", justifyContent: m.role==="user" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth:"83%",
                    background: m.role==="user" ? "#1a1814" : "#161512",
                    border:`1px solid ${m.role==="user" ? "#2a2620" : "#202020"}`,
                    borderRadius: m.role==="user" ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
                    padding:"12px 16px",
                    color: m.role==="user" ? "#bfb090" : "#cec3a8",
                    fontSize:13.5, lineHeight:1.75, whiteSpace:"pre-wrap"
                  }}>
                    {m.role === "assistant" && (
                      <span style={{ color:"#c8a96e", fontSize:10, letterSpacing:".18em", display:"block", marginBottom:5, fontFamily:"monospace" }}>
                        CLAUDE
                      </span>
                    )}
                    {m.content}
                  </div>
                </div>
              ))}

              {/* Typing indicator while generating */}
              {phase === "generating" && loading && (
                <div className="msg" style={{ display:"flex", justifyContent:"flex-start" }}>
                  <div style={{ background:"#161512", border:"1px solid #202020", borderRadius:"14px 14px 14px 3px", padding:"10px 16px" }}>
                    <span style={{ color:"#c8a96e", fontSize:10, letterSpacing:".18em", display:"block", marginBottom:4, fontFamily:"monospace" }}>
                      CRAFTING YOUR PROMPT...
                    </span>
                    <TypingDots />
                  </div>
                </div>
              )}

              <div ref={bottomRef}/>
            </div>

            {/* Error */}
            {errMsg && (
              <div style={{ background:"#1a0e0e", border:"1px solid #4a2020", borderRadius:10, padding:"12px 16px", marginBottom:16, color:"#c87070", fontSize:13 }}>
                ⚠ {errMsg}
              </div>
            )}

            {/* Generated prompt */}
            {phase === "done" && generatedPrompt && (
              <div className="msg" style={{
                background:"#0b1810", border:"1px solid #1a3a22",
                borderRadius:14, padding:"22px 22px 18px", marginBottom:16
              }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <span style={{ fontSize:10, letterSpacing:".2em", color:"#4caf70", fontFamily:"monospace" }}>
                    ✦ YOUR TOP 1% PROMPT
                  </span>
                  <button onClick={copyPrompt} style={{
                    background: copied ? "#162b1c" : "transparent",
                    border:`1px solid ${copied ? "#4caf70" : "#2a4a32"}`,
                    borderRadius:7, padding:"4px 13px",
                    color: copied ? "#4caf70" : "#3d7a4d",
                    fontSize:11.5, cursor:"pointer", fontFamily:"monospace",
                    transition:"all .2s"
                  }}>
                    {copied ? "✓ Copied!" : "Copy"}
                  </button>
                </div>
                <div style={{
                  color:"#aecfb8", fontSize:13.5, lineHeight:1.8,
                  whiteSpace:"pre-wrap", borderTop:"1px solid #1a3a22", paddingTop:14
                }}>
                  {generatedPrompt}
                </div>
              </div>
            )}

            {/* Input box */}
            {phase === "chat" && (
              <div style={{
                background:"#161512", border:"1px solid #272420",
                borderRadius:12, padding:"4px 4px 4px 14px",
                display:"flex", alignItems:"flex-end", gap:8
              }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); submitAnswer(); } }}
                  placeholder="Type your answer…"
                  rows={1}
                  style={{
                    flex:1, background:"transparent", border:"none",
                    color:"#cec3a8", fontSize:13.5, lineHeight:1.65,
                    fontFamily:"Georgia,serif", padding:"11px 0",
                    maxHeight:110, overflowY:"auto"
                  }}
                  onInput={e => {
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 110) + "px";
                  }}
                />
                <button
                  onClick={submitAnswer}
                  disabled={!input.trim()}
                  style={{
                    background: input.trim() ? "#c8a96e" : "#201e1a",
                    border:"none", borderRadius:9,
                    width:38, height:38, minWidth:38,
                    color: input.trim() ? "#0f0e0c" : "#383430",
                    fontSize:15, cursor: input.trim() ? "pointer" : "default",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    marginBottom:4, transition:"all .2s"
                  }}
                >→</button>
              </div>
            )}

            {/* Restart */}
            {phase === "done" && (
              <button onClick={restart} style={{
                width:"100%", padding:13, background:"transparent",
                border:"1px solid #222", borderRadius:11,
                color:"#555", fontSize:13, cursor:"pointer",
                fontFamily:"Georgia,serif", letterSpacing:".04em", transition:"all .2s"
              }}
                onMouseEnter={e => { e.target.style.borderColor="#3a3830"; e.target.style.color="#888"; }}
                onMouseLeave={e => { e.target.style.borderColor="#222"; e.target.style.color="#555"; }}
              >
                ↺ Build another prompt
              </button>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
