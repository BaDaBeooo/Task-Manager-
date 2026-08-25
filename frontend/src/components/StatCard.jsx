function StatCard({
  title,
  value,
  icon,
  description,
}) {
  return (
    <div className="stat-card">

      <div className="stat-card-top">

        <div className="stat-card-title">
          {title}
        </div>

        <div className="stat-card-icon">
          {icon}
        </div>

      </div>


      <div className="stat-card-value">
        {value}
      </div>


      {description && (
        <div className="stat-card-description">
          {description}
        </div>
      )}

    </div>
  );
}

export default StatCard;