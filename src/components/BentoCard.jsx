import { motion } from 'motion/react'

export default function BentoCard({ icon: Icon, title, description, className = '', isDark = true, featured = false }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={`group relative rounded-2xl border transition-all duration-300 ${
        featured ? 'p-8 md:p-10' : 'p-6'
      } ${
        isDark
          ? 'bg-white/[0.03] border-white/[0.08] hover:border-blue-500/50'
          : 'bg-white border-slate-200/60 hover:border-blue-400/50 shadow-sm'
      } ${className}`}
    >
      <div className="relative z-10">
        {/* Featured accent bar — subtle top border for featured cards */}
        {featured && (
          <div className="w-10 h-1 rounded-full mb-5 bg-blue-500/60 dark:bg-blue-400/50" />
        )}

        {/* Icon */}
        <Icon
          className={`transition-all duration-300 group-hover:scale-110 ${
            featured ? 'w-8 h-8 mb-5' : 'w-7 h-7 mb-4'
          }`}
          style={{ color: 'var(--icon-color)' }}
        />

        {/* Title */}
        <h3
          className={`font-bold mb-2 transition-colors duration-300 group-hover:text-blue-500 ${
            featured ? 'text-lg' : 'text-base'
          }`}
          style={{ color: 'var(--text-primary)' }}
        >
          {title}
        </h3>

        {/* Description */}
        <p
          className={`leading-relaxed ${
            featured ? 'text-base' : 'text-sm'
          }`}
          style={{ color: 'var(--text-muted)' }}
        >
          {description}
        </p>
      </div>
    </motion.div>
  )
}
