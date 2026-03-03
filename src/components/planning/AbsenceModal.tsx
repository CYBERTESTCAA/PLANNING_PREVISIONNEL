import { useState } from 'react';
import { AbsenceType, SlotType, ABSENCE_TYPE_LABELS, SLOT_LABELS } from '@/types/planning';
import { X, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AbsenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (type: AbsenceType, comment: string, slot: SlotType) => void;
  personName: string;
  date: string;
  defaultSlot?: SlotType;
}

export const AbsenceModal = ({
  isOpen, onClose, onSubmit, personName, date, defaultSlot = 'FULL',
}: AbsenceModalProps) => {
  const [selectedType, setSelectedType] = useState<AbsenceType>('CP');
  const [selectedSlot, setSelectedSlot] = useState<SlotType>(defaultSlot);
  const [comment, setComment] = useState('');

  const absenceTypes: { value: AbsenceType; label: string; icon: string }[] = [
    { value: 'CP', label: ABSENCE_TYPE_LABELS.CP, icon: '🏖️' },
    { value: 'RTT', label: ABSENCE_TYPE_LABELS.RTT, icon: '🕐' },
    { value: 'MALADIE', label: ABSENCE_TYPE_LABELS.MALADIE, icon: '🏥' },
    { value: 'FORMATION', label: ABSENCE_TYPE_LABELS.FORMATION, icon: '📚' },
    { value: 'AUTRE', label: ABSENCE_TYPE_LABELS.AUTRE, icon: '📝' },
  ];

  const slotOptions: { value: SlotType; label: string }[] = [
    { value: 'FULL', label: SLOT_LABELS.FULL },
    { value: 'AM', label: SLOT_LABELS.AM },
    { value: 'PM', label: SLOT_LABELS.PM },
  ];

  const handleSubmit = () => {
    onSubmit(selectedType, comment, selectedSlot);
    handleClose();
  };

  const handleClose = () => {
    setSelectedType('CP');
    setSelectedSlot(defaultSlot);
    setComment('');
    onClose();
  };

  if (!isOpen) return null;

  const formattedDate = new Date(date).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="modal-backdrop flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
          className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-border"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Ajouter une absence</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{personName} • {formattedDate}</p>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-secondary rounded-lg transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <div className="px-6 py-4">
            <label className="block text-sm font-medium text-foreground mb-3">Type d'absence</label>
            <div className="grid grid-cols-2 gap-2">
              {absenceTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all text-left
                             ${selectedType === type.value
                               ? 'bg-primary/10 border-primary text-foreground shadow-sm'
                               : 'border-border hover:bg-secondary text-muted-foreground'}`}
                >
                  <span>{type.icon}</span>
                  <span className="font-medium">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="px-6 py-4 border-t border-border">
            <label className="block text-sm font-medium text-foreground mb-3">Créneau</label>
            <div className="flex gap-2">
              {slotOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedSlot(opt.value)}
                  className={`flex-1 px-3 py-2 rounded-xl border transition-all text-center text-sm font-medium
                             ${selectedSlot === opt.value
                               ? 'bg-primary/10 border-primary text-foreground shadow-sm'
                               : 'border-border hover:bg-secondary text-muted-foreground'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="px-6 py-4 border-t border-border">
            <label className="block text-sm font-medium text-foreground mb-2">Commentaire (optionnel)</label>
            <input
              type="text"
              placeholder="Ex: Vacances famille, Visite médicale..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-3 py-2.5 bg-secondary rounded-lg text-foreground placeholder:text-muted-foreground
                         focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/30">
            <button onClick={handleClose} className="px-4 py-2 text-foreground hover:bg-secondary rounded-lg transition-colors font-medium">
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg transition-colors font-medium hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
              Ajouter l'absence
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
