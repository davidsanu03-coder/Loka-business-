
type SellerStatCardProps = {
    title: string;
    value: string;
    description: string;
    icon: string;
};

function SellerStatCard({
    title,
    value,
    description,
    icon,
}: SellerStatCardProps) {
    return (
        <article className="seller-stat-card">
            <div className="seller-stat-card-top">
                <span className="seller-stat-icon">{icon}</span>
                <span className="seller-stat-title">{title}</span>
            </div>

            <strong className="seller-stat-value">{value}</strong>
            <p>{description}</p>
        </article>
    );
}

export default SellerStatCard;