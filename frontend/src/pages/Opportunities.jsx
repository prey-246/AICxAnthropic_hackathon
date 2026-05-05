import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import SkeletonCard from "../components/SkeletonCard";
import ErrorState from "../components/ErrorState";
import ProgressBar from "../components/ProgressBar";
import "../styles/opportunities.css";

const formatDeadline = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return String(dateString);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const parseAwardValue = (award) => {
  if (typeof award === "number") return award;
  const value = Number(String(award || "").replace(/[^\d.]/g, ""));
  return Number.isNaN(value) ? 0 : value;
};

export default function Opportunities() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Best Match");

  useEffect(() => {
    const fetchMatches = async () => {
      setLoading(true);
      setError("");
      try {
        const userProfile = JSON.parse(localStorage.getItem("userProfile") || "null");
        if (!userProfile) {
          setError("Profile not found. Complete intake first.");
          setLoading(false);
          return;
        }
        const response = await client.post("/match", userProfile);
        const opportunities = response.data?.opportunities || response.data || [];
        setItems(Array.isArray(opportunities) ? opportunities : []);
      } catch (err) {
        setError(err.response?.data?.detail || "Unable to fetch opportunities.");
      } finally {
        setLoading(false);
      }
    };
    fetchMatches();
  }, []);

  const filteredAndSorted = useMemo(() => {
    const filtered = items.filter((item) => {
      if (typeFilter === "All") return true;
      return (item.type || "").toLowerCase() === typeFilter.toLowerCase();
    });

    return filtered.sort((a, b) => {
      if (sortBy === "Deadline") {
        return new Date(a.deadline || 0).getTime() - new Date(b.deadline || 0).getTime();
      }
      if (sortBy === "Award") {
        return parseAwardValue(b.award_amount) - parseAwardValue(a.award_amount);
      }
      return (b.match_score || 0) - (a.match_score || 0);
    });
  }, [items, typeFilter, sortBy]);

  const saveTrackedOpportunity = (opportunity) => {
    const existing = JSON.parse(localStorage.getItem("trackedOpportunities") || "[]");
    const id = String(opportunity.id || opportunity.opportunityId || opportunity.name);
    const alreadyExists = existing.find((item) => String(item.id) === id);
    if (alreadyExists) return;

    existing.push({
      id,
      name: opportunity.name || "Untitled Opportunity",
      deadline: opportunity.deadline || null,
      stage: "Exploring",
      gap_done: false,
      draft_done: false,
      rec_done: false,
      plan_done: false,
      blocker: ""
    });
    localStorage.setItem("trackedOpportunities", JSON.stringify(existing));
  };

  const onExplore = (opportunity) => {
    const id = String(opportunity.id || opportunity.opportunityId || opportunity.name);
    localStorage.setItem("selectedOpportunity", JSON.stringify({ ...opportunity, id }));
    saveTrackedOpportunity({ ...opportunity, id });
    navigate(`/workspace/${encodeURIComponent(id)}`);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Matched Opportunities</h1>
      </div>

      <div className="card filter-bar">
        <select className="input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option>All</option>
          <option>Scholarship</option>
          <option>Internship</option>
          <option>Fellowship</option>
        </select>
        <select className="input" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option>Best Match</option>
          <option>Deadline</option>
          <option>Award</option>
        </select>
      </div>

      {error ? <ErrorState message={error} /> : null}

      <div className="opportunity-grid">
        {loading
          ? Array.from({ length: 6 }).map((_, idx) => <SkeletonCard key={idx} />)
          : filteredAndSorted.map((item) => (
              <article className="card opportunity-card" key={String(item.id || item.name)}>
                <h3>{item.name || "Untitled Opportunity"}</h3>
                <span className={`badge type ${String(item.type || "").toLowerCase()}`}>
                  {item.type || "Opportunity"}
                </span>
                <p>
                  <strong>Deadline:</strong> {formatDeadline(item.deadline)}
                </p>
                <p>
                  <strong>Award:</strong> {item.award_amount || item.award || "N/A"}
                </p>
                <p className="italic one-line">{item.match_reason || "Matched to your profile."}</p>
                <ProgressBar value={(item.match_score || 0) * (item.match_score <= 1 ? 100 : 1)} />
                <button className="btn primary" type="button" onClick={() => onExplore(item)}>
                  Explore
                </button>
              </article>
            ))}
      </div>
    </div>
  );
}
