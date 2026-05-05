import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DragDropContext, Draggable, Droppable } from "react-beautiful-dnd";
import "../styles/tracker.css";

const COLUMNS = ["Exploring", "In Progress", "Ready to Submit", "Submitted"];

const getDaysLeft = (deadline) => {
  if (!deadline) return null;
  const now = new Date();
  const due = new Date(deadline);
  if (Number.isNaN(due.getTime())) return null;
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

const getCountdownClass = (daysLeft) => {
  if (daysLeft === null) return "";
  if (daysLeft < 7) return "red";
  if (daysLeft <= 14) return "yellow";
  return "green";
};

export default function Tracker() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const tracked = JSON.parse(localStorage.getItem("trackedOpportunities") || "[]");
      setItems(Array.isArray(tracked) ? tracked : []);
      setError("");
    } catch {
      setItems([]);
      setError("Failed to load tracked opportunities.");
    } finally {
      setLoading(false);
    }
  }, []);

  const boardData = useMemo(() => {
    return COLUMNS.reduce((acc, column) => {
      acc[column] = items.filter((item) => (item.stage || "Exploring") === column);
      return acc;
    }, {});
  }, [items]);

  const persistItems = (nextItems) => {
    setItems(nextItems);
    localStorage.setItem("trackedOpportunities", JSON.stringify(nextItems));
  };

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const movedId = String(draggableId);
    const nextItems = items.map((item) =>
      String(item.id) === movedId ? { ...item, stage: destination.droppableId } : item
    );
    persistItems(nextItems);
  };

  const getCompletionPercent = (item) => {
    const checks = [item.gap_done, item.draft_done, item.rec_done, item.plan_done];
    const done = checks.filter(Boolean).length;
    return done * 25;
  };

  return (
    <div className="page">
      <div className="page-header row-between">
        <h1>Application Tracker</h1>
        <button className="btn primary" type="button" onClick={() => navigate("/opportunities")}>
          + Track New
        </button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        {loading ? <p>Loading tracker...</p> : null}
        {error ? <div className="error-box">{error}</div> : null}
        <div className="tracker-grid">
          {COLUMNS.map((column) => (
            <Droppable key={column} droppableId={column}>
              {(provided) => (
                <section className="tracker-column" ref={provided.innerRef} {...provided.droppableProps}>
                  <h2>{column}</h2>
                  {(boardData[column] || []).map((item, index) => {
                    const daysLeft = getDaysLeft(item.deadline);
                    const completion = getCompletionPercent(item);
                    return (
                      <Draggable key={String(item.id)} draggableId={String(item.id)} index={index}>
                        {(dragProvided) => (
                          <article
                            className="card tracker-card"
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            onClick={() => navigate(`/workspace/${encodeURIComponent(item.id)}`)}
                          >
                            <h3>{item.name || "Untitled Opportunity"}</h3>
                            <p className={`countdown ${getCountdownClass(daysLeft)}`}>
                              {daysLeft === null ? "Deadline unavailable" : `${daysLeft} days left`}
                            </p>
                            <div className="progress-track">
                              <div className="progress-fill" style={{ width: `${completion}%` }} />
                            </div>
                            <p className="small">Completion: {completion}%</p>
                            <p className="italic one-line">{item.blocker || "No blocker captured yet."}</p>
                          </article>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </section>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
