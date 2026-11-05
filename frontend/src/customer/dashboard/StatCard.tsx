import "./statCard.css";

interface StatCardProps {
  title: string;
  value: string;
}

const StatCard = ({ title, value }: StatCardProps) => {
  return (
    <div className="stat-card">
      <p className="stat-card-title">{title}</p>

      <h3 className="stat-card-value">{value}</h3>
    </div>
  );
};

export default StatCard;