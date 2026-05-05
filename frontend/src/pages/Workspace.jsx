import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { jsPDF } from "jspdf";
import client from "../api/client";
import Tabs from "../components/Tabs";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorState from "../components/ErrorState";
import ProgressBar from "../components/ProgressBar";
import "../styles/workspace.css";

const TAB_NAMES = ["Gap Analysis", "Application Draft", "Rec Letter", "Action Plan"];

const getStoredJSON = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
};

const highlightBlanks = (text) => {
  return String(text || "")
    .split(/(\[BLANKS\])/g)
    .map((part, index) =>
      part === "[BLANKS]" ? (
        <span key={`${part}-${index}`} className="blank-highlight">
          {part}
        </span>
      ) : (
        <span key={`${part}-${index}`}>{part}</span>
      )
    );
};

export default function Workspace() {
  const { opportunityId } = useParams();
  const userProfile = useMemo(() => getStoredJSON("userProfile", null), []);
  const selectedOpportunity = useMemo(() => getStoredJSON("selectedOpportunity", null), []);

  const [activeTab, setActiveTab] = useState(TAB_NAMES[0]);
  const [tabLoading, setTabLoading] = useState(false);
  const [tabError, setTabError] = useState("");

  const [gapData, setGapData] = useState(getStoredJSON(`gapAnalysis_${opportunityId}`, null));
  const [expandedGap, setExpandedGap] = useState({});

  const [draftText, setDraftText] = useState("");
  const [refineInput, setRefineInput] = useState("");
  const [draftLoading, setDraftLoading] = useState(false);

  const [recommenderType, setRecommenderType] = useState("Professor");
  const [relationshipContext, setRelationshipContext] = useState("");
  const [requestEmail, setRequestEmail] = useState("");
  const [recLetter, setRecLetter] = useState("");
  const [recLoading, setRecLoading] = useState(false);

  const [actionPlanTasks, setActionPlanTasks] = useState(getStoredJSON(`actionPlan_${opportunityId}`, []));
  const [actionLoaded, setActionLoaded] = useState(false);

  const updateTracked = (patch) => {
    const tracked = getStoredJSON("trackedOpportunities", []);
    const updated = tracked.map((item) =>
      String(item.id) === String(opportunityId) ? { ...item, ...patch } : item
    );
    localStorage.setItem("trackedOpportunities", JSON.stringify(updated));
  };

  useEffect(() => {
    localStorage.setItem("selectedOpportunity", JSON.stringify({ ...(selectedOpportunity || {}), id: opportunityId }));
  }, [opportunityId, selectedOpportunity]);

  useEffect(() => {
    if (activeTab !== "Gap Analysis" || gapData) return;
    const fetchGapAnalysis = async () => {
      setTabLoading(true);
      setTabError("");
      try {
        const payload = {
          userId: userProfile?.id || userProfile?.userId || userProfile?.email || userProfile?.name || "local-user",
          opportunityId
        };
        const response = await client.post("/gap-analysis", payload);
        const result = response.data || {};
        setGapData(result);
        localStorage.setItem(`gapAnalysis_${opportunityId}`, JSON.stringify(result));
        const blocker =
          (result.gaps || []).find((g) => String(g.status).toLowerCase() === "blocker")?.explanation || "";
        updateTracked({ gap_done: true, blocker: blocker.split(".")[0] || blocker });
      } catch (err) {
        setTabError(err.response?.data?.detail || "Failed to load gap analysis.");
      } finally {
        setTabLoading(false);
      }
    };
    fetchGapAnalysis();
  }, [activeTab, gapData, opportunityId, userProfile]);

  useEffect(() => {
    if (activeTab !== "Action Plan" || actionLoaded) return;
    const fetchActionPlan = async () => {
      setTabLoading(true);
      setTabError("");
      try {
        const gap = getStoredJSON(`gapAnalysis_${opportunityId}`, gapData || {});
        const response = await client.post("/action-plan", {
          opportunityId,
          gapAnalysis: gap
        });
        const tasks = response.data?.tasks || response.data || [];
        const saved = getStoredJSON(`actionPlan_${opportunityId}`, []);
        const merged = tasks.map((task, idx) => ({
          ...task,
          id: task.id || `${opportunityId}-${idx}`,
          done: saved.find((s) => String(s.id) === String(task.id || `${opportunityId}-${idx}`))?.done || false
        }));
        setActionPlanTasks(merged);
        localStorage.setItem(`actionPlan_${opportunityId}`, JSON.stringify(merged));
        setActionLoaded(true);
      } catch (err) {
        setTabError(err.response?.data?.detail || "Failed to load action plan.");
      } finally {
        setTabLoading(false);
      }
    };
    fetchActionPlan();
  }, [activeTab, actionLoaded, gapData, opportunityId]);

  const generateDraft = async () => {
    setDraftLoading(true);
    setTabError("");
    setDraftText("");
    try {
      const response = await fetch(`${client.defaults.baseURL}/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunityId,
          userProfile,
          selectedOpportunity
        })
      });
      if (!response.ok || !response.body) {
        throw new Error("Draft generation failed.");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let output = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        output += decoder.decode(value, { stream: true });
        setDraftText(output);
      }
      updateTracked({ draft_done: true });
    } catch (err) {
      setTabError(err.message || "Failed to generate draft.");
    } finally {
      setDraftLoading(false);
    }
  };

  const refineDraft = async () => {
    setDraftLoading(true);
    setTabError("");
    try {
      const response = await client.post("/refine", {
        opportunityId,
        draft: draftText,
        refinement: refineInput
      });
      setDraftText(response.data?.draft || response.data?.text || draftText);
    } catch (err) {
      setTabError(err.response?.data?.detail || "Failed to refine draft.");
    } finally {
      setDraftLoading(false);
    }
  };

  const generateRecLetter = async () => {
    setRecLoading(true);
    setTabError("");
    try {
      const response = await client.post("/rec-letter", {
        opportunityId,
        recommender_type: recommenderType,
        relationship_context: relationshipContext,
        userProfile,
        selectedOpportunity
      });
      setRequestEmail(response.data?.request_email || response.data?.email || "");
      setRecLetter(response.data?.recommendation_letter || response.data?.letter || "");
      updateTracked({ rec_done: true });
    } catch (err) {
      setTabError(err.response?.data?.detail || "Failed to generate recommendation letter.");
    } finally {
      setRecLoading(false);
    }
  };

  const copyText = async (text) => {
    await navigator.clipboard.writeText(text || "");
  };

  const savePdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(12);
    const lines = doc.splitTextToSize(draftText || "No draft available.", 180);
    doc.text(lines, 15, 20);
    doc.save(`application-draft-${opportunityId}.pdf`);
  };

  const toggleTask = (taskId) => {
    const next = actionPlanTasks.map((task) =>
      String(task.id) === String(taskId) ? { ...task, done: !task.done } : task
    );
    setActionPlanTasks(next);
    localStorage.setItem(`actionPlan_${opportunityId}`, JSON.stringify(next));
    const allDone = next.length > 0 && next.every((t) => t.done);
    updateTracked({ plan_done: allDone });
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>{selectedOpportunity?.name || "Workspace"}</h1>
        <p>ID: {opportunityId}</p>
      </div>

      <Tabs tabs={TAB_NAMES} activeTab={activeTab} onChange={setActiveTab} />
      {tabError ? <ErrorState message={tabError} /> : null}

      {activeTab === "Gap Analysis" && (
        <section className="card">
          {tabLoading ? <LoadingSpinner label="Analyzing profile gaps..." /> : null}
          {!tabLoading && gapData ? (
            <>
              <div className="overall-badge">
                Overall Competitiveness: {gapData.overall_competitiveness || "N/A"}
              </div>
              <div className="gap-list">
                {(gapData.gaps || []).map((gap, idx) => {
                  const status = String(gap.status || "weak").toLowerCase();
                  return (
                    <article key={`${gap.field}-${idx}`} className="gap-card">
                      <div className="row-between">
                        <h3>{gap.field || "Field"}</h3>
                        <span className={`badge ${status}`}>{gap.status || "Weak"}</span>
                      </div>
                      <p>
                        <strong>Your value:</strong> {gap.user_value || "N/A"} | <strong>Required:</strong>{" "}
                        {gap.required_value || "N/A"}
                      </p>
                      <ProgressBar value={gap.benchmark_score || gap.benchmark || 0} />
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() =>
                          setExpandedGap((prev) => ({ ...prev, [idx]: !prev[idx] }))
                        }
                      >
                        {expandedGap[idx] ? "Hide details" : "Show details"}
                      </button>
                      {expandedGap[idx] ? <p>{gap.explanation || "No explanation available."}</p> : null}
                    </article>
                  );
                })}
              </div>
            </>
          ) : null}
        </section>
      )}

      {activeTab === "Application Draft" && (
        <section className="card">
          <div className="row-wrap">
            <button className="btn primary" type="button" onClick={generateDraft} disabled={draftLoading}>
              Generate Draft
            </button>
            <button className="btn ghost" type="button" onClick={() => copyText(draftText)}>
              Copy to Clipboard
            </button>
            <button className="btn ghost" type="button" onClick={savePdf}>
              Download PDF
            </button>
          </div>
          {draftLoading ? <LoadingSpinner label="Generating draft..." /> : null}
          <textarea
            className="textarea large"
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            placeholder="Draft output will stream here..."
          />
          <div className="row-wrap">
            <input
              className="input"
              value={refineInput}
              onChange={(e) => setRefineInput(e.target.value)}
              placeholder="Ask for refinements..."
            />
            <button className="btn secondary" type="button" onClick={refineDraft} disabled={draftLoading}>
              Refine
            </button>
          </div>
        </section>
      )}

      {activeTab === "Rec Letter" && (
        <section className="card">
          <div className="grid-two">
            <select
              className="input"
              value={recommenderType}
              onChange={(e) => setRecommenderType(e.target.value)}
            >
              <option>Professor</option>
              <option>Employer</option>
              <option>Mentor</option>
            </select>
            <input
              className="input"
              value={relationshipContext}
              onChange={(e) => setRelationshipContext(e.target.value)}
              placeholder="Relationship context"
            />
          </div>
          <button className="btn primary" type="button" onClick={generateRecLetter} disabled={recLoading}>
            Generate
          </button>
          {recLoading ? <LoadingSpinner label="Generating recommendation content..." /> : null}
          <div className="grid-two">
            <div>
              <h3>Request Email</h3>
              <textarea
                className="textarea"
                value={requestEmail}
                onChange={(e) => setRequestEmail(e.target.value)}
              />
              <button className="btn ghost" type="button" onClick={() => copyText(requestEmail)}>
                Copy
              </button>
            </div>
            <div>
              <h3>Draft Recommendation Letter</h3>
              <textarea className="textarea" value={recLetter} onChange={(e) => setRecLetter(e.target.value)} />
              <div className="blank-preview">{highlightBlanks(recLetter)}</div>
              <button className="btn ghost" type="button" onClick={() => copyText(recLetter)}>
                Copy
              </button>
            </div>
          </div>
        </section>
      )}

      {activeTab === "Action Plan" && (
        <section className="card">
          {tabLoading ? <LoadingSpinner label="Building action plan..." /> : null}
          {!tabLoading && actionPlanTasks.length === 0 ? <ErrorState message="No action plan tasks found." /> : null}
          <div className="timeline">
            {actionPlanTasks.map((task) => (
              <article key={task.id} className={`timeline-item ${task.done ? "done" : ""}`}>
                <div className="timeline-dot" />
                <div className="timeline-content">
                  <div className="row-between">
                    <p className="week-label">{task.week || task.week_label || "Week"}</p>
                    <input
                      type="checkbox"
                      checked={!!task.done}
                      onChange={() => toggleTask(task.id)}
                      aria-label={`Mark ${task.title || "task"} done`}
                    />
                  </div>
                  <h3>{task.title || "Task"}</h3>
                  <p>{task.description || "No description."}</p>
                  <small>Estimated Time: {task.estimated_time || "N/A"}</small>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
