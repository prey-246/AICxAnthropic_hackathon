export default function ErrorState({ message }) {
  return <div className="error-box">{message || "Something went wrong."}</div>;
}
