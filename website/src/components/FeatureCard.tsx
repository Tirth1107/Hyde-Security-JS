import React from 'react'

interface FeatureCardProps {
  title: string
  desc: string
  badge: string
  badgeType: 'core' | 'detect' | 'tamper' | 'data' | 'info' | 'auth' | 'privacy'
  children: React.ReactNode
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, desc, badge, badgeType, children }) => {
  return (
    <div className="glass-panel feature-card">
      <div className="card-header">
        <div>
          <h3 className="card-title">{title}</h3>
          <p className="card-desc" style={{ marginTop: 4 }}>{desc}</p>
        </div>
        <span className={`badge badge-${badgeType}`}>{badge}</span>
      </div>
      <div className="playground">
        {children}
      </div>
    </div>
  )
}

export default FeatureCard
