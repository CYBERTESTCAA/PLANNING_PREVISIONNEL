import { Absence, ABSENCE_TYPE_LABELS } from '@/types/planning';
import { getAbsenceBadgeClass } from '@/lib/planningUtils';
import { motion } from 'framer-motion';

interface AbsenceBadgeProps {
  absence: Absence;
  compact?: boolean;
}

export const AbsenceBadge = ({ absence, compact = false }: AbsenceBadgeProps) => {
  const badgeClass = getAbsenceBadgeClass(absence.type);
  const label = ABSENCE_TYPE_LABELS[absence.type];

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`absence-badge ${badgeClass}`}
      title={absence.comment ? `${label} - ${absence.comment}` : label}
    >
      <span className={compact ? '' : 'mr-1'}>
        {absence.type === 'MALADIE' ? '🏥' : 
         absence.type === 'CP' ? '🏖️' : 
         absence.type === 'RTT' ? '🕐' : 
         absence.type === 'FORMATION' ? '📚' : '📝'}
      </span>
      {!compact && (
        <span className="font-medium">{label}</span>
      )}
      {compact && (
        <span className="font-medium">{absence.type}</span>
      )}
    </motion.div>
  );
};
