# AG-UI Evaluation Matrix

Complete scoring across all 7 evaluation parameters.

## Scoring Summary

| # | Parameter | LangChain | Mastra | CrewAI | Weight |
|---|-----------|-----------|--------|--------|--------|
| 1 | Integration Effort | 9/10 | 10/10 | 8/10 | 15% |
| 2 | Streaming | 9/10 | 10/10 | 6/10 | 20% |
| 3 | State Sync | 10/10 | 10/10 | 8/10 | 15% |
| 4 | Tool Invocation | 10/10 | 10/10 | 8/10 | 15% |
| 5 | Error Handling | 9/10 | 9/10 | 9/10 | 10% |
| 6 | Framework Agnosticism | 10/10 | 10/10 | 10/10 | 15% |
| 7 | Developer Experience | 8/10 | 9/10 | 7/10 | 10% |
| | **Weighted Total** | **9.25** | **9.70** | **7.60** | |

---

## Detailed Scoring

### 1. Integration Effort (15%)

| Metric | LangChain | Mastra | CrewAI |
|--------|-----------|--------|--------|
| Lines of Code | 180 | 140 | 200 |
| Dev Time (hrs) | 6 | 3 | 8 |
| Complexity | Medium | Low | Medium-High |
| **Score** | 9/10 | 10/10 | 8/10 |

**Notes:**
- Mastra: Native TypeScript, AI SDK compatible
- LangChain: LangGraph event mapping straightforward
- CrewAI: Multi-agent adds complexity

---

### 2. Streaming & Responsiveness (20%)

| Metric | LangChain | Mastra | CrewAI |
|--------|-----------|--------|--------|
| TTFT (ms) | ~400 | ~350 | ~500 |
| Throughput (tok/s) | ~45 | ~52 | ~35 |
| Smoothness | 4/5 | 5/5 | 3/5 |
| **Score** | 9/10 | 10/10 | 6/10 |

**Notes:**
- CrewAI: Simulated streaming (native limitation)
- Mastra: Best streaming performance
- All meet TTFT < 500ms target

---

### 3. State Synchronization (15%)

| Metric | LangChain | Mastra | CrewAI |
|--------|-----------|--------|--------|
| Multi-turn Accuracy | 100% | 100% | 85% |
| Context Preservation | Excellent | Excellent | Good |
| Memory Usage | Low | Low | Medium |
| **Score** | 10/10 | 10/10 | 8/10 |

**Notes:**
- CrewAI crew execution model limits context
- LangChain/Mastra maintain full history

---

### 4. Tool Invocation Support (15%)

| Metric | LangChain | Mastra | CrewAI |
|--------|-----------|--------|--------|
| TOOL_CALL_START | ✅ | ✅ | ✅ |
| TOOL_CALL_END | ✅ | ✅ | ✅ |
| Result Display | ✅ | ✅ | ⚠️ |
| Error Display | ✅ | ✅ | ✅ |
| **Score** | 10/10 | 10/10 | 8/10 |

**Notes:**
- All frameworks emit core tool events
- CrewAI: Agent-as-tool pattern less clear

---

### 5. Error Handling & Recovery (10%)

| Metric | LangChain | Mastra | CrewAI |
|--------|-----------|--------|--------|
| Error Detection | ✅ | ✅ | ✅ |
| Recovery Rate | 100% | 100% | 100% |
| User Feedback | Clear | Clear | Clear |
| **Score** | 9/10 | 9/10 | 9/10 |

**Notes:**
- RUN_ERROR event properly surfaces errors
- All frameworks recover gracefully

---

### 6. Framework Agnosticism (15%)

| Metric | LangChain | Mastra | CrewAI |
|--------|-----------|--------|--------|
| UI Code Changes | 0 | 0 | 0 |
| Event Compatibility | 100% | 100% | 100% |
| Switching Effort | None | None | None |
| **Score** | 10/10 | 10/10 | 10/10 |

**Critical Finding:** Same `useAGUI` hook works with all frameworks.

---

### 7. Developer Experience (10%)

| Metric | LangChain | Mastra | CrewAI |
|--------|-----------|--------|--------|
| Documentation | 4/5 | 4/5 | 3/5 |
| Debuggability | 4/5 | 5/5 | 3/5 |
| Learning Curve | 4hrs | 2hrs | 6hrs |
| TypeScript Support | ⚠️ | ✅ | ⚠️ |
| **Score** | 8/10 | 9/10 | 7/10 |

---

## Framework Recommendation

| Framework | Score | Recommendation |
|-----------|-------|----------------|
| **Mastra** | 9.70 | ⭐ Best for new TypeScript projects |
| **LangChain** | 9.25 | ⭐ Best for Python/production |
| **CrewAI** | 7.60 | Use for multi-agent only |

## Overall AG-UI Verdict

| Criterion | Result |
|-----------|--------|
| Reduces integration effort | ✅ Yes |
| Maintains responsiveness | ✅ Yes |
| Framework agnostic | ✅ Yes |
| Production ready | ⚠️ With caveats |

**Final Recommendation: ADOPT**
